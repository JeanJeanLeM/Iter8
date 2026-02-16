import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { Button, useToastContext } from '@librechat/client';
import { ChefHat, Link2, Plus } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useCreateRecipeMutation, useCreateRecipeVariationMutation, useGetUserQuery } from '~/data-provider';
import { useMessageContext } from '~/Providers';
import { formatIngredientLine } from '~/utils/recipeIngredients';
import { recipeConversationParentMap, manuallySelectedParentId } from '~/store';
import ParentRecipeSelectorModal from '~/components/Recipes/ParentRecipeSelectorModal';
import type { TRecipe, TRecipeIngredient, TRecipeStep, TRecipeDuration } from 'librechat-data-provider';
import { cn } from '~/utils';

interface RecipeBlockProps {
  output?: string | null;
  isSubmitting: boolean;
  isLast?: boolean;
}

interface ParsedRecipe {
  title: string;
  description?: string;
  portions?: number;
  duration?: TRecipeDuration;
  ingredients: TRecipeIngredient[];
  steps: TRecipeStep[];
  equipment?: string[];
  tags?: string[];
  objective?: string;
  variationNote?: string;
}

function formatDuration(duration?: TRecipeDuration): string {
  if (duration == null) return '';
  if (typeof duration === 'number') {
    return `${duration} min`;
  }
  const parts: string[] = [];
  if (duration.prep != null) parts.push(`${duration.prep} min prep`);
  if (duration.cook != null) parts.push(`${duration.cook} min cook`);
  if (duration.total != null) parts.push(`${duration.total} min total`);
  return parts.join(' · ');
}

