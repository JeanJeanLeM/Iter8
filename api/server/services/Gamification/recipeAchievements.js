/**
 * Recipe gamification: increment badge counts on recipe creation, grant XP for milestones, update level.
 * Only new recipes count (no backfill). One recipe can increment multiple badges (1 per tag).
 */

const { logger } = require('@librechat/data-schemas');

/** Milestones (recipe count per badge) that grant XP when reached */
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

/** XP granted once per milestone reached (any badge) */
const XP_PER_MILESTONE = 10;

/** XP required per level (level 1 = 0 XP, level 2 = 100, level 3 = 200, ...) */
const XP_PER_LEVEL = 100;

/**
 * Normalize recipe tags into unique badge keys (lowercase, trimmed, non-empty).
 * @param {string[]} [tags]
 * @returns {string[]}
 */
function normalizeBadgeKeys(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [];
  }
  const seen = new Set();
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => String(t).trim().toLowerCase())
    .filter((key) => key.length > 0 && !seen.has(key) && (seen.add(key), true));
}

/**
 * Compute level from total XP (linear: level 1 at 0 XP, +1 level every XP_PER_LEVEL).
 * @param {number} xp
 * @returns {number}
 */
function levelFromXp(xp) {
  const total = Math.max(0, Number(xp) || 0);
  return Math.max(1, 1 + Math.floor(total / XP_PER_LEVEL));
}

/**
 * Process a newly created recipe: increment badge counts, compute newly reached milestones,
 * add XP, recompute level, and persist to user.
 * @param {string} userId - User ID
 * @param {{ tags?: string[] }} recipe - Created recipe (at least tags)
 * @param {{ getUserById: (id: string, fields?: string) => Promise<object|null>, updateUserGamification: (id: string, patch: object) => Promise<object|null> }} methods - DB methods
 */
async function processRecipeCreated(userId, recipe, methods) {
  const badgeKeys = normalizeBadgeKeys(recipe.tags);
  if (badgeKeys.length === 0) {
    return;
  }

  const { getUserById, updateUserGamification } = methods;
  const user = await getUserById(userId, 'gamification');
  if (!user) {
    return;
  }

  const currentXp = Math.max(0, Number(user.gamification?.xp) || 0);
  const badgeCounts = user.gamification?.badgeCounts && typeof user.gamification.badgeCounts === 'object'
    ? user.gamification.badgeCounts
    : {};

  const badgeCountsIncrements = {};
  let xpGained = 0;

  for (const badge of badgeKeys) {
    badgeCountsIncrements[badge] = (badgeCountsIncrements[badge] || 0) + 1;
  }

  for (const [badge, inc] of Object.entries(badgeCountsIncrements)) {
    const currentCount = Math.max(0, Number(badgeCounts[badge]) || 0);
    const newCount = currentCount + inc;
    for (const m of MILESTONES) {
      if (m > currentCount && m <= newCount) {
        xpGained += XP_PER_MILESTONE;
      }
    }
  }

  const newXp = currentXp + xpGained;
  const newLevel = levelFromXp(newXp);

  try {
    await updateUserGamification(userId, {
      xp: newXp,
      level: newLevel,
      badgeCountsIncrements,
    });
    if (xpGained > 0) {
      logger.debug('[recipeAchievements] Processed recipe for user', userId, 'xpGained', xpGained, 'newLevel', newLevel);
    }
  } catch (err) {
    logger.warn('[recipeAchievements] Failed to update gamification for user', userId, err?.message);
  }
}

module.exports = {
  MILESTONES,
  XP_PER_MILESTONE,
  XP_PER_LEVEL,
  normalizeBadgeKeys,
  levelFromXp,
  processRecipeCreated,
};
