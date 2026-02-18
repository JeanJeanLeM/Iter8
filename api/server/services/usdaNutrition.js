/**
 * USDA FoodData Central Foundation Foods: load JSON, index by description, extract nutrition by nutrient.id.
 * Used to enrich Ingredient documents with energyKcal, proteinG, fatG, carbohydrateG, fiberG, nutritionMicros.
 */
const path = require('path');
const fs = require('fs');

const USDA_JSON_PATH =
  process.env.USDA_FOUNDATION_FOODS_JSON ||
  path.join(__dirname, '..', '..', '..', 'assets', 'FoodData_Central_foundation_food_json_2025-12-18.json');

const PROCESSED_INGREDIENTS_PATH =
  process.env.USDA_PROCESSED_INGREDIENTS_JSON ||
  path.join(__dirname, '..', '..', '..', 'assets', 'ingredients-processed.json');

// USDA nutrient.id -> our field names (macros + micros)
const NUTRIENT_ID_MAP = {
  1008: { key: 'energyKcal', unit: 'kcal' },
  1062: { key: 'energyKcalFromKj', unit: 'kJ' }, // convert to kcal: / 4.184
  1003: { key: 'proteinG', unit: 'g' },
  1004: { key: 'fatG', unit: 'g' },
  1005: { key: 'carbohydrateG', unit: 'g' },
  1079: { key: 'fiberG', unit: 'g' },
  1093: { key: 'sodiumMg', unit: 'mg' },
  1087: { key: 'calciumMg', unit: 'mg' },
  1090: { key: 'magnesiumMg', unit: 'mg' },
  1092: { key: 'potassiumMg', unit: 'mg' },
  1162: { key: 'vitaminCMg', unit: 'mg' },
  1106: { key: 'vitaminARaeUg', unit: 'µg' },
  1110: { key: 'vitaminDIu', unit: 'IU' },
  1177: { key: 'folateUg', unit: 'µg' },
  1175: { key: 'vitaminB12Ug', unit: 'µg' },
  1095: { key: 'zincMg', unit: 'mg' },
  1103: { key: 'seleniumUg', unit: 'µg' },
  1086: { key: 'ironMg', unit: 'mg' },
  1089: { key: 'ironMg', unit: 'mg' }, // USDA "Iron, Fe" uses id 1089
};
const MICRO_KEYS = [
  'sodiumMg', 'calciumMg', 'ironMg', 'potassiumMg', 'vitaminCMg',
  'vitaminARaeUg', 'vitaminDIu', 'folateUg', 'vitaminB12Ug', 'zincMg',
  'seleniumUg', 'magnesiumMg',
];

let cachedFoundationFoods = null;
let cachedIndexByNormalized = null;
let cachedProcessedByNormalized = null;

/** French (and common) ingredient names -> USDA English description for matching. */
const FRENCH_TO_USDA_ALIAS = {
  ail: 'Garlic, raw',
  pomme: 'Apples, raw, with skin',
  'pommes de terre': 'Potatoes, raw, skin',
  tomate: 'Tomatoes, red, ripe, raw, year round average',
  oignon: 'Onions, raw',
  carotte: 'Carrots, raw',
  poireau: 'Leeks, (bulb and lower leaf-portion), raw',
  courgette: 'Squash, summer, zucchini, includes skin, raw',
  aubergine: 'Eggplant, raw',
  poivron: 'Peppers, sweet, red, raw',
  epinard: 'Spinach, raw',
  salade: 'Lettuce, cos or romaine, raw',
  laitue: 'Lettuce, cos or romaine, raw',
  citron: 'Lemons, raw, without peel',
  'citron vert': 'Limes, raw',
  orange: 'Oranges, raw, all commercial varieties',
  'jus d\'orange': 'Orange juice, raw',
  banane: 'Bananas, raw',
  poulet: 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw',
  boeuf: 'Beef, ground, 80% lean meat / 20% fat, raw',
  porc: 'Pork, fresh, loin, whole, separable lean and fat, raw',
  saumon: 'Fish, salmon, Atlantic, wild, raw',
  oeuf: 'Egg, whole, raw, fresh',
  oeufs: 'Egg, whole, raw, fresh',
  lait: 'Milk, whole, 3.25% milkfat, with added vitamin D',
  beurre: 'Butter, salted',
  fromage: 'Cheese, cheddar',
  riz: 'Rice, white, long-grain, regular, raw, unenriched',
  pates: 'Pasta, dry, unenriched',
  farine: 'Wheat flour, white, all-purpose, enriched, bleached',
  sucre: 'Sugars, granulated',
  'huile d\'olive': 'Oil, olive, salad or cooking',
  miel: 'Honey',
  'concentre de tomates': 'Tomato products, canned, paste, without salt added',
  bouillon: 'Soup, stock, chicken, home-prepared',
  'bouillon de legumes': 'Soup, vegetable broth, ready to serve',
};

