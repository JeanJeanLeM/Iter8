import React, { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import type { TRealizationWithRecipe } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import JournalEntryCard from './JournalEntryCard';
import { cn } from '~/utils';

interface JournalCalendarViewProps {
  realizations: TRealizationWithRecipe[];
  isFetching?: boolean;
}

function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export default function JournalCalendarView({
  realizations,
  isFetching,
}: JournalCalendarViewProps) {
  const localize = useLocalize();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const entriesByDay = useMemo(() => {
    const map: Record<string, TRealizationWithRecipe[]> = {};
    for (const entry of realizations) {
      try {
        const d = new Date(entry.realizedAt);
        const key = getDayKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      } catch {
        // skip invalid dates
      }
    }
    return map;
  }, [realizations]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    return entriesByDay[getDayKey(selectedDate)] ?? [];
  }, [selectedDate, entriesByDay]);

  const weekDayNames = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 0].map((d) =>
      format(new Date(2024, 0, d + 6), 'EEE'),
    );
  }, []);

  if (realizations.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p>{localize('com_ui_journal_empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border-medium bg-surface-primary-alt p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
            aria-label={localize('com_ui_journal_prev_month')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
            aria-label={localize('com_ui_journal_next_month')}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDayNames.map((name) => (
            <div
              key={name}
              className="py-1.5 text-center text-xs font-medium text-text-secondary"
            >
              {name}
            </div>
          ))}
          {calendarDays.map((day) => {
            const key = getDayKey(day);
            const entries = entriesByDay[key] ?? [];
            const hasEntries = entries.length > 0;
            const selected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex min-h-[200px] flex-col overflow-hidden rounded-xl border border-transparent p-2 text-left transition-colors',
                  !isCurrentMonth && 'text-text-tertiary',
                  isCurrentMonth && 'text-text-primary',
                  hasEntries && 'border-border-medium bg-surface-active-alt/70 hover:bg-surface-active-alt',
                  selected && 'ring-2 ring-primary border-primary bg-surface-active-alt',
                  isToday(day) && 'font-semibold',
                )}
              >
                <span className="mb-1.5 shrink-0 text-sm">{format(day, 'd')}</span>
                {hasEntries ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
                    {entries.slice(0, 2).map((entry) => {
                      const title =
                        entry.recipeTitle ??
                        (entry.variationNote
                          ? `${entry.variationNote} (variation)`
                          : localize('com_ui_journal_recipe_unknown'));
                      return (
                        <div
                          key={entry._id}
                          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-primary"
                        >
                          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-lg bg-surface-active-alt">
                            {entry.recipeImageUrl ? (
                              <img
                                src={entry.recipeImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-text-tertiary">
                                {localize('com_ui_recipe_no_image')}
                              </div>
                            )}
                          </div>
                          <p className="line-clamp-2 px-1.5 py-1 text-[11px] font-medium text-text-primary">
                            {title}
                          </p>
                        </div>
                      );
                    })}
                    {entries.length > 2 && (
                      <span className="shrink-0 px-1 text-[10px] text-text-secondary">
                        +{entries.length - 2}
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {selectedDate && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">
            {format(selectedDate, 'EEEE d MMMM yyyy')}
          </h3>
          {selectedEntries.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              {localize('com_ui_journal_no_entries_that_day')}
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEntries.map((entry) => (
                <li key={entry._id}>
                  <JournalEntryCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
