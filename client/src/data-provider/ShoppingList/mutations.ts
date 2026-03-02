/* Shopping list */
import { QueryKeys } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import type {
  TShoppingListItem,
  CreateShoppingListItemParams,
  CreateShoppingListItemsParams,
  UpdateShoppingListItemParams,
  ShoppingListResponse,
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

const SHOPPING_LIST_QUERY_KEY = [QueryKeys.shoppingList, {}] as const;

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
      async onMutate({ id, data }) {
        await queryClient.cancelQueries({ queryKey: [QueryKeys.shoppingList] });
        const previous = queryClient.getQueryData<ShoppingListResponse>(SHOPPING_LIST_QUERY_KEY);
        if (previous?.items) {
          const nextItems = previous.items.map((item) =>
            item._id === id ? { ...item, ...data } : item,
          );
          queryClient.setQueryData<ShoppingListResponse>(SHOPPING_LIST_QUERY_KEY, {
            ...previous,
            items: nextItems,
          });
        }
        return { previous };
      },
      onError(_err, _variables, context) {
        if (context?.previous) {
          queryClient.setQueryData(SHOPPING_LIST_QUERY_KEY, context.previous);
        }
        options?.onError?.(_err, _variables, context);
      },
      onSettled(...args) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.shoppingList] });
        options?.onSettled?.(...args);
      },
      onSuccess: options?.onSuccess,
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
