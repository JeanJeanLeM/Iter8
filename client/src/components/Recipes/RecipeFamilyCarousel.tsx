import React, { useMemo } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import {
  useRecipeQuery,
  useRecipesQuery,
  useRecipeRootQuery,
  useRecipeFamilyQuery,
} from '~/data-provider';
import { carouselDisplayMode, type CarouselDisplayMode } from '~/store';
import RecipeInlineCard from './RecipeInlineCard';
import { cn } from '~/utils';

interface RecipeFamilyCarouselProps {
  /** Main recipe (the one created or displayed for this message) */
  recipe: TRecipe;
  /** Recipe ID to highlight as "created" - typically the same as recipe._id */
  createdRecipeId: string;
}

/**
 * Horizontal carousel of recipe cards (mother, sisters, created) in the chat.
 * Each card is a full RecipeInlineCard. The created recipe is visually emphasized.
 * displayMode: ancestor = root + all descendants; branch = parent + siblings only.
 */
export default function RecipeFamilyCarousel({
  recipe,
  createdRecipeId,
}: RecipeFamilyCarouselProps) {
  const localize = useLocalize();
  const mode = useRecoilValue(carouselDisplayMode);
  const setMode = useSetRecoilState(carouselDisplayMode);
  const parentId = recipe.parentId ? String(recipe.parentId) : null;
  const variationCount = recipe.variationCount ?? 0;
  const variationsParentId = parentId ?? (variationCount > 0 ? recipe._id : null);

  const { data: parentRecipe } = useRecipeQuery(parentId);
  const { data: variationsData } = useRecipesQuery(
    variationsParentId ? { parentId: variationsParentId, parentsOnly: false } : undefined,
    { enabled: !!variationsParentId && mode === 'branch' },
  );

  const { data: rootRecipe } = useRecipeRootQuery(
    mode === 'ancestor' ? recipe._id : null,
  );
  const rootId = rootRecipe?._id ?? null;
  const { data: familyData } = useRecipeFamilyQuery(
    mode === 'ancestor' && rootId ? rootId : null,
  );

  const variations = useMemo(() => {
    const list = variationsData?.recipes ?? [];
    if (!variationsParentId) return list;
    return list.filter((r) => String(r.parentId ?? '') === String(variationsParentId));
  }, [variationsData?.recipes, variationsParentId]);

  const branchRecipes = useMemo((): TRecipe[] => {
    if (parentId && parentRecipe) {
      const seen = new Set<string>([parentRecipe._id]);
      const result: TRecipe[] = [parentRecipe];
      for (const v of variations) {
        if (!seen.has(v._id)) {
          seen.add(v._id);
          result.push(v);
        }
      }
      return result;
    }
    if (variationCount > 0 && !parentId) {
      const seen = new Set<string>([recipe._id]);
      const result: TRecipe[] = [recipe];
      for (const v of variations) {
        if (!seen.has(v._id)) {
          seen.add(v._id);
          result.push(v);
        }
      }
      return result;
    }
    return [recipe];
  }, [recipe, parentId, parentRecipe, variations, variationCount]);

  const ancestorRecipes = useMemo((): TRecipe[] => {
    const list = familyData?.recipes ?? [];
    if (list.length === 0 && mode === 'ancestor') {
      return branchRecipes;
    }
    return list;
  }, [familyData?.recipes, mode, branchRecipes]);

  const familyRecipes = mode === 'ancestor' ? ancestorRecipes : branchRecipes;

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'prev' | 'next') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = 320 + 12;
    const delta = direction === 'next' ? cardWidth : -cardWidth;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const toggleMode = (next: CarouselDisplayMode) => () => {
    setMode(next);
  };

  const hasMultipleLevels = (parentId && parentRecipe) || (variationCount > 0 && !parentId);

  return (
    <div className="mt-3 w-full">
      {hasMultipleLevels && (
        <div className="mb-2 flex justify-start">
          <div className="flex gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-1">
            <button
              type="button"
              onClick={toggleMode('branch')}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                mode === 'branch'
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
              title={localize('com_ui_recipe_carousel_mode_branch')}
            >
              {localize('com_ui_recipe_carousel_mode_branch')}
            </button>
            <button
              type="button"
              onClick={toggleMode('ancestor')}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                mode === 'ancestor'
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
              title={localize('com_ui_recipe_carousel_mode_ancestor')}
            >
              {localize('com_ui_recipe_carousel_mode_ancestor')}
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scroll('prev')}
          className="flex shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-primary-alt p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          aria-label={localize('com_ui_recipe_step_prev')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div
          ref={scrollContainerRef}
          className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden py-1 scroll-smooth [scrollbar-width:thin]"
        >
          {familyRecipes.map((r) => (
            <RecipeInlineCard
              key={r._id}
              recipe={r}
              isCreated={r._id === createdRecipeId}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scroll('next')}
          className="flex shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-primary-alt p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          aria-label={localize('com_ui_recipe_step_next')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
