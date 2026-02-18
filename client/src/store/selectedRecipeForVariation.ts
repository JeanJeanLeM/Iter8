import { atom } from 'recoil';
import type { TRecipeIngredient, TRecipeStep, TRecipeDuration } from 'librechat-data-provider';

export interface RecipeDataForContext {
  ingredients?: TRecipeIngredient[];
  steps?: TRecipeStep[];
  description?: string;
  duration?: TRecipeDuration;
  tags?: string[];
  equipment?: string[];
}

export interface SelectedRecipeForVariation {
  recipeId: string;
  title: string;
  parentId?: string | null;
  /** Optional full recipe data for LLM context when opening from book */
  recipeData?: RecipeDataForContext | null;
}

/**
 * The recipe selected as target for modifications (e.g. "use as base", "modify this one").
 * When set, the agent receives this context when the user sends a message.
 */
export const selectedRecipeForVariation = atom<SelectedRecipeForVariation | null>({
  key: 'selectedRecipeForVariation',
  default: null,
});
