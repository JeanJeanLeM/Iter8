const express = require('express');
const {
  getRecipes,
  getRecipe,
  getRecipeRoot,
  getRecipeFamily,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  setRecipeVote,
} = require('~/models');
const getLogStores = require('~/cache/getLogStores');
const { requireJwtAuth } = require('~/server/middleware');
const { structureRecipeWithOpenAI } = require('~/server/services/Recipes/structureRecipeWithOpenAI');
const { generateRecipeImageWithOpenAI } = require('~/server/services/Recipes/generateRecipeImageWithOpenAI');
const { parseSharePage } = require('~/server/services/Recipes/importChatgptShare/parseSharePage');
const { detectRecipes } = require('~/server/services/Recipes/importChatgptShare/detectRecipes');
const { buildImportPlan } = require('~/server/services/Recipes/importChatgptShare/buildImportPlan');
const { config: endpointConfig } = require('~/server/services/Config/EndpointService');
const { extractEnvVariable } = require('librechat-data-provider');

const router = express.Router();

async function invalidateRecipesListCache(userId) {
  const cache = getLogStores('RECIPES_LIST');
  await cache.delete(`${userId}:default`);
}

router.use(requireJwtAuth);

/**
 * POST /api/recipes/import/chatgpt-share/preview
 * Fetches a ChatGPT share URL, detects recipe candidates, returns them with default timeline parent mapping.
 * Body: { shareUrl: string }
 */
router.post('/import/chatgpt-share/preview', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'E', location: 'recipes.js:preview', message: 'preview handler entry', data: { hasShareUrl: !!(req.body && req.body.shareUrl), shareUrlLen: (req.body && req.body.shareUrl) ? String(req.body.shareUrl).length : 0 }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  try {
    const { shareUrl } = req.body || {};
    if (!shareUrl || typeof shareUrl !== 'string') {
      return res.status(400).json({ error: 'shareUrl is required.' });
    }
    const { title, messages } = await parseSharePage(shareUrl);
    const candidates = detectRecipes(messages);
    if (candidates.length === 0) {
      return res.status(200).json({
        title,
        candidates: [],
        message: 'Aucune recette détectée (ingrédients en liste à puces requis).',
      });
    }
    const plan = buildImportPlan(candidates);
    res.status(200).json({ title, candidates: plan });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'E', location: 'recipes.js:preview-catch', message: 'preview handler catch', data: { errorMessage: (error && error.message) || '', errorName: (error && error.name) || '' }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    const { logger } = require('@librechat/data-schemas');
    logger.error('[POST /api/recipes/import/chatgpt-share/preview]', error?.message, error?.stack);
    const msg = error?.message || '';
    // Treat as client error (400): validation, share-link issues, or 401 from wrong URL (e.g. pasted app URL)
    const isShareLinkError =
      /share link|URL|chatgpt|invalid url|only https|could not load|expired|not found|required\.|unexpected format|no conversation|mapping/i.test(msg) ||
      (/\b401\b/.test(msg) && /GET\s+https?:\/\//i.test(msg));
    const status = isShareLinkError ? 400 : 500;
    const bodyMessage =
      status === 400 && /\b401\b/.test(msg) && /cookiterate|api\/user/i.test(msg)
        ? 'Please use a ChatGPT share link (https://chatgpt.com/share/...). Paste the share link from ChatGPT, not a link from this site.'
        : msg;
    res.status(status).json({ error: bodyMessage });
  }
});

/**
 * POST /api/recipes/import/chatgpt-share/commit
 * Creates recipes from selected ChatGPT share candidates. Uses structureRecipeWithOpenAI + createRecipe.
 * Body: { items: Array<{ importIndex: number; rawText: string; parentImportIndex: number | null }> }
 * Items must be in order; parentImportIndex refers to importIndex of parent (null = root).
 */
