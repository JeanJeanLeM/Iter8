/**
 * Fetches a ChatGPT shared conversation page and extracts assistant message texts.
 * Only allows https://chatgpt.com/share/<id>. Used for recipe import preview.
 */
const axios = require('axios');
const { logger } = require('@librechat/data-schemas');

const ALLOWED_ORIGIN = 'https://chatgpt.com';
const SHARE_PATH_PREFIX = '/share/';
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; CookIterate/1.0; +https://github.com)';

/**
 * Validates that url is exactly https://chatgpt.com/share/<non-empty-id>
 * @param {string} url
 * @returns {{ valid: boolean; error?: string }}
 */
function validateShareUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required.' };
  }
  const trimmed = url.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL.' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed.' };
  }
  if (parsed.hostname !== 'chatgpt.com') {
    return { valid: false, error: 'Only chatgpt.com share links are supported.' };
  }
  if (!parsed.pathname.startsWith(SHARE_PATH_PREFIX)) {
    return { valid: false, error: 'URL must be a share link (e.g. https://chatgpt.com/share/...).' };
  }
  const shareId = parsed.pathname.slice(SHARE_PATH_PREFIX.length).replace(/\/$/, '');
  if (!shareId) {
    return { valid: false, error: 'Share ID is missing.' };
  }
  return { valid: true };
}

/**
 * Extract all enqueue("...") payload chunks from script content.
 * Handles escaped characters inside the chunked string.
 * @param {string} scriptContent
 * @returns {string[]}
 */
function extractEnqueuePayloads(scriptContent) {
  const marker = 'streamController.enqueue("';
  const payloads = [];
  let searchFrom = 0;

  while (searchFrom < scriptContent.length) {
    const idx = scriptContent.indexOf(marker, searchFrom);
    if (idx === -1) break;
    const start = idx + marker.length;
    let end = start;
    let i = start;
    while (i < scriptContent.length) {
      // Generic escape handling: skip escaped character, not just escaped quotes.
      if (scriptContent[i] === '\\') {
        i += 2;
        end = i;
        continue;
      }
      if (scriptContent[i] === '"') {
        end = i;
        break;
      }
      i++;
      end = i;
    }
    if (end > start) {
      const raw = scriptContent.slice(start, end);
      payloads.push(raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    }
    searchFrom = end + 1;
  }

  return payloads;
}

/**
 * Backward-compatible helper: first extracted payload chunk.
 * @param {string} scriptContent
 * @returns {string | null}
 */
function extractEnqueuePayload(scriptContent) {
  const payloads = extractEnqueuePayloads(scriptContent);
  return payloads.length > 0 ? payloads[0] : null;
}

/**
 * Parse a serialized conversation payload into the Remix array format.
 * Supports common wrappers found in streamed payload chunks.
 * @param {string} payloadString
 * @returns {{ arr: Array; strategy: string } | null}
 */
function parseSerializedConversationArray(payloadString) {
  if (!payloadString || typeof payloadString !== 'string') {
    return null;
  }

  const trimmed = payloadString.trim();
  if (!trimmed) {
    return null;
  }

  const attempts = [{ value: trimmed, strategy: 'direct' }];
  const withoutNumericPrefix = trimmed.replace(/^\d+:\s*/, '');
  if (withoutNumericPrefix !== trimmed) {
    attempts.push({ value: withoutNumericPrefix, strategy: 'strip-numeric-prefix' });
  }
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    attempts.push({
      value: trimmed.slice(firstBracket, lastBracket + 1),
      strategy: 'slice-array-brackets',
    });
  }

  const seen = new Set();
  for (const attempt of attempts) {
    if (!attempt.value || seen.has(attempt.value)) {
      continue;
    }
    seen.add(attempt.value);
    try {
      const parsed = JSON.parse(attempt.value);
      if (Array.isArray(parsed)) {
        return { arr: parsed, strategy: attempt.strategy };
      }
      if (typeof parsed === 'string') {
        const parsedTwice = JSON.parse(parsed);
        if (Array.isArray(parsedTwice)) {
          return { arr: parsedTwice, strategy: `${attempt.strategy}-double-parse` };
        }
      }
    } catch {
      // Try next strategy.
    }
  }

  return null;
}

