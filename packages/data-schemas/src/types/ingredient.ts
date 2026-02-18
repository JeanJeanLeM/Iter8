import type { Types, Document } from 'mongoose';

export interface INutritionMicros {
  sodiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  vitaminCMg?: number;
  vitaminARaeUg?: number;
  vitaminDIu?: number;
  folateUg?: number;
  vitaminB12Ug?: number;
  zincMg?: number;
  seleniumUg?: number;
  magnesiumMg?: number;
}

export interface IIngredient extends Document {
  name: string;
  displayName?: string;
  imageUrl?: string;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  fiberG?: number;
  nutritionMicros?: INutritionMicros;
  usdaFdcId?: number | string;
  usdaDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IIngredientLean {
  _id: Types.ObjectId;
  name: string;
  displayName?: string;
  imageUrl?: string;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  fiberG?: number;
  nutritionMicros?: INutritionMicros;
  usdaFdcId?: number | string;
  usdaDescription?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IngredientsListResult {
  ingredients: IIngredientLean[];
}

export interface UpdateIngredientParams {
  displayName?: string;
  imageUrl?: string;
  /** USDA nutrition (from enrich-usda) */
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbohydrateG?: number;
  fiberG?: number;
  nutritionMicros?: INutritionMicros;
  usdaFdcId?: number | string;
  usdaDescription?: string;
}
