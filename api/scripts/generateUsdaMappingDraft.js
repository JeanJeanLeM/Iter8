/**
 * Generate a draft usda-canonical-mapping.json from USDA Foundation Foods.
 * Groups entries by first word, applies EN→FR translation, writes mapping.
 * Run once: node api/scripts/generateUsdaMappingDraft.js (or npm run usda-mapping-draft)
 * Then edit assets/usda-canonical-mapping.json by hand to merge/split groups.
 */
const path = require('path');
const fs = require('fs');

const USDA_JSON_PATH = path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'FoodData_Central_foundation_food_json_2025-12-18.json',
);
const MAPPING_OUT_PATH = path.join(__dirname, '..', '..', 'assets', 'usda-canonical-mapping.json');

/** Normalize for canonical key: lowercase, NFD, remove diacritics. */
function normalizeKey(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First word of description, lowercased; plural -> singular for grouping (e.g. Apples -> apple). */
function firstWordBase(description) {
  if (typeof description !== 'string') return '';
  const first = description.trim().split(/[\s,]+/)[0] || '';
  const lower = first.toLowerCase();
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('es') && lower.length > 2) return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 1 && !['beans', 'nuts', 'oats'].includes(lower))
    return lower.slice(0, -1);
  return lower;
}

/** EN (first-word base) -> French display name (capitalized). Used to derive canonical key = normalizeKey(displayName). */
const EN_TO_FR = {
  almond: 'Amande',
  apple: 'Pomme',
  apricot: 'Abricot',
  anchovy: 'Anchois',
  arugula: 'Roquette',
  asparagus: 'Asperge',
  asparagu: 'Asperge',
  avocado: 'Avocat',
  banana: 'Banane',
  beans: 'Haricots',
  beef: 'Boeuf',
  beer: 'Bière',
  beet: 'Betterave',
  biscuit: 'Biscuit',
  blackberry: 'Mûre',
  blackeye: 'Pois à œil noir',
  blueberry: 'Myrtille',
  bread: 'Pain',
  broccoli: 'Brocoli',
  brussel: 'Chou de Bruxelles',
  buckwheat: 'Sarrasin',
  bulgur: 'Boulgour',
  butter: 'Beurre',
  buttermilk: 'Babeurre',
  cabbage: 'Chou',
  cake: 'Gâteau',
  candy: 'Bonbon',
  carrot: 'Carotte',
  cauliflower: 'Chou-fleur',
  celery: 'Céleri',
  cheese: 'Fromage',
  cherry: 'Cerise',
  chicken: 'Poulet',
  chickpea: 'Pois chiche',
  chocolate: 'Chocolat',
  clam: 'Palourde',
  coconut: 'Noix de coco',
  cod: 'Morue',
  cookie: 'Biscuit',
  cooky: 'Biscuit',
  corn: 'Maïs',
  cottage: 'Fromage cottage',
  crab: 'Crabe',
  cracker: 'Cracker',
  cream: 'Crème',
  crustacean: 'Crustacé',
  cucumber: 'Concombre',
  egg: 'Oeuf',
  eggplant: 'Aubergine',
  einkorn: 'Petit épeautre',
  farro: 'Épeautre',
  fennel: 'Fenouil',
  fig: 'Figue',
  fish: 'Poisson',
  flaxseed: 'Lin',
  flour: 'Farine',
  frankfurter: 'Saucisse',
  fruit: 'Fruit',
  garlic: 'Ail',
  gelatin: 'Gélatine',
  ginger: 'Gingembre',
  grape: 'Raisin',
  grap: 'Raisin',
  grapefruit: 'Pamplemousse',
  green: 'Oignon vert',
  ham: 'Jambon',
  halibut: 'Flétan',
  honey: 'Miel',
  hummus: 'Houmous',
  hummu: 'Houmous',
  juice: 'Jus',
  kale: 'Chou kale',
  kiwifruit: 'Kiwi',
  lamb: 'Agneau',
  leek: 'Poireau',
  lemon: 'Citron',
  lentil: 'Lentille',
  lettuce: 'Laitue',
  lime: 'Citron vert',
  lobster: 'Homard',
  mahi: 'Mahi-mahi',
  milk: 'Lait',
  mandarin: 'Mandarine',
  molasses: 'Mélasse',
  mushroom: 'Champignon',
  mustard: 'Moutarde',
  nectarine: 'Nectarine',
  nectarin: 'Nectarine',
  noodle: 'Nouille',
  nut: 'Noix',
  oat: 'Avoine',
  oil: 'Huile',
  olive: 'Olive',
  oliv: 'Olive',
  onion: 'Oignon',
  orange: 'Orange',
  orang: 'Orange',
  oyster: 'Huître',
  pasta: 'Pâtes',
  parsnip: 'Panais',
  peach: 'Pêche',
  peanut: 'Cacahuète',
  pear: 'Poire',
  pea: 'Pois',
  pepper: 'Poivron',
  pickle: 'Cornichon',
  pickl: 'Cornichon',
  pie: 'Tarte',
  pig: 'Porc',
  pineapple: 'Ananas',
  pizza: 'Pizza',
  plum: 'Prune',
  pork: 'Porc',
  potato: 'Pomme de terre',
  poultry: 'Volaille',
  pretzel: 'Bretzel',
  pumpkin: 'Citrouille',
  quince: 'Coing',
  rabbit: 'Lapin',
  radish: 'Radis',
  raspberry: 'Framboise',
  restaurant: 'Restaurant',
  rice: 'Riz',
  salad: 'Salade',
  salmon: 'Saumon',
  sauce: 'Sauce',
  sausage: 'Saucisse',
  scallop: 'Coquille Saint-Jacques',
  sea: 'Bar (légine)',
  seed: 'Graine',
  shellfish: 'Coquillage',
  snow: 'Crabe des neiges',
  soup: 'Soupe',
  sorghum: 'Sorgho',
  soy: 'Soja',
  spaghetti: 'Spaghetti',
  spinach: 'Épinard',
  squash: 'Courge',
  strawberry: 'Fraise',
  sugar: 'Sucre',
  sweet: 'Patate douce',
  sweetener: 'Édulcorant',
  swordfish: 'Espadon',
  syrup: 'Sirop',
  taro: 'Taro',
  tea: 'Thé',
  tilapia: 'Tilapia',
  toffee: 'Caramel',
  tomato: 'Tomate',
  tomatillo: 'Tomatille',
  tortilla: 'Tortilla',
  tuna: 'Thon',
  turkey: 'Dinde',
  turnip: 'Navet',
  veal: 'Veau',
  vegetable: 'Légume',
  vinegar: 'Vinaigre',
  walnut: 'Noix',
  water: 'Eau',
  watermelon: 'Pastèque',
  wheat: 'Blé',
  wild: 'Riz sauvage',
  wine: 'Vin',
  yogurt: 'Yaourt',
};

