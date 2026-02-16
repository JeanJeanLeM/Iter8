import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useRecipeQuery, useGetUserQuery } from '~/data-provider';
import { Spinner, Button } from '@librechat/client';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { TRecipeIngredient } from 'librechat-data-provider';
import { formatIngredient as formatIngredientUtil, type FormattedIngredient } from '~/utils/recipeIngredients';
import { cn } from '~/utils';

export default function RecipeStepByStepView() {
  const localize = useLocalize();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useGetUserQuery();
  const { data: recipe, isLoading, isError } = useRecipeQuery(id ?? null);
  const unitSystem =
    user?.personalization?.unitSystem === 'american' ? 'american' : 'si';
  const showIngredientGrams = user?.personalization?.showIngredientGrams ?? false;

  const [portionsChosen, setPortionsChosen] = useState(1);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const portionsRef = recipe?.portions ?? 1;
  const ratio = portionsRef > 0 ? portionsChosen / portionsRef : 1;

  useEffect(() => {
    if (recipe) {
      setPortionsChosen(recipe.portions ?? 1);
    }
  }, [recipe?.portions]);

  const sortedSteps = useMemo(() => {
    if (!recipe?.steps) return [];
    return [...recipe.steps].sort((a, b) => a.order - b.order);
  }, [recipe?.steps]);

  const scaledIngredients = useMemo((): FormattedIngredient[] => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ing) =>
      formatIngredientUtil(ing, { ratio, unitSystem, showIngredientGrams }),
    );
  }, [recipe?.ingredients, ratio, unitSystem, showIngredientGrams]);

  const currentStep = sortedSteps[currentStepIndex];
  const stepCount = sortedSteps.length;

  useDocumentTitle(recipe ? `${recipe.title} | ${localize('com_ui_recipe_step_mode')}` : localize('com_ui_recipe_step_mode'));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!id) {
    navigate('/r', { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-primary">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-primary p-4">
        <p className="text-text-secondary">{localize('com_ui_recipe_not_found')}</p>
        <Link to="/r" className="text-text-primary hover:underline">
          {localize('com_ui_recipe_back_to_book')}
        </Link>
      </div>
    );
  }

  if (stepCount === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-primary p-4">
        <p className="text-text-secondary">{localize('com_ui_recipe_no_steps')}</p>
        <Link to="/r" className="text-text-primary hover:underline">
          {localize('com_ui_recipe_back_to_book')}
        </Link>
      </div>
    );
  }

  const containerClass = cn(
    'flex h-full w-full flex-col overflow-hidden bg-surface-primary',
    isFullscreen && 'text-xl',
  );

  return (
    <div className={containerClass}>
      <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-medium px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            to="/r"
            className="flex shrink-0 items-center gap-1 text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden sm:inline">{localize('com_ui_recipe_back_to_book')}</span>
          </Link>
          <h1 className="truncate text-lg font-semibold text-text-primary sm:text-xl">
            {recipe.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span>{localize('com_ui_recipe_portions')}</span>
            <input
              type="number"
              min={1}
              max={24}
              value={portionsChosen}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v >= 1 && v <= 24) setPortionsChosen(v);
              }}
              className="w-14 rounded border border-border-medium bg-surface-primary-alt px-2 py-1 text-center text-text-primary"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="shrink-0"
            title={localize('com_ui_recipe_fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-text-secondary">
              {localize('com_ui_recipe_step_of', {
                current: currentStepIndex + 1,
                total: stepCount,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {localize('com_ui_recipe_step_prev')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentStepIndex((i) => Math.min(stepCount - 1, i + 1))
                }
                disabled={currentStepIndex === stepCount - 1}
                className="flex items-center gap-1"
              >
                {localize('com_ui_recipe_step_next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <section className="rounded-lg border border-border-medium bg-surface-primary-alt p-4">
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              {localize('com_ui_recipe_ingredients')}
            </h2>
            <ul className="list-inside list-disc space-y-1 text-text-primary">
              {scaledIngredients.map((line, idx) => (
                <li key={idx}>
                  {line.displayText}
                  {line.gramEquivalent && (
                    <span className="text-text-secondary"> {line.gramEquivalent}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border-medium bg-surface-primary-alt p-4">
            <h2 className="mb-3 text-sm font-medium text-text-secondary">
              {localize('com_ui_recipe_step_of', {
                current: currentStepIndex + 1,
                total: stepCount,
              })}
            </h2>
            <p
              className={cn(
                'whitespace-pre-wrap text-text-primary',
                isFullscreen ? 'text-2xl leading-relaxed' : 'text-base leading-relaxed',
              )}
            >
              {currentStep?.instruction}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