function normalizeForMatch(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenSet(str) {
  return new Set(normalizeForMatch(str).split(' ').filter(Boolean));
}

/** Simple similarity: Jaccard-like overlap of tokens (0..1). */
function tokenSimilarity(a, b) {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Load and parse the Foundation Foods JSON. Returns { FoundationFoods: [] }.
 */
function loadFoundationFoods() {
  if (cachedFoundationFoods) return cachedFoundationFoods;
  try {
    const raw = fs.readFileSync(USDA_JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.FoundationFoods)) {
      throw new Error('Invalid USDA JSON: missing FoundationFoods array');
    }
    cachedFoundationFoods = data.FoundationFoods;
    return cachedFoundationFoods;
  } catch (err) {
    throw new Error(`USDA load failed: ${err.message}`);
  }
}

/**
 * Build index: normalized description -> first matching entry (for exact lookup).
 * Also keep array for fuzzy search.
 */
function getIndex() {
  if (cachedIndexByNormalized) return { byNormalized: cachedIndexByNormalized, list: loadFoundationFoods() };
  const list = loadFoundationFoods();
  const byNormalized = new Map();
  for (const entry of list) {
    const desc = entry.description;
    if (desc) {
      const norm = normalizeForMatch(desc);
      if (norm && !byNormalized.has(norm)) byNormalized.set(norm, entry);
    }
  }
  cachedIndexByNormalized = byNormalized;
  return { byNormalized, list };
}

/**
 * Get numeric value from foodNutrient: prefer amount, then median.
 */
function getAmount(fn) {
  if (fn == null) return undefined;
  const v = fn.amount ?? fn.median;
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Extract nutrition object from one USDA Foundation Food entry.
 * Returns { energyKcal, proteinG, fatG, carbohydrateG, fiberG, nutritionMicros, usdaDescription, usdaFdcId }.
 */
function extractNutrition(usdaEntry) {
  if (!usdaEntry || !Array.isArray(usdaEntry.foodNutrients)) {
    return {};
  }
  const result = {
    energyKcal: undefined,
    proteinG: undefined,
    fatG: undefined,
    carbohydrateG: undefined,
    fiberG: undefined,
    nutritionMicros: {},
    usdaDescription: usdaEntry.description || undefined,
    usdaFdcId: usdaEntry.fdcId,
  };
  let energyKj = undefined;

  for (const fn of usdaEntry.foodNutrients) {
    const nutrient = fn?.nutrient;
    if (!nutrient || nutrient.id == null) continue;
    const mapping = NUTRIENT_ID_MAP[nutrient.id];
    if (!mapping) continue;
    const value = getAmount(fn);
    if (value === undefined) continue;

    if (mapping.key === 'energyKcal' && nutrient.unitName === 'kcal') {
      result.energyKcal = value;
    } else if (mapping.key === 'energyKcalFromKj') {
      energyKj = value;
    } else if (MICRO_KEYS.includes(mapping.key)) {
      result.nutritionMicros[mapping.key] = value;
    } else {
      result[mapping.key] = value;
    }
  }

  if (result.energyKcal == null && energyKj != null) {
    result.energyKcal = energyKj / 4.184;
  }
  if (Object.keys(result.nutritionMicros).length === 0) {
    delete result.nutritionMicros;
  }
  return result;
}

/**
 * Find best matching USDA entry for an ingredient name (e.g. "pomme", "jus d'orange").
 * 1) Exact match on normalized description
 * 2) Optional alias map (name -> usdaDescription)
 * 3) Fuzzy: best token similarity above threshold (default 0.35)
 */
function findBestMatch(ingredientName, aliasMap = null, similarityThreshold = 0.35) {
  if (!ingredientName || typeof ingredientName !== 'string') return null;
  const { byNormalized, list } = getIndex();
  const nameNorm = normalizeForMatch(ingredientName);
  const searchTerms = [nameNorm];
  if (aliasMap && aliasMap[ingredientName]) {
    searchTerms.push(normalizeForMatch(aliasMap[ingredientName]));
  }
  if (aliasMap && aliasMap[nameNorm]) {
    searchTerms.push(normalizeForMatch(aliasMap[nameNorm]));
  }
  for (const term of searchTerms) {
    if (byNormalized.has(term)) return byNormalized.get(term);
  }
  let best = null;
  let bestScore = similarityThreshold;
  for (const entry of list) {
    const desc = entry.description;
    if (!desc) continue;
    const score = tokenSimilarity(ingredientName, desc);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

/**
 * Load ingredients-processed.json and index by normalized name. Returns Map(normalizedName -> item).
 */
function getProcessedIndex() {
  if (cachedProcessedByNormalized) return cachedProcessedByNormalized;
  try {
    if (!fs.existsSync(PROCESSED_INGREDIENTS_PATH)) return new Map();
    const raw = fs.readFileSync(PROCESSED_INGREDIENTS_PATH, 'utf8');
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return new Map();
    const byNorm = new Map();
    for (const item of list) {
      if (item && item.name != null) {
        const norm = normalizeForMatch(String(item.name).trim());
        if (norm) byNorm.set(norm, item);
      }
    }
    cachedProcessedByNormalized = byNorm;
    return byNorm;
  } catch (_) {
    return new Map();
  }
}

/**
 * Get nutrition update payload from ingredients-processed.json by ingredient name (e.g. "yaourt").
 * Returns same shape as extractNutrition for Ingredient update, or null if not found.
 */
function getNutritionFromProcessed(ingredientName) {
  if (!ingredientName || typeof ingredientName !== 'string') return null;
  const byNorm = getProcessedIndex();
  const norm = normalizeForMatch(ingredientName.trim());
  const item = byNorm.get(norm);
  if (!item) return null;
  return {
    energyKcal: item.energyKcal,
    proteinG: item.proteinG,
    fatG: item.fatG,
    carbohydrateG: item.carbohydrateG,
    fiberG: item.fiberG,
    nutritionMicros: item.nutritionMicros,
    usdaFdcId: item.usdaFdcId,
    usdaDescription: item.usdaDescription,
  };
}

/**
 * Enrich an ingredient name: try processed list first, then USDA raw (alias + fuzzy).
 * Returns update payload for Ingredient or null.
 */
function getNutritionUpdateForIngredient(ingredientName, aliasMap = null) {
  const fromProcessed = getNutritionFromProcessed(ingredientName);
  if (fromProcessed) return fromProcessed;
  const map = aliasMap ?? FRENCH_TO_USDA_ALIAS;
  const entry = findBestMatch(ingredientName, map);
  if (!entry) return null;
  return extractNutrition(entry);
}

module.exports = {
  loadFoundationFoods,
  getIndex,
  extractNutrition,
  findBestMatch,
  getNutritionUpdateForIngredient,
  getNutritionFromProcessed,
  getProcessedIndex,
  normalizeForMatch,
};
