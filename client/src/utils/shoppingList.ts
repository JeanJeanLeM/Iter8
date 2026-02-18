import type { TShoppingListItem } from 'librechat-data-provider';

/**
 * Format a shopping list item for display: "pommes", "10 pommes", or "5 kg pommes".
 * Default: no unit.
 */
export function formatShoppingItemLabel(item: {
  name: string;
  quantity?: number;
  unit?: string;
}): string {
  const { name, quantity, unit } = item;
  const trimmedName = name.trim();
  if (quantity != null && unit) {
    return `${quantity} ${unit} ${trimmedName}`;
  }
  if (quantity != null) {
    return `${quantity} ${trimmedName}`;
  }
  return trimmedName;
}

export function sortShoppingItems(
  items: TShoppingListItem[],
  order: 'createdAtDesc' | 'createdAtAsc' = 'createdAtDesc',
): TShoppingListItem[] {
  const sorted = [...items];
  const sign = order === 'createdAtDesc' ? -1 : 1;
  sorted.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sign * (ta - tb);
  });
  return sorted;
}
