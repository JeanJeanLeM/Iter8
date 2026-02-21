import React from 'react';
import type { TRecipe } from 'librechat-data-provider';
import RecipeCard from './RecipeCard';

interface RecipeGalleryProps {
  recipes: TRecipe[];
  isFetching?: boolean;
}

export default function RecipeGallery({ recipes, isFetching }: RecipeGalleryProps) {
  if (recipes.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p>Aucune recette pour le moment.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe._id} recipe={recipe} />
      ))}
    </div>
  );
}
