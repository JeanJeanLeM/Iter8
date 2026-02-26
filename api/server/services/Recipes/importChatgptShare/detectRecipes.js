/**
 * Detects recipe candidates from assistant message texts.
 * Heuristic: section "ingrédients" (or "ingredients") with at least 3 bullet/numbered lines.
 */
const { logger } = require('@librechat/data-schemas');

const INGREDIENTS_HEADERS = [
  /ingr[eé]dients?\s*:?\s*$/im,
  /^ingr[eé]dients?\s*:?\s*$/im,
  /[\n\r]\s*ingr[eé]dients?\s*:?\s*[\n\r]/im,
];
const INGREDIENTS_KEYWORDS = [
  /\bingr[eé]dients?\b/i,
  /\bingredients?\b/i,
  /\bindgredients?\b/i,
  /\bingrediants?\b/i,
  /\bingridiants?\b/i,
];
const BULLET_OR_NUMBER = /^\s*[-*•·]\s+|\d+[.)]\s+/m;
const MIN_BULLET_LINES = 3;
const MIN_INGREDIENT_LINES = 3;
const TITLE_FALLBACK_MAX_LEN = 80;
const MIN_RECIPE_MESSAGE_LEN = 120;

/**
 * Count lines that look like list items (bullet or number) in a block of text.
 * @param {string} block
 * @returns {number}
 */
function countBulletLines(block) {
  const lines = block.split(/\r?\n/).filter((s) => s.trim().length > 0);
  let count = 0;
  for (const line of lines) {
    if (BULLET_OR_NUMBER.test(line) || /^\s*[-*•·]\s+/.test(line)) count++;
  }
  return count;
}

/**
 * Check if text has an "ingredients" section with enough list lines.
 * @param {string} text
 * @returns {{ hasSection: boolean; bulletCount: number; sectionStart: number }}
 */
function findIngredientsSection(text) {
  if (!text || typeof text !== 'string') return { hasSection: false, bulletCount: 0, sectionStart: -1 };
  const lower = text.toLowerCase();
  let sectionStart = -1;
  for (const re of INGREDIENTS_HEADERS) {
    const m = text.match(re);
    if (m && m.index != null) {
      const start = m.index + m[0].length;
      if (sectionStart === -1 || start < sectionStart) sectionStart = start;
    }
  }
  if (sectionStart === -1) {
    if (hasIngredientsKeyword(text)) {
      const keywordCandidates = [
        lower.indexOf('ingrédient'),
        lower.indexOf('ingredients'),
        lower.indexOf('ingredient'),
        lower.indexOf('indgredient'),
        lower.indexOf('ingrediant'),
        lower.indexOf('ingridiant'),
      ].filter((v) => v >= 0);
      sectionStart = keywordCandidates.length > 0 ? Math.min(...keywordCandidates) : 0;
    } else {
      return { hasSection: false, bulletCount: 0, sectionStart: -1 };
    }
  }
  const afterHeader = text.slice(sectionStart);
  const bulletCount = countBulletLines(afterHeader);
  const hasSection = bulletCount >= MIN_INGREDIENT_LINES;
  return { hasSection, bulletCount, sectionStart };
}

/**
 * Check if text contains an ingredients keyword variant in FR/EN.
 * Includes common misspellings seen in user-provided content.
 * @param {string} text
 * @returns {boolean}
 */
function hasIngredientsKeyword(text) {
  if (!text || typeof text !== 'string') return false;
  return INGREDIENTS_KEYWORDS.some((re) => re.test(text));
}

/**
 * Extract a short title from the start of the text (first non-empty line or first sentence).
 * @param {string} text
 * @returns {string}
 */
function extractTitle(text) {
  if (!text || typeof text !== 'string') return 'Sans titre';
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 3) continue;
    if (INGREDIENTS_HEADERS.some((re) => re.test(line))) continue;
    const truncated = line.length > TITLE_FALLBACK_MAX_LEN ? line.slice(0, TITLE_FALLBACK_MAX_LEN) + '…' : line;
    return truncated;
  }
  return 'Sans titre';
}

/**
 * Deduplicate candidates by normalized title + first 200 chars of content.
 * @param {Array<{ index: number; title: string; rawText: string }>} candidates
 * @returns {Array<{ index: number; title: string; rawText: string }>}
 */
function deduplicateCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    const key = `${(c.title || '').trim().toLowerCase()}|${(c.rawText || '').slice(0, 200)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Detect recipe candidates from a list of assistant message texts.
 * @param {Array<{ role: string; content: string }>} messages
 * @returns {Array<{ index: number; title: string; rawText: string }>}
 */
function detectRecipes(messages) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'H1', location: 'detectRecipes.js:entry', message: 'detectRecipes entry', data: { messageCount: Array.isArray(messages) ? messages.length : 0 }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  const candidates = [];
  const assistantTexts = messages
    .filter((m) => m.role === 'assistant' && typeof m.content === 'string')
    .map((m) => m.content);
  let keywordHits = 0;
  let sectionHits = 0;
  assistantTexts.forEach((text, index) => {
    const hasKeyword = hasIngredientsKeyword(text);
    const { hasSection, bulletCount } = findIngredientsSection(text);
    if (hasKeyword) keywordHits += 1;
    if (hasSection && bulletCount >= MIN_INGREDIENT_LINES) sectionHits += 1;
    const longEnough = text.trim().length >= MIN_RECIPE_MESSAGE_LEN;
    // Accept candidates message-by-message when ingredient keyword variants are present.
    if (!hasKeyword || (!longEnough && bulletCount < 1)) return;
    const title = extractTitle(text);
    candidates.push({ index, title, rawText: text });
  });
  const deduped = deduplicateCandidates(candidates);
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'H2', location: 'detectRecipes.js:summary', message: 'detectRecipes summary', data: { assistantCount: assistantTexts.length, keywordHits, sectionHits, candidatesBeforeDedup: candidates.length, candidatesAfterDedup: deduped.length }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  if (deduped.length > 0) {
    logger.debug('[detectRecipes] Found %d recipe candidate(s) from %d message(s).', deduped.length, messages.length);
  }
  return deduped;
}

module.exports = {
  detectRecipes,
  findIngredientsSection,
  extractTitle,
  hasIngredientsKeyword,
};
