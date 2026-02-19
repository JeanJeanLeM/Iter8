/**
 * Donne l'accès PUBLIC (VIEW) aux agents CookIter8 (Assistant Recettes, Planificateur de repas)
 * pour que tous les utilisateurs les voient. À lancer si les agents ont été créés avant l'ajout
 * des permissions publiques dans create-recipe-agent.js / create-meal-planner-agent.js.
 *
 * Usage: npm run grant-public-cookiter8-agents
 */
const path = require('path');
const { PrincipalType, ResourceType, AccessRoleIds } = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');
const { silentExit } = require('./helpers');
const { Agent } = require('~/db/models');
const { grantPermission } = require('~/server/services/PermissionService');

const COOKITER8_AGENT_NAMES = ['Assistant Recettes', 'Planificateur de repas'];

(async () => {
  await connect();

  console.purple('--------------------------');
  console.purple('Accès public aux agents CookIter8');
  console.purple('--------------------------');

  const agents = await Agent.find({ name: { $in: COOKITER8_AGENT_NAMES } }).lean();
  if (!agents.length) {
    console.orange('Aucun agent CookIter8 trouvé. Créez-les d\'abord avec :');
    console.blue('  npm run create-recipe-agent');
    console.blue('  npm run create-meal-planner-agent');
    silentExit(0);
  }

  for (const agent of agents) {
    try {
      await grantPermission({
        principalType: PrincipalType.PUBLIC,
        principalId: null,
        resourceType: ResourceType.AGENT,
        resourceId: agent._id,
        accessRoleId: AccessRoleIds.AGENT_VIEWER,
        grantedBy: agent.author,
      });
      await grantPermission({
        principalType: PrincipalType.PUBLIC,
        principalId: null,
        resourceType: ResourceType.REMOTE_AGENT,
        resourceId: agent._id,
        accessRoleId: AccessRoleIds.REMOTE_AGENT_VIEWER,
        grantedBy: agent.author,
      });
      console.green(`  "${agent.name}" (id: ${agent.id}) : accès public VIEW ajouté.`);
    } catch (err) {
      if (err.message && err.message.includes('duplicate') || err.code === 11000) {
        console.blue(`  "${agent.name}" : accès public déjà présent.`);
      } else {
        console.red(`  "${agent.name}" : erreur ${err.message}`);
      }
    }
  }

  console.green('Terminé.');
  silentExit(0);
})();
