import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface CarouselItem {
  recipe: TRecipe;
  isParent: boolean;
}

interface RecipeVariationsCarouselProps {
  items: CarouselItem[];
  /** Optional: recipe to highlight as current (e.g. in chat when not on /r/:id) */
  currentRecipeId?: string | null;
}

/**
 * Horizontal carousel for parent recipe + variations.
 * Each item has an unroll button that expands to show objective (parent) or variationNote (variation).
 */
export default function RecipeVariationsCarousel({
  items,
  currentRecipeId: currentRecipeIdProp,
}: RecipeVariationsCarouselProps) {
  const localize = useLocalize();
  const { id: routeId } = useParams<{ id: string }>();
  const currentId = currentRecipeIdProp ?? routeId ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  if (items.length === 0) return null;

  const handlePrev = () => setScrollIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setScrollIndex((i) => Math.min(items.length - 1, i + 1));

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        {localize('com_ui_recipe_versions')}
      </h2>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={scrollIndex <= 0}
          className="flex shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-primary-alt p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          aria-label={localize('com_ui_recipe_step_prev')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 overflow-hidden">
          <div
            className="flex gap-3 transition-transform duration-200"
            style={{ transform: `translateX(-${scrollIndex * (180 + 12)}px)` }}
          >
            {items.map(({ recipe, isParent }) => {
              const note = isParent
                ? (recipe.objective ?? recipe.description ?? '')
                : (recipe.variationNote ?? '');
              const isExpanded = expandedId === recipe._id;
              const isCurrent = recipe._id === currentId;

              return (
                <div
                  key={recipe._id}
                  className={cn(
                    'flex w-[180px] shrink-0 flex-col overflow-hidden rounded-xl border bg-surface-primary-alt',
                    isCurrent
                      ? 'border-primary shadow-md ring-2 ring-primary/30'
                      : 'border-border-medium hover:border-border-strong',
                  )}
                >
                  <Link
                    to={`/r/${recipe._id}`}
                    className="block shrink-0"
                  >
                    {recipe.imageUrl ? (
                      <div className="aspect-video w-full bg-surface-active-alt">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-surface-active-alt text-xs text-text-secondary">
                        {localize('com_ui_recipe_no_image')}
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-2">
                    <Link
                      to={`/r/${recipe._id}`}
                      className="line-clamp-2 text-sm font-medium text-text-primary hover:underline"
                    >
                      {recipe.title}
                    </Link>
                    {note ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : recipe._id)}
                          className="mt-1 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isParent
                              ? localize('com_ui_recipe_objective')
                              : localize('com_ui_recipe_variation_reason')}
                          </span>
                        </button>
                        {isExpanded && (
                          <p className="mt-1 text-xs text-text-secondary">{note}</p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={handleNext}
          disabled={scrollIndex >= items.length - 1}
          className="flex shrink-0 items-center justify-center rounded-lg border border-border-medium bg-surface-primary-alt p-2 text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          aria-label={localize('com_ui_recipe_step_next')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
