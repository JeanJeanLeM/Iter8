import { Schema } from 'mongoose';
import type { IRecipeVote } from '~/types/recipe';

const recipeVoteSchema: Schema<IRecipeVote> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    value: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
  },
  { timestamps: true },
);

recipeVoteSchema.index({ userId: 1, recipeId: 1 }, { unique: true });
recipeVoteSchema.index({ recipeId: 1 });

export default recipeVoteSchema;
