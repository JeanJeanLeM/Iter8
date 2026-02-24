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
 * Pass conversationId when creating from chat so the recipe links to that discussion.
 */
export function structureAndCreateRecipe(
  recipeText: string,
  options?: { parentId?: string; variationNote?: string; conversationId?: string | null },
): Promise<TRecipe> {
  return request.post(`${apiBaseUrl()}/api/recipes/structure`, {
    recipeText,
    ...(options?.parentId ? { parentId: options.parentId } : {}),
    ...(options?.variationNote ? { variationNote: options.variationNote } : {}),
    ...(options?.conversationId ? { conversationId: options.conversationId } : {}),
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

/** Response of GET /api/recipes/ai-images: all user AI images, sorted by relevance to recipeId, paginated. */
export interface RecipeAiImagesResponse {
  images: Array<{ url: string; source: 'ai'; recipeId: string; recipeTitle: string }>;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * List all AI-generated images across the user's recipes, sorted by relevance to a recipe.
 * recipeId: current recipe (for sorting by ingredients, dishType, cuisineType); optional.
 */
export function getRecipeAiImages(
  recipeId: string | null | undefined,
  page = 1,
  limit = 10,
): Promise<RecipeAiImagesResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (recipeId) params.recipeId = recipeId;
  return request.get(`${apiBaseUrl()}/api/recipes/ai-images${buildQuery(params)}`);
}

/* ChatGPT share import */
export interface ChatgptSharePreviewCandidate {
  importIndex: number;
  index: number;
  title: string;
  rawText: string;
  suggestedParentIndex: number | null;
}

export interface ChatgptSharePreviewResponse {
  title: string;
  candidates: ChatgptSharePreviewCandidate[];
  message?: string;
}

export function previewChatgptShareImport(shareUrl: string): Promise<ChatgptSharePreviewResponse> {
  return request.post(`${apiBaseUrl()}/api/recipes/import/chatgpt-share/preview`, { shareUrl });
}

export interface ChatgptShareCommitItem {
  importIndex: number;
  rawText: string;
  parentImportIndex: number | null;
}

export interface ChatgptShareCommitResponse {
  recipes: TRecipe[];
}

export function commitChatgptShareImport(items: ChatgptShareCommitItem[]): Promise<ChatgptShareCommitResponse> {
  return request.post(`${apiBaseUrl()}/api/recipes/import/chatgpt-share/commit`, { items });
}