function main() {
  const raw = fs.readFileSync(USDA_JSON_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!data?.FoundationFoods || !Array.isArray(data.FoundationFoods)) {
    throw new Error('Invalid USDA JSON: missing FoundationFoods array');
  }

  const descriptions = data.FoundationFoods.map((f) => f.description).filter(Boolean);
  const byFirstWord = new Map();
  for (const desc of descriptions) {
    const base = firstWordBase(desc);
    if (!byFirstWord.has(base)) byFirstWord.set(base, []);
    byFirstWord.get(base).push(desc);
  }

  // Merge by canonical key (so egg + eggs -> one "oeuf" entry)
  const byCanonical = new Map();
  const SKIP_KEYS = new Set(['salt']); // exclude from canonical list
  for (const [base, list] of byFirstWord) {
    if (SKIP_KEYS.has(base)) continue;
    const displayName = EN_TO_FR[base] || base.charAt(0).toUpperCase() + base.slice(1);
    const canonicalKey = normalizeKey(displayName) || base;
    if (!byCanonical.has(canonicalKey)) {
      byCanonical.set(canonicalKey, { displayName, usdaDescriptions: [] });
    }
    const entry = byCanonical.get(canonicalKey);
    entry.usdaDescriptions.push(...list);
  }

  const mapping = {};
  for (const [key, { displayName, usdaDescriptions }] of byCanonical) {
    mapping[key] = {
      displayName,
      usdaDescriptions: [...new Set(usdaDescriptions)].sort(),
    };
  }

  fs.writeFileSync(MAPPING_OUT_PATH, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`Wrote ${Object.keys(mapping).length} groups to ${MAPPING_OUT_PATH}`);
}

main();
