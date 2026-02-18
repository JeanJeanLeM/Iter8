import { Types } from 'mongoose';
import type {
  IIngredientLean,
  IngredientsListResult,
  UpdateIngredientParams,
} from '~/types/ingredient';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function toDisplayName(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function createIngredientMethods(mongoose: typeof import('mongoose')) {
  const Ingredient = mongoose.models.Ingredient;
  const Recipe = mongoose.models.Recipe;
  const ShoppingListItem = mongoose.models.ShoppingListItem;

  async function getIngredients(): Promise<IngredientsListResult> {
    const docs = (await Ingredient.find({})
      .sort({ displayName: 1, name: 1 })
      .lean()
      .exec()) as IIngredientLean[];
    return { ingredients: docs };
  }

  async function getIngredientById(
    ingredientId: string | Types.ObjectId,
  ): Promise<IIngredientLean | null> {
    const doc = await Ingredient.findById(new Types.ObjectId(ingredientId as string))
      .lean()
      .exec();
    return doc as IIngredientLean | null;
  }

  /** Create an ingredient by name (or return existing if same normalized name). */
  async function createIngredient(params: {
    name: string;
    displayName?: string;
  }): Promise<IIngredientLean> {
    const norm = normalizeName(params.name);
    if (!norm) {
      throw new Error('Ingredient name is required.');
    }
    const existing = await Ingredient.findOne({ name: norm }).lean().exec();
    if (existing) {
      return existing as IIngredientLean;
    }
    const displayName =
      params.displayName?.trim() || toDisplayName(params.name);
    const doc = await Ingredient.create({
      name: norm,
      displayName,
    });
    return doc.toObject() as IIngredientLean;
  }

  /** Sync ingredient catalog from a user's recipes and shopping list (adds new names). */
  async function syncIngredientsFromUserData(
    userId: string | Types.ObjectId,
  ): Promise<{ added: number }> {
    const userIdObj = new Types.ObjectId(userId as string);
    const recipeDocs = await Recipe.find(
      { userId: userIdObj, 'ingredients.0': { $exists: true } },
      { ingredients: 1 },
    )
      .lean()
      .exec();
    const shoppingDocs = await ShoppingListItem.find(
      { userId: userIdObj },
      { name: 1 },
    )
      .lean()
      .exec();

    const names = new Set<string>();
    for (const r of recipeDocs) {
      const ingList = (r as { ingredients?: Array<{ name?: string }> }).ingredients;
      if (ingList) {
        for (const ing of ingList) {
          if (ing?.name?.trim()) names.add(normalizeName(ing.name));
        }
      }
    }
    for (const s of shoppingDocs) {
      const name = (s as { name?: string }).name;
      if (name?.trim()) names.add(normalizeName(name));
    }

    let added = 0;
    for (const norm of names) {
      const existing = await Ingredient.findOne({ name: norm }).exec();
      if (!existing) {
        await Ingredient.create({
          name: norm,
          displayName: toDisplayName(norm),
        });
        added++;
      }
    }
    return { added };
  }

  async function updateIngredient(
    ingredientId: string | Types.ObjectId,
    update: UpdateIngredientParams,
  ): Promise<IIngredientLean | null> {
    const payload: Record<string, unknown> = {};
    if (update.displayName !== undefined)
      payload.displayName = update.displayName.trim() || undefined;
    if (update.imageUrl !== undefined)
      payload.imageUrl = update.imageUrl.trim() || undefined;
    if (update.energyKcal !== undefined && Number.isFinite(update.energyKcal))
      payload.energyKcal = update.energyKcal;
    if (update.proteinG !== undefined && Number.isFinite(update.proteinG))
      payload.proteinG = update.proteinG;
    if (update.fatG !== undefined && Number.isFinite(update.fatG))
      payload.fatG = update.fatG;
    if (update.carbohydrateG !== undefined && Number.isFinite(update.carbohydrateG))
      payload.carbohydrateG = update.carbohydrateG;
    if (update.fiberG !== undefined && Number.isFinite(update.fiberG))
      payload.fiberG = update.fiberG;
    if (update.nutritionMicros != null && typeof update.nutritionMicros === 'object')
      payload.nutritionMicros = update.nutritionMicros;
    if (update.usdaFdcId !== undefined)
      payload.usdaFdcId = update.usdaFdcId;
    if (update.usdaDescription !== undefined)
      payload.usdaDescription = update.usdaDescription;

    const doc = await Ingredient.findByIdAndUpdate(
      new Types.ObjectId(ingredientId as string),
      { $set: payload },
      { new: true },
    )
      .lean()
      .exec();
    return doc as IIngredientLean | null;
  }

  return {
    getIngredients,
    getIngredientById,
    createIngredient,
    syncIngredientsFromUserData,
    updateIngredient,
  };
}

export type IngredientMethods = ReturnType<typeof createIngredientMethods>;
