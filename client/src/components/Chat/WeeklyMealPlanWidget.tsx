import React, { useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CalendarDays, RefreshCw } from 'lucide-react';
import { useLocalize } from '~/hooks';
import useLocalStorage from '~/hooks/useLocalStorage';
import { useMealPlannerCalendarQuery } from '~/data-provider';
import type { TPlannedMeal, MealPlanSlot } from 'librechat-data-provider';
import { PlannedMealDetailDrawer, AddPlannedMealDialog } from '~/components/Journal';
import { cn } from '~/utils';

const ALL_SLOTS: MealPlanSlot[] = ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'];
const SLOT_EMOJI: Record<MealPlanSlot, string> = {
  breakfast: '🥐',
  collation: '🍎',
  lunch: '☀️',
  dinner: '🌙',
  sortie: '🚶',
};

const DEFAULT_SLOT_FILTERS: MealPlanSlot[] = ['lunch', 'dinner'];

type DishTypeFilter = '' | 'entree' | 'plat' | 'dessert';

export default function WeeklyMealPlanWidget() {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedMeal, setSelectedMeal] = useState<TPlannedMeal | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDate, setAddDialogDate] = useState<string>('');
  const [addDialogSlot, setAddDialogSlot] = useState<MealPlanSlot>('dinner');
  const [slotFiltersArray, setSlotFiltersArray] = useLocalStorage<MealPlanSlot[]>('mealPlannerSlotFilters', DEFAULT_SLOT_FILTERS);
  const [dishTypeFilter, setDishTypeFilter] = useLocalStorage<DishTypeFilter>('mealPlannerDishTypeFilter', '');
  const slotFilters = useMemo(() => new Set(slotFiltersArray), [slotFiltersArray]);

  const weekDays = useMemo(() => {
    const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end });
  }, [currentWeekStart]);

  const calendarRange = useMemo(() => {
    const from = format(currentWeekStart, 'yyyy-MM-dd');
    const to = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return { from, to };
  }, [currentWeekStart]);

  const { data: calendarData, isLoading, refetch, isFetching } = useMealPlannerCalendarQuery(calendarRange);
  const plannedMeals = calendarData?.plannedMeals ?? [];

  const filteredPlannedMeals = useMemo(() => {
    if (!dishTypeFilter) return plannedMeals;
    return plannedMeals.filter((m) => m.recipeDishType === dishTypeFilter);
  }, [plannedMeals, dishTypeFilter]);

  // Plusieurs repas par créneau possible (ex. entrée + plat + dessert pour un même dîner)
  const mealsByDay = useMemo(() => {
    const map: Record<string, Partial<Record<MealPlanSlot, TPlannedMeal[]>>> = {};
    for (const m of filteredPlannedMeals) {
      const key = typeof m.date === 'string' ? m.date.slice(0, 10) : format(new Date(m.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = {};
      const slot = m.slot as MealPlanSlot;
      if (ALL_SLOTS.includes(slot)) {
        if (!map[key][slot]) map[key][slot] = [];
        map[key][slot].push(m);
      }
    }
    return map;
  }, [filteredPlannedMeals]);

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

  const activeSlots = useMemo(() => ALL_SLOTS.filter((s) => slotFilters.has(s)), [slotFilters]);

  const hasAnyMealForSlot = (dayKey: string, slot: MealPlanSlot) => {
    const arr = mealsByDay[dayKey]?.[slot];
    return Array.isArray(arr) && arr.length > 0;
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  };

  const hasMeals = plannedMeals.length > 0;

  const handleAddMeal = (date: string, slot: MealPlanSlot) => {
    setAddDialogDate(date);
    setAddDialogSlot(slot);
    setAddDialogOpen(true);
  };

  return (
    <div className="mx-auto mb-3 w-full max-w-3xl px-2 xl:max-w-4xl">
      <div className="rounded-xl border border-border-medium bg-surface-primary-alt">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">
              {localize('com_ui_weekly_meal_plan')}
            </span>
            {hasMeals && !isExpanded && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                {plannedMeals.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-border-medium p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="shrink-0 rounded p-1 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
                aria-label={localize('com_ui_weekly_meal_plan_prev_week')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1 truncate text-center text-xs font-medium text-text-secondary">
                {format(currentWeekStart, 'd MMM', { locale: fr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
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
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="shrink-0 rounded p-1 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary disabled:opacity-50"
                aria-label={localize('com_ui_weekly_meal_plan_refresh')}
                title={localize('com_ui_weekly_meal_plan_refresh')}
              >
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="shrink-0 rounded p-1 text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
                aria-label={localize('com_ui_weekly_meal_plan_next_week')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-medium text-text-secondary">
                {localize('com_ui_journal_filter_dish_type')}:
              </span>
              <button
                type="button"
                onClick={() => setDishTypeFilter('')}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                  dishTypeFilter === '' ? 'bg-surface-active-alt text-text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {localize('com_ui_recipe_filter_all')}
              </button>
              <button
                type="button"
                onClick={() => setDishTypeFilter('entree')}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                  dishTypeFilter === 'entree' ? 'bg-surface-active-alt text-text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {localize('com_ui_recipe_dish_entree')}
              </button>
              <button
                type="button"
                onClick={() => setDishTypeFilter('plat')}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                  dishTypeFilter === 'plat' ? 'bg-surface-active-alt text-text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {localize('com_ui_recipe_dish_plat')}
              </button>
              <button
                type="button"
                onClick={() => setDishTypeFilter('dessert')}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                  dishTypeFilter === 'dessert' ? 'bg-surface-active-alt text-text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {localize('com_ui_recipe_dish_dessert')}
              </button>
            </div>

            {isLoading ? (
              <div className="py-4 text-center text-xs text-text-secondary">
                {localize('com_ui_loading')}...
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayMeals = mealsByDay[key] ?? {};
                  const today = isToday(day);
                  const hasAnyMeal = activeSlots.some((s) => hasAnyMealForSlot(key, s));
                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-lg border border-border-light bg-surface-primary p-2.5',
                        today && 'border-primary bg-primary/5',
                        !hasAnyMeal && 'opacity-60',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={cn('text-xs font-medium capitalize', today ? 'text-primary' : 'text-text-secondary')}>
                          {format(day, 'EEEE d', { locale: fr })}
                        </span>
                        {today && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                            {localize('com_ui_weekly_meal_plan_today')}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {activeSlots.map((slot) => {
                          const meals = dayMeals[slot] ?? [];
                          const emoji = SLOT_EMOJI[slot];
                          return (
                            <div key={slot} className="space-y-0.5">
                              {meals.length > 0 ? (
                                meals.map((meal) => (
                                  <button
                                    key={meal._id}
                                    type="button"
                                    onClick={() => setSelectedMeal(meal)}
                                    className="flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-hover"
                                    title={meal.recipeTitle}
                                  >
                                    <span className="shrink-0 font-medium text-text-tertiary">{emoji}</span>
                                    <span className="min-w-0 flex-1 truncate text-text-primary" title={meal.recipeTitle}>
                                      {meal.recipeTitle}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddMeal(key, slot)}
                                  className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                                >
                                  <span className="shrink-0 opacity-60">{emoji}</span>
                                  <span className="flex-1 italic">-</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <PlannedMealDetailDrawer
        plannedMeal={selectedMeal}
        open={!!selectedMeal}
        onOpenChange={(open) => {
          if (!open) setSelectedMeal(null);
        }}
      />

      <AddPlannedMealDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        initialDate={addDialogDate}
        initialSlot={addDialogSlot}
      />
    </div>
  );
}
