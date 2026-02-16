import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle, useLocalize } from '~/hooks';
import { useJournalQuery } from '~/data-provider';
import { Spinner, Button } from '@librechat/client';
import { Plus, Calendar, List } from 'lucide-react';
import JournalFiltersBar from './JournalFiltersBar';
import JournalEntryList from './JournalEntryList';
import JournalCalendarView from './JournalCalendarView';
import AddJournalEntryDialog from './AddJournalEntryDialog';
import { cn } from '~/utils';

export type JournalViewMode = 'calendar' | 'list';

export default function JournalView() {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const addRecipeId = searchParams.get('add') ?? undefined;

  // Open add dialog when navigating with ?add=recipeId (e.g. from recipe card)
  React.useEffect(() => {
    if (addRecipeId) {
      setAddEntryOpen(true);
    }
  }, [addRecipeId]);

  const params = useMemo(() => {
    const recipeId = searchParams.get('recipeId') || undefined;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const sort =
      searchParams.get('sort') === 'realizedAtAsc' ? 'realizedAtAsc' : 'realizedAtDesc';
    return {
      recipeId,
      fromDate,
      toDate,
      sort,
    };
  }, [searchParams]);

  const viewMode = (searchParams.get('view') as JournalViewMode) || 'calendar';
  const setViewMode = (mode: JournalViewMode) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', mode);
    setSearchParams(next);
  };

  const { data, isLoading, isFetching } = useJournalQuery(params);
  const realizations = data?.realizations ?? [];

  useDocumentTitle(`${localize('com_ui_journal')} | Iter8`);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-border-medium px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-text-primary">
            {localize('com_ui_journal')}
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-surface-active-alt text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Calendar className="h-4 w-4" />
                {localize('com_ui_journal_view_calendar')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-surface-active-alt text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <List className="h-4 w-4" />
                {localize('com_ui_journal_view_list')}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddEntryOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {localize('com_ui_journal_add')}
            </Button>
          </div>
        </div>
        <JournalFiltersBar />
        <AddJournalEntryDialog
          open={addEntryOpen}
          onOpenChange={(open) => {
            setAddEntryOpen(open);
            if (!open && addRecipeId) {
              const next = new URLSearchParams(searchParams);
              next.delete('add');
              setSearchParams(next, { replace: true });
            }
          }}
          initialRecipeId={addRecipeId}
        />
      </div>
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="text-text-primary" />
          </div>
        ) : viewMode === 'calendar' ? (
          <JournalCalendarView
            realizations={realizations}
            isFetching={isFetching}
          />
        ) : (
          <JournalEntryList realizations={realizations} isFetching={isFetching} />
        )}
      </div>
    </div>
  );
}
