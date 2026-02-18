import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

type Localize = (key: string, values?: Record<string, string>) => string;

interface MealPlannerResult {
  action?: string;
  success?: boolean;
  plannedMeal?: { date?: string; slot?: string; recipeTitle?: string };
  deleted?: boolean;
  error?: string;
}

/**
 * Builds a short user-friendly summary for a meal_planner tool execution.
 * Falls back to generic "Planning mis à jour" if parsing fails.
 */
export function getMealPlannerSummary(
  argsStr: string | undefined,
  outputStr: string | undefined,
  localize: Localize,
): string {
  if (!outputStr || typeof outputStr !== 'string') {
    return localize('com_ui_meal_planner_action_summary_updated');
  }

  let result: MealPlannerResult;
  try {
    result = JSON.parse(outputStr) as MealPlannerResult;
  } catch {
    return localize('com_ui_meal_planner_action_summary_updated');
  }

  if (result.error) {
    return localize('com_ui_meal_planner_action_summary_updated');
  }

  const action = result.action ?? (typeof argsStr === 'string' ? parseActionFromArgs(argsStr) : null);

  if (action === 'add_meal' && result.success && result.plannedMeal?.recipeTitle) {
    const dateStr = result.plannedMeal.date;
    const slot = result.plannedMeal.slot;
    const title = result.plannedMeal.recipeTitle;
    const slotKey =
      slot === 'breakfast'
        ? 'com_ui_meal_planner_slot_breakfast'
        : slot === 'collation'
          ? 'com_ui_meal_planner_slot_collation'
          : slot === 'lunch'
            ? 'com_ui_meal_planner_slot_lunch'
            : slot === 'dinner'
              ? 'com_ui_meal_planner_slot_dinner'
              : slot === 'sortie'
                ? 'com_ui_meal_planner_slot_sortie'
                : '';
    const slotLabel = slotKey ? localize(slotKey) : '';
    const dateLabel = dateStr
      ? (() => {
          const s = format(parseISO(dateStr.slice(0, 10)), 'EEEE d MMMM', { locale: fr });
          return s.charAt(0).toUpperCase() + s.slice(1);
        })()
      : '';
    const withSlot = slotLabel ? localize('com_ui_meal_planner_action_summary_planned_with_slot', { 0: title, 1: dateLabel, 2: slotLabel }) : localize('com_ui_meal_planner_action_summary_planned', { 0: title, 1: dateLabel });
    return withSlot.trim();
  }

  if (action === 'delete_meal' && (result.success || result.deleted)) {
    return localize('com_ui_meal_planner_action_summary_deleted');
  }

  if (action === 'update_meal' && result.success) {
    return localize('com_ui_meal_planner_action_summary_updated');
  }

  if (action === 'add_comment' && result.success) {
    return localize('com_ui_meal_planner_action_summary_comment');
  }

  if (action === 'get_calendar') {
    return localize('com_ui_meal_planner_action_summary_calendar');
  }

  return localize('com_ui_meal_planner_action_summary_updated');
}

function parseActionFromArgs(argsStr: string): string | null {
  try {
    const args = JSON.parse(argsStr) as { action?: string };
    return args?.action ?? null;
  } catch {
    return null;
  }
}
