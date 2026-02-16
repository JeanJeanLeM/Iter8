/* Journal */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type {
  JournalListParams,
  JournalListResponse,
  TRealizationWithRecipe,
} from 'librechat-data-provider';
import { getJournal as getJournalApi, getJournalEntry as getJournalEntryApi } from './api';

export const useJournalQuery = (
  params?: JournalListParams,
  config?: UseQueryOptions<JournalListResponse>,
): QueryObserverResult<JournalListResponse> => {
  return useQuery<JournalListResponse>(
    [QueryKeys.journal, params ?? {}],
    () => getJournalApi(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

export const useJournalEntryQuery = (
  id: string | null,
  config?: UseQueryOptions<TRealizationWithRecipe>,
): QueryObserverResult<TRealizationWithRecipe> => {
  return useQuery<TRealizationWithRecipe>(
    [QueryKeys.journalEntry, id],
    () => (id ? getJournalEntryApi(id) : Promise.reject(new Error('No journal entry id'))),
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};
