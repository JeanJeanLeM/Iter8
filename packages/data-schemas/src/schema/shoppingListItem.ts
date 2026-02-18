import { Schema } from 'mongoose';
import type { IShoppingListItem } from '~/types/shoppingListItem';

const shoppingListItemSchema: Schema<IShoppingListItem> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number },
    unit: { type: String },
    bought: { type: Boolean, default: false, index: true },
    sourceRealizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Realization',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

shoppingListItemSchema.index({ userId: 1, bought: 1, createdAt: -1 });
shoppingListItemSchema.index({ userId: 1, sourceRealizationId: 1 });

export default shoppingListItemSchema;
