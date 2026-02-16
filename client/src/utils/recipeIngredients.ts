/**
 * Recipe ingredient formatting: rounding, unit system (SI / American), and gram equivalent.
 */

import type { TRecipeIngredient } from 'librechat-data-provider';

export type UnitSystem = 'si' | 'american';

export interface FormatIngredientOptions {
  /** Portion scale ratio (e.g. portionsChosen / recipePortions) */
  ratio?: number;
  /** Preferred unit system for display */
  unitSystem?: UnitSystem;
  /** When true, append "≈ X g" for tsp/tbsp/cup when possible */
  showGrams?: boolean;
}

export interface FormattedIngredient {
  /** Main display line (e.g. "2 œufs" or "50 g farine") */
  displayText: string;
  /** When showGrams and unit is volumetric, approximate grams (e.g. "≈ 120 g") */
  gramEquivalent?: string;
}

/** Ingredient name patterns that must be shown as whole numbers (egg, etc.) */
const WHOLE_INGREDIENT_PATTERNS = [
  /\b(oeuf|œuf|egg|eier|huevo|uovo)\b/i,
  /\b(egg\s*white|blanc\s*d[\''']?oeuf)\b/i,
  /\b(egg\s*yolk|jaune\s*d[\''']?oeuf)\b/i,
  /\b(clove|gousse)\s+(of\s+)?(garlic|ail)\b/i,
  /\b(garlic|ail)\s+clove/i,
  /\b(citron|lemon|lime)\s*$/i,
  /\b(pomme|apple|orange)\s*$/i,
  /\b(baguette|loaf)\s*$/i,
  /\b(carotte|carrot)\s*$/i,
  /\b(courgette|zucchini)\s*$/i,
  /\b(tranche|slice)\s*$/i,
  /\b(steak|escalope|filet)\s*$/i,
  /\b(piece|pièce|morceau)\s*$/i,
  /\b(whole\s+)|(entier)\s+/i,
];

/** Units that represent "count" and should be rounded to whole numbers */
const COUNT_UNITS = new Set([
  '',
  'unit',
  'unité',
  'unités',
  'piece',
  'pièce',
  'pièces',
  'pcs',
  'clove',
  'gousse',
  'gousses',
  'slice',
  'tranche',
  'tranches',
  'leaf',
  'feuille',
  'feuilles',
]);

function isWholeIngredient(ing: TRecipeIngredient): boolean {
  const name = (ing.name ?? '').trim().toLowerCase();
  const unit = (ing.unit ?? '').trim().toLowerCase();
  if (COUNT_UNITS.has(unit)) return true;
  return WHOLE_INGREDIENT_PATTERNS.some((re) => re.test(name));
}

/**
 * Rounds quantity for display: whole for eggs/count items, otherwise sensible decimals.
 */
export function roundQuantity(qty: number, ing: TRecipeIngredient): number {
  if (!Number.isFinite(qty) || qty <= 0) return qty;
  if (isWholeIngredient(ing)) return Math.max(1, Math.round(qty));
  if (qty >= 100) return Math.round(qty);
  if (qty >= 10) return Math.round(qty * 10) / 10;
  if (qty >= 1) return Math.round(qty * 10) / 10;
  if (qty >= 0.1) return Math.round(qty * 100) / 100;
  return Math.round(qty * 100) / 100;
}

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  const s = qty.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

/** Normalized unit keys for conversion (lowercase, no accents for matching) */
const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gram: 'g',
  gramme: 'g',
  grams: 'g',
  grammes: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  liter: 'l',
  litre: 'l',
  oz: 'oz',
  'fl oz': 'floz',
  'fluid ounce': 'floz',
  tsp: 'tsp',
  'tsp.': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'cuillère à café': 'tsp',
  'c. à café': 'tsp',
  'c à café': 'tsp',
  tbsp: 'tbsp',
  'tbsp.': 'tbsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'cuillère à soupe': 'tbsp',
  'c. à soupe': 'tbsp',
  'c à soupe': 'tbsp',
  cup: 'cup',
  cups: 'cup',
  'tasse': 'cup',
  'tasses': 'cup',
  pinch: 'pinch',
  pincée: 'pinch',
};

function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  return UNIT_ALIASES[u] ?? u;
}

/** Approximate grams per cup for common ingredients (for volumetric → g) */
const GRAMS_PER_CUP: Record<string, number> = {
  default: 240, // water
  flour: 125,
  farine: 125,
  sugar: 200,
  sucre: 200,
  brown_sugar: 220,
  sucre_brun: 220,
  butter: 227,
  beurre: 227,
  oil: 218,
  huile: 218,
  honey: 340,
  miel: 340,
  milk: 245,
  lait: 245,
  cream: 240,
  crème: 240,
  cocoa: 100,
  cacao: 100,
  chocolate_chips: 170,
  pépites: 170,
  salt: 292,
  sel: 292,
  baking_powder: 220,
  levure: 220,
  oats: 90,
  flocons: 90,
  rice: 185,
  riz: 185,
  vanilla: 208,
  vanille: 208,
};

/** Grams per tablespoon (for small amounts) */
const GRAMS_PER_TBSP: Record<string, number> = {
  default: 15,
  flour: 8,
  farine: 8,
  sugar: 12.5,
  sucre: 12.5,
  butter: 14,
  beurre: 14,
  salt: 18,
  sel: 18,
  baking_powder: 14,
  levure: 14,
  vanilla: 13,
  vanille: 13,
  honey: 21,
  miel: 21,
  cocoa: 6,
  cacao: 6,
};

const GRAMS_PER_TSP: Record<string, number> = {
  default: 5,
  flour: 2.6,
  farine: 2.6,
  sugar: 4.2,
  sucre: 4.2,
  salt: 6,
  sel: 6,
  baking_powder: 4.6,
  levure: 4.6,
  vanilla: 4.3,
  vanille: 4.3,
  bicarbonate: 4.6,
  baking_soda: 4.6,
  extrait: 4.3,
  vanilla_extract: 4.3,
  extrait de vanille: 4.3,
};

function getDensityKey(name: string, unit: string): string {
  const n = name.trim().toLowerCase();
  const u = unit.trim().toLowerCase();
  if (/\b(farine|flour)\b/i.test(n)) return u.includes('soupe') ? 'farine' : 'flour';
  if (/\b(sucre|sugar)\b/i.test(n)) return u.includes('soupe') ? 'sucre' : 'sugar';
  if (/\b(beurre|butter)\b/i.test(n)) return 'beurre';
  if (/\b(sel|salt)\b/i.test(n)) return 'sel';
  if (/\b(levure|baking\s*powder)\b/i.test(n)) return 'levure';
  if (/\b(bicarbonate|baking\s*soda)\b/i.test(n)) return 'bicarbonate';
  if (/\b(extrait\s*de\s*vanille|vanilla\s*extract|vanille)\b/i.test(n)) return 'vanille';
  if (/\b(miel|honey)\b/i.test(n)) return 'miel';
  if (/\b(cacao|cocoa)\b/i.test(n)) return 'cacao';
  if (/\b(pépites|chocolate\s*chips)\b/i.test(n)) return 'pépites';
  if (/\b(huile|oil)\b/i.test(n)) return 'huile';
  if (/\b(lait|milk)\b/i.test(n)) return 'lait';
  if (/\b(crème|cream)\b/i.test(n)) return 'crème';
  return 'default';
}

/** Convert volumetric quantity to approximate grams */
function volumetricToGrams(
  qty: number,
  unitNorm: string,
  ingredientName: string,
): number | null {
  const key = getDensityKey(ingredientName, unitNorm);
  switch (unitNorm) {
    case 'cup':
      return qty * (GRAMS_PER_CUP[key] ?? GRAMS_PER_CUP.default);
    case 'tbsp':
      return qty * (GRAMS_PER_TBSP[key] ?? GRAMS_PER_TBSP.default);
    case 'tsp':
      return qty * (GRAMS_PER_TSP[key] ?? GRAMS_PER_TSP.default);
    case 'pinch':
      return qty * 0.5; // ~0.5 g per pinch
    default:
      return null;
  }
}

/** 1 oz ≈ 28.35 g; 1 fl oz water ≈ 29.57 g */
const OZ_TO_G = 28.3495;
const FLOZ_TO_ML = 29.5735;
const CUP_TO_ML = 240;
const TBSP_TO_ML = 15;
const TSP_TO_ML = 5;

/**
 * Convert and format for display according to unit system.
 * Returns the quantity to display, the unit label to display, and optionally gram equivalent.
 */
function convertUnit(
  qty: number,
  unitRaw: string,
  unitSystem: UnitSystem,
  ingredientName: string,
  showGrams: boolean,
): { displayQty: number; displayUnit: string; gramEquivalent: number | null } {
  const unit = normalizeUnit(unitRaw);
  let displayQty = qty;
  let displayUnit = unitRaw.trim() || '';
  let gramEquivalent: number | null = null;

  if (unit === 'g' || unit === 'kg') {
    if (unitSystem === 'american') {
      displayQty = unit === 'kg' ? (qty * 1000) / OZ_TO_G : qty / OZ_TO_G;
      displayUnit = 'oz';
    } else {
      displayUnit = unit === 'kg' ? 'kg' : 'g';
    }
    gramEquivalent = unit === 'kg' ? qty * 1000 : qty;
    return { displayQty, displayUnit, showGrams ? gramEquivalent : null };
  }

  if (unit === 'ml' || unit === 'l') {
    const ml = unit === 'l' ? qty * 1000 : qty;
    if (unitSystem === 'american') {
      displayQty = ml / TBSP_TO_ML;
      if (displayQty >= 32) {
        displayUnit = 'cup';
        displayQty = ml / CUP_TO_ML;
      } else if (displayQty >= 1) {
        displayUnit = 'tbsp';
      } else {
        displayQty = ml / TSP_TO_ML;
        displayUnit = 'tsp';
      }
    } else {
      displayUnit = unit === 'l' ? 'L' : 'ml';
    }
    return { displayQty, displayUnit, null };
  }

  if (unit === 'oz' || unit === 'floz') {
    if (unitSystem === 'si') {
      if (unit === 'oz') {
        displayQty = qty * OZ_TO_G;
        displayUnit = 'g';
        gramEquivalent = displayQty;
      } else {
        displayQty = qty * FLOZ_TO_ML;
        displayUnit = 'ml';
      }
    } else {
      displayUnit = unit === 'floz' ? 'fl oz' : 'oz';
    }
    return { displayQty, displayUnit, showGrams && unit === 'oz' ? qty * OZ_TO_G : null };
  }

  if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') {
    const ml =
      unit === 'cup'
        ? qty * CUP_TO_ML
        : unit === 'tbsp'
          ? qty * TBSP_TO_ML
          : qty * TSP_TO_ML;
    if (unitSystem === 'american') {
      displayUnit =
        unit === 'cup'
          ? 'cup'
          : unit === 'tbsp'
            ? 'tbsp'
            : 'tsp';
      // keep same unit, already american
    } else {
      // SI: show ml (or g if showGrams)
      displayQty = ml;
      displayUnit = 'ml';
    }
    gramEquivalent = volumetricToGrams(qty, unit, ingredientName);
    return {
      displayQty,
      displayUnit,
      gramEquivalent: showGrams ? gramEquivalent : null,
    };
  }

  if (unit === 'pinch') {
    gramEquivalent = volumetricToGrams(qty, unit, ingredientName);
    return { displayQty, displayUnit, showGrams ? gramEquivalent : null };
  }

  return { displayQty, displayUnit, null };
}

/**
 * Format a single ingredient for display: rounded quantity, optional unit conversion, optional "≈ X g".
 */
export function formatIngredient(
  ing: TRecipeIngredient,
  options: FormatIngredientOptions = {},
): FormattedIngredient {
  const { ratio = 1, unitSystem = 'si', showGrams = false } = options;
  const name = (ing.name ?? '').trim();
  const note = (ing.note ?? '').trim();
  const unitRaw = (ing.unit ?? '').trim();

  if (ing.quantity == null) {
    return { displayText: name };
  }

  const scaled = ing.quantity * ratio;
  const { displayQty, displayUnit, gramEquivalent } = convertUnit(
    scaled,
    unitRaw,
    unitSystem,
    name,
    showGrams,
  );
  const roundedQty = roundQuantity(displayQty, ing);
  const qtyStr = formatQty(roundedQty);

  let displayText: string;
  if (displayUnit) {
    displayText = `${qtyStr} ${displayUnit} ${name}`;
  } else {
    displayText = `${qtyStr} ${name}`;
  }
  if (note) displayText += ` (${note})`;

  let gramEquivalentStr: string | undefined;
  if (gramEquivalent != null && gramEquivalent > 0) {
    const gRounded = gramEquivalent >= 10 ? Math.round(gramEquivalent) : Math.round(gramEquivalent * 10) / 10;
    gramEquivalentStr = `≈ ${formatQty(gRounded)} g`;
  }

  return { displayText, gramEquivalent: gramEquivalentStr };
}

/**
 * Format ingredient as a single line (legacy): display text + optional " ≈ X g" on same line.
 */
export function formatIngredientLine(
  ing: TRecipeIngredient,
  options: FormatIngredientOptions & { gramOnSameLine?: boolean } = {},
): string {
  const { gramOnSameLine = true } = options;
  const { displayText, gramEquivalent } = formatIngredient(ing, options);
  if (gramOnSameLine && gramEquivalent) return `${displayText} ${gramEquivalent}`;
  return displayText;
}
