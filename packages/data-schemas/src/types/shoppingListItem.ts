import type { Types, Document } from 'mongoose';

export interface IShoppingListItem extends Document {
  userId: Types.ObjectId;
  name: string;
  quantity?: number;
  unit?: string;
  bought: boolean;
  sourceRealizationId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShoppingListItemLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  quantity?: number;
  unit?: string;
  bought: boolean;
  sourceRealizationId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetShoppingListParams {
  userId: string | Types.ObjectId;
  bought?: boolean;
}

export interface ShoppingListResult {
  items: IShoppingListItemLean[];
}

export interface CreateShoppingListItemParams {
  userId: string | Types.ObjectId;
  name: string;
  quantity?: number;
  unit?: string;
}

export interface CreateShoppingListItemsParams {
  userId: string | Types.ObjectId;
  items: Array<{ name: string; quantity?: number; unit?: string }>;
  /** When set, items are linked to this journal entry; they can be auto-removed when the date is past. */
  sourceRealizationId?: string | Types.ObjectId | null;
}

export interface UpdateShoppingListItemParams {
  name?: string;
  quantity?: number;
  unit?: string;
  bought?: boolean;
}
