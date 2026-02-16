const fs = require('fs');
const path = require('path');
const express = require('express');
const { logger } = require('@librechat/data-schemas');
const DEBUG_LOG = path.resolve(__dirname, '../../../.cursor/debug.log');
function debugLog(p) {
  try { fs.appendFileSync(DEBUG_LOG, JSON.stringify({ ...p, timestamp: Date.now() }) + '\n'); } catch (_) {}
}
const { isEnabled, getBalanceConfig } = require('@librechat/api');
const { Constants, CacheKeys, defaultSocialLogins } = require('librechat-data-provider');
const { getLdapConfig } = require('~/server/services/Config/ldap');
const { getAppConfig } = require('~/server/services/Config/app');
const { getProjectByName } = require('~/models/Project');
const { Agent } = require('~/db/models');
const { getLogStores } = require('~/cache');

const RECIPE_ASSISTANT_NAME = 'Assistant Recettes';

const router = express.Router();
const emailLoginEnabled =
  process.env.ALLOW_EMAIL_LOGIN === undefined || isEnabled(process.env.ALLOW_EMAIL_LOGIN);
const passwordResetEnabled = isEnabled(process.env.ALLOW_PASSWORD_RESET);

const sharedLinksEnabled =
  process.env.ALLOW_SHARED_LINKS === undefined || isEnabled(process.env.ALLOW_SHARED_LINKS);

const publicSharedLinksEnabled =
  sharedLinksEnabled &&
  (process.env.ALLOW_SHARED_LINKS_PUBLIC === undefined ||
    isEnabled(process.env.ALLOW_SHARED_LINKS_PUBLIC));

const sharePointFilePickerEnabled = isEnabled(process.env.ENABLE_SHAREPOINT_FILEPICKER);
const openidReuseTokens = isEnabled(process.env.OPENID_REUSE_TOKENS);

