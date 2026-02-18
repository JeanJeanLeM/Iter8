import shoppingListItemSchema from '~/schema/shoppingListItem';
import type { IShoppingListItem } from '~/types/shoppingListItem';

export function createShoppingListItemModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.ShoppingListItem ||
    mongoose.model<IShoppingListItem>('ShoppingListItem', shoppingListItemSchema)
  );
}
