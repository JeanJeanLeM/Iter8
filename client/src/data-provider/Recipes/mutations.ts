/* Recipes */
import { QueryKeys } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { TRecipe, RecipeVoteResponse } from 'librechat-data-provider';
import {
  createRecipe as createRecipeApi,
  createRecipeVariation as createRecipeVariationApi,
  updateRecipe as updateRecipeApi,
  deleteRecipe as deleteRecipeApi,
  setRecipeVote as setRecipeVoteApi,
  generateRecipeImage as generateRecipeImageApi,
  previewChatgptShareImport as previewChatgptShareImportApi,
  commitChatgptShareImport as commitChatgptShareImportApi,
} from './api';
import type {
  ChatgptSharePreviewResponse,
  ChatgptShareCommitItem,
  ChatgptShareCommitResponse,
} from './api';

export const useCreateRecipeMutation = (
  options?: UseMutationOptions<TRecipe, Error, Partial<TRecipe> & { title: string }>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: Partial<TRecipe> & { title: string }) => createRecipeApi(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.recipes]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

/** Mutation to create a child recipe (variation) from a parent. */
export const useCreateRecipeVariationMutation = (
  options?: UseMutationOptions<
    TRecipe,
    Error,
    { parentId: string; data: Partial<TRecipe> & { title: string; variationNote?: string } }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ parentId, data }: { parentId: string; data: Partial<TRecipe> & { title: string; variationNote?: string } }) =>
      createRecipeVariationApi(parentId, data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.recipes]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useUpdateRecipeMutation = (
  options?: UseMutationOptions<TRecipe, Error, { id: string; data: Partial<TRecipe> }>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: Partial<TRecipe> }) =>
      updateRecipeApi(id, data),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.recipes]);
        queryClient.invalidateQueries([QueryKeys.recipe, variables.id]);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useDeleteRecipeMutation = (
  options?: UseMutationOptions<{ deleted: boolean }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => deleteRecipeApi(id), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.recipes]);
      options?.onSuccess?.(...args);
    },
  });
};

export const useRecipeVoteMutation = (
  recipeId: string,
  options?: UseMutationOptions<RecipeVoteResponse, Error, 1 | -1>,
) => {
  const queryClient = useQueryClient();
  return useMutation((value: 1 | -1) => setRecipeVoteApi(recipeId, value), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.recipes]);
      queryClient.invalidateQueries([QueryKeys.recipe, recipeId]);
      options?.onSuccess?.(...args);
    },
  });
};

/** Generate recipe image with OpenAI and update the recipe. Returns updated recipe. */
export const useGenerateRecipeImageMutation = (
  options?: UseMutationOptions<TRecipe, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((recipeId: string) => generateRecipeImageApi(recipeId), {
    ...options,
    onSuccess: (data, recipeId, context) => {
      queryClient.invalidateQueries([QueryKeys.recipes]);
      queryClient.invalidateQueries([QueryKeys.recipe, recipeId]);
      options?.onSuccess?.(data, recipeId, context);
    },
  });
};

/** Preview ChatGPT share link: detect recipe candidates and default parent mapping. */
export const useChatgptSharePreviewMutation = (
  options?: UseMutationOptions<ChatgptSharePreviewResponse, Error, string>,
) => {
  return useMutation((shareUrl: string) => previewChatgptShareImportApi(shareUrl), options);
};

/** Commit ChatGPT share import: create selected recipes with parent links. */
export const useCommitChatgptShareImportMutation = (
  options?: UseMutationOptions<ChatgptShareCommitResponse, Error, ChatgptShareCommitItem[]>,
) => {
  const queryClient = useQueryClient();
  return useMutation((items: ChatgptShareCommitItem[]) => commitChatgptShareImportApi(items), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.recipes]);
      options?.onSuccess?.(...args);
    },
  });
};
