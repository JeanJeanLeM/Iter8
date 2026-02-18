const express = require('express');
const {
  getShoppingList,
  createShoppingListItem,
  createShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItem,
  deleteShoppingListItemsForPastRealizations,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /api/shopping-list
 * List shopping list items for the authenticated user.
 * Query: bought (optional) — "true" | "false" to filter by bought status.
 * Automatically removes items that were added for meal-plan entries whose date is in the past.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    await deleteShoppingListItemsForPastRealizations(userId);
    const boughtParam = req.query.bought;
    let bought;
    if (boughtParam === 'true') bought = true;
    else if (boughtParam === 'false') bought = false;

    const { items } = await getShoppingList({ userId, bought });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/shopping-list
 * Add one or more items. Body: { name, quantity?, unit? } or { items: [{ name, quantity?, unit? }, ...] }.
 * Single item or bulk for tools/planificateur.
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};

    if (Array.isArray(body.items) && body.items.length > 0) {
      const created = await createShoppingListItems({
        userId,
        items: body.items.map((item) => ({
          name: item.name ?? '',
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      return res.status(201).json({ items: created });
    }

    const name = body.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const item = await createShoppingListItem({
      userId,
      name: name.trim(),
      quantity: body.quantity,
      unit: body.unit,
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/shopping-list/:id
 * Update an item (e.g. toggle bought, or edit name/quantity/unit). Body: { bought?, name?, quantity?, unit? }.
 */
router.patch('/:id', async (req, res) => {
  try {
    const updated = await updateShoppingListItem(
      req.user.id,
      req.params.id,
      req.body || {},
    );
    if (!updated) {
      return res.status(404).json({ error: 'Shopping list item not found.' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/shopping-list/:id
 * Delete an item (must belong to the user).
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteShoppingListItem(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Shopping list item not found.' });
    }
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
