import { Schema } from 'mongoose';
import type { IRecipe } from '~/types/recipe';

const ingredientSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: { type: String },
    note: { type: String },
    section: { type: String },
    state: { type: String },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    ingredientsUsed: { type: [String], default: [] },
    durationMinutes: { type: Number },
  },
  { _id: false },
);

const recipeSchema: Schema<IRecipe> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      default: null,
      index: true,
    },
    variationNote: { type: String },
    objective: { type: String },
    emoji: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    portions: { type: Number },
    duration: { type: Schema.Types.Mixed },
    ingredients: { type: [ingredientSchema], default: [] },
    steps: { type: [stepSchema], default: [] },
    equipment: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    dishType: { type: String, enum: ['entree', 'plat', 'dessert'] },
    cuisineType: { type: [String], default: [] },
    diet: { type: [String], default: [] },
    imageUrl: { type: String },
    images: {
      type: [
        {
          url: { type: String, required: true },
          source: { type: String, enum: ['ai', 'upload'], required: true },
        },
      ],
      default: undefined,
    },
    restTimeMinutes: { type: Number },
    maxStorageDays: { type: Number },
    /** Conversation where this recipe was created (chat that mentions it). */
    conversationId: { type: String, default: null },
    /** Whether the recipe is visible to other users in Explore. Default: private. */
    visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
    /** When this recipe was derived from another user's public recipe. */
    sourceRecipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', default: null },
    /** Owner (userId) of the source recipe when derived from another user. */
    sourceOwnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

recipeSchema.index({ userId: 1, createdAt: -1 });
recipeSchema.index({ userId: 1, parentId: 1 });
recipeSchema.index({ visibility: 1, parentId: 1 });
recipeSchema.index({ sourceOwnerId: 1, visibility: 1 });

export default recipeSchema;
