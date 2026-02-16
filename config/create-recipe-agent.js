/**
 * Creates a default "Assistant Recettes" agent with the update_recipe tool.
 * Run once after the app is set up and at least one user exists.
 *
 * Usage: npm run create-recipe-agent
 * Optional: npm run create-recipe-agent -- --email=user@example.com  (use specific user as author)
 */
const path = require('path');
const { nanoid } = require('nanoid');
const { AccessRoleIds, ResourceType, PrincipalType } = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');
const { askQuestion, silentExit } = require('./helpers');
const { createAgent, updateAgent } = require('~/models/Agent');
const { Agent, User } = require('~/db/models');
const { grantPermission } = require('~/server/services/PermissionService');

const RECIPE_AGENT_NAME = 'Assistant Recettes';

const DEFAULT_INSTRUCTIONS = `Tu es un assistant culinaire spécialisé dans les recettes.

Quand l'utilisateur te demande une recette (crépes, gâteau, plat, etc.) :
1. Réponds avec la recette COMPLÈTE en texte lisible : titre, ingrédients (avec quantités et unités), étapes numérotées, durée, matériel éventuel. Présente-la de façon engageante et claire.
2. N'utilise PAS l'outil update_recipe de toi-même. L'utilisateur verra un bouton "Écrire la recette" pour structurer et enregistrer.

TRIGGER OBLIGATOIRE : Si l'utilisateur demande d'AJOUTER, ENREGISTRER ou STRUCTURER la recette (ex : "ajoute à mon livre", "ajoute la recette", "enregistre-la", "structure cette recette", "écris la recette", "ajoute la à mon livre de recette", "appelle le tool", "Appelle l'outil update_recipe", etc.), tu DOIS impérativement APPELER l'outil update_recipe avec les données structurées. NE RÉPONDS PAS en texte : fais UNIQUEMENT un tool call. Ta réponse doit être un appel à update_recipe, pas du texte.

Format du tool : title, description, portions, duration, ingredients [{ name, quantity, unit?, note? }], steps [{ order, instruction }], equipment, tags.
- Pour une NOUVELLE recette : inclus "objective" (ex : "Recette de cookies moelleux pour le goûter").
- Pour une MODIFICATION ou VARIATION (ex : "modifie pour mettre moins de sucre", "fais une version sans gluten") : tu DOIS impérativement inclure "variationNote" avec un court texte décrivant ce qui a été changé (ex : "25% de sucre en moins", "Version sans gluten"). C'est obligatoire pour les variations.`;

const DEFAULT_CONVERSATION_STARTERS = [
  'Donne-moi une recette de crêpes',
  'Recette de gâteau au chocolat pour 6 personnes',
  'Idée de plat végétarien rapide',
];

(async () => {
  await connect();

  console.purple('--------------------------');
  console.purple('Création de l\'agent Assistant Recettes');
  console.purple('--------------------------');

  // Parse --email=user@example.com if provided
  let authorEmail = null;
  const emailArg = process.argv.find((a) => a.startsWith('--email='));
  if (emailArg) {
    authorEmail = emailArg.split('=')[1]?.trim();
  }

  let user;
  if (authorEmail) {
    user = await User.findOne({ email: authorEmail }).lean();
    if (!user) {
      console.red(`Erreur : aucun utilisateur trouvé avec l'email "${authorEmail}".`);
      silentExit(1);
    }
  } else {
    user = await User.findOne().sort({ createdAt: 1 }).lean();
    if (!user) {
      console.red('Erreur : aucun utilisateur dans la base. Créez d\'abord un compte (npm run create-user).');
      silentExit(1);
    }
    console.blue(`Utilisation du premier utilisateur : ${user.email}`);
  }

  const existingAgent = await Agent.findOne({
    name: RECIPE_AGENT_NAME,
    author: user._id,
  }).lean();

  if (existingAgent) {
    console.orange(`L'agent "${RECIPE_AGENT_NAME}" existe déjà (id: ${existingAgent.id}).`);
    const overwrite = await askQuestion('Souhaitez-vous le mettre à jour ? (o/N)');
    if (overwrite.trim().toLowerCase() !== 'o' && overwrite.trim().toLowerCase() !== 'oui') {
      console.green('Annulé.');
      silentExit(0);
    }
    // Mise à jour en place pour préserver l'ID (évite 404 sur les conversations existantes)
    try {
      const agent = await updateAgent(
        { id: existingAgent.id, author: user._id },
        {
          instructions: DEFAULT_INSTRUCTIONS,
          tools: ['update_recipe'],
          description:
            "Assistant spécialisé dans les recettes. Propose des recettes structurées que vous pouvez enregistrer dans votre livre de recettes.",
          model: 'gpt-4o',
          provider: 'openai',
          model_parameters: {},
          conversation_starters: DEFAULT_CONVERSATION_STARTERS,
        },
        { skipVersioning: false, updatingUserId: user._id },
      );
      console.green(`Agent "${RECIPE_AGENT_NAME}" mis à jour (id: ${agent.id}).`);
      console.blue('Outil activé : update_recipe');
      silentExit(0);
    } catch (err) {
      console.red('Erreur lors de la mise à jour :', err.message);
      silentExit(1);
    }
  }

  const agentData = {
    id: `agent_${nanoid()}`,
    name: RECIPE_AGENT_NAME,
    description:
      "Assistant spécialisé dans les recettes. Propose des recettes structurées que vous pouvez enregistrer dans votre livre de recettes.",
    author: user._id,
    provider: 'openai',
    model: 'gpt-4o',
    instructions: DEFAULT_INSTRUCTIONS,
    tools: ['update_recipe'],
    model_parameters: {},
    category: 'general',
    conversation_starters: DEFAULT_CONVERSATION_STARTERS,
  };

  try {
    const agent = await createAgent(agentData);

    await grantPermission({
      principalType: PrincipalType.USER,
      principalId: user._id,
      resourceType: ResourceType.AGENT,
      resourceId: agent._id,
      accessRoleId: AccessRoleIds.AGENT_OWNER,
      grantedBy: user._id,
    });

    // REMOTE_AGENT : pour usage via API (clés API, etc.). Pour usage local chat uniquement, AGENT suffit.
    await grantPermission({
      principalType: PrincipalType.USER,
      principalId: user._id,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agent._id,
      accessRoleId: AccessRoleIds.REMOTE_AGENT_OWNER,
      grantedBy: user._id,
    });

    console.green(`Agent "${RECIPE_AGENT_NAME}" créé avec succès (id: ${agent.id}).`);
    console.blue('Outil activé : update_recipe');
    console.blue('Sélectionnez cet agent dans le chat pour créer des recettes.');
  } catch (err) {
    console.red('Erreur lors de la création de l\'agent :', err.message);
    silentExit(1);
  }

  silentExit(0);
})();
