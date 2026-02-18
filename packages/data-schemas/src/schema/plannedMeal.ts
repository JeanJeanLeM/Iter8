import { Schema } from 'mongoose';
import type { IPlannedMeal } from '~/types/plannedMeal';

const plannedMealSchema: Schema<IPlannedMeal> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    slot: {
      type: String,
      enum: ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'],
      required: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      default: null,
    },
    recipeTitle: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true },
);

plannedMealSchema.index({ userId: 1, date: 1 });
plannedMealSchema.index({ userId: 1, date: 1, slot: 1 });

export default plannedMealSchema;
