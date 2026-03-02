import type { Types, Document } from 'mongoose';

export interface IRecipeIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  /** Section label for multi-part recipes (e.g. "Pour la pâte", "Pour le glaçage"). */
  section?: string;
}

export interface IRecipeStep {
  order: number;
  instruction: string;
  ingredientsUsed?: string[];
  /** Duration in minutes for this step (e.g. cooking time). Used for timer in step-by-step mode. */
  durationMinutes?: number;
}

/** Duration in minutes, or object with prep/cook/total in minutes */
export type IRecipeDuration = number | { prep?: number; cook?: number; total?: number };

export interface IRecipe extends Document {
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  variationNote?: string;
  objective?: string;
  emoji?: string;
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
  /** Rest / fermentation / marinade time in minutes (e.g. 720 for 12h). */
  restTimeMinutes?: number;
  /** Max storage in days (e.g. 2 for 48h). */
  maxStorageDays?: number;
  /** Conversation where this recipe was created (chat that mentions it). Used for "go to discussion" link. */
  conversationId?: string | null;
  /** Whether the recipe is visible to other users in Explore. Default: private. */
  visibility?: 'private' | 'public';
  /** When this recipe was derived from another user's public recipe. */
  sourceRecipeId?: Types.ObjectId | null;
  /** Owner (userId) of the source recipe when derived from another user. */
  sourceOwnerId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRecipeLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  variationNote?: string;
  objective?: string;
  emoji?: string;
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
  restTimeMinutes?: number;
  maxStorageDays?: number;
  /** Conversation where this recipe was created (chat that mentions it). */
  conversationId?: string | null;
  visibility?: 'private' | 'public';
  sourceRecipeId?: Types.ObjectId | null;
  sourceOwnerId?: Types.ObjectId | null;
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

export type RecipeVisibility = 'private' | 'public';

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
  /** Listing mode: mine (default) or explore (public roots from all users). */
  mode?: 'mine' | 'explore';
  /** For mode=mine: filter by visibility (all = no filter). */
  visibilityFilter?: 'all' | RecipeVisibility;
  /** For mode=mine: include recipes from other users that are public and derived from my recipes (sourceOwnerId = me). */
  includeOthersDerivedFromMine?: boolean;
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
