import plannedMealSchema from '~/schema/plannedMeal';
import type { IPlannedMeal } from '~/types/plannedMeal';

export function createPlannedMealModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.PlannedMeal ||
    mongoose.model<IPlannedMeal>('PlannedMeal', plannedMealSchema)
  );
}
