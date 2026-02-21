/* Shopping list */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { ShoppingListParams, ShoppingListResponse } from 'librechat-data-provider';
import { getShoppingList as getShoppingListApi } from './api';

/** Cache: 2 min fresh, 15 min kept in memory (plan: liste de course) */
const SHOPPING_LIST_STALE_MS = 2 * 60 * 1000;
const SHOPPING_LIST_GC_MS = 15 * 60 * 1000;

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
      staleTime: SHOPPING_LIST_STALE_MS,
      gcTime: SHOPPING_LIST_GC_MS,
      ...config,
    },
  );
};
