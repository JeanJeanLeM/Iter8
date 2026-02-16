/**
 * Diet and allergy option values stored in user personalization.
 * Labels are translated via i18n (com_ui_diet_*, com_ui_allergy_*).
 */
export const DIET_OPTIONS: readonly string[] = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'halal',
  'kosher',
  'pescatarian',
] as const;

export const ALLERGY_OPTIONS: readonly string[] = [
  'gluten',
  'lactose',
  'peanuts',
  'tree_nuts',
  'eggs',
  'shellfish',
  'soy',
  'fish',
  'sesame',
] as const;

/** Max length for custom allergy text (must match API validation). */
export const ALLERGY_MAX_LENGTH = 80;

/** Cooking level values stored in user personalization. Labels via i18n (com_ui_cooking_level_*). */
export const COOKING_LEVEL_OPTIONS: readonly string[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

/** Max length for dietary preferences description (must match API validation). */
export const DIETARY_PREFERENCES_MAX_LENGTH = 500;