export default function RecipeBlock({ output, isSubmitting, isLast }: RecipeBlockProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { conversationId } = useMessageContext();
  const { data: user } = useGetUserQuery();
  const unitSystem =
    user?.personalization?.unitSystem === 'american' ? 'american' : 'si';
  const showIngredientGrams = user?.personalization?.showIngredientGrams ?? false;
  const parentMap = useRecoilValue(recipeConversationParentMap);
  const setParentMap = useSetRecoilState(recipeConversationParentMap);
  const manualParentId = useRecoilValue(manuallySelectedParentId);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  const [saved, setSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  const { recipe, parseError } = useMemo(() => {
    if (!output || typeof output !== 'string') {
      return { recipe: null, parseError: !output && !isSubmitting };
    }
    try {
      const raw = JSON.parse(output) as Record<string, unknown>;
      if (!raw || typeof raw.title !== 'string') {
        return { recipe: null, parseError: true };
      }
      const recipe: ParsedRecipe = {
        title: String(raw.title).trim() || localize('com_ui_recipe_untitled'),
        description: raw.description != null ? String(raw.description).trim() : undefined,
        portions: typeof raw.portions === 'number' && raw.portions > 0 ? raw.portions : undefined,
        duration: raw.duration as TRecipeDuration | undefined,
        ingredients: Array.isArray(raw.ingredients)
          ? (raw.ingredients as TRecipeIngredient[]).filter((i) => i && typeof i.name === 'string')
          : [],
        steps: Array.isArray(raw.steps)
          ? (raw.steps as TRecipeStep[])
              .filter((s) => s && typeof s.instruction === 'string')
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          : [],
        equipment: Array.isArray(raw.equipment)
          ? (raw.equipment as string[]).filter((e) => typeof e === 'string')
          : [],
        tags: Array.isArray(raw.tags)
          ? (raw.tags as string[]).filter((t) => typeof t === 'string')
          : [],
        objective: raw.objective != null ? String(raw.objective).trim() : undefined,
        variationNote: raw.variationNote != null ? String(raw.variationNote).trim() : undefined,
      };
      return { recipe, parseError: false };
    } catch {
      return { recipe: null, parseError: !isSubmitting };
    }
  }, [output, isSubmitting, localize]);

  const parentRecipeIdFromMap = conversationId ? parentMap[conversationId] ?? null : null;
  const parentRecipeId = manualParentId ?? parentRecipeIdFromMap;
  const hasParentInConversation = !!parentRecipeId;

  const createMutation = useCreateRecipeMutation({
    onSuccess: (createdRecipe) => {
      showToast({ message: localize('com_ui_recipe_saved') });
      setSaved(true);
      if (createdRecipe?._id) {
        setSavedRecipeId(createdRecipe._id);
      }
      if (conversationId && createdRecipe?._id && !parentRecipeIdFromMap) {
        setParentMap((prev) => ({ ...prev, [conversationId]: createdRecipe._id }));
      }
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_recipe_save_error') });
    },
  });

  const variationMutation = useCreateRecipeVariationMutation({
    onSuccess: (createdRecipe) => {
      showToast({ message: localize('com_ui_recipe_saved') });
      setSaved(true);
      if (createdRecipe?._id) {
        setSavedRecipeId(createdRecipe._id);
      }
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_recipe_save_error') });
    },
  });

  const handleSaveAsIndependent = () => {
    if (!recipe || createMutation.isPending || saved) return;
    const payload: Partial<TRecipe> & { title: string } = {
      title: recipe.title,
      description: recipe.description,
      portions: recipe.portions,
      duration: recipe.duration,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      equipment: recipe.equipment?.length ? recipe.equipment : undefined,
      tags: recipe.tags?.length ? recipe.tags : undefined,
      objective: recipe.objective,
    };
    createMutation.mutate(payload);
  };

  const handleSaveAsVariation = () => {
    if (!recipe || !parentRecipeId || variationMutation.isPending || saved) return;
    variationMutation.mutate({
      parentId: parentRecipeId,
      data: {
        title: recipe.title,
        description: recipe.description,
        portions: recipe.portions,
        duration: recipe.duration,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        equipment: recipe.equipment?.length ? recipe.equipment : undefined,
        tags: recipe.tags?.length ? recipe.tags : undefined,
        variationNote: recipe.variationNote,
      },
    });
  };

  if (parseError && !recipe) {
    return null;
  }

  if (!recipe) {
    return (
      <div className="my-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
        {localize('com_ui_recipe_loading')}
      </div>
    );
  }

  const durationStr = formatDuration(recipe.duration);

  return (
    <div
      className={cn(
        'my-2 overflow-hidden rounded-xl border border-border-light bg-surface-secondary shadow-md',
      )}
    >
      <div className="border-b border-border-light bg-surface-primary-alt px-4 py-3">
        <h3 className="text-lg font-semibold text-text-primary">{recipe.title}</h3>
        {(recipe.description || recipe.portions || durationStr) && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
            {recipe.description && <span>{recipe.description}</span>}
            {recipe.portions != null && (
              <span>
                {recipe.portions} {localize('com_ui_recipe_portions')}
              </span>
            )}
            {durationStr && <span>{durationStr}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4">
        {recipe.ingredients.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_ingredients')}
            </h4>
            <ul className="list-inside list-disc space-y-0.5 text-sm text-text-secondary">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx}>
                  {formatIngredientLine(ing, {
                    ratio: 1,
                    unitSystem,
                    showGrams: showIngredientGrams,
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recipe.steps.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_steps')}
            </h4>
            <ol className="list-inside list-decimal space-y-1.5 text-sm text-text-secondary">
              {recipe.steps.map((step, idx) => (
                <li key={idx}>{step.instruction}</li>
              ))}
            </ol>
          </div>
        )}

        {recipe.equipment && recipe.equipment.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_equipment')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {recipe.equipment.map((eq, idx) => (
                <span
                  key={idx}
                  className="rounded bg-surface-active-alt px-2 py-0.5 text-xs text-text-secondary"
                >
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag, idx) => (
              <span
                key={idx}
                className="rounded bg-surface-active-alt px-2 py-0.5 text-xs text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            disabled={createMutation.isPending || variationMutation.isPending || saved}
            onClick={handleSaveAsIndependent}
          >
            {saved
              ? localize('com_ui_recipe_saved')
              : createMutation.isPending
                ? localize('com_ui_loading')
                : localize('com_ui_recipe_add_to_book')}
          </Button>
          {hasParentInConversation && (
            <Button
              size="sm"
              variant="outline"
              disabled={variationMutation.isPending || saved}
              onClick={handleSaveAsVariation}
              title={localize('com_ui_recipe_link_direct_tooltip')}
            >
                {variationMutation.isPending ? (
                  localize('com_ui_loading')
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="ml-1">{localize('com_ui_recipe_link_direct')}</span>
                  </>
                )}
            </Button>
          )}
          {conversationId != null && (
            <Button
              size="sm"
              variant="outline"
              disabled={variationMutation.isPending || saved}
              onClick={() => setParentPickerOpen(true)}
              title={localize('com_ui_recipe_link_choose_tooltip')}
            >
              <Link2 className="h-3.5 w-3.5" />
              <Plus className="ml-0.5 h-3 w-3" />
              <span className="ml-1">{localize('com_ui_recipe_link_choose')}</span>
            </Button>
          )}
          <ParentRecipeSelectorModal
            open={parentPickerOpen}
            onOpenChange={setParentPickerOpen}
            conversationId={conversationId ?? null}
          />
          {saved && savedRecipeId && (
            <Link
              to={`/r/${savedRecipeId}/step`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-active-alt hover:text-text-primary"
              title={localize('com_ui_recipe_go_to_cooking_mode')}
            >
              <ChefHat className="h-3.5 w-3.5" />
              {localize('com_ui_recipe_cooking_mode')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
