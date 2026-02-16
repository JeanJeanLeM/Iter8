import { Schema } from 'mongoose';
import type { IRealization } from '~/types/realization';

const realizationSchema: Schema<IRealization> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      index: true,
      required: true,
    },
    realizedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    comment: { type: String },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
  },
  { timestamps: true },
);

realizationSchema.index({ userId: 1, realizedAt: -1 });
realizationSchema.index({ userId: 1, recipeId: 1 });

export default realizationSchema;