router.get('/', async function (req, res) {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'config.js:GET/entry',message:'GET /api/config entered',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  } catch (_) {}
  // #endregion
  try {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);

  const cachedStartupConfig = await cache.get(CacheKeys.STARTUP_CONFIG);
  if (cachedStartupConfig) {
    res.send(cachedStartupConfig);
    return;
  }

  const isBirthday = () => {
    const today = new Date();
    return today.getMonth() === 1 && today.getDate() === 11;
  };

  const instanceProject = await getProjectByName(Constants.GLOBAL_PROJECT_NAME, '_id');
  debugLog({ location: 'config.js:after getProjectByName', message: 'config after getProjectByName', data: { hasInstance: !!instanceProject }, hypothesisId: 'H1' });

  const ldap = getLdapConfig();

  try {
    const appConfig = await getAppConfig({ role: req.user?.role });
    debugLog({ location: 'config.js:after getAppConfig', message: 'config after getAppConfig', data: {}, hypothesisId: 'H1' });

    const isOpenIdEnabled =
      !!process.env.OPENID_CLIENT_ID &&
      !!process.env.OPENID_CLIENT_SECRET &&
      !!process.env.OPENID_ISSUER &&
      !!process.env.OPENID_SESSION_SECRET;

    const isSamlEnabled =
      !!process.env.SAML_ENTRY_POINT &&
      !!process.env.SAML_ISSUER &&
      !!process.env.SAML_CERT &&
      !!process.env.SAML_SESSION_SECRET;

    const balanceConfig = getBalanceConfig(appConfig);

    /** @type {TStartupConfig} */
    const payload = {
      appTitle: process.env.APP_TITLE || 'Iter8',
      socialLogins: appConfig?.registration?.socialLogins ?? defaultSocialLogins,
      discordLoginEnabled: !!process.env.DISCORD_CLIENT_ID && !!process.env.DISCORD_CLIENT_SECRET,
      facebookLoginEnabled:
        !!process.env.FACEBOOK_CLIENT_ID && !!process.env.FACEBOOK_CLIENT_SECRET,
      githubLoginEnabled: !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
      googleLoginEnabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      appleLoginEnabled:
        !!process.env.APPLE_CLIENT_ID &&
        !!process.env.APPLE_TEAM_ID &&
        !!process.env.APPLE_KEY_ID &&
        !!process.env.APPLE_PRIVATE_KEY_PATH,
      openidLoginEnabled: isOpenIdEnabled,
      openidLabel: process.env.OPENID_BUTTON_LABEL || 'Continue with OpenID',
      openidImageUrl: process.env.OPENID_IMAGE_URL,
      openidAutoRedirect: isEnabled(process.env.OPENID_AUTO_REDIRECT),
      samlLoginEnabled: !isOpenIdEnabled && isSamlEnabled,
      samlLabel: process.env.SAML_BUTTON_LABEL,
      samlImageUrl: process.env.SAML_IMAGE_URL,
      serverDomain: process.env.DOMAIN_SERVER || 'http://localhost:3080',
      emailLoginEnabled,
      registrationEnabled: !ldap?.enabled && isEnabled(process.env.ALLOW_REGISTRATION),
      socialLoginEnabled: isEnabled(process.env.ALLOW_SOCIAL_LOGIN),
      emailEnabled:
        (!!process.env.EMAIL_SERVICE || !!process.env.EMAIL_HOST) &&
        !!process.env.EMAIL_USERNAME &&
        !!process.env.EMAIL_PASSWORD &&
        !!process.env.EMAIL_FROM,
      passwordResetEnabled,
      showBirthdayIcon:
        isBirthday() ||
        isEnabled(process.env.SHOW_BIRTHDAY_ICON) ||
        process.env.SHOW_BIRTHDAY_ICON === '',
      helpAndFaqURL: process.env.HELP_AND_FAQ_URL || 'https://librechat.ai',
      interface: appConfig?.interfaceConfig,
      turnstile: appConfig?.turnstileConfig,
      modelSpecs: appConfig?.modelSpecs,
      balance: balanceConfig,
      sharedLinksEnabled,
      publicSharedLinksEnabled,
      analyticsGtmId: process.env.ANALYTICS_GTM_ID,
      instanceProjectId: instanceProject._id.toString(),
      bundlerURL: process.env.SANDPACK_BUNDLER_URL,
      staticBundlerURL: process.env.SANDPACK_STATIC_BUNDLER_URL,
      sharePointFilePickerEnabled,
      sharePointBaseUrl: process.env.SHAREPOINT_BASE_URL,
      sharePointPickerGraphScope: process.env.SHAREPOINT_PICKER_GRAPH_SCOPE,
      sharePointPickerSharePointScope: process.env.SHAREPOINT_PICKER_SHAREPOINT_SCOPE,
      openidReuseTokens,
      conversationImportMaxFileSize: process.env.CONVERSATION_IMPORT_MAX_FILE_SIZE_BYTES
        ? parseInt(process.env.CONVERSATION_IMPORT_MAX_FILE_SIZE_BYTES, 10)
        : 0,
    };

    try {
      const recipeAgent = await Agent.findOne({ name: RECIPE_ASSISTANT_NAME })
        .select('id')
        .lean();
      if (recipeAgent?.id) {
        payload.defaultRecipeAgentId = recipeAgent.id;
      }
    } catch (agentErr) {
      logger.debug('[Config] Could not resolve default recipe agent:', agentErr?.message);
    }

    const minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH, 10);
    if (minPasswordLength && !isNaN(minPasswordLength)) {
      payload.minPasswordLength = minPasswordLength;
    }

    const webSearchConfig = appConfig?.webSearch;
    if (
      webSearchConfig != null &&
      (webSearchConfig.searchProvider ||
        webSearchConfig.scraperProvider ||
        webSearchConfig.rerankerType)
    ) {
      payload.webSearch = {};
    }

    if (webSearchConfig?.searchProvider) {
      payload.webSearch.searchProvider = webSearchConfig.searchProvider;
    }
    if (webSearchConfig?.scraperProvider) {
      payload.webSearch.scraperProvider = webSearchConfig.scraperProvider;
    }
    if (webSearchConfig?.rerankerType) {
      payload.webSearch.rerankerType = webSearchConfig.rerankerType;
    }

    if (ldap) {
      payload.ldap = ldap;
    }

    if (typeof process.env.CUSTOM_FOOTER === 'string') {
      payload.customFooter = process.env.CUSTOM_FOOTER;
    }

    await cache.set(CacheKeys.STARTUP_CONFIG, payload);
    debugLog({ location: 'config.js:before send', message: 'config before res.send', data: {}, hypothesisId: 'H1' });
    try {
      return res.status(200).send(payload);
    } catch (sendErr) {
      debugLog({ location: 'config.js:send catch', message: 'config res.send error', data: { message: sendErr?.message, name: sendErr?.name }, hypothesisId: 'H1' });
      throw sendErr;
    }
  } catch (err) {
    // #region agent log
    const pl = {location:'config.js:GET/catch',message:'GET /api/config error',data:{message:err?.message,name:err?.name,stack:err?.stack?.slice(0,600)},hypothesisId:'H1'};
    debugLog(pl);
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pl,timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.error('Error in startup config', err);
    return res.status(500).send({ error: err.message });
  }
  } catch (outerErr) {
    // #region agent log
    const pl = {location:'config.js:GET/outerCatch',message:'GET /api/config outer error',data:{message:outerErr?.message,name:outerErr?.name,stack:outerErr?.stack?.slice(0,600)},hypothesisId:'H1'};
    debugLog(pl);
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pl,timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.error('Error in startup config (outer)', outerErr);
    return res.status(500).send({ error: outerErr?.message ?? 'Config error' });
  }
});

module.exports = router;
