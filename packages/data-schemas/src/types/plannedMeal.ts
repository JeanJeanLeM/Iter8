import type { Types, Document } from 'mongoose';

export type PlannedMealSlot = 'breakfast' | 'collation' | 'lunch' | 'dinner' | 'sortie';

export interface IPlannedMeal extends Document {
  userId: Types.ObjectId;
  date: Date;
  slot: PlannedMealSlot;
  recipeId?: Types.ObjectId | null;
  recipeTitle: string;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPlannedMealLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  slot: PlannedMealSlot;
  recipeId?: Types.ObjectId | null;
  recipeTitle: string;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetPlannedMealsParams {
  userId: string | Types.ObjectId;
  fromDate?: Date;
  toDate?: Date;
}

export interface PlannedMealListResult {
  plannedMeals: IPlannedMealLean[];
}

export interface CreatePlannedMealParams {
  userId: string | Types.ObjectId;
  date: Date;
  slot: PlannedMealSlot;
  recipeId?: string | Types.ObjectId | null;
  recipeTitle: string;
  comment?: string;
}

export interface CreatePlannedMealsParams {
  userId: string | Types.ObjectId;
  plannedMeals: Array<{
    date: Date;
    slot: PlannedMealSlot;
    recipeId?: string | Types.ObjectId | null;
    recipeTitle: string;
    comment?: string;
  }>;
}

export interface UpdatePlannedMealParams {
  date?: Date;
  slot?: PlannedMealSlot;
  recipeId?: string | Types.ObjectId | null;
  recipeTitle?: string;
  comment?: string;
}
