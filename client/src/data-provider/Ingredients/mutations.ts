import { QueryKeys } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { TIngredient, CreateIngredientParams } from 'librechat-data-provider';
import {
  createIngredient as createIngredientApi,
  enrichIngredientWithUsda as enrichIngredientWithUsdaApi,
} from './api';

export const useCreateIngredientMutation = (
  options?: UseMutationOptions<TIngredient, Error, CreateIngredientParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: CreateIngredientParams) => createIngredientApi(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.ingredients]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useEnrichIngredientWithUsdaMutation = (
  options?: UseMutationOptions<TIngredient, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => enrichIngredientWithUsdaApi(id), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.ingredients]);
      options?.onSuccess?.(...args);
    },
  });
};
