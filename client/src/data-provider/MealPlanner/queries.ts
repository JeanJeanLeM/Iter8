/* Meal planner */
import { QueryKeys } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type { MealPlannerCalendarParams, MealPlannerCalendarResponse } from 'librechat-data-provider';
import { getMealPlannerCalendar } from './api';

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
      ...config,
    },
  );
}
