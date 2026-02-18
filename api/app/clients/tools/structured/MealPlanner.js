const { Tool } = require('@langchain/core/tools');

const mealPlannerJsonSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['get_calendar', 'add_meal', 'update_meal', 'delete_meal', 'add_comment'],
      description:
        'get_calendar: list planned meals in a date range. add_meal: add a meal. update_meal: update an existing planned meal. delete_meal: remove a planned meal. add_comment: add a comment for a past meal (journal/realization).',
    },
    fromDate: {
      type: 'string',
      description: 'Start date for get_calendar (YYYY-MM-DD).',
    },
    toDate: {
      type: 'string',
      description: 'End date for get_calendar (YYYY-MM-DD).',
    },
    date: {
      type: 'string',
      description: 'Date for add_meal, delete_meal (by date+slot+recipeTitle), or add_comment (YYYY-MM-DD).',
    },
    slot: {
      type: 'string',
      enum: ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'],
      description: 'Meal slot: breakfast, collation (snack), lunch, dinner, or sortie (outing).',
    },
    recipeTitle: {
      type: 'string',
      description:
        'Dish name (free text or recipe title). For add_meal/update_meal: will be matched to user recipes when possible. For delete_meal: identify meal to delete. For add_comment: recipe eaten (e.g. "mousse au chocolat").',
    },
    comment: {
      type: 'string',
      description:
        'Note for add_meal (future meal) or comment text for add_comment (past meal feedback).',
    },
    plannedMealId: {
      type: 'string',
      description: 'ID of the planned meal for update_meal or delete_meal.',
    },
  },
  required: ['action'],
  additionalProperties: false,
};

