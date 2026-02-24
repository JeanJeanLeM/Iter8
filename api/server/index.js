require('dotenv').config();
const fs = require('fs');
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '..') });
const cors = require('cors');
const axios = require('axios');
const express = require('express');
const passport = require('passport');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { logger } = require('@librechat/data-schemas');
const mongoSanitize = require('express-mongo-sanitize');
const {
  isEnabled,
  ErrorController,
  performStartupChecks,
  handleJsonParseError,
  initializeFileStorage,
  GenerationJobManager,
  createStreamServices,
} = require('@librechat/api');
const { connectDb, indexSync } = require('~/db');
const initializeOAuthReconnectManager = require('./services/initializeOAuthReconnectManager');
const createValidateImageRequest = require('./middleware/validateImageRequest');
const { jwtLogin, ldapLogin, passportLogin } = require('~/strategies');
const { updateInterfacePermissions } = require('~/models/interface');
const { checkMigrations } = require('./services/start/migration');
const initializeMCPs = require('./services/initializeMCPs');
const configureSocialLogins = require('./socialLogins');
const { getAppConfig } = require('./services/Config');
const staticCache = require('./utils/staticCache');
const noIndex = require('./middleware/noIndex');
const { seedDatabase } = require('~/models');
const routes = require('./routes');

const { PORT, HOST, ALLOW_SOCIAL_LOGIN, DISABLE_COMPRESSION, TRUST_PROXY } = process.env ?? {};

// Allow PORT=0 to be used for automatic free port assignment
const port = isNaN(Number(PORT)) ? 3080 : Number(PORT);
const host = (typeof HOST === 'string' ? HOST.trim() : HOST) || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
const trusted_proxy = Number(TRUST_PROXY) || 1; /* trust first proxy by default */

const app = express();

