import { atomWithLocalStorage } from './utils';

const STORAGE_KEY = 'librechat_recipe_message_map';

/**
 * Persisted map: conversationId -> messageId -> recipeId
 * Allows RecipeInlineCards to be shown when returning to a chat after adding a recipe.
 */
export const recipeMessageMap = atomWithLocalStorage<Record<string, Record<string, string>>>(
  STORAGE_KEY,
  {},
);
