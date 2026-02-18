/* Shopping list */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { ShoppingListParams, ShoppingListResponse } from 'librechat-data-provider';
import { getShoppingList as getShoppingListApi } from './api';

export const useShoppingListQuery = (
  params?: ShoppingListParams,
  config?: UseQueryOptions<ShoppingListResponse>,
): QueryObserverResult<ShoppingListResponse> => {
  return useQuery<ShoppingListResponse>(
    [QueryKeys.shoppingList, params ?? {}],
    () => getShoppingListApi(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};
