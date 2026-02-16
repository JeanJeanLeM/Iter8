import { atom } from 'recoil';

export interface SelectedRecipeForVariation {
  recipeId: string;
  title: string;
  parentId?: string | null;
}

/**
 * The recipe selected as target for modifications (e.g. "use as base", "modify this one").
 * When set, the agent receives this context when the user sends a message.
 */
export const selectedRecipeForVariation = atom<SelectedRecipeForVariation | null>({
  key: 'selectedRecipeForVariation',
  default: null,
});
