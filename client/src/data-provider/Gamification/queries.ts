import { QueryKeys, dataService } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type { TGamificationStats } from 'librechat-data-provider';

const GAMIFICATION_STALE_MS = 2 * 60 * 1000; // 2 min

export const useGetGamificationQuery = (
  config?: UseQueryOptions<TGamificationStats>,
): QueryObserverResult<TGamificationStats> => {
  return useQuery<TGamificationStats>(
    [QueryKeys.gamification],
    () => dataService.getGamificationStats(),
    {
      refetchOnWindowFocus: false,
      staleTime: GAMIFICATION_STALE_MS,
      ...config,
    },
  );
};
