import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ControlCombobox } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { DISH_TYPES, CUISINE_TYPES, DIET_TYPES } from './recipeFilterOptions';
import SearchableMultiSelect from './SearchableMultiSelect';

export default function RecipeFiltersBar() {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Ingrédients */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {localize('com_ui_recipe_filter_ingredients_include')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <input
            type="text"
            value={ingredientIncludeInput}
            onChange={(e) => setIngredientIncludeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIngredient('include', ingredientIncludeInput)}
            placeholder={localize('com_ui_recipe_filter_ingredient_placeholder')}
            className="w-full rounded border border-border-medium bg-surface-primary-alt px-2 py-1.5 text-sm text-text-primary"
          />
          <button
            type="button"
            onClick={() => addIngredient('include', ingredientIncludeInput)}
            className="rounded bg-surface-active-alt px-2 py-1.5 text-sm text-text-primary hover:opacity-80"
          >
            +
          </button>
          <ul className="flex flex-wrap gap-1">
            {ingredientsInclude.map((v, i) => (
              <li key={`inc-${i}`} className="inline-flex items-center gap-0.5 rounded bg-surface-active-alt px-1.5 py-0.5 text-xs">
                {v}
                <button type="button" onClick={() => removeIngredient('include', i)} className="hover:text-text-primary" aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
        </div>
        <h3 className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {localize('com_ui_recipe_filter_ingredients_exclude')}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <input
            type="text"
            value={ingredientExcludeInput}
            onChange={(e) => setIngredientExcludeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIngredient('exclude', ingredientExcludeInput)}
            placeholder={localize('com_ui_recipe_filter_ingredient_placeholder')}
            className="w-full rounded border border-border-medium bg-surface-primary-alt px-2 py-1.5 text-sm text-text-primary"
          />
          <button
            type="button"
            onClick={() => addIngredient('exclude', ingredientExcludeInput)}
            className="rounded bg-surface-active-alt px-2 py-1.5 text-sm text-text-primary hover:opacity-80"
          >
            +
          </button>
          <ul className="flex flex-wrap gap-1">
            {ingredientsExclude.map((v, i) => (
              <li key={`exc-${i}`} className="inline-flex items-center gap-0.5 rounded bg-surface-active-alt px-1.5 py-0.5 text-xs">
                {v}
                <button type="button" onClick={() => removeIngredient('exclude', i)} className="hover:text-text-primary" aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Type de plat - combobox avec recherche (UX Culture) */}
      <div className="flex flex-col gap-1.5">
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
        <span className="text-xs text-text-secondary">{localize('com_ui_recipe_filter_search_hint')}</span>
      </div>

      {/* Cuisine - combobox multi avec recherche (UX Culture) */}
      <SearchableMultiSelect
        id="recipe-filter-cuisine"
        label={localize('com_ui_recipe_filter_cuisine')}
        selectPlaceholder={localize('com_ui_recipe_filter_select_cuisine')}
        searchPlaceholder={localize('com_ui_recipe_filter_search_cuisine')}
        hintText={localize('com_ui_recipe_filter_search_hint')}
        options={cuisineOptions}
        selectedValues={cuisineType}
        onSelectionChange={setCuisineMulti}
        selectedCountLabel={(n) => localize('com_ui_recipe_filter_n_selected', { count: n })}
        noResultsText={localize('com_ui_recipe_filter_no_results')}
      />

      {/* Régime - combobox multi avec recherche (UX Culture) */}
      <SearchableMultiSelect
        id="recipe-filter-diet"
        label={localize('com_ui_recipe_filter_diet')}
        selectPlaceholder={localize('com_ui_recipe_filter_select_diet')}
        searchPlaceholder={localize('com_ui_recipe_filter_search_diet')}
        hintText={localize('com_ui_recipe_filter_search_hint')}
        options={dietOptions}
        selectedValues={diet}
        onSelectionChange={setDietMulti}
        selectedCountLabel={(n) => localize('com_ui_recipe_filter_n_selected', { count: n })}
        noResultsText={localize('com_ui_recipe_filter_no_results')}
      />
    </div>
  );
}
