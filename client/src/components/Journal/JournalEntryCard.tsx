import React, { useState } from 'react';
import type { TRealizationWithRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import JournalEntryDetailDrawer from './JournalEntryDetailDrawer';
import { cn } from '~/utils';

interface JournalEntryCardProps {
  entry: TRealizationWithRecipe;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function JournalEntryCard({ entry }: JournalEntryCardProps) {
  const localize = useLocalize();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const title =
    entry.recipeTitle ??
    (entry.variationNote ? `${entry.variationNote} (variation)` : localize('com_ui_journal_recipe_unknown'));
  const commentExcerpt = entry.comment
    ? entry.comment.length > 80
      ? `${entry.comment.slice(0, 80)}…`
      : entry.comment
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          'w-full rounded-xl border border-border-medium bg-surface-primary-alt p-4 text-left',
          'shadow-sm transition-shadow hover:shadow-md',
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold text-text-primary">{title}</span>
          <span className="text-sm text-text-secondary">
            {formatDate(entry.realizedAt)}
          </span>
        </div>
        {commentExcerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
            {commentExcerpt}
          </p>
        )}
      </button>
      <JournalEntryDetailDrawer
        entryId={entry._id}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
