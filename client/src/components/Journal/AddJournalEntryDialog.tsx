import React, { useState, useEffect, useMemo } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle, Button, useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useRecipesQuery, useRecipeQuery, useCreateJournalEntryMutation } from '~/data-provider';
import { Search } from 'lucide-react';
import { cn } from '~/utils';

type DishTypeFilter = '' | 'entree' | 'plat' | 'dessert';

interface AddJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecipeId?: string;
}

export default function AddJournalEntryDialog({
  open,
  onOpenChange,
  initialRecipeId,
}: AddJournalEntryDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [searchText, setSearchText] = useState('');
  const [dishTypeFilter, setDishTypeFilter] = useState<DishTypeFilter>('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedRecipeId, setRecipeId] = useState(initialRecipeId ?? '');
  const [realizedAt, setRealizedAt] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [comment, setComment] = useState('');

  const { data: initialRecipe } = useRecipeQuery(open && initialRecipeId ? initialRecipeId : null);
  useEffect(() => {
    if (open && initialRecipeId && initialRecipe) {
      const parentId = initialRecipe.parentId ?? initialRecipeId;
      setSelectedParentId(parentId);
      setRecipeId(initialRecipeId);
      if (!initialRecipe.parentId) {
        setSelectedParentId(initialRecipeId);
      }
    }
  }, [open, initialRecipeId, initialRecipe]);

  useEffect(() => {
    if (!open) {
      setSearchText('');
      setDishTypeFilter('');
      setSelectedParentId('');
      setRecipeId(initialRecipeId ?? '');
      setRealizedAt(new Date().toISOString().slice(0, 10));
      setComment('');
    }
  }, [open, initialRecipeId]);

  const parentsParams = useMemo(
    () => ({
      parentsOnly: true as const,
      dishType: dishTypeFilter || undefined,
    }),
    [dishTypeFilter],
  );
  const { data: parentsData } = useRecipesQuery(parentsParams);
  const parentRecipes = parentsData?.recipes ?? [];

  const filteredParents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return parentRecipes;
    return parentRecipes.filter((r) => r.title?.toLowerCase().includes(q));
  }, [parentRecipes, searchText]);

  const variationsParams = useMemo(
    () => (selectedParentId ? { parentId: selectedParentId, parentsOnly: false } : undefined),
    [selectedParentId],
  );
  const { data: variationsData } = useRecipesQuery(variationsParams, {
    enabled: !!selectedParentId,
  });
  const variations = variationsData?.recipes ?? [];
  const selectedParent = parentRecipes.find((r) => r._id === selectedParentId);
  const hasVariations = variations.length > 0;

  const createMutation = useCreateJournalEntryMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_journal_entry_created') });
      onOpenChange(false);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_journal_entry_create_error') });
    },
  });

  const handleSelectParent = (parentId: string) => {
    setSelectedParentId(parentId);
    setRecipeId(parentId);
  };

  const handleSelectVariation = (recipeId: string) => {
    setRecipeId(recipeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = selectedRecipeId.trim();
    if (!id) {
      showToast({ message: localize('com_ui_journal_recipe_required') });
      return;
    }
    createMutation.mutate({
      recipeId: id,
      realizedAt: realizedAt || undefined,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md">
        <OGDialogTitle>{localize('com_ui_journal_add')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          {/* Filtre type de plat */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_filter_dish_type')}
            </label>
            <div className="flex gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-1">
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
          </div>

          {/* 1. Sélection recette (mère) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_select_recipe')} *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={localize('com_ui_journal_search_recipe_placeholder')}
                className="w-full rounded border border-border-medium bg-surface-primary-alt py-2 pl-9 pr-3 text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded border border-border-medium bg-surface-primary-alt">
              {filteredParents.length === 0 ? (
                <p className="p-3 text-sm text-text-secondary">
                  {localize('com_ui_journal_no_recipe_match')}
                </p>
              ) : (
                <ul className="divide-y divide-border-medium">
                  {filteredParents.map((r) => (
                    <li key={r._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectParent(r._id)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm transition-colors',
                          selectedParentId === r._id
                            ? 'bg-surface-active-alt font-medium text-text-primary'
                            : 'text-text-primary hover:bg-surface-active-alt/70',
                        )}
                      >
                        {r.emoji && <span className="mr-2">{r.emoji}</span>}
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 2. Sélection variation (si la recette a des variations) */}
          {selectedParentId && hasVariations && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                {localize('com_ui_journal_select_variation')}
              </label>
              <div className="max-h-32 overflow-y-auto rounded border border-border-medium bg-surface-primary-alt">
                <ul className="divide-y divide-border-medium">
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelectVariation(selectedParentId)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors',
                        selectedRecipeId === selectedParentId
                          ? 'bg-surface-active-alt font-medium text-text-primary'
                          : 'text-text-primary hover:bg-surface-active-alt/70',
                      )}
                    >
                      {selectedParent?.emoji && <span className="mr-2">{selectedParent.emoji}</span>}
                      {localize('com_ui_journal_base_recipe')}
                    </button>
                  </li>
                  {variations.map((v) => (
                    <li key={v._id}>
                      <button
                        type="button"
                        onClick={() => handleSelectVariation(v._id)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm transition-colors',
                          selectedRecipeId === v._id
                            ? 'bg-surface-active-alt font-medium text-text-primary'
                            : 'text-text-primary hover:bg-surface-active-alt/70',
                        )}
                      >
                        {v.emoji && <span className="mr-2">{v.emoji}</span>}
                        {v.variationNote || v.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_realized_on')}
            </label>
            <input
              type="date"
              value={realizedAt}
              onChange={(e) => setRealizedAt(e.target.value)}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={localize('com_ui_journal_comment_placeholder')}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isLoading}>
              {localize('com_ui_journal_add')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
