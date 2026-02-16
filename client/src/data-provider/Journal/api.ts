/**
 * Journal API using the shared request instance.
 */
import { request, apiBaseUrl } from 'librechat-data-provider';
import type {
  JournalListParams,
  JournalListResponse,
  TRealizationWithRecipe,
  TRealization,
  CreateJournalEntryParams,
} from 'librechat-data-provider';

function buildQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function getJournal(params?: JournalListParams): Promise<JournalListResponse> {
  const url = `${apiBaseUrl()}/api/journal${params ? buildQuery(params as Record<string, unknown>) : ''}`;
  return request.get(url);
}

export function getJournalEntry(id: string): Promise<TRealizationWithRecipe> {
  return request.get(`${apiBaseUrl()}/api/journal/${encodeURIComponent(id)}`);
}

export function createJournalEntry(
  data: CreateJournalEntryParams,
): Promise<TRealization> {
  return request.post(`${apiBaseUrl()}/api/journal`, data);
}

export function deleteJournalEntry(id: string): Promise<{ deleted: boolean }> {
  return request.delete(`${apiBaseUrl()}/api/journal/${encodeURIComponent(id)}`);
}
