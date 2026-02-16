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
} from './api';

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
