const express = require('express');
const {
  getRealizations,
  getRealization,
  createRealization,
  deleteRealization,
  getRecipe,
  createShoppingListItems,
  deleteShoppingListItemsByRealizationId,
} = require('~/models');
const getLogStores = require('~/cache/getLogStores');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

async function invalidateShoppingListCache(userId) {
  const cache = getLogStores('SHOPPING_LIST');
  await Promise.all([
    cache.delete(`${userId}:all`),
    cache.delete(`${userId}:true`),
    cache.delete(`${userId}:false`),
  ]);
}

router.use(requireJwtAuth);

/**
 * GET /api/journal
 * List realizations (journal entries) for the authenticated user.
 * Query: recipeId, fromDate, toDate (ISO date strings), sort (realizedAtDesc | realizedAtAsc)
 */
router.get('/', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'journal.js:GET/',message:'GET /api/journal entered',data:{hasGetRealizations:typeof getRealizations,userIdPresent:!!req.user?.id},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const userId = req.user.id;
    const recipeId = req.query.recipeId || undefined;
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : undefined;
    const toDate = req.query.toDate ? new Date(req.query.toDate) : undefined;
    const sort = req.query.sort === 'realizedAtAsc' ? 'realizedAtAsc' : 'realizedAtDesc';
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'journal.js:before getRealizations',message:'calling getRealizations',data:{userId,recipeId,sort},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const { realizations } = await getRealizations({
      userId,
      recipeId,
      fromDate,
      toDate,
      sort,
    });
    res.json({ realizations });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'journal.js:catch',message:'GET /api/journal error',data:{message:error?.message,stack:error?.stack,name:error?.name},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/journal/:id
 * Get a single journal entry (must belong to the user).
 */
router.get('/:id', async (req, res) => {
  try {
    const entry = await getRealization(req.user.id, req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/journal
 * Create a journal entry (realization). Body: { recipeId, realizedAt?, comment? }
 * Also adds the recipe ingredients to the shopping list (name only), linked to this entry.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const recipeId = body.recipeId;
    if (!recipeId) {
      return res.status(400).json({ error: 'recipeId is required.' });
    }
    const userId = req.user.id;
    const realizedAt = body.realizedAt ? new Date(body.realizedAt) : undefined;
    const entry = await createRealization({
      userId,
      recipeId,
      realizedAt,
      comment: body.comment,
    });
    const recipe = await getRecipe(userId, recipeId);
    if (recipe?.ingredients?.length) {
      await createShoppingListItems({
        userId,
        sourceRealizationId: entry._id,
        items: recipe.ingredients.map((ing) => ({ name: ing.name })),
      });
    }
    await invalidateShoppingListCache(userId);
    res.status(201).json(entry);
  } catch (error) {
    if (error.message === 'Recipe not found') {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/journal/:id
 * Delete a journal entry (must belong to the user).
 * Also removes from the shopping list any ingredients that were added for this entry.
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    await deleteShoppingListItemsByRealizationId(userId, id);
    const deleted = await deleteRealization(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Journal entry not found.' });
    }
    await invalidateShoppingListCache(userId);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
