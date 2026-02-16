import React from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { selectedRecipeForVariation } from '~/store';
import { cn } from '~/utils';

export default function SelectedRecipeBanner() {
  const localize = useLocalize();
  const selected = useRecoilValue(selectedRecipeForVariation);
  const setSelected = useSetRecoilState(selectedRecipeForVariation);

  if (!selected) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-2 text-sm',
        'border-b border-border-light bg-surface-primary-alt/80',
      )}
    >
      <span className="truncate text-text-secondary">
        {localize('com_ui_recipe_selected_banner', { title: selected.title })}
      </span>
      <button
        type="button"
        onClick={() => setSelected(null)}
        className="shrink-0 rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        aria-label={localize('com_ui_clear')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