/**
 * Find conversation title and mapping from a Remix/React Router style serialized array.
 * Array format: [ ..., "key", value, ... ]. We look for "title" (string) and "mapping" (object).
 * @param {Array} arr
 * @returns {{ title: string; mapping: Record<string, number> | null }}
 */
function findTitleAndMapping(arr) {
  let title = '';
  let mapping = null;
  for (let i = 0; i < arr.length - 1; i += 2) {
    const key = arr[i];
    const val = arr[i + 1];
    if (key === 'title' && typeof val === 'string') title = val.trim();
    if (key === 'mapping' && val !== null && typeof val === 'object' && !Array.isArray(val)) mapping = val;
  }
  return { title, mapping };
}

/**
 * Resolve a node by index. In Remix serialization, values in objects can be indices.
 * @param {Array} arr
 * @param {number} index
 * @returns {unknown}
 */
function getNode(arr, index) {
  if (index == null || index < 0 || index >= arr.length) return undefined;
  return arr[index];
}

/**
 * Recursively collect all string values from an object (for text content).
 * @param {unknown} node
 * @param {Array} arr
 * @param {Set<number>} visited
 * @returns {string[]}
 */
function collectTextFromNode(node, arr, visited) {
  const texts = [];
  if (node == null) return texts;
  if (typeof node === 'string') {
    if (node.length > 20) texts.push(node);
    return texts;
  }
  if (typeof node === 'number') {
    if (visited.has(node)) return texts;
    visited.add(node);
    return collectTextFromNode(getNode(arr, node), arr, visited);
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      texts.push(...collectTextFromNode(item, arr, visited));
    }
    return texts;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node)) {
      texts.push(...collectTextFromNode(value, arr, visited));
    }
    return texts;
  }
  return texts;
}

/**
 * Check if a node (by index) represents an assistant message and return its text content.
 * @param {Array} arr
 * @param {number} nodeIndex
 * @param {Set<number>} visited
 * @returns {{ role: string; text: string } | null}
 */
function getMessageRoleAndText(arr, nodeIndex, visited) {
  if (visited.has(nodeIndex)) return null;
  visited.add(nodeIndex);
  const node = getNode(arr, nodeIndex);
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null;
  const obj = node;
  let role = null;
  let contentIndex = null;
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (k === 'author' && typeof v === 'number') {
      const authorNode = getNode(arr, v);
      if (authorNode && typeof authorNode === 'object' && !Array.isArray(authorNode)) {
        const roleVal = authorNode.role ?? authorNode._52 ?? getNode(arr, authorNode._52);
        role = typeof roleVal === 'string' ? roleVal : (getNode(arr, roleVal) ?? null);
      }
    }
    if (k === 'content' && typeof v === 'number') contentIndex = v;
  }
  if (!role || role !== 'assistant') return null;
  if (contentIndex == null) return null;
  const contentNode = getNode(arr, contentIndex);
  if (!contentNode) return null;
  const parts = contentNode.parts ?? contentNode._56 ?? (typeof contentNode._56 === 'number' ? getNode(arr, contentNode._56) : null);
  const partsArr = Array.isArray(parts) ? parts : (parts != null ? [parts] : []);
  const visitedInner = new Set(visited);
  const texts = [];
  for (const partRef of partsArr) {
    const part = typeof partRef === 'number' ? getNode(arr, partRef) : partRef;
    if (typeof part === 'string') texts.push(part);
    else if (part && typeof part === 'object') {
      const text = part.text ?? part._63 ?? (typeof part._63 === 'number' ? getNode(arr, part._63) : null);
      if (typeof text === 'string') texts.push(text);
      else texts.push(...collectTextFromNode(part, arr, visitedInner));
    }
  }
  const text = texts.join('\n').trim();
  return text ? { role: 'assistant', text } : null;
}

