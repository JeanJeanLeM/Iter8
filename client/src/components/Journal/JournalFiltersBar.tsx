import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { useRecipesQuery } from '~/data-provider';
import { cn } from '~/utils';

export default function JournalFiltersBar() {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useRecipesQuery({ parentsOnly: true });
  const recipes = data?.recipes ?? [];

  const recipeId = searchParams.get('recipeId') ?? '';
  const sort = searchParams.get('sort') ?? 'realizedAtDesc';
  const fromDate = searchParams.get('fromDate') ?? '';
  const toDate = searchParams.get('toDate') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">
          {localize('com_ui_journal_filter_recipe')}
        </label>
        <select
          value={recipeId}
          onChange={(e) => setFilter('recipeId', e.target.value)}
          className="rounded border border-border-medium bg-surface-primary-alt px-2 py-1.5 text-sm text-text-primary"
        >
          <option value="">{localize('com_ui_journal_all_recipes')}</option>
          {recipes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">
          {localize('com_ui_journal_from')}
        </label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFilter('fromDate', e.target.value)}
          className="rounded border border-border-medium bg-surface-primary-alt px-2 py-1.5 text-sm text-text-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">
          {localize('com_ui_journal_to')}
        </label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setFilter('toDate', e.target.value)}
          className="rounded border border-border-medium bg-surface-primary-alt px-2 py-1.5 text-sm text-text-primary"
        />
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-0.5">
        <button
          type="button"
          onClick={() => setFilter('sort', 'realizedAtDesc')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            sort === 'realizedAtDesc'
              ? 'bg-surface-active-alt text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {localize('com_ui_journal_sort_newest')}
        </button>
        <button
          type="button"
          onClick={() => setFilter('sort', 'realizedAtAsc')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            sort === 'realizedAtAsc'
              ? 'bg-surface-active-alt text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {localize('com_ui_journal_sort_oldest')}
        </button>
      </div>
    </div>
  );
}
