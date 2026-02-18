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
import type {
  TRealizationWithRecipe,
  TPlannedMeal,
  MealPlanSlot,
} from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import useLocalStorage from '~/hooks/useLocalStorage';
import { useMediaQuery } from '@librechat/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMealPlannerCalendarQuery } from '~/data-provider';
import JournalEntryDetailDrawer from './JournalEntryDetailDrawer';
import PlannedMealDetailDrawer from './PlannedMealDetailDrawer';
import { cn } from '~/utils';

const DEFAULT_EMOJI = '🍽️';

const ALL_SLOTS: MealPlanSlot[] = ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'];
const SLOT_EMOJI: Record<MealPlanSlot, string> = {
  breakfast: '🥐',
  collation: '🍎',
  lunch: '☀️',
  dinner: '🌙',
  sortie: '🚶',
};
const DEFAULT_SLOT_FILTERS: MealPlanSlot[] = ['lunch', 'dinner'];

const SLOT_LABEL_KEYS: Record<string, string> = {
  breakfast: 'com_ui_meal_planner_slot_breakfast',
  collation: 'com_ui_meal_planner_slot_collation',
  lunch: 'com_ui_meal_planner_slot_lunch',
  dinner: 'com_ui_meal_planner_slot_dinner',
  sortie: 'com_ui_meal_planner_slot_sortie',
};

type DishTypeFilter = '' | 'entree' | 'plat' | 'dessert';

function getSlotLabel(slot: string, localize: (key: string) => string): string {
  const key = SLOT_LABEL_KEYS[slot];
  return key ? localize(key) : slot;
}

