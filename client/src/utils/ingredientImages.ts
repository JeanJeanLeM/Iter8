import type { TIngredient } from 'librechat-data-provider';

export function normalizeIngredientKey(value?: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildIngredientImageMap(
  ingredients?: TIngredient[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ing of ingredients ?? []) {
    const imageUrl = ing.imageUrl?.trim();
    if (!imageUrl) {
      continue;
    }
    const nameKey = normalizeIngredientKey(ing.name);
    if (nameKey) {
      map.set(nameKey, imageUrl);
    }
    const displayKey = normalizeIngredientKey(ing.displayName);
    if (displayKey) {
      map.set(displayKey, imageUrl);
    }
  }
  return map;
}

export function resolveIngredientImageUrl(
  ingredientName: string | undefined,
  imageMap: Map<string, string>,
): string | undefined {
  const key = normalizeIngredientKey(ingredientName);
  if (!key) {
    return undefined;
  }
  return imageMap.get(key);
}

export function getIngredientFallbackLetter(name?: string): string {
  const first = (name ?? '').trim().charAt(0);
  return (first || '?').toUpperCase();
}
