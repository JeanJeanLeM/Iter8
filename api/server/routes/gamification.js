/**
 * GET /api/gamification
 * Returns the authenticated user's gamification stats (XP, level, badge counts).
 */
const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { getUserById } = require('~/models');
const { MILESTONES, XP_PER_LEVEL } = require('~/server/services/Gamification/recipeAchievements');

const router = express.Router();

router.use(requireJwtAuth);

router.get('/', async (req, res) => {
  try {
    const user = await getUserById(req.user.id, 'gamification');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const gamification = user.gamification || {};
    const xp = Math.max(0, Number(gamification.xp) || 0);
    const level = Math.max(1, Number(gamification.level) || 1);
    const badgeCounts = gamification.badgeCounts && typeof gamification.badgeCounts === 'object'
      ? gamification.badgeCounts
      : {};

    const xpForCurrentLevel = (level - 1) * XP_PER_LEVEL;
    const xpForNextLevel = level * XP_PER_LEVEL;
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;

    res.json({
      xp,
      level,
      badgeCounts,
      milestones: MILESTONES,
      xpInCurrentLevel,
      xpNeededForNextLevel,
      xpForNextLevel,
    });
  } catch (error) {
    const { logger } = require('@librechat/data-schemas');
    logger.error('[GET /api/gamification]', error?.message, error?.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
