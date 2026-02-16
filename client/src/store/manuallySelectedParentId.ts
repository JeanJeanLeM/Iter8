import { atom } from 'recoil';

/**
 * Recipe ID selected as parent for the next variation ("Garder le lien").
 * When set, WriteRecipeHoverButton and RecipeBlock use this instead of
 * recipeConversationParentMap for the parent link.
 */
export const manuallySelectedParentId = atom<string | null>({
  key: 'manuallySelectedParentId',
  default: null,
});
