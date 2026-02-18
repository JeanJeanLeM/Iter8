import { Types } from 'mongoose';
import type {
  IShoppingListItemLean,
  GetShoppingListParams,
  ShoppingListResult,
  CreateShoppingListItemParams,
  CreateShoppingListItemsParams,
  UpdateShoppingListItemParams,
} from '~/types/shoppingListItem';

export function createShoppingListItemMethods(mongoose: typeof import('mongoose')) {
  const ShoppingListItem = mongoose.models.ShoppingListItem;
  const Realization = mongoose.models.Realization;

  async function getShoppingList(
    params: GetShoppingListParams,
  ): Promise<ShoppingListResult> {
    const { userId, bought } = params;
    const userIdObj = new Types.ObjectId(userId as string);
    const filter: Record<string, unknown> = { userId: userIdObj };
    if (typeof bought === 'boolean') {
      filter.bought = bought;
    }
    const docs = (await ShoppingListItem.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec()) as IShoppingListItemLean[];
    return { items: docs };
  }

  async function createShoppingListItem(
    data: CreateShoppingListItemParams,
  ): Promise<IShoppingListItemLean> {
    const userIdObj = new Types.ObjectId(data.userId as string);
    const doc = await ShoppingListItem.create({
      userId: userIdObj,
      name: data.name.trim(),
      quantity: data.quantity,
      unit: data.unit?.trim() || undefined,
      bought: false,
    });
    return doc.toObject() as IShoppingListItemLean;
  }

  async function createShoppingListItems(
    data: CreateShoppingListItemsParams,
  ): Promise<IShoppingListItemLean[]> {
    const userIdObj = new Types.ObjectId(data.userId as string);
    const sourceRealizationIdObj =
      data.sourceRealizationId != null
        ? new Types.ObjectId(data.sourceRealizationId as string)
        : undefined;
    const docs = await ShoppingListItem.insertMany(
      data.items.map((item) => ({
        userId: userIdObj,
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit?.trim() || undefined,
        bought: false,
        ...(sourceRealizationIdObj != null && {
          sourceRealizationId: sourceRealizationIdObj,
        }),
      })),
    );
    return docs.map((d) => d.toObject() as IShoppingListItemLean);
  }

  async function updateShoppingListItem(
    userId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    update: UpdateShoppingListItemParams,
  ): Promise<IShoppingListItemLean | null> {
    const filter = {
      _id: new Types.ObjectId(itemId as string),
      userId: new Types.ObjectId(userId as string),
    };
    const payload: Record<string, unknown> = {};
    if (update.name !== undefined) payload.name = update.name.trim();
    if (update.quantity !== undefined) payload.quantity = update.quantity;
    if (update.unit !== undefined) payload.unit = update.unit?.trim() || undefined;
    if (update.bought !== undefined) payload.bought = update.bought;

    const doc = await ShoppingListItem.findOneAndUpdate(
      filter,
      { $set: payload },
      { new: true },
    )
      .lean()
      .exec();
    return doc as IShoppingListItemLean | null;
  }

  async function deleteShoppingListItem(
    userId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
  ): Promise<boolean> {
    const result = await ShoppingListItem.findOneAndDelete({
      _id: new Types.ObjectId(itemId as string),
      userId: new Types.ObjectId(userId as string),
    }).exec();
    return !!result;
  }

  /** Remove shopping list items linked to realizations whose planned date is in the past. */
  async function deleteShoppingListItemsForPastRealizations(
    userId: string | Types.ObjectId,
  ): Promise<number> {
    const userIdObj = new Types.ObjectId(userId as string);
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const pastRealizations = await Realization.find({
      userId: userIdObj,
      realizedAt: { $lt: startOfToday },
    })
      .select('_id')
      .lean()
      .exec();
    const pastIds = pastRealizations.map((r) => r._id);
    if (pastIds.length === 0) return 0;
    const result = await ShoppingListItem.deleteMany({
      userId: userIdObj,
      sourceRealizationId: { $in: pastIds },
    }).exec();
    return result.deletedCount ?? 0;
  }

  /** Remove shopping list items linked to a specific realization (e.g. when user deletes the journal entry). */
  async function deleteShoppingListItemsByRealizationId(
    userId: string | Types.ObjectId,
    realizationId: string | Types.ObjectId,
  ): Promise<number> {
    const result = await ShoppingListItem.deleteMany({
      userId: new Types.ObjectId(userId as string),
      sourceRealizationId: new Types.ObjectId(realizationId as string),
    }).exec();
    return result.deletedCount ?? 0;
  }

  return {
    getShoppingList,
    createShoppingListItem,
    createShoppingListItems,
    updateShoppingListItem,
    deleteShoppingListItem,
    deleteShoppingListItemsForPastRealizations,
    deleteShoppingListItemsByRealizationId,
  };
}

export type ShoppingListItemMethods = ReturnType<typeof createShoppingListItemMethods>;
