/* Meal planner */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { MealPlannerCalendarParams, MealPlannerCalendarResponse } from 'librechat-data-provider';
import { getMealPlannerCalendar } from './api';

/** Cache: 5 min fresh, 30 min kept (plan: menus prévus mois ±3 sem) */
const MEAL_PLANNER_STALE_MS = 5 * 60 * 1000;
const MEAL_PLANNER_GC_MS = 30 * 60 * 1000;

export function useMealPlannerCalendarQuery(
  params: MealPlannerCalendarParams | null,
  config?: UseQueryOptions<MealPlannerCalendarResponse>,
): QueryObserverResult<MealPlannerCalendarResponse> {
  return useQuery<MealPlannerCalendarResponse>(
    [QueryKeys.mealPlannerCalendar, params ?? {}],
    () => (params ? getMealPlannerCalendar(params) : Promise.reject(new Error('No params'))),
    {
      enabled: !!params?.from && !!params?.to,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: MEAL_PLANNER_STALE_MS,
      gcTime: MEAL_PLANNER_GC_MS,
      ...config,
    },
  );
}
