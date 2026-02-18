const passport = require('passport');
const { logger } = require('@librechat/data-schemas');

const requireLocalAuth = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logger.error('[requireLocalAuth] Error at passport.authenticate:', err);
      return next(err);
    }
    if (!user) {
      logger.debug('[requireLocalAuth] Error: No user');
      const message = info?.message ?? 'Invalid credentials';
      return res.status(401).json({ message });
    }
    if (info && info.message) {
      logger.debug('[requireLocalAuth] Error: ' + info.message);
      return res.status(422).send({ message: info.message });
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = requireLocalAuth;
