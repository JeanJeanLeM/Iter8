import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import RecipeVoteButtons from './RecipeVoteButtons';
import { cn } from '~/utils';

interface RecipeAddedModalProps {
  recipe: TRecipe;
  onClose: () => void;
}

/**
 * Modal overlay displaying a card-style recipe preview after adding to the book.
 * Centered on the page. Click on the card opens the recipe; click outside closes.
 */
export default function RecipeAddedModal({ recipe, onClose }: RecipeAddedModalProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const variationCount = recipe.variationCount ?? 0;
  const score = recipe.score ?? 0;

  const handleCardClick = () => {
    onClose();
    navigate(`/r/${recipe._id}`);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-added-title"
    >
      <div
        className={cn(
          'flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border-medium',
          'bg-surface-primary shadow-lg transition-shadow hover:shadow-xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCardClick}
          className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
        >
          {recipe.imageUrl ? (
            <div className="aspect-video w-full bg-surface-active-alt">
              <img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-surface-active-alt text-sm text-text-secondary">
              {localize('com_ui_recipe_no_image')}
            </div>
          )}
        </button>
        <div className="flex flex-1 flex-col p-3">
          <button
            type="button"
            onClick={handleCardClick}
            className="text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black dark:focus-visible:ring-white"
          >
            <h2 id="recipe-added-title" className="line-clamp-2 font-semibold text-text-primary hover:underline">
              {recipe.title}
            </h2>
          </button>
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
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-medium pt-2 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <Link
                to={`/r/${recipe._id}/step`}
                onClick={onClose}
                className="hover:text-text-primary hover:underline"
              >
                {localize('com_ui_recipe_step_mode')}
              </Link>
              <Link
                to={`/journal?add=${encodeURIComponent(recipe._id)}`}
                onClick={onClose}
                className="hover:text-text-primary hover:underline"
              >
                {localize('com_ui_journal_add_short')}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {variationCount} {localize('com_ui_recipe_variations')}
              </span>
              <RecipeVoteButtons recipeId={recipe._id} score={score} userVote={recipe.userVote} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
