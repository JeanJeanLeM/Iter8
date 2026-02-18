import React, { useState, useEffect, useMemo } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  Button,
  useToastContext,
} from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useRecipesQuery, useCreatePlannedMealMutation } from '~/data-provider';
import type { MealPlanSlot } from 'librechat-data-provider';
import { Search } from 'lucide-react';
import { cn } from '~/utils';

const SLOTS: { value: MealPlanSlot; labelKey: string }[] = [
  { value: 'breakfast', labelKey: 'com_ui_meal_planner_slot_breakfast' },
  { value: 'collation', labelKey: 'com_ui_meal_planner_slot_collation' },
  { value: 'lunch', labelKey: 'com_ui_meal_planner_slot_lunch' },
  { value: 'dinner', labelKey: 'com_ui_meal_planner_slot_dinner' },
  { value: 'sortie', labelKey: 'com_ui_meal_planner_slot_sortie' },
];

const FREE_RECIPE_ID = '__free__';

type DishTypeFilter = '' | 'entree' | 'plat' | 'dessert';

interface AddPlannedMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialSlot?: MealPlanSlot;
}

export default function AddPlannedMealDialog({
  open,
  onOpenChange,
  initialDate,
  initialSlot,
}: AddPlannedMealDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<MealPlanSlot>('dinner');
  const [recipeId, setRecipeId] = useState<string>(FREE_RECIPE_ID);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [comment, setComment] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dishTypeFilter, setDishTypeFilter] = useState<DishTypeFilter>('');

  useEffect(() => {
    if (open) {
      setDate(initialDate || '');
      setSlot(initialSlot || 'dinner');
      setRecipeId(FREE_RECIPE_ID);
      setRecipeTitle('');
      setComment('');
      setSearchText('');
      setDishTypeFilter('');
    }
  }, [open, initialDate, initialSlot]);

  const parentsParams = useMemo(
    () => ({
      parentsOnly: true as const,
      dishType: dishTypeFilter || undefined,
    }),
    [dishTypeFilter],
  );
  const { data: recipesData } = useRecipesQuery(parentsParams, { enabled: open });
  const parentRecipes = recipesData?.recipes ?? [];

  const filteredRecipes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return parentRecipes;
    return parentRecipes.filter((r) => r.title?.toLowerCase().includes(q));
  }, [parentRecipes, searchText]);

  const createMutation = useCreatePlannedMealMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_planned_meal_created') });
      onOpenChange(false);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_planned_meal_create_error') });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      recipeId === FREE_RECIPE_ID
        ? recipeTitle.trim()
        : parentRecipes.find((r) => r._id === recipeId)?.title ?? '';
    if (!title) {
      showToast({ message: localize('com_ui_journal_recipe_required') });
      return;
    }
    createMutation.mutate({
      date: new Date(date),
      slot,
      recipeId: recipeId === FREE_RECIPE_ID ? null : recipeId,
      recipeTitle: title,
      comment: comment.trim() || undefined,
    });
  };

  const handleRecipeSelect = (selectedRecipeId: string) => {
    setRecipeId(selectedRecipeId);
    if (selectedRecipeId !== FREE_RECIPE_ID) {
      const recipe = parentRecipes.find((r) => r._id === selectedRecipeId);
      if (recipe) {
        setRecipeTitle(recipe.title ?? '');
      }
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <OGDialogTitle>{localize('com_ui_planned_meal_add')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_journal_date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-border-medium bg-surface-primary px-3 py-2 text-text-primary"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_meal_planner_slot')}
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as MealPlanSlot)}
                className="w-full rounded border border-border-medium bg-surface-primary px-3 py-2 text-text-primary"
              >
                {SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {localize(s.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_recipe')}
            </label>
            <div className="mb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={localize('com_ui_journal_search_recipe')}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded border border-border-medium bg-surface-primary py-2 pl-10 pr-3 text-sm text-text-primary"
                />
              </div>
              <select
                value={dishTypeFilter}
                onChange={(e) => setDishTypeFilter(e.target.value as DishTypeFilter)}
                className="rounded border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary"
              >
                <option value="">{localize('com_ui_journal_dish_type_all')}</option>
                <option value="entree">{localize('com_ui_journal_dish_type_starter')}</option>
                <option value="plat">{localize('com_ui_journal_dish_type_main')}</option>
                <option value="dessert">{localize('com_ui_journal_dish_type_dessert')}</option>
              </select>
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto rounded border border-border-medium bg-surface-primary-alt p-2">
              <button
                type="button"
                onClick={() => handleRecipeSelect(FREE_RECIPE_ID)}
                className={cn(
                  'w-full rounded px-3 py-2 text-left text-sm transition-colors',
                  recipeId === FREE_RECIPE_ID
                    ? 'bg-primary text-white'
                    : 'hover:bg-surface-hover text-text-primary',
                )}
              >
                {localize('com_ui_journal_free_text')}
              </button>
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe._id}
                  type="button"
                  onClick={() => handleRecipeSelect(recipe._id)}
                  className={cn(
                    'w-full rounded px-3 py-2 text-left text-sm transition-colors',
                    recipeId === recipe._id
                      ? 'bg-primary text-white'
                      : 'hover:bg-surface-hover text-text-primary',
                  )}
                >
                  {recipe.title}
                </button>
              ))}
            </div>
          </div>

          {recipeId === FREE_RECIPE_ID && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_journal_recipe_title')}
              </label>
              <input
                type="text"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                placeholder={localize('com_ui_journal_recipe_title_placeholder')}
                className="w-full rounded border border-border-medium bg-surface-primary px-3 py-2 text-text-primary"
                required={recipeId === FREE_RECIPE_ID}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={localize('com_ui_journal_comment_placeholder')}
              rows={3}
              className="w-full rounded border border-border-medium bg-surface-primary px-3 py-2 text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isLoading}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? localize('com_ui_loading') : localize('com_ui_add')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
