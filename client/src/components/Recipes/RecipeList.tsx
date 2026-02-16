import React from 'react';
import { Link } from 'react-router-dom';
import type { TRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import RecipeVoteButtons from './RecipeVoteButtons';

interface RecipeListProps {
  recipes: TRecipe[];
  isFetching?: boolean;
}

export default function RecipeList({ recipes, isFetching }: RecipeListProps) {
  const localize = useLocalize();
  if (recipes.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p>Aucune recette pour le moment.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border-medium rounded-lg border border-border-medium bg-surface-primary-alt">
      {recipes.map((recipe) => {
        const variationCount = recipe.variationCount ?? 0;
        const score = recipe.score ?? 0;
        return (
          <li
            key={recipe._id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-active-alt/50"
          >
            <div className="min-w-0 flex-1">
              <Link to={`/r/${recipe._id}`} className="font-medium text-text-primary hover:underline">
                {recipe.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-text-secondary">
                {recipe.dishType && (
                  <span>{localize(`com_ui_recipe_dish_${recipe.dishType}`)}</span>
                )}
                {recipe.cuisineType && recipe.cuisineType.length > 0 && (
                  <span>{recipe.cuisineType.join(', ')}</span>
                )}
                {recipe.diet && recipe.diet.length > 0 && (
                  <span>{recipe.diet.map((d) => localize(`com_ui_recipe_diet_${d}`)).join(', ')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-secondary">
                {variationCount} {localize('com_ui_recipe_variations')}
              </span>
              <Link
                to={`/r/${recipe._id}/step`}
                className="text-xs text-text-secondary hover:text-text-primary hover:underline"
              >
                {localize('com_ui_recipe_step_mode')}
              </Link>
              <Link
                to={`/journal?add=${encodeURIComponent(recipe._id)}`}
                className="text-xs text-text-secondary hover:text-text-primary hover:underline"
              >
                {localize('com_ui_journal_add_short')}
              </Link>
              <RecipeVoteButtons recipeId={recipe._id} score={score} userVote={recipe.userVote} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