function getEntryDisplay(
  entry: TRealizationWithRecipe,
  localize: (key: string) => string,
): { title: string; emoji: string } {
  const title =
    entry.recipeTitle ??
    (entry.variationNote
      ? `${entry.variationNote} (variation)`
      : localize('com_ui_journal_recipe_unknown'));
  const emoji = entry.recipeEmoji?.trim() || DEFAULT_EMOJI;
  return { title, emoji };
}

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
  const isSmallScreen = useMediaQuery('(max-width: 640px)');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerEntryId, setDrawerEntryId] = useState<string | null>(null);
  const [drawerPlannedMeal, setDrawerPlannedMeal] = useState<TPlannedMeal | null>(null);
  const [slotFiltersArray, setSlotFiltersArray] = useLocalStorage<MealPlanSlot[]>('journalSlotFilters', DEFAULT_SLOT_FILTERS);
  const [dishTypeFilter, setDishTypeFilter] = useState<DishTypeFilter>('');
  const slotFilters = useMemo(() => new Set(slotFiltersArray), [slotFiltersArray]);

  const calendarRange = useMemo(() => {
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    return { from, to };
  }, [currentMonth]);

  const { data: calendarData } = useMealPlannerCalendarQuery(calendarRange);
  const plannedMeals = calendarData?.plannedMeals ?? [];

  const toggleSlotFilter = (slot: MealPlanSlot) => {
    setSlotFiltersArray((prev) => {
      const currentSet = new Set(prev);
      if (currentSet.has(slot)) {
        currentSet.delete(slot);
      } else {
        currentSet.add(slot);
      }
      return Array.from(currentSet);
    });
  };

  const entriesByDay = useMemo(() => {
    const map: Record<string, TRealizationWithRecipe[]> = {};
    for (const entry of realizations) {
      // Filter by dish type if selected
      if (dishTypeFilter && entry.recipeDishType !== dishTypeFilter) {
        continue;
      }
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
  }, [realizations, dishTypeFilter]);

  const plannedMealsByDay = useMemo(() => {
    const map: Record<string, TPlannedMeal[]> = {};
    for (const m of plannedMeals) {
      // Filter by slot
      if (!slotFilters.has(m.slot as MealPlanSlot)) {
        continue;
      }
      const key = typeof m.date === 'string' ? m.date.slice(0, 10) : format(new Date(m.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [plannedMeals, slotFilters]);


  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    return entriesByDay[getDayKey(selectedDate)] ?? [];
  }, [selectedDate, entriesByDay]);

  const selectedPlannedMeals = useMemo(() => {
    if (!selectedDate) return [];
    return plannedMealsByDay[getDayKey(selectedDate)] ?? [];
  }, [selectedDate, plannedMealsByDay]);


  const weekDayNames = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 0].map((d) =>
      format(new Date(2024, 0, d + 6), 'EEE'),
    );
  }, []);

  const hasAnyEvents =
    realizations.length > 0 ||
    plannedMeals.length > 0;
  if (!hasAnyEvents && !isFetching) {
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
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <h2 className="text-base font-semibold text-text-primary sm:text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
            aria-label={localize('com_ui_journal_next_month')}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-text-secondary">
              {localize('com_ui_journal_filter_slot')}:
            </span>
            {ALL_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlotFilter(slot)}
                className={cn(
                  'rounded p-1 text-base transition-opacity hover:opacity-100',
                  slotFilters.has(slot) ? 'opacity-100' : 'opacity-40 grayscale',
                )}
                title={localize(`com_ui_meal_planner_slot_${slot}`)}
                aria-label={localize(`com_ui_meal_planner_slot_${slot}`)}
                aria-pressed={slotFilters.has(slot)}
              >
                {SLOT_EMOJI[slot]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-text-secondary">
              {localize('com_ui_journal_filter_dish_type')}:
            </span>
            <button
              type="button"
              onClick={() => setDishTypeFilter('')}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                dishTypeFilter === ''
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_recipe_filter_all')}
            </button>
            <button
              type="button"
              onClick={() => setDishTypeFilter('entree')}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                dishTypeFilter === 'entree'
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_recipe_dish_entree')}
            </button>
            <button
              type="button"
              onClick={() => setDishTypeFilter('plat')}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                dishTypeFilter === 'plat'
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_recipe_dish_plat')}
            </button>
            <button
              type="button"
              onClick={() => setDishTypeFilter('dessert')}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                dishTypeFilter === 'dessert'
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize('com_ui_recipe_dish_dessert')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDayNames.map((name) => (
            <div
              key={name}
              className="py-1 text-center text-[10px] font-medium text-text-secondary sm:py-1.5 sm:text-xs"
            >
              {name}
            </div>
          ))}
          {calendarDays.map((day) => {
            const key = getDayKey(day);
            const entries = entriesByDay[key] ?? [];
            const dayPlanned = plannedMealsByDay[key] ?? [];
            const hasEntries = entries.length > 0;
            const hasPlanned = dayPlanned.length > 0;
            const hasAny = hasEntries || hasPlanned;
            const selected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const displayItems = isSmallScreen ? 3 : 4;
            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-[72px] flex-col overflow-hidden rounded-lg border border-transparent p-1.5 text-left transition-colors sm:min-h-[100px] sm:rounded-xl sm:p-2',
                  !isCurrentMonth && 'text-text-tertiary',
                  isCurrentMonth && 'text-text-primary',
                  hasAny && 'border-border-medium bg-surface-active-alt/70',
                  selected && 'ring-2 ring-primary border-primary bg-surface-active-alt',
                  isToday(day) && 'font-semibold',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className="mb-1 shrink-0 text-left text-xs sm:text-sm"
                >
                  {format(day, 'd')}
                </button>
                {hasAny ? (
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1">
                    {entries.slice(0, displayItems).map((entry) => {
                      const { title, emoji } = getEntryDisplay(entry, localize);
                      return (
                        <button
                          key={entry._id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerEntryId(entry._id);
                          }}
                          className={cn(
                            'flex min-w-0 items-center gap-1 rounded-md bg-surface-primary px-1 py-0.5 text-left transition-colors hover:bg-surface-active-alt sm:px-1.5 sm:py-1',
                            isSmallScreen ? 'justify-center' : 'justify-start',
                          )}
                        >
                          <span className="shrink-0 text-sm sm:text-base" aria-hidden>
                            {emoji}
                          </span>
                          {!isSmallScreen && (
                            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-text-primary sm:text-xs">
                              {title}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {dayPlanned.slice(0, Math.max(0, displayItems - entries.length)).map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day);
                          setDrawerPlannedMeal(m);
                        }}
                        className={cn(
                          'flex min-w-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1 py-0.5 text-left transition-colors hover:bg-primary/10 sm:px-1.5 sm:py-1',
                          isSmallScreen ? 'justify-center' : 'justify-start',
                        )}
                        title={m.recipeTitle}
                      >
                        <span className="shrink-0 text-sm sm:text-base" aria-hidden>
                          🍽️
                        </span>
                        {!isSmallScreen && (
                          <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-text-primary sm:text-xs" title={m.recipeTitle}>
                            {m.recipeTitle} ({getSlotLabel(m.slot, localize)})
                          </span>
                        )}
                      </button>
                    ))}
                    {(entries.length + dayPlanned.length) > displayItems && (
                      <span className="shrink-0 px-1 text-[9px] text-text-secondary sm:text-[10px]">
                        +{entries.length + dayPlanned.length - displayItems}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          className={cn(
            'rounded-xl border border-border-medium bg-surface-primary-alt p-4',
            isSmallScreen && 'min-h-[120px]',
          )}
        >
          <h3 className="mb-2 text-sm font-medium text-text-secondary">
            {format(selectedDate, 'EEEE d MMMM yyyy')}
          </h3>
          {selectedEntries.length === 0 &&
          selectedPlannedMeals.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              {localize('com_ui_journal_no_entries_that_day')}
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedEntries.map((entry) => {
                const { title, emoji } = getEntryDisplay(entry, localize);
                return (
                  <li key={entry._id}>
                    <button
                      type="button"
                      onClick={() => setDrawerEntryId(entry._id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-border-medium bg-surface-primary p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                    >
                      <span className="text-xl" aria-hidden>
                        {emoji}
                      </span>
                      <span className="flex-1 font-medium text-text-primary">
                        {title}
                      </span>
                    </button>
                  </li>
                );
              })}
              {selectedPlannedMeals.map((m) => (
                <li key={m._id}>
                  <button
                    type="button"
                    onClick={() => setDrawerPlannedMeal(m)}
                    className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                    title={m.recipeTitle}
                  >
                    <span className="text-xl shrink-0" aria-hidden>
                      🍽️
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-text-primary" title={m.recipeTitle}>
                      {m.recipeTitle} · {getSlotLabel(m.slot, localize)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {drawerEntryId && (
        <JournalEntryDetailDrawer
          entryId={drawerEntryId}
          open={!!drawerEntryId}
          onOpenChange={(open) => !open && setDrawerEntryId(null)}
        />
      )}
      <PlannedMealDetailDrawer
        plannedMeal={drawerPlannedMeal}
        open={!!drawerPlannedMeal}
        onOpenChange={(open) => !open && setDrawerPlannedMeal(null)}
      />
    </div>
  );
}
