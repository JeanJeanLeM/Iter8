import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { IngredientsResponse } from 'librechat-data-provider';
import { getIngredients as getIngredientsApi } from './api';

export const useIngredientsQuery = (
  config?: UseQueryOptions<IngredientsResponse>,
): QueryObserverResult<IngredientsResponse> => {
  return useQuery<IngredientsResponse>(
    [QueryKeys.ingredients],
    () => getIngredientsApi(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};
