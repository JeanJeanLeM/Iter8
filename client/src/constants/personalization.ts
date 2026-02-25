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

/** Cooking level: free text. Max length must match API (COOKING_LEVEL_MAX_LENGTH). */
export const COOKING_LEVEL_MAX_LENGTH = 100;

/** Max length for custom diet text (must match API PERSONALIZATION_MAX_ITEM_LENGTH). */
export const DIET_MAX_LENGTH = 80;

/** Max length for dietary preferences description (must match API validation). */
export const DIETARY_PREFERENCES_MAX_LENGTH = 500;

/**
 * Kitchen equipment option values for user personalization.
 * Labels via i18n: com_ui_equipment_*.
 */
export const EQUIPMENT_OPTIONS: readonly string[] = [
  'robot_patissier',
  'four',
  'mixeur_electrique',
  'friteuse_air_fryer',
] as const;

/** Max length for custom equipment item (must match API PERSONALIZATION_MAX_ITEM_LENGTH). */
export const EQUIPMENT_MAX_LENGTH = 80;

/**
 * Recipe AI image style options (key = API value, labelKey = i18n key).
 * Must match RECIPE_IMAGE_STYLE_KEYS in api/server/routes/memories.js.
 */
export const RECIPE_IMAGE_STYLE_OPTIONS: readonly { value: string; labelKey: string }[] = [
  { value: 'hyper_realiste', labelKey: 'com_ui_recipe_image_style_hyper_realiste' },
  { value: 'anime_japonais', labelKey: 'com_ui_recipe_image_style_anime_japonais' },
  { value: 'peinture_huile', labelKey: 'com_ui_recipe_image_style_peinture_huile' },
  { value: 'cartoon_moderne', labelKey: 'com_ui_recipe_image_style_cartoon_moderne' },
  { value: 'isometrique', labelKey: 'com_ui_recipe_image_style_isometrique' },
  { value: 'pixar_3d', labelKey: 'com_ui_recipe_image_style_pixar_3d' },
  { value: 'dessin_crayon', labelKey: 'com_ui_recipe_image_style_dessin_crayon' },
] as const;

/**
 * Recipe AI image background options (key = API value, labelKey = i18n key).
 * Must match RECIPE_IMAGE_BACKGROUND_KEYS in api/server/routes/memories.js.
 */
export const RECIPE_IMAGE_BACKGROUND_OPTIONS: readonly { value: string; labelKey: string }[] = [
  { value: 'planche_bois', labelKey: 'com_ui_recipe_image_background_planche_bois' },
  { value: 'cuisine_inox', labelKey: 'com_ui_recipe_image_background_cuisine_inox' },
  { value: 'table_restaurant', labelKey: 'com_ui_recipe_image_background_table_restaurant' },
  { value: 'nappe_carreaux', labelKey: 'com_ui_recipe_image_background_nappe_carreaux' },
  { value: 'street_urbain', labelKey: 'com_ui_recipe_image_background_street_urbain' },
  { value: 'plage', labelKey: 'com_ui_recipe_image_background_plage' },
  { value: 'montagne', labelKey: 'com_ui_recipe_image_background_montagne' },
] as const;

/** Default recipe image style when user has not set one (used by backend). */
export const RECIPE_IMAGE_STYLE_DEFAULT = 'hyper_realiste';
/** Default recipe image background when user has not set one (used by backend). */
export const RECIPE_IMAGE_BACKGROUND_DEFAULT = 'planche_bois';
