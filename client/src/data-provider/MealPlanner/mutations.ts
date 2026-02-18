/* Meal planner mutations */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import type { UpdatePlannedMealParams, CreatePlannedMealParams } from 'librechat-data-provider';
import { 
  createPlannedMeal as createPlannedMealApi,
  updatePlannedMeal as updatePlannedMealApi, 
  deletePlannedMeal as deletePlannedMealApi 
} from './api';

export function useUpdatePlannedMealMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plannedMealId, params }: { plannedMealId: string; params: UpdatePlannedMealParams }) =>
      updatePlannedMealApi(plannedMealId, params),
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.mealPlannerCalendar]);
      queryClient.invalidateQueries([QueryKeys.journal]);
    },
  });
}

export function useDeletePlannedMealMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plannedMealId: string) => deletePlannedMealApi(plannedMealId),
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.mealPlannerCalendar]);
      queryClient.invalidateQueries([QueryKeys.journal]);
    },
  });
}

export function useCreatePlannedMealMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreatePlannedMealParams) => createPlannedMealApi(params),
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKeys.mealPlannerCalendar]);
      queryClient.invalidateQueries([QueryKeys.journal]);
    },
  });
}