const debugRunId = process.env.DEBUG_RUN_ID || 'railway-502';
const sendDebugLog = (location, message, hypothesisId, data = {}) => {
  console.log(`[agent-debug] ${message}`, JSON.stringify({ location, hypothesisId, data }));
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '204ac8' },
    body: JSON.stringify({
      sessionId: '204ac8',
      runId: debugRunId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

const startServer = async () => {
  sendDebugLog('api/server/index.js:startServer', 'startServer entered', 'H1', {
    nodeEnv: process.env.NODE_ENV || null,
    port,
    host,
    trustProxy: trusted_proxy,
    hasMongoUri: Boolean(process.env.MONGO_URI),
    domainClient: process.env.DOMAIN_CLIENT || null,
    domainServer: process.env.DOMAIN_SERVER || null,
  });
  if (typeof Bun !== 'undefined') {
    axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
  }
  try {
    await connectDb();
    sendDebugLog('api/server/index.js:connectDb', 'connectDb success', 'H2');
  } catch (error) {
    sendDebugLog('api/server/index.js:connectDb', 'connectDb failed', 'H2', {
      name: error?.name,
      message: error?.message,
    });
    throw error;
  }

  logger.info('Connected to MongoDB');
  indexSync().catch((err) => {
    logger.error('[indexSync] Background sync failed:', err);
  });

  app.disable('x-powered-by');
  app.set('trust proxy', trusted_proxy);

  await seedDatabase();
  const appConfig = await getAppConfig();
  initializeFileStorage(appConfig);
  await performStartupChecks(appConfig);
  await updateInterfacePermissions(appConfig);

  const indexPath = path.join(appConfig.paths.dist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    const msg =
      `Client build missing at ${indexPath}. ` +
      'Run "npm run frontend" before starting the backend, or use Start Command "npm start" (builds then starts).';
    logger.error(msg);
    process.exit(1);
  }
  let indexHTML = fs.readFileSync(indexPath, 'utf8');

  // In order to provide support to serving the application in a sub-directory
  // We need to update the base href if the DOMAIN_CLIENT is specified and not the root path
  if (process.env.DOMAIN_CLIENT) {
    let clientUrl;
    try {
      clientUrl = new URL(process.env.DOMAIN_CLIENT);
      sendDebugLog('api/server/index.js:domainClient', 'DOMAIN_CLIENT parsed', 'H3', {
        domainClient: process.env.DOMAIN_CLIENT,
      });
    } catch (error) {
      sendDebugLog('api/server/index.js:domainClient', 'DOMAIN_CLIENT invalid URL', 'H3', {
        domainClient: process.env.DOMAIN_CLIENT,
        message: error?.message,
      });
      throw error;
    }
    const baseHref = clientUrl.pathname.endsWith('/')
      ? clientUrl.pathname
      : `${clientUrl.pathname}/`;
    if (baseHref !== '/') {
      logger.info(`Setting base href to ${baseHref}`);
      indexHTML = indexHTML.replace(/base href="\/"/, `base href="${baseHref}"`);
    }
  }

  app.get('/health', (_req, res) => res.status(200).send('OK'));

  /* Middleware */
  app.use(noIndex);
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(handleJsonParseError);

  /**
   * Express 5 Compatibility: Make req.query writable for mongoSanitize
   * In Express 5, req.query is read-only by default, but express-mongo-sanitize needs to modify it
   */
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'query', {
      ...Object.getOwnPropertyDescriptor(req, 'query'),
      value: req.query,
      writable: true,
    });
    next();
  });

  app.use(mongoSanitize());
  app.use(cors());
  app.use(cookieParser());

  if (!isEnabled(DISABLE_COMPRESSION)) {
    app.use(compression());
  } else {
    console.warn('Response compression has been disabled via DISABLE_COMPRESSION.');
  }

  app.use(staticCache(appConfig.paths.dist));
  app.use(staticCache(appConfig.paths.fonts));
  app.use(staticCache(appConfig.paths.assets));

  if (!ALLOW_SOCIAL_LOGIN) {
    console.warn('Social logins are disabled. Set ALLOW_SOCIAL_LOGIN=true to enable them.');
  }

  /* OAUTH */
  app.use(passport.initialize());
  passport.use(jwtLogin());
  passport.use(passportLogin());

  /* LDAP Auth */
  if (process.env.LDAP_URL && process.env.LDAP_USER_SEARCH_BASE) {
    passport.use(ldapLogin);
  }

  if (isEnabled(ALLOW_SOCIAL_LOGIN)) {
    await configureSocialLogins(app);
  }

  app.use('/oauth', routes.oauth);
  /* API Endpoints */
  app.use('/api/auth', routes.auth);
  app.use('/api/admin', routes.adminAuth);
  app.use('/api/actions', routes.actions);
  app.use('/api/keys', routes.keys);
  app.use('/api/api-keys', routes.apiKeys);
  app.use('/api/user', routes.user);
  app.use('/api/search', routes.search);
  app.use('/api/messages', routes.messages);
  app.use('/api/convos', routes.convos);
  app.use('/api/presets', routes.presets);
  app.use('/api/prompts', routes.prompts);
  app.use('/api/categories', routes.categories);
  app.use('/api/endpoints', routes.endpoints);
  app.use('/api/balance', routes.balance);
  app.use('/api/models', routes.models);
  app.use('/api/config', routes.config);
  app.use('/api/assistants', routes.assistants);
  app.use('/api/files', await routes.files.initialize());
  app.use('/images/', createValidateImageRequest(appConfig.secureImageLinks), routes.staticRoute);
  app.use('/api/share', routes.share);
  app.use('/api/roles', routes.roles);
  app.use('/api/agents', routes.agents);
  app.use('/api/banner', routes.banner);
  app.use('/api/memories', routes.memories);
  app.use('/api/recipes', routes.recipes);
  app.use('/api/journal', routes.journal);
  app.use('/api/shopping-list', routes.shoppingList);
  app.use('/api/meal-planner', routes.mealPlanner);
  app.use('/api/ingredients', routes.ingredients);
  app.use('/api/permissions', routes.accessPermissions);

  app.use('/api/tags', routes.tags);
  app.use('/api/mcp', routes.mcp);

  app.use(ErrorController);

  app.use((req, res) => {
    res.set({
      'Cache-Control': process.env.INDEX_CACHE_CONTROL || 'no-cache, no-store, must-revalidate',
      Pragma: process.env.INDEX_PRAGMA || 'no-cache',
      Expires: process.env.INDEX_EXPIRES || '0',
    });

    const lang = req.cookies.lang || req.headers['accept-language']?.split(',')[0] || 'en-US';
    const saneLang = lang.replace(/"/g, '&quot;');
    let updatedIndexHtml = indexHTML.replace(/lang="en-US"/g, `lang="${saneLang}"`);

    res.type('html');
    res.send(updatedIndexHtml);
  });

  const listenCallback = async (err) => {
    sendDebugLog('api/server/index.js:listenCallback', 'listen callback entered', 'H4', {
      hasError: Boolean(err),
      port,
      host,
    });
    if (err) {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }

    if (host === '0.0.0.0' || !host) {
      logger.info(
        `Server listening on all interfaces at port ${port}. Use http://localhost:${port} to access it`,
      );
    } else {
      logger.info(`Server listening at http://${host}:${port}`);
    }

    try {
      await initializeMCPs();
      await initializeOAuthReconnectManager();
      await checkMigrations();
      sendDebugLog('api/server/index.js:postListenInit', 'post-listen init success', 'H5');
    } catch (error) {
      sendDebugLog('api/server/index.js:postListenInit', 'post-listen init failed', 'H5', {
        name: error?.name,
        message: error?.message,
      });
      throw error;
    }

    // Configure stream services (auto-detects Redis from USE_REDIS env var)
    const streamServices = createStreamServices();
    GenerationJobManager.configure(streamServices);
    GenerationJobManager.initialize();
  };

  if (host === '0.0.0.0') {
    app.listen(port, listenCallback);
  } else {
    app.listen(port, host, listenCallback);
  }
};

