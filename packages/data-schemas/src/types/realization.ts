import type { Types, Document } from 'mongoose';

export interface IRealization extends Document {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  realizedAt: Date;
  comment?: string;
  commentId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRealizationLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  realizedAt: Date;
  comment?: string;
  commentId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

/** List item with recipe title and image for display */
export interface IRealizationWithRecipe extends IRealizationLean {
  recipeTitle?: string;
  recipeImageUrl?: string;
  recipeParentId?: Types.ObjectId | null;
  variationNote?: string;
}

export type RealizationSort = 'realizedAtDesc' | 'realizedAtAsc';

export interface GetRealizationsParams {
  userId: string | Types.ObjectId;
  recipeId?: string | Types.ObjectId;
  fromDate?: Date;
  toDate?: Date;
  sort?: RealizationSort;
}

export interface RealizationListResult {
  realizations: IRealizationWithRecipe[];
}

export interface CreateRealizationParams {
  userId: string | Types.ObjectId;
  recipeId: string | Types.ObjectId;
  realizedAt?: Date;
  comment?: string;
}
