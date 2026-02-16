import React, { useCallback, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { BookOpen, Loader2, Link2, Plus } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { structureAndCreateRecipe } from '~/data-provider/Recipes/api';
import { useToastContext } from '@librechat/client';
import { manuallySelectedParentId } from '~/store';
import ParentRecipeSelectorModal from '~/components/Recipes/ParentRecipeSelectorModal';
import type { TRecipe } from 'librechat-data-provider';

export default function WriteRecipeHoverButton({
  isLast,
  isDisabled,
  recipeText,
  onRecipeAdded,
  parentRecipeId,
  conversationId,
  /** Hide link button when this message just created the parent (first recipe) */
  hideLinkForFirstRecipe = false,
}: {
  isLast: boolean;
  isDisabled?: boolean;
  recipeText: string;
  onRecipeAdded?: (recipe: TRecipe) => void;
  parentRecipeId?: string | null;
  conversationId?: string | null;
  hideLinkForFirstRecipe?: boolean;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const manualParentId = useRecoilValue(manuallySelectedParentId);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVariation, setIsLoadingVariation] = useState(false);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const effectiveParentId = manualParentId ?? parentRecipeId;
  const hasParent = !!effectiveParentId && !hideLinkForFirstRecipe;

  const doCreate = useCallback(
    async (asVariation: boolean) => {
      const text = (recipeText || '').trim();
      if (!text) {
        showToast({ message: localize('com_ui_recipe_no_content'), status: 'error' });
        return;
      }

      const setLoading = asVariation ? setIsLoadingVariation : setIsLoading;
      setLoading(true);
      try {
        const recipe = await structureAndCreateRecipe(text, asVariation && effectiveParentId ? { parentId: effectiveParentId } : undefined);
        showToast({
          message: localize('com_ui_recipe_added') || 'Recette ajoutée au livre !',
          status: 'success',
        });
        onRecipeAdded?.(recipe);
      } catch (error: unknown) {
        let message = localize('com_ui_error');
        if (error && typeof error === 'object') {
          const err = error as { message?: string; response?: { data?: { error?: string } } };
          message = err.response?.data?.error || err.message || message;
        }
        showToast({ message, status: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [recipeText, localize, showToast, onRecipeAdded, effectiveParentId],
  );

  const handleClick = useCallback(() => doCreate(false), [doCreate]);
  const handleKeepLink = useCallback(() => doCreate(true), [doCreate]);

  const buttonStyle = cn(
    'hover-button rounded-lg p-1.5 text-text-secondary-alt',
    'hover:text-text-primary hover:bg-surface-hover',
    'md:group-hover:visible md:group-focus-within:visible md:group-[.final-completion]:visible',
    !isLast && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
    'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
  );

  return (
    <>
      <button
        className={buttonStyle}
        onClick={handleClick}
        type="button"
        title={localize('com_ui_recipe_write_recipe')}
        disabled={isDisabled || isLoading || isLoadingVariation}
      >
        {isLoading ? (
          <Loader2 size={19} className="animate-spin" />
        ) : (
          <BookOpen size={19} />
        )}
      </button>
      {hasParent && (
        <button
          className={buttonStyle}
          onClick={handleKeepLink}
          type="button"
          title={localize('com_ui_recipe_link_direct_tooltip')}
          disabled={isDisabled || isLoading || isLoadingVariation}
        >
          {isLoadingVariation ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <Link2 size={19} />
          )}
        </button>
      )}
      {conversationId != null && (
        <button
          className={buttonStyle}
          onClick={() => setParentPickerOpen(true)}
          type="button"
          title={localize('com_ui_recipe_link_choose_tooltip')}
          disabled={isDisabled || isLoading || isLoadingVariation}
        >
          <Link2 size={19} className="mr-0.5" />
          <Plus size={12} />
        </button>
      )}
      <ParentRecipeSelectorModal
        open={parentPickerOpen}
        onOpenChange={setParentPickerOpen}
        conversationId={conversationId ?? null}
      />
    </>
  );
}
