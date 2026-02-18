import { request, apiBaseUrl } from 'librechat-data-provider';
import type {
  IngredientsResponse,
  TIngredient,
  UpdateIngredientParams,
  CreateIngredientParams,
} from 'librechat-data-provider';

export function getIngredients(): Promise<IngredientsResponse> {
  return request.get(`${apiBaseUrl()}/api/ingredients`);
}

export function createIngredient(data: CreateIngredientParams): Promise<TIngredient> {
  return request.post(`${apiBaseUrl()}/api/ingredients`, data);
}

export function updateIngredient(
  id: string,
  data: UpdateIngredientParams,
): Promise<TIngredient> {
  return request.patch(
    `${apiBaseUrl()}/api/ingredients/${encodeURIComponent(id)}`,
    data,
  );
}

export function enrichIngredientWithUsda(id: string): Promise<TIngredient> {
  return request.post(
    `${apiBaseUrl()}/api/ingredients/${encodeURIComponent(id)}/enrich-usda`,
  );
}
