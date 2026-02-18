import React, { useState, useEffect, useMemo } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  Button,
  Spinner,
  useToastContext,
} from '@librechat/client';
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import {
  useUpdatePlannedMealMutation,
  useDeletePlannedMealMutation,
  useRecipesQuery,
  useGetStartupConfig,
} from '~/data-provider';
import type { TPlannedMeal, MealPlanSlot } from 'librechat-data-provider';
import { Trash2, Search, ExternalLink, PlusCircle } from 'lucide-react';
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

interface PlannedMealDetailDrawerProps {
  plannedMeal: TPlannedMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlannedMealDetailDrawer({
  plannedMeal,
  open,
  onOpenChange,
}: PlannedMealDetailDrawerProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { data: startupConfig } = useGetStartupConfig();
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<MealPlanSlot>('dinner');
  const [recipeId, setRecipeId] = useState<string>(FREE_RECIPE_ID);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [comment, setComment] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dishTypeFilter, setDishTypeFilter] = useState<DishTypeFilter>('');

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

  useEffect(() => {
    if (plannedMeal && open) {
      const d = typeof plannedMeal.date === 'string' ? plannedMeal.date.slice(0, 10) : '';
      setDate(d);
      setSlot((plannedMeal.slot as MealPlanSlot) || 'dinner');
      setRecipeId(plannedMeal.recipeId ?? FREE_RECIPE_ID);
      setRecipeTitle(plannedMeal.recipeTitle ?? '');
      setComment(plannedMeal.comment ?? '');
    }
  }, [plannedMeal, open]);

  const updateMutation = useUpdatePlannedMealMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_planned_meal_updated') });
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_planned_meal_update_error') });
    },
  });

  const deleteMutation = useDeletePlannedMealMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_planned_meal_deleted') });
      onOpenChange(false);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_planned_meal_delete_error') });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plannedMeal) return;
    const title =
      recipeId === FREE_RECIPE_ID
        ? recipeTitle.trim()
        : (parentRecipes.find((r) => r._id === recipeId)?.title ?? recipeTitle.trim());
    if (!title) {
      showToast({ message: localize('com_ui_journal_recipe_required') });
      return;
    }
    const params: {
      date?: string;
      slot?: MealPlanSlot;
      recipeId?: string | null;
      recipeTitle?: string;
      comment?: string;
    } = {};
    if (date) params.date = date;
    params.slot = slot;
    params.recipeId = recipeId === FREE_RECIPE_ID ? null : recipeId;
    params.recipeTitle = title;
    params.comment = comment.trim() || undefined;
    updateMutation.mutate({ plannedMealId: plannedMeal._id, params });
  };

  const handleDelete = () => {
    if (!plannedMeal) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(localize('com_ui_planned_meal_confirm_delete'))
    )
      return;
    deleteMutation.mutate(plannedMeal._id);
  };

  const handleOpenRecipe = () => {
    if (recipeId && recipeId !== FREE_RECIPE_ID) {
      onOpenChange(false);
      navigate(`/r/${recipeId}`);
    }
  };

  const handleCreateRecipe = () => {
    onOpenChange(false);
    const title = recipeTitle.trim() || plannedMeal?.recipeTitle?.trim() || '';
    const prompt = localize('com_ui_planned_meal_create_recipe_prompt', { title: title || '' });
    const params = new URLSearchParams();
    if (startupConfig?.defaultRecipeAgentId) {
      params.set('agent_id', startupConfig.defaultRecipeAgentId);
    }
    params.set('prompt', prompt);
    navigate(`/c/new?${params.toString()}`);
  };

  const isBusy = updateMutation.isLoading || deleteMutation.isLoading;
  const canOpenRecipe = recipeId && recipeId !== FREE_RECIPE_ID;

  if (!plannedMeal && open) return null;

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <OGDialogTitle>{localize('com_ui_planned_meal_edit')}</OGDialogTitle>
        {plannedMeal && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_meal_planner_date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary focus:border-border-strong focus:outline-none"
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
                className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary focus:border-border-strong focus:outline-none"
              >
                {SLOTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {localize(s.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipe selection: filter by dish type + search */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                {localize('com_ui_meal_planner_recipe')}
              </label>
              <div className="mb-1.5 flex gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-1">
                <button
                  type="button"
                  onClick={() => setDishTypeFilter('')}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    dishTypeFilter === ''
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_journal_all_dishes')}
                </button>
                <button
                  type="button"
                  onClick={() => setDishTypeFilter('entree')}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    dishTypeFilter === 'entree'
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_recipe_dish_entree')}
                </button>
                <button
                  type="button"
                  onClick={() => setDishTypeFilter('plat')}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    dishTypeFilter === 'plat'
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_recipe_dish_plat')}
                </button>
                <button
                  type="button"
                  onClick={() => setDishTypeFilter('dessert')}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                    dishTypeFilter === 'dessert'
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {localize('com_ui_recipe_dish_dessert')}
                </button>
              </div>
              <div className="relative mb-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={localize('com_ui_journal_search_recipe_placeholder')}
                  className="w-full rounded-lg border border-border-medium bg-surface-primary-alt py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border-medium bg-surface-primary-alt">
                <ul className="divide-y divide-border-medium">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipeId(FREE_RECIPE_ID);
                        setRecipeTitle('');
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        recipeId === FREE_RECIPE_ID
                          ? 'bg-surface-active-alt font-medium text-text-primary'
                          : 'text-text-primary hover:bg-surface-active-alt/70',
                      )}
                    >
                      {localize('com_ui_meal_planner_recipe_free')}
                    </button>
                  </li>
                  {filteredRecipes.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-text-secondary">
                      {localize('com_ui_journal_no_recipe_match')}
                    </li>
                  ) : (
                    filteredRecipes.map((r) => (
                      <li key={r._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setRecipeId(r._id);
                            setRecipeTitle(r.title ?? '');
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                            recipeId === r._id
                              ? 'bg-surface-active-alt font-medium text-text-primary'
                              : 'text-text-primary hover:bg-surface-active-alt/70',
                          )}
                        >
                          {r.emoji && <span className="shrink-0">{r.emoji}</span>}
                          <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <input
                type="text"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                placeholder={localize('com_ui_meal_planner_recipe_placeholder')}
                className="mt-1.5 w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
            </div>

            {/* Actions: Open recipe / Create recipe */}
            <div className="flex flex-wrap gap-2">
              {canOpenRecipe && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenRecipe}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {localize('com_ui_planned_meal_open_recipe')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateRecipe}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {localize('com_ui_planned_meal_create_recipe')}
              </Button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_journal_comment')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={localize('com_ui_journal_comment_placeholder')}
                rows={3}
                className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border-medium pt-4">
              <Button type="submit" disabled={isBusy} className="flex items-center gap-2">
                {updateMutation.isLoading && <Spinner className="h-4 w-4" />}
                {localize('com_ui_save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isBusy}
                className={cn(
                  'flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30',
                )}
              >
                {deleteMutation.isLoading && <Spinner className="h-4 w-4" />}
                <Trash2 className="h-4 w-4" />
                {localize('com_ui_planned_meal_delete')}
              </Button>
            </div>
          </form>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
