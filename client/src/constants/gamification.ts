/**
 * Recipe badges (by cuisine/type) to stick on toques in Collection des Toques.
 * Keys must match normalized recipe tags (lowercase, underscores).
 * Labels via i18n: com_ui_gamification_badge_*.
 * image: optional URL for a unique image per success (e.g. /assets/toques/vegetarien.svg).
 */
export const RECIPE_BADGE_OPTIONS: readonly { value: string; labelKey: string; image?: string }[] = [
  { value: 'vegetarien', labelKey: 'com_ui_gamification_badge_vegetarien' },
  { value: 'vegan', labelKey: 'com_ui_gamification_badge_vegan' },
  { value: 'proteine', labelKey: 'com_ui_gamification_badge_proteine' },
  { value: 'sans_sucre_ajoute', labelKey: 'com_ui_gamification_badge_sans_sucre_ajoute' },
  { value: 'cuisine_indienne', labelKey: 'com_ui_gamification_badge_cuisine_indienne' },
  { value: 'cuisine_italienne', labelKey: 'com_ui_gamification_badge_cuisine_italienne' },
  { value: 'cuisine_asiatique', labelKey: 'com_ui_gamification_badge_cuisine_asiatique' },
  { value: 'sans_gluten', labelKey: 'com_ui_gamification_badge_sans_gluten' },
  { value: 'dessert', labelKey: 'com_ui_gamification_badge_dessert' },
  { value: 'rapide', labelKey: 'com_ui_gamification_badge_rapide' },
  { value: 'entree', labelKey: 'com_ui_gamification_badge_entree' },
  { value: 'plat', labelKey: 'com_ui_gamification_badge_plat' },
] as const;

/** Hue (0–360) from badge key for a unique color per success when no image is set. */
export function getBadgeColorHue(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}
