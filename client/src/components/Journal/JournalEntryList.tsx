import React from 'react';
import type { TRealizationWithRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import JournalEntryCard from './JournalEntryCard';

interface JournalEntryListProps {
  realizations: TRealizationWithRecipe[];
  isFetching?: boolean;
}

export default function JournalEntryList({
  realizations,
  isFetching,
}: JournalEntryListProps) {
  const localize = useLocalize();

  if (realizations.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p>{localize('com_ui_journal_empty')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {realizations.map((entry) => (
        <li key={entry._id}>
          <JournalEntryCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}
