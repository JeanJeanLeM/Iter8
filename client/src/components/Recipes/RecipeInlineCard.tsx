import React from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { ChefHat, NotebookPen, Target } from 'lucide-react';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { selectedRecipeForVariation } from '~/store';
import RecipeVoteButtons from './RecipeVoteButtons';
import { cn } from '~/utils';

interface RecipeInlineCardProps {
  recipe: TRecipe;
  className?: string;
  /** Visual emphasis when this card is the one just created (vs mother/sister) */
  isCreated?: boolean;
}

/**
 * Recipe card displayed inline in the chat as an agent message.
 * Same design as RecipeCard/RecipeAddedModal but without overlay.
 * Clicking opens the recipe.
 */
export default function RecipeInlineCard({ recipe, className, isCreated }: RecipeInlineCardProps) {
  const localize = useLocalize();
  const selected = useRecoilValue(selectedRecipeForVariation);
  const setSelected = useSetRecoilState(selectedRecipeForVariation);
  const variationCount = recipe.variationCount ?? 0;
  const score = recipe.score ?? 0;
  const isSelected = selected?.recipeId === recipe._id;

  const handleSelectForModification = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(
      isSelected
        ? null
        : {
            recipeId: recipe._id,
            title: recipe.title,
            parentId: recipe.parentId ? String(recipe.parentId) : null,
          },
    );
  };

  return (
    <div
      className={cn(
        'relative flex w-full min-w-[280px] max-w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border',
        'bg-surface-primary shadow-sm transition-shadow hover:shadow-md',
        isCreated
          ? 'border-primary ring-2 ring-primary/40 shadow-lg'
          : isSelected
            ? 'border-primary/70 ring-2 ring-primary/30'
            : 'border-border-medium',
        className,
      )}
    >
      {isCreated && (
        <span
          className="absolute right-3 top-3 z-10 flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
          title={localize('com_ui_recipe_created')}
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={handleSelectForModification}
        className={cn(
          'absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
          isSelected
            ? 'bg-primary text-white'
            : 'bg-surface-primary/90 text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
        title={isSelected ? localize('com_ui_recipe_selected_for_modification') : localize('com_ui_recipe_select_for_modification')}
      >
        <Target className="h-3.5 w-3.5" />
        {isSelected ? localize('com_ui_recipe_selected_for_modification') : localize('com_ui_recipe_select_for_modification')}
      </button>
      <Link to={`/r/${recipe._id}`} className="block shrink-0">
        {recipe.imageUrl ? (
          <div className="aspect-video w-full bg-surface-active-alt">
            <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-surface-active-alt text-sm text-text-secondary">
            {localize('com_ui_recipe_no_image')}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/r/${recipe._id}`}>
          <h3 className="line-clamp-2 font-semibold text-text-primary hover:underline">
            {recipe.title}
          </h3>
        </Link>
        {recipe.parentId && recipe.variationNote && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
            {recipe.variationNote}
          </p>
        )}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-active-alt px-1.5 py-0.5 text-xs text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-medium pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/r/${recipe._id}/step`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <ChefHat className="h-4 w-4" />
              {localize('com_ui_recipe_step_mode')}
            </Link>
            <Link
              to={`/journal?add=${encodeURIComponent(recipe._id)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border-medium bg-transparent px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
            >
              <NotebookPen className="h-4 w-4" />
              {localize('com_ui_journal_add_short')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              {variationCount} {localize('com_ui_recipe_variations')}
            </span>
            <RecipeVoteButtons
              recipeId={recipe._id}
              score={score}
              userVote={recipe.userVote}
              size="lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