startServer();

let messageCount = 0;
process.on('uncaughtException', (err) => {
  sendDebugLog('api/server/index.js:uncaughtException', 'uncaught exception', 'H6', {
    message: err?.message,
    name: err?.name,
  });
  if (!err.message.includes('fetch failed')) {
    logger.error('There was an uncaught error:', err);
  }

  if (err.message && err.message?.toLowerCase()?.includes('abort')) {
    logger.warn('There was an uncatchable abort error.');
    return;
  }

  if (err.message.includes('GoogleGenerativeAI')) {
    logger.warn(
      '\n\n`GoogleGenerativeAI` errors cannot be caught due to an upstream issue, see: https://github.com/google-gemini/generative-ai-js/issues/303',
    );
    return;
  }

  if (err.message.includes('fetch failed')) {
    if (messageCount === 0) {
      logger.warn('Meilisearch error, search will be disabled');
      messageCount++;
    }

    return;
  }

  if (err.message.includes('OpenAIError') || err.message.includes('ChatCompletionMessage')) {
    logger.error(
      '\n\nAn Uncaught `OpenAIError` error may be due to your reverse-proxy setup or stream configuration, or a bug in the `openai` node package.',
    );
    return;
  }

  if (err.stack && err.stack.includes('@librechat/agents')) {
    logger.error(
      '\n\nAn error occurred in the agents system. The error has been logged and the app will continue running.',
      {
        message: err.message,
        stack: err.stack,
      },
    );
    return;
  }

  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  sendDebugLog('api/server/index.js:unhandledRejection', 'unhandled rejection', 'H6', {
    message: reason?.message || String(reason),
    name: reason?.name || null,
  });
});

/** Export app for easier testing purposes */
module.exports = app;