/**
 * From mapping object (id -> index), collect all assistant message texts in order.
 * @param {Array} arr
 * @param {Record<string, number>} mapping
 * @returns {{ title: string; messages: Array<{ role: string; content: string }> }}
 */
function extractMessagesFromMapping(arr, mapping) {
  const visited = new Set();
  const messages = [];
  const seenText = new Set();
  const indices = Object.values(mapping).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  for (const idx of indices) {
    const msg = getMessageRoleAndText(arr, idx, visited);
    if (msg && msg.text && !seenText.has(msg.text)) {
      seenText.add(msg.text);
      messages.push({ role: msg.role, content: msg.text });
    }
  }
  return messages;
}

/**
 * Fetch ChatGPT share page and extract conversation title + assistant message texts.
 * @param {string} shareUrl - https://chatgpt.com/share/<id>
 * @returns {Promise<{ title: string; messages: Array<{ role: string; content: string }> }>}
 */
async function parseSharePage(shareUrl) {
  let parsedForLog = null;
  try {
    parsedForLog = new URL(typeof shareUrl === 'string' ? shareUrl.trim() : '');
  } catch {
    parsedForLog = null;
  }
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'F', location: 'parseSharePage.js:entry', message: 'parseSharePage entry metadata', data: { shareUrlLen: typeof shareUrl === 'string' ? shareUrl.trim().length : 0, protocol: parsedForLog?.protocol || '', hostname: parsedForLog?.hostname || '', pathStartsWithShare: !!parsedForLog?.pathname?.startsWith('/share/') }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  const validation = validateShareUrl(shareUrl);
  if (!validation.valid) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'F', location: 'parseSharePage.js:validation-fail', message: 'share URL validation failed', data: { validationError: validation.error || '', protocol: parsedForLog?.protocol || '', hostname: parsedForLog?.hostname || '', pathStartsWithShare: !!parsedForLog?.pathname?.startsWith('/share/') }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    throw new Error(validation.error);
  }
  const url = shareUrl.trim();
  let html;
  try {
    const res = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: (status) => status === 200,
    });
    html = res.data;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'A', location: 'parseSharePage.js:fetch', message: 'after fetch', data: { status: res.status, htmlLength: (html && typeof html === 'string') ? html.length : 0 }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'A', location: 'parseSharePage.js:fetch-catch', message: 'fetch error', data: { isAxios: !!axios.isAxiosError(err), code: (err && err.code) || '', status: (err && err.response && err.response.status) || '', errMessage: (err && err.message) ? String(err.message).slice(0, 200) : '' }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Share link request timed out.');
      }
      if (err.response?.status === 404) throw new Error('Share link not found or expired.');
      if (err.response?.status) throw new Error(`Share link returned ${err.response.status}.`);
    }
    throw new Error('Could not load share link.');
  }
  if (!html || typeof html !== 'string') {
    throw new Error('Empty response from share link.');
  }
  const scriptMatch = html.match(/<script[^>]*nonce="[^"]*"[^>]*>([\s\S]*?)<\/script>/gi);
  let payloadString = null;
  let matchedScriptCount = 0;
  let enqueueChunkCount = 0;
  const payloadCandidates = [];
  for (const tag of scriptMatch || []) {
    if (tag.includes('serverResponse') && tag.includes('mapping')) {
      matchedScriptCount += 1;
      const inner = tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      const chunks = extractEnqueuePayloads(inner);
      enqueueChunkCount += chunks.length;
      if (chunks.length > 0) {
        const joined = chunks.join('');
        if (joined) payloadCandidates.push(joined);
        payloadCandidates.push(...chunks);
      } else {
        const legacyPayload = extractEnqueuePayload(inner);
        if (legacyPayload) payloadCandidates.push(legacyPayload);
      }
    }
  }
  const uniquePayloadCandidates = [
    ...new Set(
      payloadCandidates
        .filter((candidate) => typeof candidate === 'string')
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length > 0),
    ),
  ].sort((a, b) => b.length - a.length);
  payloadString = uniquePayloadCandidates[0] || null;
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'B', location: 'parseSharePage.js:payload', message: 'after extract payload', data: { hasPayloadString: !!payloadString, payloadStringLen: payloadString ? payloadString.length : 0, payloadCandidateCount: uniquePayloadCandidates.length, enqueueChunkCount, scriptMatchCount: (scriptMatch && scriptMatch.length) || 0 }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  const trimmedPayload = payloadString ? payloadString.trim() : '';
  let arr;
  let parseStrategy = 'none';
  for (let i = 0; i < uniquePayloadCandidates.length; i += 1) {
    const parsed = parseSerializedConversationArray(uniquePayloadCandidates[i]);
    if (parsed) {
      arr = parsed.arr;
      payloadString = uniquePayloadCandidates[i];
      parseStrategy = `${parsed.strategy}:candidate-${i}`;
      break;
    }
  }
  // #region agent log
  logger.error(`[POST /api/recipes/import/chatgpt-share/preview][parse-debug] scriptTotal=${(scriptMatch && scriptMatch.length) || 0} matchedScripts=${matchedScriptCount} enqueueChunkCount=${enqueueChunkCount} payloadCandidates=${uniquePayloadCandidates.length} payloadLen=${payloadString ? payloadString.length : 0} startsWithBracket=${trimmedPayload.startsWith('[')} startsWithBrace=${trimmedPayload.startsWith('{')} startsWithQuote=${trimmedPayload.startsWith('"')} endsWithBracket=${trimmedPayload.endsWith(']')} endsWithBrace=${trimmedPayload.endsWith('}')} parseStrategy=${parseStrategy}`);
  // #endregion
  if (!payloadString) {
    throw new Error('Could not read conversation data from share link.');
  }
  if (!arr) {
    const firstCandidate = uniquePayloadCandidates[0] || '';
    const firstCandidateTrimmed = firstCandidate.trim();
    // #region agent log
    logger.error(`[POST /api/recipes/import/chatgpt-share/preview][parse-debug] json-parse-failed candidateCount=${uniquePayloadCandidates.length} firstCandidateLen=${firstCandidate.length} firstChar=${firstCandidateTrimmed.slice(0, 1) || 'n/a'} secondChar=${firstCandidateTrimmed.slice(1, 2) || 'n/a'} hasEscapedQuote=${firstCandidate.includes('\\"')} hasDoubleSlash=${firstCandidate.includes('\\\\')} hasNewline=${firstCandidate.includes('\n')}`);
    // #endregion
    throw new Error('Invalid conversation data from share link.');
  }
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'C', location: 'parseSharePage.js:parse', message: 'after JSON.parse', data: { isArray: Array.isArray(arr), arrLength: Array.isArray(arr) ? arr.length : 0 }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  if (!Array.isArray(arr)) {
    throw new Error('Unexpected conversation format.');
  }
  const { title, mapping } = findTitleAndMapping(arr);
  if (!mapping || typeof mapping !== 'object') {
    throw new Error('No conversation mapping in share link.');
  }
  let messages = extractMessagesFromMapping(arr, mapping);
  if (messages.length === 0 && payloadString.length > 100) {
    messages = extractMessagesFromPayloadFallback(payloadString);
  }
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'D', location: 'parseSharePage.js:exit', message: 'parseSharePage return', data: { messagesLength: messages.length, titleLen: (title && title.length) || 0 }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  return {
    title: title || 'Shared conversation',
    messages,
  };
}

/**
 * Fallback: extract long quoted strings that look like recipe content (contain ingredients).
 * @param {string} payloadString
 * @returns {Array<{ role: string; content: string }>}
 */
function extractMessagesFromPayloadFallback(payloadString) {
  const messages = [];
  const regex = /"(?:[^"\\]|\\.)*ingr[eé]dients?(?:[^"\\]|\\.){20,}"/gi;
  let m;
  while ((m = regex.exec(payloadString)) !== null) {
    const raw = m[0];
    const unescaped = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (unescaped.length > 80) {
      messages.push({ role: 'assistant', content: unescaped });
    }
  }
  return messages;
}

module.exports = {
  validateShareUrl,
  parseSharePage,
};
