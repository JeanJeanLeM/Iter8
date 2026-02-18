const mongoose = require('mongoose');
const express = require('express');
const {
  getRealizations,
  getPlannedMeals,
  createPlannedMeal,
  updatePlannedMeal,
  deletePlannedMeal,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /api/meal-planner/calendar
 * Aggregated calendar data: realizations and plannedMeals for date range.
 * Query: from (ISO date), to (ISO date).
 */
router.get('/calendar', async (req, res) => {
  try {
    const userId = req.user.id;
    const fromParam = req.query.from;
    const toParam = req.query.to;
    if (!fromParam || !toParam) {
      return res.status(400).json({ error: 'Query from and to (ISO date) are required.' });
    }

    const fromDate = new Date(fromParam + 'T00:00:00.000Z');
    const toDate = new Date(toParam + 'T23:59:59.999Z');
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date.' });
    }

    // #region agent log
    (function () {
      fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mealPlanner.js:calendar', message: 'calendar range (toDate end-of-day)', data: { fromParam, toParam, fromDateISO: fromDate.toISOString(), toDateISO: toDate.toISOString() }, timestamp: Date.now(), hypothesisId: 'A', runId: 'post-fix' }) }).catch(() => {});
    })();
    // #endregion

    const [realizationsResult, plannedMealsResult] = await Promise.all([
      getRealizations({
        userId,
        fromDate,
        toDate,
        sort: 'realizedAtAsc',
      }),
      getPlannedMeals({ userId, fromDate, toDate }),
    ]);

    // #region agent log
    (function () {
      const meals = plannedMealsResult.plannedMeals;
      fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'mealPlanner.js:after getPlannedMeals', message: 'plannedMeals result', data: { count: meals.length, dates: meals.map((m) => (m.date instanceof Date ? m.date.toISOString() : m.date)), recipeTitles: meals.map((m) => m.recipeTitle) }, timestamp: Date.now(), hypothesisId: 'B' }) }).catch(() => {});
    })();
    // #endregion

    const plannedMeals = plannedMealsResult.plannedMeals;
    const recipeIds = [...new Set(plannedMeals.map((m) => m.recipeId).filter(Boolean))];
    let recipeDishTypeMap = {};
    if (recipeIds.length > 0) {
      const Recipe = mongoose.models?.Recipe;
      if (Recipe) {
        const recipes = await Recipe.find(
          { _id: { $in: recipeIds }, userId: new mongoose.Types.ObjectId(userId) },
          { _id: 1, dishType: 1 },
        )
          .lean()
          .exec();
        recipes.forEach((r) => {
          if (r._id && r.dishType) {
            recipeDishTypeMap[r._id.toString()] = r.dishType;
          }
        });
      }
    }

    res.json({
      realizations: realizationsResult.realizations,
      plannedMeals: plannedMeals.map((m) => {
        const recipeIdStr = m.recipeId ? m.recipeId.toString() : null;
        const recipeDishType = recipeIdStr ? recipeDishTypeMap[recipeIdStr] ?? null : null;
        return {
          ...m,
          date: m.date instanceof Date ? m.date.toISOString().slice(0, 10) : m.date,
          recipeDishType: recipeDishType || undefined,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/meal-planner/planned-meals
 * Body: { date, slot, recipeId?, recipeTitle, comment? }
 */
router.post('/planned-meals', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, slot, recipeId, recipeTitle, comment } = req.body || {};
    
    if (!date || !slot || !recipeTitle) {
      return res.status(400).json({ error: 'date, slot, and recipeTitle are required.' });
    }
    
    const created = await createPlannedMeal({
      userId,
      date: new Date(date),
      slot,
      recipeId: recipeId || null,
      recipeTitle,
      comment,
    });
    
    res.json({
      ...created,
      date: created.date instanceof Date ? created.date.toISOString().slice(0, 10) : created.date,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/meal-planner/planned-meals/:id
 * Body: { date?, slot?, recipeId?, recipeTitle?, comment? }
 */
router.patch('/planned-meals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { date, slot, recipeId, recipeTitle, comment } = req.body || {};
    const updates = {};
    if (date !== undefined) updates.date = new Date(date);
    if (slot !== undefined) updates.slot = slot;
    if (recipeId !== undefined) updates.recipeId = recipeId || null;
    if (recipeTitle !== undefined) updates.recipeTitle = recipeTitle;
    if (comment !== undefined) updates.comment = comment;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    const updated = await updatePlannedMeal(userId, id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Planned meal not found.' });
    }
    res.json({
      ...updated,
      date: updated.date instanceof Date ? updated.date.toISOString().slice(0, 10) : updated.date,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/meal-planner/planned-meals/:id
 */
router.delete('/planned-meals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const deleted = await deletePlannedMeal(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Planned meal not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
