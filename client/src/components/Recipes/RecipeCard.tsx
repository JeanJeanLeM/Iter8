import React from 'react';
import { Link } from 'react-router-dom';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import RecipeVoteButtons from './RecipeVoteButtons';
import { cn } from '~/utils';

interface RecipeCardProps {
  recipe: TRecipe;
  className?: string;
}

export default function RecipeCard({ recipe, className }: RecipeCardProps) {
  const localize = useLocalize();
  const variationCount = recipe.variationCount ?? 0;
  const score = recipe.score ?? 0;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border-medium bg-surface-primary-alt shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
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
          <h3 className="line-clamp-2 font-semibold text-text-primary hover:underline">{recipe.title}</h3>
        </Link>
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
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
          <span>
            {variationCount} {localize('com_ui_recipe_variations')}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={`/r/${recipe._id}/step`}
              className="text-text-secondary hover:text-text-primary hover:underline"
            >
              {localize('com_ui_recipe_step_mode')}
            </Link>
            <Link
              to={`/journal?add=${encodeURIComponent(recipe._id)}`}
              className="text-text-secondary hover:text-text-primary hover:underline"
            >
              {localize('com_ui_journal_add_short')}
            </Link>
            <RecipeVoteButtons recipeId={recipe._id} score={score} userVote={recipe.userVote} />
          </div>
        </div>
      </div>
    </div>
  );
}