router.post('/import/chatgpt-share/commit', async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty.' });
    }
    const apiKey =
      endpointConfig?.openAIApiKey != null
        ? extractEnvVariable(String(endpointConfig.openAIApiKey))
        : process.env.OPENAI_API_KEY;
    const createdIdsByImportIndex = new Map();
    const created = [];
    const sorted = [...items]
      .filter((i) => i != null && typeof i.importIndex === 'number' && typeof i.rawText === 'string')
      .sort((a, b) => a.importIndex - b.importIndex);
    for (const item of sorted) {
      const { importIndex, rawText, parentImportIndex } = item;
      const parentId = parentImportIndex != null && createdIdsByImportIndex.has(parentImportIndex)
        ? createdIdsByImportIndex.get(parentImportIndex)
        : null;
      const structured = await structureRecipeWithOpenAI(rawText, apiKey, {});
      const recipe = await createRecipe({
        userId: req.user.id,
        parentId,
        variationNote: undefined,
        conversationId: null,
        title: structured.title,
        objective: structured.objective,
        description: structured.description,
        portions: structured.portions,
        duration: structured.duration,
        ingredients: structured.ingredients,
        steps: structured.steps,
        equipment: structured.equipment,
        tags: structured.tags,
        restTimeMinutes: structured.restTimeMinutes,
        maxStorageDays: structured.maxStorageDays,
      });
      createdIdsByImportIndex.set(importIndex, recipe._id.toString());
      created.push(recipe);
    }
    await invalidateRecipesListCache(req.user.id);
    res.status(201).json({ recipes: created });
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[POST /api/recipes/import/chatgpt-share/commit]', error?.message, error?.stack);
    const status = error.message?.includes('API key') ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * POST /api/recipes/structure
 * Takes raw recipe text from the AI assistant, structures it via OpenAI, and saves to DB.
 * Body: { recipeText: string }
 */
