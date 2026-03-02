import React, { useState, useMemo } from 'react';
import { useDocumentTitle, useLocalize } from '~/hooks';
import {
  useShoppingListQuery,
  useCreateShoppingListItemMutation,
  useUpdateShoppingListItemMutation,
  useDeleteShoppingListItemMutation,
  useIngredientsQuery,
} from '~/data-provider';
import type { TShoppingListItem } from 'librechat-data-provider';
import { Spinner, Button } from '@librechat/client';
import { Plus, Check, Trash2 } from 'lucide-react';
import { formatShoppingItemLabel, sortShoppingItems } from '~/utils/shoppingList';
import {
  buildIngredientImageMap,
  getIngredientFallbackLetter,
  resolveIngredientImageUrl,
} from '~/utils/ingredientImages';
import { cn } from '~/utils';

export default function ShoppingListView() {
  const localize = useLocalize();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState('');

  const { data, isLoading, isFetching } = useShoppingListQuery();
  const { data: ingredientsData } = useIngredientsQuery();
  const createMutation = useCreateShoppingListItemMutation();
  const updateMutation = useUpdateShoppingListItemMutation();
  const deleteMutation = useDeleteShoppingListItemMutation();

  const items = data?.items ?? [];
  const toBuy = useMemo(
    () => sortShoppingItems(items.filter((i) => !i.bought)),
    [items],
  );
  const plannedToBuy = useMemo(
    () => toBuy.filter((i) => !i.sourceRealizationId),
    [toBuy],
  );
  const fromJournalToBuy = useMemo(
    () => toBuy.filter((i) => !!i.sourceRealizationId),
    [toBuy],
  );
  const bought = useMemo(
    () => sortShoppingItems(items.filter((i) => i.bought)),
    [items],
  );
  const ingredientImageMap = useMemo(
    () => buildIngredientImageMap(ingredientsData?.ingredients),
    [ingredientsData?.ingredients],
  );

  useDocumentTitle(`${localize('com_ui_shopping_list')} | CookIter8`);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const payload = {
      name: trimmedName,
      quantity: quantity.trim() ? Number(quantity) : undefined,
      unit: unit.trim() || undefined,
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        setName('');
        setQuantity('');
        setUnit('');
      },
    });
  };

  const handleToggleBought = (item: TShoppingListItem) => {
    updateMutation.mutate({ id: item._id, data: { bought: !item.bought } });
  };

  const handleDelete = (e: React.MouseEvent, item: TShoppingListItem) => {
    e.stopPropagation();
    deleteMutation.mutate(item._id);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border-medium px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">
          {localize('com_ui_shopping_list')}
        </h1>

        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={localize('com_ui_shopping_list_name_placeholder')}
            className="min-w-[140px] flex-1 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
            aria-label={localize('com_ui_shopping_list_name_placeholder')}
          />
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={localize('com_ui_shopping_list_quantity_placeholder')}
            className="w-20 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
            aria-label={localize('com_ui_shopping_list_quantity_placeholder')}
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder={localize('com_ui_shopping_list_unit_placeholder')}
            className="w-24 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
            aria-label={localize('com_ui_shopping_list_unit_placeholder')}
          />
          <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4" />
            {localize('com_ui_shopping_list_add')}
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="text-text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Planifié */}
            <section>
              <h2 className="mb-2 text-sm font-medium text-text-secondary">
                {localize('com_ui_shopping_list_planned')}
              </h2>
              {plannedToBuy.length === 0 && !isFetching ? (
                <p className="py-4 text-sm text-text-tertiary">
                  {localize('com_ui_shopping_list_empty_planned')}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {plannedToBuy.map((item) => (
                    <ShoppingListItemCard
                      key={item._id}
                      item={item}
                      imageUrl={resolveIngredientImageUrl(item.name, ingredientImageMap)}
                      onToggle={() => handleToggleBought(item)}
                      onDelete={(e) => handleDelete(e, item)}
                      isUpdating={updateMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Journal de cuisine */}
            <section>
              <h2 className="mb-2 text-sm font-medium text-text-secondary">
                {localize('com_ui_shopping_list_from_journal')}
              </h2>
              {fromJournalToBuy.length === 0 && !isFetching ? (
                <p className="py-4 text-sm text-text-tertiary">
                  {localize('com_ui_shopping_list_empty_from_journal')}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {fromJournalToBuy.map((item) => (
                    <ShoppingListItemCard
                      key={item._id}
                      item={item}
                      imageUrl={resolveIngredientImageUrl(item.name, ingredientImageMap)}
                      onToggle={() => handleToggleBought(item)}
                      onDelete={(e) => handleDelete(e, item)}
                      isUpdating={updateMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Achetés */}
            <section>
              <h2 className="mb-2 text-sm font-medium text-text-secondary">
                {localize('com_ui_shopping_list_bought')}
              </h2>
              {bought.length === 0 ? (
                <p className="py-4 text-sm text-text-tertiary">
                  {localize('com_ui_shopping_list_empty_bought')}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {bought.map((item) => (
                    <ShoppingListItemCard
                      key={item._id}
                      item={item}
                      imageUrl={resolveIngredientImageUrl(item.name, ingredientImageMap)}
                      bought
                      onToggle={() => handleToggleBought(item)}
                      onDelete={(e) => handleDelete(e, item)}
                      isUpdating={updateMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingListItemCard({
  item,
  imageUrl,
  bought,
  onToggle,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  item: TShoppingListItem;
  imageUrl?: string;
  bought?: boolean;
  onToggle: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const localize = useLocalize();
  const label = formatShoppingItemLabel(item);
  const fallbackLetter = getIngredientFallbackLetter(item.name);
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border-medium bg-surface-primary-alt p-3 transition-colors',
        bought && 'opacity-75',
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-medium bg-surface-active-alt/50">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-2xl font-bold text-text-primary" aria-hidden>
            {fallbackLetter}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={isUpdating}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors',
          bought
            ? 'border-green-500 bg-green-500/20 text-green-600'
            : 'border-border-strong text-text-tertiary hover:border-border-strong hover:bg-surface-active-alt',
        )}
        aria-label={
          bought
            ? localize('com_ui_shopping_list_untick')
            : localize('com_ui_shopping_list_tick')
        }
      >
        {bought ? <Check className="h-4 w-4" /> : null}
      </button>
      <span
        className={cn(
          'min-w-0 flex-1 text-sm text-text-primary',
          bought && 'line-through text-text-tertiary',
        )}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="rounded p-1 text-text-tertiary hover:bg-surface-active-alt hover:text-text-primary disabled:opacity-50"
        aria-label={localize('com_ui_shopping_list_delete')}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}