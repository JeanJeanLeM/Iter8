/**
 * Meal planner API using the shared request instance.
 */
import { request, apiBaseUrl } from 'librechat-data-provider';
import type {
  MealPlannerCalendarParams,
  MealPlannerCalendarResponse,
  TPlannedMeal,
  UpdatePlannedMealParams,
  CreatePlannedMealParams,
} from 'librechat-data-provider';

function buildQuery(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function getMealPlannerCalendar(
  params: MealPlannerCalendarParams,
): Promise<MealPlannerCalendarResponse> {
  const url = `${apiBaseUrl()}/api/meal-planner/calendar${buildQuery(params as Record<string, unknown>)}`;
  return request.get(url);
}

export function updatePlannedMeal(
  plannedMealId: string,
  params: UpdatePlannedMealParams,
): Promise<TPlannedMeal> {
  return request.patch(`${apiBaseUrl()}/api/meal-planner/planned-meals/${plannedMealId}`, params);
}

export function deletePlannedMeal(plannedMealId: string): Promise<{ success: boolean }> {
  return request.delete(`${apiBaseUrl()}/api/meal-planner/planned-meals/${plannedMealId}`);
}

export function createPlannedMeal(params: CreatePlannedMealParams): Promise<TPlannedMeal> {
  return request.post(`${apiBaseUrl()}/api/meal-planner/planned-meals`, params);
}
