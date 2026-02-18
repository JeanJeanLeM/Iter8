import { Types } from 'mongoose';
import type {
  IPlannedMealLean,
  GetPlannedMealsParams,
  PlannedMealListResult,
  CreatePlannedMealParams,
  CreatePlannedMealsParams,
  UpdatePlannedMealParams,
} from '~/types/plannedMeal';

export function createPlannedMealMethods(mongoose: typeof import('mongoose')) {
  const PlannedMeal = mongoose.models?.PlannedMeal;
  if (!PlannedMeal) {
    throw new Error(
      'PlannedMeal model not registered. Ensure createModels(mongoose) runs before createMethods(mongoose).',
    );
  }

  async function getPlannedMeals(
    params: GetPlannedMealsParams,
  ): Promise<PlannedMealListResult> {
    const { userId, fromDate, toDate } = params;
    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId as string),
    };
    if (fromDate) {
      match.date = (match.date as Record<string, Date>) || {};
      (match.date as Record<string, Date>).$gte = fromDate;
    }
    if (toDate) {
      match.date = (match.date as Record<string, Date>) || {};
      (match.date as Record<string, Date>).$lte = toDate;
    }

    const docs = (await PlannedMeal.find(match)
      .sort({ date: 1, slot: 1 })
      .lean()
      .exec()) as IPlannedMealLean[];
    return { plannedMeals: docs };
  }

  async function getPlannedMeal(
    userId: string | Types.ObjectId,
    plannedMealId: string | Types.ObjectId,
  ): Promise<IPlannedMealLean | null> {
    const doc = (await PlannedMeal.findOne({
      _id: new Types.ObjectId(plannedMealId as string),
      userId: new Types.ObjectId(userId as string),
    })
      .lean()
      .exec()) as IPlannedMealLean | null;
    return doc;
  }

  async function createPlannedMeal(
    data: CreatePlannedMealParams,
  ): Promise<IPlannedMealLean> {
    const doc = await PlannedMeal.create({
      userId: new Types.ObjectId(data.userId as string),
      date: data.date,
      slot: data.slot,
      recipeId: data.recipeId ? new Types.ObjectId(data.recipeId as string) : null,
      recipeTitle: data.recipeTitle,
      comment: data.comment ?? undefined,
    });
    return doc.toObject() as IPlannedMealLean;
  }

  async function createPlannedMeals(
    params: CreatePlannedMealsParams,
  ): Promise<IPlannedMealLean[]> {
    const userIdObj = new Types.ObjectId(params.userId as string);
    const docs = await PlannedMeal.insertMany(
      params.plannedMeals.map((m) => ({
        userId: userIdObj,
        date: m.date,
        slot: m.slot,
        recipeId: m.recipeId ? new Types.ObjectId(m.recipeId as string) : null,
        recipeTitle: m.recipeTitle,
        comment: m.comment ?? undefined,
      })),
    );
    return docs.map((d) => d.toObject()) as IPlannedMealLean[];
  }

  async function updatePlannedMeal(
    userId: string | Types.ObjectId,
    plannedMealId: string | Types.ObjectId,
    updates: UpdatePlannedMealParams,
  ): Promise<IPlannedMealLean | null> {
    const updateFields: Record<string, unknown> = {};
    if (updates.date !== undefined) updateFields.date = updates.date;
    if (updates.slot !== undefined) updateFields.slot = updates.slot;
    if (updates.recipeId !== undefined) {
      updateFields.recipeId = updates.recipeId
        ? new Types.ObjectId(updates.recipeId as string)
        : null;
    }
    if (updates.recipeTitle !== undefined) updateFields.recipeTitle = updates.recipeTitle;
    if (updates.comment !== undefined) updateFields.comment = updates.comment;
    if (Object.keys(updateFields).length === 0) {
      return getPlannedMeal(userId, plannedMealId);
    }
    const doc = await PlannedMeal.findOneAndUpdate(
      {
        _id: new Types.ObjectId(plannedMealId as string),
        userId: new Types.ObjectId(userId as string),
      },
      { $set: updateFields },
      { new: true },
    )
      .lean()
      .exec();
    return doc as IPlannedMealLean | null;
  }

  async function deletePlannedMeal(
    userId: string | Types.ObjectId,
    plannedMealId: string | Types.ObjectId,
  ): Promise<boolean> {
    const result = await PlannedMeal.findOneAndDelete({
      _id: new Types.ObjectId(plannedMealId as string),
      userId: new Types.ObjectId(userId as string),
    }).exec();
    return !!result;
  }

  async function deletePlannedMealsByDateRange(
    userId: string | Types.ObjectId,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const result = await PlannedMeal.deleteMany({
      userId: new Types.ObjectId(userId as string),
      date: { $gte: fromDate, $lte: toDate },
    }).exec();
    return result.deletedCount ?? 0;
  }

  return {
    getPlannedMeals,
    getPlannedMeal,
    createPlannedMeal,
    createPlannedMeals,
    updatePlannedMeal,
    deletePlannedMeal,
    deletePlannedMealsByDateRange,
  };
}

export type PlannedMealMethods = ReturnType<typeof createPlannedMealMethods>;
