/**
 * Recipes API using the shared request instance (auth, base URL).
 * Used so the recipe book works even when the data-provider package dist doesn't include recipe methods yet.
 */
import { request, apiBaseUrl } from 'librechat-data-provider';
import type { TRecipe, RecipesListParams, RecipesListResponse, RecipeVoteResponse } from 'librechat-data-provider';

function buildQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    })
    .flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((v) => `${key}=${encodeURIComponent(String(v))}`)
        : [`${key}=${encodeURIComponent(String(value))}`],
    );
  return parts.length ? `?${parts.join('&')}` : '';
}

export function getRecipes(params?: RecipesListParams): Promise<RecipesListResponse> {
  const url = `${apiBaseUrl()}/api/recipes${params ? buildQuery(params as Record<string, unknown>) : ''}`;
  return request.get(url);
}

export function getRecipe(id: string): Promise<TRecipe> {
  return request.get(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}`);
}

/** Get the root (ancestor) of a recipe by traversing parentId. */
export function getRecipeRoot(id: string): Promise<TRecipe> {
  return request.get(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}/root`);
}

/**
 * Get root + all descendants of a recipe (full lineage for ancestor mode).
 */
export function getRecipeFamily(rootId: string): Promise<RecipesListResponse> {
  return request.get(`${apiBaseUrl()}/api/recipes/family?rootId=${encodeURIComponent(rootId)}`);
}

export function createRecipe(data: Partial<TRecipe> & { title: string }): Promise<TRecipe> {
  return request.post(`${apiBaseUrl()}/api/recipes`, data);
}

/**
 * Create a child recipe (variation) from a parent recipe.
 * Use this when the user explicitly chooses to "keep the link" with a parent recipe.
 */
export function createRecipeVariation(
  parentId: string,
  data: Partial<TRecipe> & { title: string; variationNote?: string },
): Promise<TRecipe> {
  return request.post(
    `${apiBaseUrl()}/api/recipes/${encodeURIComponent(parentId)}/variation`,
    data,
  );
}

/**
 * Structure raw recipe text via OpenAI and save to the user's recipe book.
 * Optionally create as variation: pass parentId (and optionally variationNote).
 */
export function structureAndCreateRecipe(
  recipeText: string,
  options?: { parentId?: string; variationNote?: string },
): Promise<TRecipe> {
  return request.post(`${apiBaseUrl()}/api/recipes/structure`, {
    recipeText,
    ...(options?.parentId ? { parentId: options.parentId } : {}),
    ...(options?.variationNote ? { variationNote: options.variationNote } : {}),
  });
}

export function updateRecipe(id: string, data: Partial<TRecipe>): Promise<TRecipe> {
  return request.put(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}`, data);
}

export function deleteRecipe(id: string): Promise<{ deleted: boolean }> {
  return request.delete(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}`);
}

export function setRecipeVote(id: string, value: 1 | -1): Promise<RecipeVoteResponse> {
  return request.post(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}/vote`, { value });
}

/**
 * Generate a recipe image with OpenAI (gpt-image-1.5, 1024x1024, low) and update the recipe.
 * Returns the updated recipe with imageUrl set.
 */
export function generateRecipeImage(id: string): Promise<TRecipe> {
  return request.post(`${apiBaseUrl()}/api/recipes/${encodeURIComponent(id)}/generate-image`);
}
