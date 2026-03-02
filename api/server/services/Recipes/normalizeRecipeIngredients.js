/**
 * Normalizes recipe ingredients for storage: trims fields, optionally splits
 * trailing "state" phrases from name so we store canonical name + state.
 * Used by update_recipe tool and structureRecipeWithOpenAI. Safe fallback:
 * if uncertain, leaves name as-is and only passes through explicit state.
 */

/** Known state phrases (lowercase) to strip from end of ingredient name when state not provided. Longest first. */
const STATE_PHRASES = [
  'bien froid',
  'bien froide',
  'bien mou',
  'bien molle',
  'à température ambiante',
  'a temperature ambiante',
  'finement haché',
  'finement hachée',
  'finement coupé',
  'finement coupée',
  'en petits dés',
  'en dés',
  'en cubes',
  'fondu',
  'fondue',
  'mou',
  'molle',
  'froid',
  'froide',
  'râpé',
  'râpe',
  'rapé',
  'rape',
  'haché',
  'hachée',
  'coupé',
  'coupée',
  'émincé',
  'emince',
  'émincée',
  'emincee',
  'mixé',
  'mixée',
  'mixer',
  'lavé',
  'lavée',
  'lavé et séché',
  'lavé et seché',
  'séché',
  'seché',
  'séchée',
  'sechee',
  'tiède',
  'tiede',
  'chaud',
  'chaude',
  'réduit en purée',
  'reduit en puree',
  'en purée',
  'en puree',
  'en tranches',
  'en lamelles',
  'en rondelles',
  'en julienne',
  'en morceaux',
  'écrasé',
  'ecrase',
  'écrasée',
  'ecrasee',
  'tamisé',
  'tamise',
  'tamisée',
  'tamisee',
  'ramolli',
  'ramollie',
  'confit',
  'confite',
  'poché',
  'poche',
  'pochée',
  'pochee',
  'grillé',
  'grille',
  'grillée',
  'grillee',
  'rôti',
  'roti',
  'rôtie',
  'rotie',
  'frit',
  'frite',
  'cru',
  'crue',
  'cuit',
  'cuite',
  'frais',
  'fraîche',
  'fraiche',
  'fraîches',
  'fraiches',
  'mûr',
  'mur',
  'mûre',
  'mure',
  'pelé',
  'pele',
  'pelée',
  'pelee',
  'décongelé',
  'decongele',
  'décongelée',
  'decongelee',
  'noir',
  'noire',
  'blanc',
  'blanche',
  'extra noir',
  'extra noire',
];

/**
 * Try to infer state from end of name (e.g. "beurre fondu" -> name "beurre", state "fondu").
 * Returns { name, state } or { name } if no match. Does not mutate if phrase not found.
 * @param {string} name - Trimmed ingredient name
 * @returns {{ name: string, state?: string }}
 */
function trySplitStateFromName(name) {
  if (!name || typeof name !== 'string') {
    return { name: name || '' };
  }
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  for (const phrase of STATE_PHRASES) {
    if (phrase.length >= 2 && lower.endsWith(' ' + phrase)) {
      const canonicalName = trimmed.slice(0, -(phrase.length + 1)).trim();
      if (canonicalName.length >= 2) {
        const stateValue = trimmed.slice(-phrase.length);
        return { name: canonicalName, state: stateValue };
      }
    }
  }
  return { name: trimmed };
}

/**
 * Normalize a single raw ingredient for DB: trim fields, optional state split.
 * @param {object} raw - { name, quantity?, unit?, note?, section?, state? }
 * @returns {{ name: string, quantity?: number, unit?: string, note?: string, section?: string, state?: string }}
 */
function normalizeOne(raw) {
  const name = raw && typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    return null;
  }
  let canonicalName = name;
  let state =
    raw.state != null && String(raw.state).trim() !== ''
      ? String(raw.state).trim()
      : undefined;

  if (!state) {
    const split = trySplitStateFromName(name);
    canonicalName = split.name;
    if (split.state) state = split.state;
  }

  const quantity =
    typeof raw.quantity === 'number' && Number.isFinite(raw.quantity)
      ? raw.quantity
      : undefined;
  const unit = raw.unit != null ? String(raw.unit).trim() : undefined;
  const note = raw.note != null ? String(raw.note).trim() : undefined;
  const section = raw.section != null ? String(raw.section).trim() : undefined;

  const out = {
    name: canonicalName,
    ...(quantity !== undefined && { quantity }),
    ...(unit && { unit }),
    ...(note && { note }),
    ...(section && { section }),
    ...(state && { state }),
  };
  return out;
}

/**
 * Normalize an array of ingredients for recipe storage.
 * @param {object[]} ingredients - Raw ingredients from LLM or API
 * @returns {object[]} Normalized ingredients (name, quantity?, unit?, note?, section?, state?)
 */
function normalizeRecipeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) {
    return [];
  }
  return ingredients
    .map((i) => normalizeOne(i))
    .filter(Boolean);
}

module.exports = {
  normalizeRecipeIngredients,
  normalizeOne,
  trySplitStateFromName,
};