router.post('/structure', async (req, res) => {
  try {
    const { recipeText, parentId: parentIdBody, variationNote, conversationId: conversationIdBody } = req.body || {};
    if (!recipeText || typeof recipeText !== 'string') {
      return res.status(400).json({ error: 'recipeText is required.' });
    }

    const apiKey =
      endpointConfig?.openAIApiKey != null
        ? extractEnvVariable(String(endpointConfig.openAIApiKey))
        : process.env.OPENAI_API_KEY;

    const structured = await structureRecipeWithOpenAI(recipeText, apiKey, {
      ...(variationNote != null ? { variationNote } : {}),
    });

    const recipe = await createRecipe({
      userId: req.user.id,
      parentId: parentIdBody ?? null,
      variationNote: variationNote ?? undefined,
      conversationId: conversationIdBody && typeof conversationIdBody === 'string' ? conversationIdBody : null,
      title: structured.title,
      objective: structured.objective,
      description: structured.description,
      portions: structured.portions,
      duration: structured.duration,
      ingredients: structured.ingredients,
      steps: structured.steps,
      equipment: structured.equipment,
      tags: structured.tags,
      restTimeMinutes: structured.restTimeMinutes,
      maxStorageDays: structured.maxStorageDays,
    });

    await invalidateRecipesListCache(req.user.id);
    res.status(201).json(recipe);
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[POST /api/recipes/structure]', error?.message, error?.stack);
    const status = error.message?.includes('API key') ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * POST /api/recipes/:parentId/variation
 * Create a child recipe (variation) from a parent recipe.
 * Body: { title, variationNote?, description?, portions?, duration?, ingredients?, steps?, equipment?, tags?, ... }
 */
router.post('/:parentId/variation', async (req, res) => {
  try {
    const { parentId } = req.params;
    const body = req.body || {};

    const parentRecipe = await getRecipe(req.user.id, parentId);
    if (!parentRecipe) {
      return res.status(404).json({ error: 'Parent recipe not found.' });
    }

    const recipe = await createRecipe({
      userId: req.user.id,
      parentId,
      variationNote: body.variationNote ?? null,
      emoji: body.emoji,
      title: body.title ?? 'Sans titre',
      description: body.description,
      portions: body.portions,
      duration: body.duration,
      ingredients: body.ingredients ?? [],
      steps: body.steps ?? [],
      equipment: body.equipment ?? [],
      tags: body.tags ?? [],
      dishType: body.dishType,
      cuisineType: body.cuisineType ?? [],
      diet: body.diet ?? [],
      imageUrl: body.imageUrl,
    });

    await invalidateRecipesListCache(req.user.id);
    res.status(201).json(recipe);
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[POST /api/recipes/:parentId/variation]', error?.message, error?.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recipes/family
 * Get root + all descendants of a recipe (full lineage). Query: rootId
 */
router.get('/family', async (req, res) => {
  try {
    const rootId = req.query.rootId;
    if (!rootId || typeof rootId !== 'string') {
      return res.status(400).json({ error: 'rootId is required.' });
    }
    const { recipes } = await getRecipeFamily(req.user.id, rootId);
    res.json({ recipes });
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[GET /api/recipes/family]', error?.message, error?.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recipes/ai-images
 * List all AI-generated images across the user's recipes, sorted by relevance to a recipe.
 * Uses a lightweight find (no aggregation) to avoid MongoDB sort memory limits.
 * Query: recipeId (current recipe for sorting), page (default 1), limit (default 10).
 * Sort: same ingredients first, then same dishType, then same cuisineType.
 */
router.get('/ai-images', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Recipe = mongoose.models?.Recipe;
    if (!Recipe) {
      return res.status(500).json({ error: 'Recipe model not available.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const recipeId = req.query.recipeId ? String(req.query.recipeId) : null;

    const recipesWithAiImages = await Recipe.find(
      {
        userId: new mongoose.Types.ObjectId(req.user.id),
        'images.source': 'ai',
      },
      { _id: 1, title: 1, images: 1, dishType: 1, cuisineType: 1, 'ingredients.name': 1 },
    ).lean().exec();

    const flat = [];
    for (const r of recipesWithAiImages) {
      const images = Array.isArray(r.images) ? r.images : [];
      const title = r.title || '';
      const dishType = r.dishType || null;
      const cuisineType = Array.isArray(r.cuisineType) ? r.cuisineType : [];
      const ingredients = (r.ingredients || []).map((i) => (i.name || '').trim().toLowerCase()).filter(Boolean);
      for (const img of images) {
        if (img && img.source === 'ai' && img.url) {
          flat.push({
            url: img.url,
            source: 'ai',
            recipeId: r._id?.toString(),
            recipeTitle: title,
            dishType,
            cuisineType,
            ingredients,
          });
        }
      }
    }

    if (recipeId && flat.length > 0) {
      const currentRecipe = await Recipe.findOne(
        {
          _id: new mongoose.Types.ObjectId(recipeId),
          userId: new mongoose.Types.ObjectId(req.user.id),
        },
        { dishType: 1, cuisineType: 1, 'ingredients.name': 1 },
      ).lean().exec();

      if (currentRecipe) {
        const curIngredients = new Set(
          (currentRecipe.ingredients || [])
            .map((i) => (i.name || '').trim().toLowerCase())
            .filter(Boolean),
        );
        const curDishType = currentRecipe.dishType || null;
        const curCuisineType = new Set(Array.isArray(currentRecipe.cuisineType) ? currentRecipe.cuisineType : []);

        flat.sort((a, b) => {
          const ingredientScoreA = a.ingredients.filter((name) => curIngredients.has(name)).length;
          const ingredientScoreB = b.ingredients.filter((name) => curIngredients.has(name)).length;
          if (ingredientScoreB !== ingredientScoreA) return ingredientScoreB - ingredientScoreA;
          const dishA = a.dishType === curDishType ? 1 : 0;
          const dishB = b.dishType === curDishType ? 1 : 0;
          if (dishB !== dishA) return dishB - dishA;
          const cuisineA = (a.cuisineType || []).filter((c) => curCuisineType.has(c)).length;
          const cuisineB = (b.cuisineType || []).filter((c) => curCuisineType.has(c)).length;
          return cuisineB - cuisineA;
        });
      }
    }

    const total = flat.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const images = flat.slice(skip, skip + limit).map(({ url, source, recipeId: rid, recipeTitle }) => ({
      url,
      source,
      recipeId: rid,
      recipeTitle,
    }));

    res.json({ images, total, page, totalPages });
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[GET /api/recipes/ai-images] ' + String(error?.message || error));
    res.status(500).json({ error: String(error?.message || 'Unknown error') });
  }
});

/**
 * GET /api/recipes
 * List recipes for the authenticated user with optional filters.
 * Query: ingredientsInclude, ingredientsExclude (array or comma-separated),
 *        dishType, cuisineType, diet (array or comma-separated), parentsOnly (default true)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const ingredientsInclude = parseArrayParam(req.query.ingredientsInclude);
    const ingredientsExclude = parseArrayParam(req.query.ingredientsExclude);
    const dishType = req.query.dishType || undefined;
    const cuisineType = parseArrayParam(req.query.cuisineType);
    const diet = parseArrayParam(req.query.diet);
    const parentsOnly = req.query.parentsOnly !== 'false';
    const parentId = req.query.parentId || undefined;
    const ids = parseArrayParam(req.query.ids);

    const useCache =
      ids.length === 0 &&
      !parentId &&
      ingredientsInclude.length === 0 &&
      ingredientsExclude.length === 0 &&
      !dishType &&
      (!cuisineType || cuisineType.length === 0) &&
      (!diet || diet.length === 0) &&
      parentsOnly;

    if (useCache) {
      const cache = getLogStores('RECIPES_LIST');
      const cacheKey = `${userId}:default`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const { recipes } = await getRecipes({
      userId,
      ingredientsInclude,
      ingredientsExclude,
      dishType,
      cuisineType,
      diet,
      parentsOnly,
      parentId,
      ids: ids.length > 0 ? ids : undefined,
    });
    const payload = { recipes };
    if (useCache) {
      const cache = getLogStores('RECIPES_LIST');
      const cacheKey = `${userId}:default`;
      await cache.set(cacheKey, payload);
    }
    res.json(payload);
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[GET /api/recipes]', error?.message, error?.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recipes/:id/root
 * Get the root (ancestor) of a recipe by traversing parentId. Returns the root recipe.
 */
router.get('/:id/root', async (req, res) => {
  try {
    const root = await getRecipeRoot(req.user.id, req.params.id);
    if (!root) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json(root);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recipes/:id
 * Get a single recipe by id (must belong to the user).
 */
router.get('/:id', async (req, res) => {
  try {
    const recipe = await getRecipe(req.user.id, req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/recipes
 * Create a new recipe (mother or variation if parentId provided).
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const recipe = await createRecipe({
      userId: req.user.id,
      parentId: body.parentId ?? null,
      variationNote: body.variationNote,
      objective: body.objective,
      emoji: body.emoji,
      title: body.title ?? 'Sans titre',
      description: body.description,
      portions: body.portions,
      duration: body.duration,
      ingredients: body.ingredients ?? [],
      steps: body.steps ?? [],
      equipment: body.equipment ?? [],
      tags: body.tags ?? [],
      dishType: body.dishType,
      cuisineType: body.cuisineType ?? [],
      diet: body.diet ?? [],
      imageUrl: body.imageUrl,
    });
    await invalidateRecipesListCache(req.user.id);
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/recipes/:id/generate-image
 * Generate a recipe image with OpenAI (gpt-image-1.5, 1024x1024, low) and set recipe.imageUrl.
 * Uses OPENAI_API_KEY from .env.
 */
router.post('/:id/generate-image', async (req, res) => {
  const id = req.params.id;
  try {
    const recipe = await getRecipe(req.user.id, id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    const existingImages = Array.isArray(recipe.images) && recipe.images.length > 0
      ? recipe.images
      : recipe.imageUrl
        ? [{ url: recipe.imageUrl, source: 'upload' }]
        : [];
    const hasAiImage = existingImages.some((img) => img.source === 'ai');
    if (hasAiImage) {
      return res.status(409).json({ error: 'Cette recette a déjà une image créée par IA.' });
    }
    let apiKey;
    try {
      apiKey =
        endpointConfig?.openAIApiKey != null
          ? extractEnvVariable(String(endpointConfig.openAIApiKey))
          : process.env.OPENAI_API_KEY;
    } catch (extractErr) {
      throw extractErr;
    }
    const newImageUrl = await generateRecipeImageWithOpenAI(recipe, apiKey);
    const newImages = [...existingImages, { url: newImageUrl, source: 'ai' }];
    const updated = await updateRecipe(req.user.id, id, {
      images: newImages,
      imageUrl: newImages[0].url,
    });
    res.json(updated);
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[POST /api/recipes/:id/generate-image]', error?.message, error?.stack);
    const status = error.message?.includes('API key') ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * PUT /api/recipes/:id
 * Update a recipe (must belong to the user).
 */
router.put('/:id', async (req, res) => {
  try {
    const recipe = await updateRecipe(req.user.id, req.params.id, req.body || {});
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    await invalidateRecipesListCache(req.user.id);
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete a recipe and its variations and votes (must belong to the user).
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteRecipe(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    await invalidateRecipesListCache(req.user.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/recipes/:id/vote
 * Set or update the authenticated user's vote for a recipe. Body: { value: 1 | -1 }
 */
router.post('/:id/vote', async (req, res) => {
  try {
    const value = req.body?.value;
    if (value !== 1 && value !== -1) {
      return res.status(400).json({ error: 'value must be 1 or -1.' });
    }
    const result = await setRecipeVote({
      userId: req.user.id,
      recipeId: req.params.id,
      value,
    });
    res.json(result);
  } catch (error) {
    if (error.message === 'Recipe not found') {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.status(500).json({ error: error.message });
  }
});

function parseArrayParam(param) {
  if (param == null) return [];
  if (Array.isArray(param)) return param.filter(Boolean);
  if (typeof param === 'string') return param.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

module.exports = router;
