/* Shopping list */
import { QueryKeys } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import type {
  TShoppingListItem,
  CreateShoppingListItemParams,
  CreateShoppingListItemsParams,
  UpdateShoppingListItemParams,
} from 'librechat-data-provider';
import {
  createShoppingListItem as createShoppingListItemApi,
  createShoppingListItems as createShoppingListItemsApi,
  updateShoppingListItem as updateShoppingListItemApi,
  deleteShoppingListItem as deleteShoppingListItemApi,
} from './api';

export const useCreateShoppingListItemMutation = (
  options?: UseMutationOptions<TShoppingListItem, Error, CreateShoppingListItemParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: CreateShoppingListItemParams) => createShoppingListItemApi(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.shoppingList]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useCreateShoppingListItemsMutation = (
  options?: UseMutationOptions<
    { items: TShoppingListItem[] },
    Error,
    CreateShoppingListItemsParams
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: CreateShoppingListItemsParams) => createShoppingListItemsApi(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.shoppingList]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useUpdateShoppingListItemMutation = (
  options?: UseMutationOptions<
    TShoppingListItem,
    Error,
    { id: string; data: UpdateShoppingListItemParams }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }: { id: string; data: UpdateShoppingListItemParams }) =>
      updateShoppingListItemApi(id, data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.shoppingList]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useDeleteShoppingListItemMutation = (
  options?: UseMutationOptions<{ deleted: boolean }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => deleteShoppingListItemApi(id), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.shoppingList]);
      options?.onSuccess?.(...args);
    },
  });
};
