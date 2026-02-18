const express = require('express');
const {
  getIngredients,
  getIngredientById,
  createIngredient,
  syncIngredientsFromUserData,
  updateIngredient,
} = require('~/models');
const { requireJwtAuth } = require('~/server/middleware');
const { getNutritionUpdateForIngredient, getNutritionFromProcessed } = require('~/server/services/usdaNutrition');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /api/ingredients
 * List all ingredients (gallery). Syncs from recipes/shopping first, then backfills nutrition from
 * ingredients-processed.json for any ingredient without data so values are visible by default.
 */
router.get('/', async (req, res) => {
  try {
    await syncIngredientsFromUserData(req.user.id);
    let { ingredients } = await getIngredients();
    for (const ing of ingredients) {
      if (ing.energyKcal != null) continue;
      const payload = getNutritionFromProcessed(ing.name);
      if (payload) {
        await updateIngredient(ing._id, {
          energyKcal: payload.energyKcal,
          proteinG: payload.proteinG,
          fatG: payload.fatG,
          carbohydrateG: payload.carbohydrateG,
          fiberG: payload.fiberG,
          nutritionMicros: payload.nutritionMicros,
          usdaFdcId: payload.usdaFdcId,
          usdaDescription: payload.usdaDescription,
        });
      }
    }
    const result = await getIngredients();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ingredients
 * Create an ingredient manually. Body: { name (required), displayName? }. If name already exists (normalized), returns existing.
 */
router.post('/', async (req, res) => {
  try {
    const { name, displayName } = req.body || {};
    const ingredient = await createIngredient({ name, displayName });
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/ingredients/:id
 * Update an ingredient (e.g. set imageUrl for the simple drawn image). Body: { imageUrl?, displayName? }
 */
router.patch('/:id', async (req, res) => {
  try {
    const updated = await updateIngredient(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ingredients/:id/enrich-usda
 * Enrich an ingredient with USDA FoodData Central nutrition (energyKcal, macros, micros). Uses ingredient name to match USDA entry.
 */
router.post('/:id/enrich-usda', async (req, res) => {
  try {
    const ingredient = await getIngredientById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }
    const payload = getNutritionUpdateForIngredient(ingredient.name);
    if (!payload) {
      return res.status(404).json({ error: 'No USDA match found for this ingredient name.' });
    }
    const update = {
      energyKcal: payload.energyKcal,
      proteinG: payload.proteinG,
      fatG: payload.fatG,
      carbohydrateG: payload.carbohydrateG,
      fiberG: payload.fiberG,
      nutritionMicros: payload.nutritionMicros,
      usdaFdcId: payload.usdaFdcId,
      usdaDescription: payload.usdaDescription,
    };
    const updated = await updateIngredient(req.params.id, update);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
