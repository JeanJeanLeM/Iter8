const express = require('express');
const { Tokenizer, generateCheckAccess } = require('@librechat/api');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const {
  getAllUserMemories,
  updateUserPersonalization,
  createMemory,
  deleteMemory,
  setMemory,
} = require('~/models');
const { requireJwtAuth, configMiddleware } = require('~/server/middleware');
const { getRoleByName } = require('~/models/Role');
const { generatePreferencesSummary } = require('~/server/services/PreferencesSummaryService');

const router = express.Router();

const memoryPayloadLimit = express.json({ limit: '100kb' });

const checkMemoryRead = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.READ],
  getRoleByName,
});
const checkMemoryCreate = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});
const checkMemoryUpdate = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.UPDATE],
  getRoleByName,
});
const checkMemoryDelete = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.UPDATE],
  getRoleByName,
});
const checkMemoryOptOut = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.OPT_OUT],
  getRoleByName,
});

router.use(requireJwtAuth);

/**
 * GET /memories
 * Returns all memories for the authenticated user, sorted by updated_at (newest first).
 * Also includes memory usage percentage based on token limit.
 */
router.get('/', checkMemoryRead, configMiddleware, async (req, res) => {
  try {
    const memories = await getAllUserMemories(req.user.id);

    const sortedMemories = memories.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    const totalTokens = memories.reduce((sum, memory) => {
      return sum + (memory.tokenCount || 0);
    }, 0);

    const appConfig = req.config;
    const memoryConfig = appConfig?.memory;
    const tokenLimit = memoryConfig?.tokenLimit;
    const charLimit = memoryConfig?.charLimit || 10000;

    let usagePercentage = null;
    if (tokenLimit && tokenLimit > 0) {
      usagePercentage = Math.min(100, Math.round((totalTokens / tokenLimit) * 100));
    }

    res.json({
      memories: sortedMemories,
      totalTokens,
      tokenLimit: tokenLimit || null,
      charLimit,
      usagePercentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /memories
 * Creates a new memory entry for the authenticated user.
 * Body: { key: string, value: string }
 * Returns 201 and { created: true, memory: <createdDoc> } when successful.
 */
router.post('/', memoryPayloadLimit, checkMemoryCreate, configMiddleware, async (req, res) => {
  const { key, value } = req.body;

  if (typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ error: 'Key is required and must be a non-empty string.' });
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return res.status(400).json({ error: 'Value is required and must be a non-empty string.' });
  }

  const appConfig = req.config;
  const memoryConfig = appConfig?.memory;
  const charLimit = memoryConfig?.charLimit || 10000;

  if (key.length > 1000) {
    return res.status(400).json({
      error: `Key exceeds maximum length of 1000 characters. Current length: ${key.length} characters.`,
    });
  }

  if (value.length > charLimit) {
    return res.status(400).json({
      error: `Value exceeds maximum length of ${charLimit} characters. Current length: ${value.length} characters.`,
    });
  }

  try {
    const tokenCount = Tokenizer.getTokenCount(value, 'o200k_base');

    const memories = await getAllUserMemories(req.user.id);

    const appConfig = req.config;
    const memoryConfig = appConfig?.memory;
    const tokenLimit = memoryConfig?.tokenLimit;

    if (tokenLimit) {
      const currentTotalTokens = memories.reduce(
        (sum, memory) => sum + (memory.tokenCount || 0),
        0,
      );
      if (currentTotalTokens + tokenCount > tokenLimit) {
        return res.status(400).json({
          error: `Adding this memory would exceed the token limit of ${tokenLimit}. Current usage: ${currentTotalTokens} tokens.`,
        });
      }
    }

    const result = await createMemory({
      userId: req.user.id,
      key: key.trim(),
      value: value.trim(),
      tokenCount,
    });

    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to create memory.' });
    }

    const updatedMemories = await getAllUserMemories(req.user.id);
    const newMemory = updatedMemories.find((m) => m.key === key.trim());

    res.status(201).json({ created: true, memory: newMemory });
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      return res.status(409).json({ error: 'Memory with this key already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

const PERSONALIZATION_MAX_ITEMS = 20;
const PERSONALIZATION_MAX_ITEM_LENGTH = 80;
const PERSONALIZATION_DIETARY_PREFERENCES_MAX_LENGTH = 500;
const COOKING_LEVEL_VALUES = new Set(['beginner', 'intermediate', 'advanced']);

function validateStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    return `${fieldName} must be an array of strings.`;
  }
  if (value.length > PERSONALIZATION_MAX_ITEMS) {
    return `${fieldName} must have at most ${PERSONALIZATION_MAX_ITEMS} items.`;
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      return `${fieldName}[${i}] must be a string.`;
    }
    const trimmed = value[i].trim();
    if (trimmed.length === 0) {
      return `${fieldName}[${i}] must be non-empty after trim.`;
    }
    if (trimmed.length > PERSONALIZATION_MAX_ITEM_LENGTH) {
      return `${fieldName}[${i}] must be at most ${PERSONALIZATION_MAX_ITEM_LENGTH} characters.`;
    }
  }
  return null;
}

/**
 * PATCH /memories/preferences
 * Updates the user's personalization preferences (memories, diets, allergies, cookingLevel, dietaryPreferences).
 * Body: { memories?, diets?, allergies?, cookingLevel?, dietaryPreferences? }
 * At least one key must be present. Returns 200 and { updated: true, preferences } when successful.
 */
const UNIT_SYSTEM_VALUES = new Set(['si', 'american']);

router.patch('/preferences', checkMemoryOptOut, async (req, res) => {
  const { memories, diets, allergies, cookingLevel, dietaryPreferences, unitSystem, showIngredientGrams } = req.body;

  const patch = {};
  if (typeof memories === 'boolean') {
    patch.memories = memories;
  }
  if (diets !== undefined) {
    const err = validateStringArray(diets, 'diets');
    if (err) {
      return res.status(400).json({ error: err });
    }
    patch.diets = diets.map((s) => s.trim());
  }
  if (allergies !== undefined) {
    const err = validateStringArray(allergies, 'allergies');
    if (err) {
      return res.status(400).json({ error: err });
    }
    patch.allergies = allergies.map((s) => s.trim());
  }
  if (cookingLevel !== undefined) {
    if (typeof cookingLevel !== 'string') {
      return res.status(400).json({ error: 'cookingLevel must be a string.' });
    }
    const level = cookingLevel.trim();
    if (level && !COOKING_LEVEL_VALUES.has(level)) {
      return res.status(400).json({
        error: `cookingLevel must be one of: ${[...COOKING_LEVEL_VALUES].join(', ')}.`,
      });
    }
    patch.cookingLevel = level || '';
  }
  if (dietaryPreferences !== undefined) {
    if (typeof dietaryPreferences !== 'string') {
      return res.status(400).json({ error: 'dietaryPreferences must be a string.' });
    }
    const prefs = dietaryPreferences.trim();
    if (prefs.length > PERSONALIZATION_DIETARY_PREFERENCES_MAX_LENGTH) {
      return res.status(400).json({
        error: `dietaryPreferences must be at most ${PERSONALIZATION_DIETARY_PREFERENCES_MAX_LENGTH} characters.`,
      });
    }
    patch.dietaryPreferences = prefs;
  }
  if (unitSystem !== undefined) {
    const sys = typeof unitSystem === 'string' ? unitSystem.trim().toLowerCase() : '';
    if (sys && !UNIT_SYSTEM_VALUES.has(sys)) {
      return res.status(400).json({
        error: 'unitSystem must be one of: si, american.',
      });
    }
    patch.unitSystem = sys || null;
  }
  if (showIngredientGrams !== undefined) {
    patch.showIngredientGrams = !!showIngredientGrams;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({
      error:
        'At least one of memories, diets, allergies, cookingLevel, dietaryPreferences, unitSystem, or showIngredientGrams must be provided.',
    });
  }

  try {
    const updatedUser = await updateUserPersonalization(req.user.id, patch);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const p = updatedUser.personalization || {};
    const hasDietaryData =
      (p.diets?.length || p.allergies?.length || p.cookingLevel || p.dietaryPreferences) && !!(patch.diets !== undefined || patch.allergies !== undefined || patch.cookingLevel !== undefined || patch.dietaryPreferences !== undefined);
    if (hasDietaryData) {
      Promise.resolve()
        .then(() => generatePreferencesSummary(p))
        .then((summary) => {
          if (summary) {
            return updateUserPersonalization(req.user.id, { preferencesSummary: summary });
          }
        })
        .catch((err) => {
          const { logger } = require('@librechat/data-schemas');
          logger.warn('[memories/preferences] Preferences summary generation failed', err);
        });
    }

    res.json({
      updated: true,
      preferences: {
        memories: p.memories ?? true,
        diets: p.diets ?? [],
        allergies: p.allergies ?? [],
        cookingLevel: p.cookingLevel ?? '',
        dietaryPreferences: p.dietaryPreferences ?? '',
        preferencesSummary: p.preferencesSummary ?? '',
        unitSystem: p.unitSystem ?? '',
        showIngredientGrams: p.showIngredientGrams ?? false,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /memories/:key
 * Updates the value of an existing memory entry for the authenticated user.
 * Body: { key?: string, value: string }
 * Returns 200 and { updated: true, memory: <updatedDoc> } when successful.
 */
router.patch('/:key', memoryPayloadLimit, checkMemoryUpdate, configMiddleware, async (req, res) => {
  const { key: urlKey } = req.params;
  const { key: bodyKey, value } = req.body || {};

  if (typeof value !== 'string' || value.trim() === '') {
    return res.status(400).json({ error: 'Value is required and must be a non-empty string.' });
  }

  const newKey = bodyKey || urlKey;
  const appConfig = req.config;
  const memoryConfig = appConfig?.memory;
  const charLimit = memoryConfig?.charLimit || 10000;

  if (newKey.length > 1000) {
    return res.status(400).json({
      error: `Key exceeds maximum length of 1000 characters. Current length: ${newKey.length} characters.`,
    });
  }

  if (value.length > charLimit) {
    return res.status(400).json({
      error: `Value exceeds maximum length of ${charLimit} characters. Current length: ${value.length} characters.`,
    });
  }

  try {
    const tokenCount = Tokenizer.getTokenCount(value, 'o200k_base');

    const memories = await getAllUserMemories(req.user.id);
    const existingMemory = memories.find((m) => m.key === urlKey);

    if (!existingMemory) {
      return res.status(404).json({ error: 'Memory not found.' });
    }

    if (newKey !== urlKey) {
      const keyExists = memories.find((m) => m.key === newKey);
      if (keyExists) {
        return res.status(409).json({ error: 'Memory with this key already exists.' });
      }

      const createResult = await createMemory({
        userId: req.user.id,
        key: newKey,
        value,
        tokenCount,
      });

      if (!createResult.ok) {
        return res.status(500).json({ error: 'Failed to create new memory.' });
      }

      const deleteResult = await deleteMemory({ userId: req.user.id, key: urlKey });
      if (!deleteResult.ok) {
        return res.status(500).json({ error: 'Failed to delete old memory.' });
      }
    } else {
      const result = await setMemory({
        userId: req.user.id,
        key: newKey,
        value,
        tokenCount,
      });

      if (!result.ok) {
        return res.status(500).json({ error: 'Failed to update memory.' });
      }
    }

    const updatedMemories = await getAllUserMemories(req.user.id);
    const updatedMemory = updatedMemories.find((m) => m.key === newKey);

    res.json({ updated: true, memory: updatedMemory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /memories/:key
 * Deletes a memory entry for the authenticated user.
 * Returns 200 and { deleted: true } when successful.
 */
router.delete('/:key', checkMemoryDelete, async (req, res) => {
  const { key } = req.params;

  try {
    const result = await deleteMemory({ userId: req.user.id, key });

    if (!result.ok) {
      return res.status(404).json({ error: 'Memory not found.' });
    }

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
