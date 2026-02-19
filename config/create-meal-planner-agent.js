/**
 * Creates a default "Planificateur de repas" agent with the meal_planner tool.
 * Run once after the app is set up and at least one user exists.
 *
 * Usage: npm run create-meal-planner-agent
 * Optional: npm run create-meal-planner-agent -- --email=user@example.com  (use specific user as author)
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

const MEAL_PLANNER_AGENT_NAME = 'Planificateur de repas';

const DEFAULT_INSTRUCTIONS = `Tu es un assistant pour le planning de repas. Tu peux ajouter, modifier, supprimer et commenter les repas du planning en utilisant l'outil meal_planner.

Date du jour (utilise UNIQUEMENT cette date pour résoudre "demain", "vendredi", "ce midi", etc.) : {{current_date}}. Calcule toujours les dates en YYYY-MM-DD par rapport à cette date (ex. "vendredi" = le vendredi de cette semaine ou le prochain).

Règles :
1. Interprète le langage naturel : "demain" = lendemain de la date du jour, "mercredi soir" = mercredi slot dinner, "ce midi" = date du jour slot lunch, "le lendemain midi" = jour suivant slot lunch, "demain matin" = lendemain slot breakfast. Toujours passer les dates en YYYY-MM-DD et le slot parmi : "breakfast" (petit-déjeuner), "collation" (snack), "lunch" (midi), "dinner" (soir), "sortie" (repas au restaurant/sortie).
2. Utilise get_calendar (fromDate, toDate en YYYY-MM-DD) pour afficher ou contextualiser le planning sur une période.
3. Utilise add_meal pour ajouter un repas : date, slot, recipeTitle (nom du plat ou texte libre) ; optionnel : comment (note). Si le plat correspond à une recette du livre de l'utilisateur, elle sera liée automatiquement ; sinon le repas est planifié avec le titre libre (la recette pourra être créée plus tard).
4. Utilise update_meal pour modifier un repas existant : plannedMealId (obtenu via get_calendar) et les champs à changer (recipeTitle, comment). Pour remplacer un plat par un autre (ex. carbonaras → lasagne), utilise update_meal avec le plannedMealId et le nouveau recipeTitle.
5. Utilise delete_meal pour supprimer un repas : soit plannedMealId, soit date + slot + recipeTitle pour identifier le repas.
6. Utilise add_comment pour enregistrer un retour sur un repas déjà mangé (ex. "la mousse de ce midi était trop sucrée") : date, slot, recipeTitle (nom du plat mangé), comment. La recette doit exister dans le livre de l'utilisateur ; sinon indique à l'utilisateur qu'il peut ajouter la recette pour enregistrer le commentaire.

Réponds de façon concise et confirme les actions effectuées.`;

const DEFAULT_CONVERSATION_STARTERS = [
  'Je veux manger du tiramisu demain',
  'Planifier des boulettes mercredi soir et le lendemain midi',
  'Prévois une omelette demain matin au petit-déjeuner',
  'La mousse au chocolat de ce midi était un peu trop sucrée',
];

(async () => {
  await connect();

  console.purple('--------------------------');
  console.purple('Création de l\'agent Planificateur de repas');
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
    name: MEAL_PLANNER_AGENT_NAME,
    author: user._id,
  }).lean();

  if (existingAgent) {
    console.orange(`L'agent "${MEAL_PLANNER_AGENT_NAME}" existe déjà (id: ${existingAgent.id}).`);
    const overwrite = await askQuestion('Souhaitez-vous le mettre à jour ? (o/N)');
    if (overwrite.trim().toLowerCase() !== 'o' && overwrite.trim().toLowerCase() !== 'oui') {
      console.green('Annulé.');
      silentExit(0);
    }
    try {
      const agent = await updateAgent(
        { id: existingAgent.id, author: user._id },
        {
          instructions: DEFAULT_INSTRUCTIONS,
          tools: ['meal_planner'],
          description:
            'Assistant pour le planning de repas. Ajoute, modifie, supprime et commente les repas en langage naturel.',
          model: 'gpt-4o',
          provider: 'openai',
          model_parameters: {},
          conversation_starters: DEFAULT_CONVERSATION_STARTERS,
        },
        { skipVersioning: false, updatingUserId: user._id },
      );
      console.green(`Agent "${MEAL_PLANNER_AGENT_NAME}" mis à jour (id: ${agent.id}).`);
      console.blue('Outil activé : meal_planner');
      silentExit(0);
    } catch (err) {
      console.red('Erreur lors de la mise à jour :', err.message);
      silentExit(1);
    }
  }

  const agentData = {
    id: `agent_${nanoid()}`,
    name: MEAL_PLANNER_AGENT_NAME,
    description:
      'Assistant pour le planning de repas. Ajoute, modifie, supprime et commente les repas en langage naturel.',
    author: user._id,
    provider: 'openai',
    model: 'gpt-4o',
    instructions: DEFAULT_INSTRUCTIONS,
    tools: ['meal_planner'],
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

    await grantPermission({
      principalType: PrincipalType.USER,
      principalId: user._id,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agent._id,
      accessRoleId: AccessRoleIds.REMOTE_AGENT_OWNER,
      grantedBy: user._id,
    });

    // Rendre l'agent visible par tous les utilisateurs (chat et API) — CookIter8 = agents préconstruits pour tout le monde
    await grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.AGENT,
      resourceId: agent._id,
      accessRoleId: AccessRoleIds.AGENT_VIEWER,
      grantedBy: user._id,
    });
    await grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.REMOTE_AGENT,
      resourceId: agent._id,
      accessRoleId: AccessRoleIds.REMOTE_AGENT_VIEWER,
      grantedBy: user._id,
    });

    console.green(`Agent "${MEAL_PLANNER_AGENT_NAME}" créé avec succès (id: ${agent.id}).`);
    console.blue('Outil activé : meal_planner');
    console.blue('Sélectionnez cet agent dans le chat pour gérer ton planning de repas.');
  } catch (err) {
    console.red('Erreur lors de la création de l\'agent :', err.message);
    silentExit(1);
  }

  silentExit(0);
})();
