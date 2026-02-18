/* Recipes */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { TRecipe, RecipesListParams, RecipesListResponse } from 'librechat-data-provider';
import {
  getRecipes as getRecipesApi,
  getRecipe as getRecipeApi,
  getRecipeRoot as getRecipeRootApi,
  getRecipeFamily as getRecipeFamilyApi,
  getRecipeAiImages as getRecipeAiImagesApi,
} from './api';
import type { RecipeAiImagesResponse } from './api';

export const useRecipesQuery = (
  params?: RecipesListParams,
  config?: UseQueryOptions<RecipesListResponse>,
): QueryObserverResult<RecipesListResponse> => {
  return useQuery<RecipesListResponse>(
    [QueryKeys.recipes, params ?? {}],
    () => getRecipesApi(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

export const useRecipeQuery = (
  id: string | null,
  config?: UseQueryOptions<TRecipe>,
): QueryObserverResult<TRecipe> => {
  return useQuery<TRecipe>(
    [QueryKeys.recipe, id],
    () => (id ? getRecipeApi(id) : Promise.reject(new Error('No recipe id'))),
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

/**
 * Fetch the root (ancestor) of a recipe by traversing parentId.
 */
export const useRecipeRootQuery = (
  recipeId: string | null,
  config?: UseQueryOptions<TRecipe>,
): QueryObserverResult<TRecipe> => {
  return useQuery<TRecipe>(
    [QueryKeys.recipe, 'root', recipeId],
    () => (recipeId ? getRecipeRootApi(recipeId) : Promise.reject(new Error('No recipeId'))),
    {
      enabled: !!recipeId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

/**
 * Fetch root + all descendants of a recipe (full lineage for ancestor mode).
 */
export const useRecipeFamilyQuery = (
  rootId: string | null,
  config?: UseQueryOptions<RecipesListResponse>,
): QueryObserverResult<RecipesListResponse> => {
  return useQuery<RecipesListResponse>(
    [QueryKeys.recipes, 'family', rootId],
    () => (rootId ? getRecipeFamilyApi(rootId) : Promise.reject(new Error('No rootId'))),
    {
      enabled: !!rootId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

/**
 * Fetch all user AI-generated recipe images, paginated and sorted by relevance to a recipe.
 * Use when the "Galerie IA" modal is open. recipeId = current recipe (for sorting).
 */
export const useRecipeAiImagesQuery = (
  recipeId: string | null,
  page: number,
  enabled: boolean,
  limit = 10,
  config?: UseQueryOptions<RecipeAiImagesResponse>,
): QueryObserverResult<RecipeAiImagesResponse> => {
  return useQuery<RecipeAiImagesResponse>(
    [QueryKeys.recipes, 'ai-images', recipeId ?? '', page, limit],
    () => getRecipeAiImagesApi(recipeId, page, limit),
    {
      enabled: enabled,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};
