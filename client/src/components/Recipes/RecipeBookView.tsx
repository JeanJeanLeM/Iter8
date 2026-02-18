import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useRecipesQuery } from '~/data-provider';
import { Spinner, Button, useMediaQuery } from '@librechat/client';
import { Plus, RefreshCw, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import RecipeFiltersBar from './RecipeFiltersBar';
import RecipeGallery from './RecipeGallery';
import RecipeList from './RecipeList';
import NewRecipeDialog from './NewRecipeDialog';
import { cn } from '~/utils';

export type RecipeViewMode = 'gallery' | 'list';

const SMALL_SCREEN_MAX_WIDTH = 768;

export default function RecipeBookView() {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isSmallScreen = useMediaQuery(`(max-width: ${SMALL_SCREEN_MAX_WIDTH}px)`);

  useEffect(() => {
    if (!isSmallScreen) setFiltersOpen(true);
  }, [isSmallScreen]);

  const viewMode = (searchParams.get('view') as RecipeViewMode) || 'gallery';
  const setViewMode = (mode: RecipeViewMode) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next);
  };

  const filters = useMemo(() => {
    const ingredientsInclude = searchParams.getAll('ingredientsInclude').filter(Boolean);
    const ingredientsExclude = searchParams.getAll('ingredientsExclude').filter(Boolean);
    const dishType = searchParams.get('dishType') || undefined;
    const cuisineType = searchParams.getAll('cuisineType').filter(Boolean);
    const diet = searchParams.getAll('diet').filter(Boolean);
    return {
      ingredientsInclude: ingredientsInclude.length ? ingredientsInclude : undefined,
      ingredientsExclude: ingredientsExclude.length ? ingredientsExclude : undefined,
      dishType,
      cuisineType: cuisineType.length ? cuisineType : undefined,
      diet: diet.length ? diet : undefined,
      parentsOnly: true,
    };
  }, [searchParams]);

  const { data, isLoading, isFetching, refetch } = useRecipesQuery(filters);
  const recipes = data?.recipes ?? [];

  useDocumentTitle(`${localize('com_ui_recipe_book')} | CookIter8`);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-border-medium px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
            <h1 className="truncate text-lg font-semibold text-text-primary">
              {localize('com_ui_recipe_book')}
            </h1>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-border-medium bg-surface-primary-alt px-2.5 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-active-alt sm:ml-0"
              aria-expanded={filtersOpen}
            >
              {localize('com_ui_recipe_filters')}
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1 sm:gap-1.5"
              title={localize('com_ui_recipe_reload')}
            >
              <RefreshCw className={cn('h-4 w-4 flex-shrink-0', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">{localize('com_ui_recipe_reload')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewRecipeOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{localize('com_ui_recipe_new')}</span>
            </Button>
            <div className="flex gap-0.5 rounded-lg border border-border-medium bg-surface-primary-alt p-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3',
                  viewMode === 'gallery'
                    ? 'bg-surface-active-alt text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={localize('com_ui_recipe_view_gallery')}
              >
                <span className="hidden sm:inline">{localize('com_ui_recipe_view_gallery')}</span>
                <LayoutGrid className="h-4 w-4 sm:hidden" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm font-medium transition-colors sm:px-3',
                  viewMode === 'list'
                    ? 'bg-surface-active-alt text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                title={localize('com_ui_recipe_view_list')}
              >
                <span className="hidden sm:inline">{localize('com_ui_recipe_view_list')}</span>
                <List className="h-4 w-4 sm:hidden" />
              </button>
            </div>
          </div>
        </div>
        {filtersOpen && (
          <div className="animate-in slide-in-from-top-1 duration-200">
            <RecipeFiltersBar />
          </div>
        )}
        <NewRecipeDialog open={newRecipeOpen} onOpenChange={setNewRecipeOpen} />
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="text-text-primary" />
          </div>
        ) : (
          <>
            {viewMode === 'gallery' && (
              <RecipeGallery recipes={recipes} isFetching={isFetching} />
            )}
            {viewMode === 'list' && (
              <RecipeList recipes={recipes} isFetching={isFetching} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
