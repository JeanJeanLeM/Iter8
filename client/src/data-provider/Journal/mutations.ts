/* Journal */
import { QueryKeys } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { TRealization, CreateJournalEntryParams } from 'librechat-data-provider';
import {
  createJournalEntry as createJournalEntryApi,
  deleteJournalEntry as deleteJournalEntryApi,
} from './api';

export const useCreateJournalEntryMutation = (
  options?: UseMutationOptions<TRealization, Error, CreateJournalEntryParams>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (data: CreateJournalEntryParams) => createJournalEntryApi(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.journal]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useDeleteJournalEntryMutation = (
  options?: UseMutationOptions<{ deleted: boolean }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => deleteJournalEntryApi(id), {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries([QueryKeys.journal]);
      options?.onSuccess?.(...args);
    },
  });
};
