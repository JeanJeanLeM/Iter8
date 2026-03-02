/**
 * Detects recipe candidates from assistant message texts.
 * Heuristic: assistant messages containing ingredients keyword variants.
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
const USER_RESPONSE_MAX_LEN = 280;
const TITLE_PATTERNS = [
  /\b(?:recette|recipe)\b(?:\s+(?:de|du|des|d'|d’|for|of))?\s+([^\n.!?:;,()\-–—]{3,120})/i,
  /\b(?:fa[cç]on|style)\s+([^\n.!?:;,()\-–—]{3,120})/i,
];
const USER_RESPONSE_INFERENCE_PATTERNS = [
  /\b(?:tu|vous)\s+(?:veux|voulez|souhaites|souhaitez)\s+([^.!?\n]{6,180})/i,
  /\b(?:tu|vous)\s+as\s+demand[ée]\s+([^.!?\n]{6,180})/i,
  /\b(?:you)\s+(?:want|asked)\s+([^.!?\n]{6,180})/i,
];

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
  for (const pattern of TITLE_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const explicit = cleanRecipeTitle(m[1]);
      if (explicit) {
        return explicit.length > TITLE_FALLBACK_MAX_LEN
          ? `${explicit.slice(0, TITLE_FALLBACK_MAX_LEN)}…`
          : explicit;
      }
    }
  }

  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = cleanRecipeTitle(line);
    if (cleaned.length < 3) continue;
    if (INGREDIENTS_HEADERS.some((re) => re.test(cleaned))) continue;
    const truncated = cleaned.length > TITLE_FALLBACK_MAX_LEN ? cleaned.slice(0, TITLE_FALLBACK_MAX_LEN) + '…' : cleaned;
    return truncated;
  }
  return 'Sans titre';
}

/**
 * Clean and normalize a title candidate by removing chatty prefixes and markdown wrappers.
 * @param {string} value
 * @returns {string}
 */
function cleanRecipeTitle(value) {
  if (!value || typeof value !== 'string') return '';
  let out = value
    .replace(/\\n+/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/#+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  out = out.replace(/^(?:bien\s+s[ûu]r|parfait|super|g[eé]nial|voici|ok(?:ay)?|d['’]accord)\s*[!,:-]?\s*/i, '');
  out = out.replace(/^(?:une?\s+)?(?:recette|recipe)\s+(?:de|du|des|d'|d’|for|of)\s+/i, '');
  out = out.replace(/^(?:une?\s+)?(?:recette|recipe)\s+/i, '');
  const beforeVoici = out.split(/\bvoici\b/i)[0].trim();
  if (beforeVoici) out = beforeVoici;
  out = out.replace(/^[^A-Za-zÀ-ÿ0-9]+/, '');
  out = out.replace(/[.!?:;,\-–—\s]+$/, '').trim();
  return out;
}

/**
 * Heuristic: title is probably chatty, not a recipe name.
 * @param {string} title
 * @returns {boolean}
 */
function isLikelyChattyTitle(title) {
  if (!title || typeof title !== 'string') return true;
  return /^(bien\s+s[ûu]r|parfait|voici|excellente question|tu veux|you want|great|sure|ok)/i.test(title.trim());
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
 * Find the previous non-empty user message before an assistant message.
 * @param {Array<{ role: string; content: string }>} messages
 * @param {number} assistantMessageIndex
 * @returns {string | null}
 */
function findPreviousUserResponse(messages, assistantMessageIndex) {
  for (let i = assistantMessageIndex - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role !== 'user' || typeof m?.content !== 'string') continue;
    const normalized = m.content.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    return normalized.length > USER_RESPONSE_MAX_LEN
      ? `${normalized.slice(0, USER_RESPONSE_MAX_LEN)}…`
      : normalized;
  }
  return null;
}

/**
 * Infer user intent from assistant wording when no explicit user message is available.
 * @param {string} assistantText
 * @returns {string | null}
 */
function inferUserResponseFromAssistant(assistantText) {
  if (!assistantText || typeof assistantText !== 'string') return null;
  for (const pattern of USER_RESPONSE_INFERENCE_PATTERNS) {
    const m = assistantText.match(pattern);
    if (m && m[1]) {
      const normalized = m[1].replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      return normalized.length > USER_RESPONSE_MAX_LEN
        ? `${normalized.slice(0, USER_RESPONSE_MAX_LEN)}…`
        : normalized;
    }
  }
  return null;
}

/**
 * Normalize ISO-like date string, return null if invalid.
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeDate(value) {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Detect recipe candidates from a list of assistant message texts.
 * @param {Array<{ role: string; content: string; createdAt?: string | null; inferredUserResponse?: string | null }>} messages
 * @returns {Array<{ index: number; title: string; rawText: string; recipeDate: string | null; userResponse: string | null }>}
 */
function detectRecipes(messages) {
  const candidates = [];
  messages.forEach((message, index) => {
    if (message?.role !== 'assistant' || typeof message?.content !== 'string') return;
    const text = message.content;
    const hasKeyword = hasIngredientsKeyword(text);
    const { hasSection, bulletCount } = findIngredientsSection(text);
    const longEnough = text.trim().length >= MIN_RECIPE_MESSAGE_LEN;
    // Accept candidates message-by-message when ingredient keyword variants are present.
    if (!hasKeyword || (!longEnough && bulletCount < 1)) return;
    let title = extractTitle(text);
    if (isLikelyChattyTitle(title) && candidates.length > 0) {
      title = candidates[candidates.length - 1].title;
    }
    const userResponse =
      findPreviousUserResponse(messages, index) ||
      (typeof message.inferredUserResponse === 'string' ? message.inferredUserResponse : null) ||
      inferUserResponseFromAssistant(text);
    candidates.push({
      index,
      title,
      rawText: text,
      recipeDate: normalizeDate(message.createdAt),
      userResponse,
    });
  });
  const deduped = deduplicateCandidates(candidates);
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
  cleanRecipeTitle,
  isLikelyChattyTitle,
  findPreviousUserResponse,
  inferUserResponseFromAssistant,
};
