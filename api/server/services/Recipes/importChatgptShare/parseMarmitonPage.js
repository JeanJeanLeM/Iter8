const axios = require('axios');

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (compatible; CookIterate/1.0; +https://github.com)';
const MARMITON_HOSTS = new Set(['marmiton.org', 'www.marmiton.org']);

function decodeHtmlEntities(input) {
  if (!input) return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&eacute;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&agrave;/gi, 'à')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&deg;/gi, '°');
}

function normalizeLine(line) {
  return decodeHtmlEntities(String(line || ''))
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function normalizeTimestamp(value) {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function validateMarmitonUrl(url) {
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
  const host = parsed.hostname.toLowerCase();
  if (!MARMITON_HOSTS.has(host)) {
    return { valid: false, error: 'Only marmiton.org recipe links are supported.' };
  }
  if (!/^\/recettes\/recette_/i.test(parsed.pathname)) {
    return { valid: false, error: 'URL must be a Marmiton recipe link (/recettes/recette_...).'};
  }
  return { valid: true };
}

function htmlToLines(html) {
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '\n')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|section|article|ul|ol|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n');
  const lines = text.split('\n').map(normalizeLine).filter((line) => line.length > 0);
  const deduped = [];
  for (const line of lines) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
      deduped.push(line);
    }
  }
  return deduped;
}

function extractTitle(html, lines) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1 && h1[1]) {
    const title = normalizeLine(h1[1].replace(/<[^>]+>/g, ' '));
    if (title) return title;
  }
  const fallback = lines.find((line) => line.length > 5 && !/^accueil$/i.test(line));
  return fallback || 'Recette Marmiton';
}

function getSection(lines, startMatcher, endMatchers) {
  const start = lines.findIndex((line) => startMatcher.test(line));
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (endMatchers.some((matcher) => matcher.test(lines[i]))) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function extractIngredients(lines) {
  const raw = getSection(lines, /^ingr[eé]dients?$/i, [/^ustensiles$/i, /^pr[eé]paration$/i, /^temps total/i]);
  const cleaned = raw
    .map(normalizeLine)
    .filter(
      (line) =>
        line.length > 1 &&
        !/^voir plus/i.test(line) &&
        !/^en cliquant/i.test(line) &&
        !/^copier le lien/i.test(line) &&
        !/^partager la recette/i.test(line),
    );
  const unique = [];
  const seen = new Set();
  for (const line of cleaned) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  return unique;
}

function extractSteps(lines) {
  const prepSection = getSection(lines, /^pr[eé]paration$/i, [
    /^qu['’]est-ce qu['’]on mange ce soir/i,
    /^vous aimerez aussi/i,
    /^commentaires/i,
    /^plus de recettes/i,
  ]);
  const steps = [];
  for (let i = 0; i < prepSection.length; i += 1) {
    if (!/^([eé]tape)\s*\d+/i.test(prepSection[i])) continue;
    const stepLines = [];
    for (let j = i + 1; j < prepSection.length; j += 1) {
      if (/^([eé]tape)\s*\d+/i.test(prepSection[j])) {
        i = j - 1;
        break;
      }
      if (/^(temps total|pr[eé]paration|cuisson|repos)\s*:?\s*$/i.test(prepSection[j])) continue;
      stepLines.push(prepSection[j]);
      if (j === prepSection.length - 1) {
        i = j;
      }
    }
    const step = normalizeLine(stepLines.join(' '));
    if (step) steps.push(step);
  }
  return steps;
}

function parseMarmitonHtml(html) {
  const structured = extractStructuredRecipeData(html);
  const lines = htmlToLines(html);
  const title = structured?.title || extractTitle(html, lines);
  const ingredients = structured?.ingredients || extractIngredients(lines);
  const steps = structured?.steps || extractSteps(lines);
  const recipeDate = structured?.recipeDate || null;
  if (!title || ingredients.length < 2 || steps.length < 1) {
    throw new Error('Could not parse Marmiton recipe content.');
  }
  const recipeText = [
    title,
    '',
    'Ingrédients :',
    ...ingredients.map((i) => `- ${i}`),
    '',
    'Préparation :',
    ...steps.map((s, idx) => `${idx + 1}. ${s}`),
  ].join('\n');

  return {
    title,
    recipeText,
    ingredients,
    steps,
    recipeDate,
  };
}

function extractStructuredRecipeData(html) {
  const ingredientMatch = html.match(/"recipeIngredient"\s*:\s*(\[[\s\S]*?\])/i);
  const instructionsMatch = html.match(/"recipeInstructions"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/i);
  if (!ingredientMatch || !instructionsMatch) return null;
  try {
    const ingredientArr = JSON.parse(ingredientMatch[1]);
    const instructionsArr = JSON.parse(instructionsMatch[1]);
    const ingredientIdx = html.indexOf(ingredientMatch[0]);
    const contextStart = Math.max(0, ingredientIdx - 5000);
    const context = html.slice(contextStart, ingredientIdx + 200);
    const nameMatches = [...context.matchAll(/"name"\s*:\s*"([^"]+)"/gi)];
    const dateMatches = [...context.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)];
    const rawTitle = nameMatches.length > 0 ? nameMatches[nameMatches.length - 1][1] : '';
    const rawDate = dateMatches.length > 0 ? dateMatches[dateMatches.length - 1][1] : '';
    const title = rawTitle ? normalizeLine(JSON.parse(`"${rawTitle}"`)) : '';
    const recipeDate = rawDate ? normalizeTimestamp(JSON.parse(`"${rawDate}"`)) : null;
    const ingredients = Array.isArray(ingredientArr)
      ? ingredientArr.map(normalizeLine).filter(Boolean)
      : [];
    const steps = Array.isArray(instructionsArr)
      ? instructionsArr
          .map((step) => {
            if (typeof step === 'string') return normalizeLine(step);
            if (!step || typeof step !== 'object') return '';
            return normalizeLine(step.text || step.name || '');
          })
          .filter(Boolean)
      : [];
    if (!title || ingredients.length < 2 || steps.length < 1) return null;
    return { title, ingredients, steps, recipeDate };
  } catch {
    return null;
  }
}

async function parseMarmitonPage(url) {
  const validation = validateMarmitonUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  let html;
  try {
    const res = await axios.get(url.trim(), {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: (status) => status === 200,
    });
    html = res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Marmiton recipe request timed out.');
      }
      if (err.response?.status === 404) throw new Error('Marmiton recipe not found.');
      if (err.response?.status) throw new Error(`Marmiton recipe returned ${err.response.status}.`);
    }
    throw new Error('Could not load Marmiton recipe.');
  }
  if (!html || typeof html !== 'string') {
    throw new Error('Empty response from Marmiton recipe.');
  }
  const parsed = parseMarmitonHtml(html);
  return {
    title: parsed.title,
    recipeText: parsed.recipeText,
    recipeDate: parsed.recipeDate,
    userResponse: null,
  };
}

module.exports = {
  validateMarmitonUrl,
  parseMarmitonHtml,
  parseMarmitonPage,
};
