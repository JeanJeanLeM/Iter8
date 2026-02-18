/**
 * Shopping list API using the shared request instance.
 */
import { request, apiBaseUrl } from 'librechat-data-provider';
import type {
  ShoppingListParams,
  ShoppingListResponse,
  TShoppingListItem,
  CreateShoppingListItemParams,
  CreateShoppingListItemsParams,
  UpdateShoppingListItemParams,
} from 'librechat-data-provider';

function buildQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function getShoppingList(
  params?: ShoppingListParams,
): Promise<ShoppingListResponse> {
  const url = `${apiBaseUrl()}/api/shopping-list${params ? buildQuery(params as Record<string, unknown>) : ''}`;
  return request.get(url);
}

export function createShoppingListItem(
  data: CreateShoppingListItemParams,
): Promise<TShoppingListItem> {
  return request.post(`${apiBaseUrl()}/api/shopping-list`, data);
}

export function createShoppingListItems(
  data: CreateShoppingListItemsParams,
): Promise<{ items: TShoppingListItem[] }> {
  return request.post(`${apiBaseUrl()}/api/shopping-list`, data);
}

export function updateShoppingListItem(
  id: string,
  data: UpdateShoppingListItemParams,
): Promise<TShoppingListItem> {
  return request.patch(
    `${apiBaseUrl()}/api/shopping-list/${encodeURIComponent(id)}`,
    data,
  );
}

export function deleteShoppingListItem(
  id: string,
): Promise<{ deleted: boolean }> {
  return request.delete(
    `${apiBaseUrl()}/api/shopping-list/${encodeURIComponent(id)}`,
  );
}
