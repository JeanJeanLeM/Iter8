/**
 * Fetches a ChatGPT shared conversation page and extracts assistant message texts.
 * Only allows https://chatgpt.com/share/<id>. Used for recipe import preview.
 */
const axios = require('axios');

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
 * Normalize various timestamp formats to ISO string.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeTimestamp(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value < 1e12 ? value * 1000 : value;
    const d = new Date(millis);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return normalizeTimestamp(Number(trimmed));
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Check if a node (by index) represents a user/assistant message and return its text.
 * @param {Array} arr
 * @param {number} nodeIndex
 * @param {Set<number>} visited
 * @returns {{ role: 'assistant' | 'user'; text: string; createdAt: string | null; nodeIndex: number } | null}
 */
function getMessageFromNode(arr, nodeIndex, visited) {
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
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  if (normalizedRole !== 'assistant' && normalizedRole !== 'user') return null;
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
  if (!text) return null;

  const createTimeRaw =
    obj.create_time ??
    obj.createTime ??
    obj.created_at ??
    obj.createdAt ??
    obj.timestamp ??
    obj.time;
  const resolvedCreateTime =
    typeof createTimeRaw === 'number' && Number.isInteger(createTimeRaw) && createTimeRaw >= 0 && createTimeRaw < arr.length
      ? getNode(arr, createTimeRaw)
      : createTimeRaw;
  const createdAt = normalizeTimestamp(resolvedCreateTime);
  return { role: normalizedRole, text, createdAt, nodeIndex };
}

/**
 * From mapping object (id -> index), collect user/assistant messages in order.
 * @param {Array} arr
 * @param {Record<string, number>} mapping
 * @returns {Array<{ role: 'assistant' | 'user'; content: string; createdAt: string | null }>}
 */
function extractMessagesFromMapping(arr, mapping) {
  const visited = new Set();
  const messages = [];
  const seenText = new Set();
  const indices = Object.values(mapping).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  for (const idx of indices) {
    const msg = getMessageFromNode(arr, idx, visited);
    if (msg && msg.text) {
      const dedupKey = `${msg.role}|${msg.text}`;
      if (seenText.has(dedupKey)) continue;
      seenText.add(dedupKey);
      messages.push({ role: msg.role, content: msg.text, createdAt: msg.createdAt });
    }
  }
  return messages;
}

/**
 * Fallback when mapping is missing: scan full serialized array and recover message nodes.
 * @param {Array} arr
 * @returns {Array<{ role: 'assistant' | 'user'; content: string; createdAt: string | null }>}
 */
function extractMessagesFromArrayScan(arr) {
  const collected = [];
  const seen = new Set();
  for (let i = 0; i < arr.length; i += 1) {
    const msg = getMessageFromNode(arr, i, new Set());
    if (!msg || !msg.text) continue;
    const dedupKey = `${msg.role}|${msg.text}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    collected.push(msg);
  }
  collected.sort((a, b) => a.nodeIndex - b.nodeIndex);
  return collected.map((m) => ({ role: m.role, content: m.text, createdAt: m.createdAt }));
}

/**
 * Fetch ChatGPT share page and extract conversation title + message timeline.
 * @param {string} shareUrl - https://chatgpt.com/share/<id>
 * @returns {Promise<{ title: string; messages: Array<{ role: 'assistant' | 'user'; content: string; createdAt: string | null; inferredUserResponse?: string | null }> }>}
 */
async function parseSharePage(shareUrl) {
  const validation = validateShareUrl(shareUrl);
  if (!validation.valid) {
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
  } catch (err) {
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
  const payloadCandidates = [];
  for (const tag of scriptMatch || []) {
    if (tag.includes('serverResponse') && tag.includes('mapping')) {
      const inner = tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      const chunks = extractEnqueuePayloads(inner);
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
  let arr;
  for (let i = 0; i < uniquePayloadCandidates.length; i += 1) {
    const parsed = parseSerializedConversationArray(uniquePayloadCandidates[i]);
    if (parsed) {
      arr = parsed.arr;
      payloadString = uniquePayloadCandidates[i];
      break;
    }
  }
  if (!payloadString) {
    throw new Error('Could not read conversation data from share link.');
  }
  if (!arr) {
    throw new Error('Invalid conversation data from share link.');
  }
  if (!Array.isArray(arr)) {
    throw new Error('Unexpected conversation format.');
  }
  const { title, mapping } = findTitleAndMapping(arr);
  let messages = mapping && typeof mapping === 'object' ? extractMessagesFromMapping(arr, mapping) : [];
  if (messages.length === 0) {
    messages = extractMessagesFromArrayScan(arr);
  }
  if (messages.length === 0 && payloadString.length > 100) {
    messages = extractMessagesFromPayloadFallback(payloadString);
  }
  const hasAssistantMessage = messages.some(
    (m) => m?.role === 'assistant' && typeof m?.content === 'string' && m.content.trim().length > 0,
  );
  if (!hasAssistantMessage) {
    throw new Error('No assistant messages in share link.');
  }
  return {
    title: title || 'Shared conversation',
    messages,
  };
}

/**
 * Fallback: extract long quoted strings that look like recipe content (contain ingredients).
 * @param {string} payloadString
 * @returns {Array<{ role: 'assistant'; content: string; createdAt: string | null; inferredUserResponse: string | null }>}
 */
function extractMessagesFromPayloadFallback(payloadString) {
  const messages = [];
  const regex = /"(?:[^"\\]|\\.)*ingr[eé]dients?(?:[^"\\]|\\.){20,}"/gi;
  let m;
  while ((m = regex.exec(payloadString)) !== null) {
    const raw = m[0];
    const unescaped = raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (unescaped.length > 80) {
      messages.push({
        role: 'assistant',
        content: unescaped,
        createdAt: inferFallbackTimestamp(payloadString, m.index),
        inferredUserResponse: inferFallbackUserResponse(payloadString, m.index),
      });
    }
  }
  return messages;
}

/**
 * Try to infer a nearby timestamp around a fallback match.
 * @param {string} payloadString
 * @param {number} matchIndex
 * @returns {string | null}
 */
function inferFallbackTimestamp(payloadString, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 3000);
  const window = payloadString.slice(windowStart, matchIndex + 250);
  const regex =
    /(?:create[_-]?time|created[_-]?at|timestamp)\s*"?\s*[:=]\s*"?(\d{10,13}(?:\.\d+)?|20\d{2}-\d{2}-\d{2}T[^"\\\s,}]+)/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(window)) !== null) {
    if (m[1]) matches.push(m[1]);
  }
  if (matches.length > 0) {
    return normalizeTimestamp(matches[matches.length - 1]);
  }
  // Last-resort fallback: grab nearest 10-13 digit number near the message block.
  const generic = window.match(/\b\d{10,13}\b/g);
  if (!generic || generic.length === 0) return null;
  return normalizeTimestamp(generic[generic.length - 1]);
}

/**
 * Try to infer previous user response text around a fallback match.
 * @param {string} payloadString
 * @param {number} matchIndex
 * @returns {string | null}
 */
function inferFallbackUserResponse(payloadString, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 5000);
  const window = payloadString.slice(windowStart, matchIndex);
  const regex = /"((?:[^"\\]|\\.){12,260})"/g;
  const candidates = [];
  let m;
  while ((m = regex.exec(window)) !== null) {
    const raw = m[1];
    const unescaped = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\s+/g, ' ').trim();
    if (!unescaped) continue;
    candidates.push(unescaped);
  }
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const text = candidates[i];
    if (/\bingr[eé]dients?\b/i.test(text)) continue;
    if (text.length < 12) continue;
    if (/\?|plus|sans|avec|modifi|change|version|moelleux|cuisson|temps|can you|please|make/i.test(text)) {
      return text.length > 280 ? `${text.slice(0, 280)}…` : text;
    }
  }
  return null;
}

module.exports = {
  validateShareUrl,
  parseSharePage,
};
