import React, { useState } from 'react';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useIngredientsQuery } from '~/data-provider';
import type { TIngredient } from 'librechat-data-provider';
import { Spinner, Button } from '@librechat/client';
import { Apple, Plus } from 'lucide-react';
import { cn } from '~/utils';
import IngredientDetailDrawer from './IngredientDetailDrawer';
import AddIngredientDialog from './AddIngredientDialog';

export default function IngredientGalleryView() {
  const localize = useLocalize();
  const { data, isLoading } = useIngredientsQuery();
  const ingredients = data?.ingredients ?? [];
  const [selectedIngredient, setSelectedIngredient] = useState<TIngredient | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useDocumentTitle(`${localize('com_ui_ingredient_gallery')} | Iter8`);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border-medium px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">
          {localize('com_ui_ingredient_gallery')}
        </h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAddDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {localize('com_ui_ingredient_add')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="text-text-primary" />
          </div>
        ) : ingredients.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-tertiary">
            {localize('com_ui_ingredient_gallery_empty')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ingredients.map((ing) => (
              <IngredientCard
                key={ing._id}
                ingredient={ing}
                onClick={() => setSelectedIngredient(ing)}
              />
            ))}
          </div>
        )}
      </div>

      <IngredientDetailDrawer
        ingredient={selectedIngredient}
        open={!!selectedIngredient}
        onOpenChange={(open) => !open && setSelectedIngredient(null)}
        onIngredientUpdated={setSelectedIngredient}
      />
      <AddIngredientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}

function IngredientCard({
  ingredient,
  onClick,
}: {
  ingredient: TIngredient;
  onClick: () => void;
}) {
  const displayName =
    ingredient.displayName?.trim() ||
    (ingredient.name.trim().charAt(0).toUpperCase() +
      ingredient.name.trim().slice(1).toLowerCase());
  const hasNutrition =
    ingredient.energyKcal != null ||
    ingredient.proteinG != null ||
    ingredient.fatG != null ||
    ingredient.carbohydrateG != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-border-medium bg-surface-primary-alt p-4 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary',
      )}
    >
      <div className="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-surface-active-alt/50">
        {ingredient.imageUrl ? (
          <img
            src={ingredient.imageUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <Apple className="h-10 w-10 text-text-tertiary" aria-hidden />
        )}
      </div>
      <span className="text-center text-sm font-medium text-text-primary">
        {displayName}
      </span>
      {hasNutrition && (
        <span className="mt-1 text-center text-xs text-text-tertiary">
          {[
            ingredient.energyKcal != null &&
              `${Math.round(ingredient.energyKcal)} kcal`,
            (ingredient.proteinG != null ||
              ingredient.fatG != null ||
              ingredient.carbohydrateG != null) &&
              `P ${formatMacro(ingredient.proteinG)} · F ${formatMacro(ingredient.fatG)} · C ${formatMacro(ingredient.carbohydrateG)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </button>
  );
}

function formatMacro(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}
