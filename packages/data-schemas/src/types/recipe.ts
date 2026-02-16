import type { Types, Document } from 'mongoose';

export interface IRecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

export interface IRecipeStep {
  order: number;
  instruction: string;
  ingredientsUsed?: string[];
}

/** Duration in minutes, or object with prep/cook/total in minutes */
export type IRecipeDuration = number | { prep?: number; cook?: number; total?: number };

export interface IRecipe extends Document {
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  variationNote?: string;
  objective?: string;
  title: string;
  description?: string;
  portions?: number;
  duration?: IRecipeDuration;
  ingredients: IRecipeIngredient[];
  steps: IRecipeStep[];
  equipment?: string[];
  tags?: string[];
  dishType?: 'entree' | 'plat' | 'dessert';
  cuisineType?: string[];
  diet?: string[];
  imageUrl?: string;
  /** Gallery: multiple images (IA + upload). When set, imageUrl is kept in sync with first image for cards. */
  images?: Array<{ url: string; source: 'ai' | 'upload' }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRecipeLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  variationNote?: string;
  objective?: string;
  title: string;
  description?: string;
  portions?: number;
  duration?: IRecipeDuration;
  ingredients: IRecipeIngredient[];
  steps: IRecipeStep[];
  equipment?: string[];
  tags?: string[];
  dishType?: 'entree' | 'plat' | 'dessert';
  cuisineType?: string[];
  diet?: string[];
  imageUrl?: string;
  images?: Array<{ url: string; source: 'ai' | 'upload' }>;
  variationCount?: number;
  score?: number;
  userVote?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRecipeVote extends Document {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  value: 1 | -1;
  updatedAt?: Date;
}

export interface IRecipeVoteLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  value: 1 | -1;
  updatedAt?: Date;
}

export interface GetRecipesParams {
  userId: string | Types.ObjectId;
  ingredientsInclude?: string[];
  ingredientsExclude?: string[];
  dishType?: string;
  cuisineType?: string[];
  diet?: string[];
  parentsOnly?: boolean;
  parentId?: string | Types.ObjectId | null;
  /** When set, fetch only recipes with these IDs (ignores parentsOnly/parentId) */
  ids?: (string | Types.ObjectId)[];
}

export interface RecipeListResult {
  recipes: IRecipeLean[];
}

export interface SetRecipeVoteParams {
  userId: string | Types.ObjectId;
  recipeId: string | Types.ObjectId;
  value: 1 | -1;
}

export interface RecipeVoteResult {
  ok: boolean;
  score?: number;
}