function normalizeTitle(title) {
  if (typeof title !== 'string') return '';
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + 'T12:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

class MealPlanner extends Tool {
  name = 'meal_planner';
  description =
    'Manage the meal planner: get calendar (list planned meals), add a meal, update a meal, delete a meal, or add a comment for a past meal. ' +
    'Use get_calendar to see planned meals in a date range. Use add_meal with date (YYYY-MM-DD), slot (breakfast/collation/lunch/dinner/sortie), recipeTitle; optionally comment. ' +
    'Use update_meal with plannedMealId and fields to change (recipeTitle, comment). ' +
    'Use delete_meal with plannedMealId or with date, slot, recipeTitle to identify the meal. ' +
    'Use add_comment for feedback on a meal already eaten: date, slot, recipeTitle, comment (recipe must exist in user book).';

  schema = mealPlannerJsonSchema;

  static get jsonSchema() {
    return mealPlannerJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.userId = fields.userId ?? null;
  }

  async _call(args) {
    const userId = this.userId;
    if (!userId) {
      return JSON.stringify({ error: 'User context not available.' });
    }

    const {
      getRecipes,
      getPlannedMeals,
      getPlannedMeal,
      createPlannedMeal,
      updatePlannedMeal,
      deletePlannedMeal,
      createRealization,
    } = require('~/models');

    const action = args.action;

    try {
      if (action === 'get_calendar') {
        const fromDate = parseDate(args.fromDate);
        const toDate = parseDate(args.toDate);
        if (!fromDate || !toDate) {
          return JSON.stringify({
            error: 'get_calendar requires fromDate and toDate (YYYY-MM-DD).',
          });
        }
        const { plannedMeals } = await getPlannedMeals({
          userId,
          fromDate,
          toDate,
        });
        const list = plannedMeals.map((m) => ({
          id: String(m._id),
          date: m.date instanceof Date ? m.date.toISOString().slice(0, 10) : m.date,
          slot: m.slot,
          recipeTitle: m.recipeTitle,
          comment: m.comment ?? undefined,
        }));
        return JSON.stringify({ plannedMeals: list });
      }

      if (action === 'add_meal') {
        const date = parseDate(args.date);
        const VALID_SLOTS = ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'];
        const slot = VALID_SLOTS.includes(args.slot) ? args.slot : null;
        const recipeTitle =
          typeof args.recipeTitle === 'string' && args.recipeTitle.trim()
            ? args.recipeTitle.trim()
            : null;
        if (!date || !slot || !recipeTitle) {
          return JSON.stringify({
            error: 'add_meal requires date (YYYY-MM-DD), slot (breakfast/collation/lunch/dinner/sortie), and recipeTitle.',
          });
        }
        let recipeId = null;
        const { recipes } = await getRecipes({ userId, parentsOnly: true });
        const normalized = normalizeTitle(recipeTitle);
        const found = recipes.find((r) => normalizeTitle(r.title) === normalized);
        if (found) recipeId = String(found._id);
        const comment =
          typeof args.comment === 'string' && args.comment.trim() ? args.comment.trim() : undefined;
        const meal = await createPlannedMeal({
          userId,
          date,
          slot,
          recipeId: recipeId || undefined,
          recipeTitle,
          comment,
        });
        return JSON.stringify({
          success: true,
          plannedMeal: {
            id: String(meal._id),
            date: meal.date instanceof Date ? meal.date.toISOString().slice(0, 10) : meal.date,
            slot: meal.slot,
            recipeTitle: meal.recipeTitle,
            matchedRecipe: !!recipeId,
          },
        });
      }

      if (action === 'update_meal') {
        const plannedMealId = typeof args.plannedMealId === 'string' ? args.plannedMealId.trim() : null;
        if (!plannedMealId) {
          return JSON.stringify({ error: 'update_meal requires plannedMealId.' });
        }
        const updates = {};
        if (typeof args.recipeTitle === 'string' && args.recipeTitle.trim())
          updates.recipeTitle = args.recipeTitle.trim();
        if (typeof args.comment === 'string') updates.comment = args.comment.trim() || undefined;
        if (updates.recipeTitle) {
          const { recipes } = await getRecipes({ userId, parentsOnly: true });
          const normalized = normalizeTitle(updates.recipeTitle);
          const found = recipes.find((r) => normalizeTitle(r.title) === normalized);
          updates.recipeId = found ? String(found._id) : null;
        }
        const updated = await updatePlannedMeal(userId, plannedMealId, updates);
        if (!updated) {
          return JSON.stringify({ error: 'Planned meal not found or not updated.' });
        }
        return JSON.stringify({
          success: true,
          plannedMeal: {
            id: String(updated._id),
            date: updated.date instanceof Date ? updated.date.toISOString().slice(0, 10) : updated.date,
            slot: updated.slot,
            recipeTitle: updated.recipeTitle,
            comment: updated.comment ?? undefined,
          },
        });
      }

      if (action === 'delete_meal') {
        let plannedMealId = typeof args.plannedMealId === 'string' ? args.plannedMealId.trim() : null;
        if (!plannedMealId) {
          const date = parseDate(args.date);
          const VALID_SLOTS = ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'];
          const slot = VALID_SLOTS.includes(args.slot) ? args.slot : null;
          const recipeTitle =
            typeof args.recipeTitle === 'string' && args.recipeTitle.trim()
              ? args.recipeTitle.trim()
              : null;
          if (!date || !slot || !recipeTitle) {
            return JSON.stringify({
              error:
                'delete_meal requires plannedMealId OR (date, slot, recipeTitle) to identify the meal.',
            });
          }
          const { plannedMeals } = await getPlannedMeals({ userId, fromDate: date, toDate: date });
          const normalized = normalizeTitle(recipeTitle);
          const match = plannedMeals.find(
            (m) => m.slot === slot && normalizeTitle(m.recipeTitle) === normalized,
          );
          if (!match) {
            return JSON.stringify({ error: 'No matching planned meal found to delete.' });
          }
          plannedMealId = String(match._id);
        }
        const deleted = await deletePlannedMeal(userId, plannedMealId);
        return JSON.stringify({ success: deleted, deleted: !!deleted });
      }

      if (action === 'add_comment') {
        const date = parseDate(args.date);
        const VALID_SLOTS = ['breakfast', 'collation', 'lunch', 'dinner', 'sortie'];
        const slot = VALID_SLOTS.includes(args.slot) ? args.slot : null;
        const recipeTitle =
          typeof args.recipeTitle === 'string' && args.recipeTitle.trim()
            ? args.recipeTitle.trim()
            : null;
        const comment =
          typeof args.comment === 'string' && args.comment.trim() ? args.comment.trim() : null;
        if (!date || !slot || !recipeTitle || !comment) {
          return JSON.stringify({
            error: 'add_comment requires date (YYYY-MM-DD), slot (breakfast/collation/lunch/dinner/sortie), recipeTitle, and comment.',
          });
        }
        const { recipes } = await getRecipes({ userId, parentsOnly: true });
        const normalized = normalizeTitle(recipeTitle);
        const found = recipes.find((r) => normalizeTitle(r.title) === normalized);
        if (!found) {
          return JSON.stringify({
            error: `Aucune recette "${recipeTitle}" trouvée dans ton livre. Ajoute la recette pour enregistrer ce commentaire.`,
          });
        }
        const recipeId = String(found._id);
        const realizedAt = new Date(date);
        const hourBySlot = { breakfast: 8, collation: 16, lunch: 12, dinner: 20, sortie: 19 };
        realizedAt.setHours(hourBySlot[slot] ?? 12, 0, 0, 0);
        await createRealization({
          userId,
          recipeId,
          realizedAt,
          comment,
        });
        return JSON.stringify({
          success: true,
          message: 'Commentaire enregistré pour ce repas.',
        });
      }

      return JSON.stringify({ error: `Unknown action: ${action}` });
    } catch (err) {
      return JSON.stringify({ error: err.message || String(err) });
    }
  }
}

module.exports = MealPlanner;
