import React from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle, Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useJournalEntryQuery, useRecipeQuery } from '~/data-provider';

interface JournalEntryDetailDrawerProps {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function JournalEntryDetailDrawer({
  entryId,
  open,
  onOpenChange,
}: JournalEntryDetailDrawerProps) {
  const localize = useLocalize();
  const { data: entry, isLoading: entryLoading } = useJournalEntryQuery(
    open ? entryId : null,
  );
  const recipeId = entry?.recipeId;
  const { data: recipe, isLoading: recipeLoading } = useRecipeQuery(
    open && recipeId ? recipeId : null,
  );

  const isLoading = entryLoading || recipeLoading;
  const title =
    entry?.recipeTitle ??
    (entry?.variationNote
      ? `${entry.variationNote} (variation)`
      : localize('com_ui_journal_recipe_unknown'));

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <OGDialogTitle>{localize('com_ui_journal_entry_detail')}</OGDialogTitle>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-text-primary" />
          </div>
        ) : entry ? (
          <div className="flex flex-col gap-4 pt-2">
            <div>
              <h3 className="text-sm font-medium text-text-secondary">
                {localize('com_ui_journal_realized_on')}
              </h3>
              <p className="text-text-primary">{formatDate(entry.realizedAt)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-secondary">
                {localize('com_ui_recipe_title')}
              </h3>
              <p className="font-medium text-text-primary">{title}</p>
            </div>
            {recipe && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary">
                  {localize('com_ui_journal_recipe_detail')}
                </h3>
                <div className="mt-1 rounded border border-border-medium bg-surface-primary-alt p-3 text-sm text-text-primary">
                  {recipe.description && (
                    <p className="mb-2">{recipe.description}</p>
                  )}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <p className="text-text-secondary">
                      {recipe.ingredients.length} {localize('com_ui_journal_ingredients')}
                    </p>
                  )}
                  {recipe.steps && recipe.steps.length > 0 && (
                    <p className="text-text-secondary">
                      {recipe.steps.length} {localize('com_ui_journal_steps')}
                    </p>
                  )}
                </div>
              </div>
            )}
            {entry.comment && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary">
                  {localize('com_ui_journal_comment')}
                </h3>
                <p className="mt-1 whitespace-pre-wrap rounded border border-border-medium bg-surface-primary-alt p-3 text-text-primary">
                  {entry.comment}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </OGDialogContent>
    </OGDialog>
  );
}
