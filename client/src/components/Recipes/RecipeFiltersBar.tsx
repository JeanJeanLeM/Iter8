import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ControlCombobox } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { DISH_TYPES, CUISINE_TYPES, DIET_TYPES } from './recipeFilterOptions';
import SearchableMultiSelect from './SearchableMultiSelect';

export default function RecipeFiltersBar({
  showJournalScopeFilters = false,
}: {
  /** When true, show visibility filter and "include others derived from mine" toggle (for /r only). */
  showJournalScopeFilters?: boolean;
}) {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ingredientIncludeInput, setIngredientIncludeInput] = useState('');
  const [ingredientExcludeInput, setIngredientExcludeInput] = useState('');

  const updateParams = useCallback(
    (updater: (prev: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const addIngredient = (type: 'include' | 'exclude', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    updateParams((p) => {
      p.append(type === 'include' ? 'ingredientsInclude' : 'ingredientsExclude', trimmed);
    });
    if (type === 'include') setIngredientIncludeInput('');
    else setIngredientExcludeInput('');
  };

  const removeIngredient = (type: 'include' | 'exclude', index: number) => {
    const key = type === 'include' ? 'ingredientsInclude' : 'ingredientsExclude';
    updateParams((p) => {
      const values = p.getAll(key);
      values.splice(index, 1);
      p.delete(key);
      values.forEach((v) => p.append(key, v));
    });
  };

  const setDishType = (value: string | null) => {
    updateParams((p) => {
      if (value) p.set('dishType', value);
      else p.delete('dishType');
    });
  };

  const setCuisineMulti = (values: string[]) => {
    updateParams((p) => {
      p.delete('cuisineType');
      values.forEach((v) => p.append('cuisineType', v));
    });
  };

  const setDietMulti = (values: string[]) => {
    updateParams((p) => {
      p.delete('diet');
      values.forEach((v) => p.append('diet', v));
    });
  };

  const visibilityFilter = searchParams.get('visibilityFilter') || 'all';
  const setVisibilityFilter = (value: 'all' | 'private' | 'public') => {
    updateParams((p) => {
      if (value === 'all') p.delete('visibilityFilter');
      else p.set('visibilityFilter', value);
    });
  };

  const includeOthersDerivedFromMine = searchParams.get('includeOthersDerivedFromMine') === 'true';
  const setIncludeOthersDerivedFromMine = (value: boolean) => {
    updateParams((p) => {
      if (value) p.set('includeOthersDerivedFromMine', 'true');
      else p.delete('includeOthersDerivedFromMine');
    });
  };

  const ingredientsInclude = searchParams.getAll('ingredientsInclude').filter(Boolean);
  const ingredientsExclude = searchParams.getAll('ingredientsExclude').filter(Boolean);
  const dishType = searchParams.get('dishType');
  const cuisineType = searchParams.getAll('cuisineType');
  const diet = searchParams.getAll('diet');

  const dishItems = useMemo(
    () => [
      { value: '', label: localize('com_ui_recipe_filter_all') },
      ...DISH_TYPES.map((d) => ({ value: d, label: localize(`com_ui_recipe_dish_${d}`) })),
    ],
    [localize],
  );

  const dishDisplayValue =
    dishType && dishItems.find((i) => i.value === dishType)
      ? dishItems.find((i) => i.value === dishType)!.label
      : localize('com_ui_recipe_filter_select_dish_type');

  const cuisineOptions = useMemo(
    () => CUISINE_TYPES.map((c) => ({ value: c, label: localize(`com_ui_recipe_cuisine_${c}`) })),
    [localize],
  );

  const dietOptions = useMemo(
    () => DIET_TYPES.map((d) => ({ value: d, label: localize(`com_ui_recipe_diet_${d}`) })),
    [localize],
  );

  return (
    <div className="flex flex-col gap-4">
      {showJournalScopeFilters && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-medium bg-surface-primary-alt p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {localize('com_ui_recipe_filter_my_visibility')}
            </span>
            <div className="flex gap-1 rounded-md p-0.5 bg-surface-primary">
              {(['all', 'private', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibilityFilter(v)}
                  className={`rounded px-2.5 py-1 text-sm font-medium ${
                    visibilityFilter === v
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {localize(`com_ui_recipe_filter_visibility_${v}`)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeOthersDerivedFromMine}
              onChange={(e) => setIncludeOthersDerivedFromMine(e.target.checked)}
              className="rounded border-border-medium"
            />
            <span className="text-sm text-text-primary">
              {localize('com_ui_recipe_filter_include_others_derived')}
            </span>
          </label>
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* Ingrédients - inclure */}
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {localize('com_ui_recipe_filter_ingredients_include')}
          </h3>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={ingredientIncludeInput}
              onChange={(e) => setIngredientIncludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient('include', ingredientIncludeInput)}
              placeholder={localize('com_ui_recipe_filter_ingredient_placeholder')}
              className="h-10 min-w-0 flex-1 rounded-lg border border-border-medium bg-surface-primary-alt px-3 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => addIngredient('include', ingredientIncludeInput)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-active-alt text-sm text-text-primary hover:opacity-80"
              aria-label={localize('com_ui_recipe_filter_ingredient_placeholder')}
            >
              +
            </button>
          </div>
          {ingredientsInclude.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {ingredientsInclude.map((v, i) => (
                <li key={`inc-${i}`} className="inline-flex items-center gap-0.5 rounded bg-surface-active-alt px-1.5 py-0.5 text-xs">
                  {v}
                  <button type="button" onClick={() => removeIngredient('include', i)} className="hover:text-text-primary" aria-label="Remove">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ingrédients - exclure */}
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {localize('com_ui_recipe_filter_ingredients_exclude')}
          </h3>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={ingredientExcludeInput}
              onChange={(e) => setIngredientExcludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient('exclude', ingredientExcludeInput)}
              placeholder={localize('com_ui_recipe_filter_ingredient_placeholder')}
              className="h-10 min-w-0 flex-1 rounded-lg border border-border-medium bg-surface-primary-alt px-3 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => addIngredient('exclude', ingredientExcludeInput)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-active-alt text-sm text-text-primary hover:opacity-80"
              aria-label={localize('com_ui_recipe_filter_ingredient_placeholder')}
            >
              +
            </button>
          </div>
          {ingredientsExclude.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {ingredientsExclude.map((v, i) => (
                <li key={`exc-${i}`} className="inline-flex items-center gap-0.5 rounded bg-surface-active-alt px-1.5 py-0.5 text-xs">
                  {v}
                  <button type="button" onClick={() => removeIngredient('exclude', i)} className="hover:text-text-primary" aria-label="Remove">×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Type de plat */}
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary" htmlFor="recipe-filter-dish">
            {localize('com_ui_recipe_filter_dish_type')}
          </label>
          <ControlCombobox
            selectId="recipe-filter-dish"
            selectedValue={dishType ?? ''}
            displayValue={dishDisplayValue}
            setValue={(v) => setDishType(v || null)}
            items={dishItems}
            ariaLabel={localize('com_ui_recipe_filter_dish_type')}
            selectPlaceholder={localize('com_ui_recipe_filter_select_dish_type')}
            searchPlaceholder={localize('com_ui_recipe_filter_search_dish_type')}
            isCollapsed={false}
            showCarat={true}
            containerClassName="w-full px-0"
            className="!rounded-lg border-border-medium bg-surface-primary-alt"
          />
        </div>

        {/* Cuisine */}
        <div className="relative flex flex-1 flex-col gap-1">
          <SearchableMultiSelect
            id="recipe-filter-cuisine"
            label={localize('com_ui_recipe_filter_cuisine')}
            selectPlaceholder={localize('com_ui_recipe_filter_select_cuisine')}
            searchPlaceholder={localize('com_ui_recipe_filter_search_cuisine')}
            hintText=""
            options={cuisineOptions}
            selectedValues={cuisineType}
            onSelectionChange={setCuisineMulti}
            selectedCountLabel={(n) => localize('com_ui_recipe_filter_n_selected', { count: n })}
            noResultsText={localize('com_ui_recipe_filter_no_results')}
          />
        </div>

        {/* Régime */}
        <div className="relative flex flex-1 flex-col gap-1">
          <SearchableMultiSelect
            id="recipe-filter-diet"
            label={localize('com_ui_recipe_filter_diet')}
            selectPlaceholder={localize('com_ui_recipe_filter_select_diet')}
            searchPlaceholder={localize('com_ui_recipe_filter_search_diet')}
            hintText=""
            options={dietOptions}
            selectedValues={diet}
            onSelectionChange={setDietMulti}
            selectedCountLabel={(n) => localize('com_ui_recipe_filter_n_selected', { count: n })}
            noResultsText={localize('com_ui_recipe_filter_no_results')}
          />
        </div>
      </div>
    </div>
  );
}
