/**
 * Insère des recettes de test pour le livre de recettes.
 * À lancer une fois qu'au moins un utilisateur existe.
 *
 * Usage: npm run seed-recipes
 * Optionnel: npm run seed-recipes -- --email=user@example.com
 */
const path = require('path');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');
const { createRecipe } = require('~/models');
const { User } = require('~/db/models');
const { silentExit } = require('./helpers');

const SAMPLE_RECIPES = [
  {
    title: 'Crêpes simples',
    imageUrl: '/assets/recipes/crepes.png',
    description: 'Recette de base pour des crêpes légères.',
    portions: 4,
    duration: 30,
    ingredients: [
      { name: 'Farine', quantity: 250, unit: 'g' },
      { name: 'Œufs', quantity: 3 },
      { name: 'Lait', quantity: 500, unit: 'ml' },
      { name: 'Sel', quantity: 1, unit: 'pincée' },
    ],
    steps: [
      { order: 1, instruction: 'Mélanger la farine et le sel dans un saladier.' },
      { order: 2, instruction: 'Ajouter les œufs et mélanger.' },
      { order: 3, instruction: 'Verser le lait progressivement en fouettant pour éviter les grumeaux.' },
      { order: 4, instruction: 'Laisser reposer 30 min. Faire cuire les crêpes à la poêle.' },
    ],
    equipment: ['Saladier', 'Fouet', 'Poêle'],
    tags: ['rapide', 'classique'],
    dishType: 'plat',
    cuisineType: ['Française'],
    diet: ['vegetarian'],
  },
  {
    title: 'Salade César',
    imageUrl: '/assets/recipes/salade-cesar.png',
    description: 'Salade César classique avec poulet et parmesan.',
    portions: 2,
    duration: { prep: 15, cook: 10, total: 25 },
    ingredients: [
      { name: 'Poulet', quantity: 200, unit: 'g' },
      { name: 'Salade romaine', quantity: 1, note: 'grosse' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
      { name: 'Croûtons', quantity: 50, unit: 'g' },
      { name: 'Sauce César', quantity: 3, unit: 'c. à soupe' },
    ],
    steps: [
      { order: 1, instruction: 'Faire griller le poulet en dés.' },
      { order: 2, instruction: 'Laver et essorer la salade, la mettre dans un saladier.' },
      { order: 3, instruction: 'Ajouter le poulet, les croûtons, le parmesan en copeaux.' },
      { order: 4, instruction: 'Arroser de sauce César et servir.' },
    ],
    equipment: ['Saladier', 'Poêle'],
    tags: ['salade', 'poulet'],
    dishType: 'entree',
    cuisineType: ['Américaine'],
    diet: [],
  },
  {
    title: 'Compote de pommes',
    imageUrl: '/assets/recipes/compote-pommes.png',
    description: 'Compote maison sans sucre ajouté.',
    portions: 4,
    duration: 25,
    ingredients: [
      { name: 'Pommes', quantity: 6 },
      { name: 'Cannelle', quantity: 1, unit: 'pincée' },
      { name: 'Eau', quantity: 2, unit: 'c. à soupe' },
    ],
    steps: [
      { order: 1, instruction: 'Éplucher et couper les pommes en morceaux.' },
      { order: 2, instruction: 'Les mettre dans une casserole avec l\'eau et la cannelle.' },
      { order: 3, instruction: 'Cuire à feu doux 15–20 min en remuant. Écraser à la fourchette.' },
    ],
    equipment: ['Casserole'],
    tags: ['dessert', 'sans sucre'],
    dishType: 'dessert',
    cuisineType: ['Française'],
    diet: ['vegetarian', 'vegan'],
  },
];

(async () => {
  await connect();

  let authorEmail = null;
  const emailArg = process.argv.find((a) => a.startsWith('--email='));
  if (emailArg) {
    authorEmail = emailArg.split('=')[1]?.trim();
  }

  let user;
  if (authorEmail) {
    user = await User.findOne({ email: authorEmail }).lean();
    if (!user) {
      console.red(`Aucun utilisateur avec l'email "${authorEmail}".`);
      silentExit(1);
    }
  } else {
    user = await User.findOne().sort({ createdAt: 1 }).lean();
    if (!user) {
      console.red('Aucun utilisateur en base. Créez un compte (npm run create-user) puis relancez.');
      silentExit(1);
    }
  }

  const userId = user._id.toString();
  console.blue(`Utilisateur : ${user.email} (${userId})`);

  let created = 0;
  for (const r of SAMPLE_RECIPES) {
    try {
      await createRecipe({
        userId,
        parentId: null,
        title: r.title,
        description: r.description,
        portions: r.portions,
        duration: r.duration,
        ingredients: r.ingredients,
        steps: r.steps,
        equipment: r.equipment,
        tags: r.tags,
        dishType: r.dishType,
        cuisineType: r.cuisineType,
        diet: r.diet,
        imageUrl: r.imageUrl,
      });
      created++;
      console.green(`  + ${r.title}`);
    } catch (err) {
      console.orange(`  ! ${r.title} : ${err.message}`);
    }
  }

  console.purple(`${created} recette(s) insérée(s). Vous pouvez tester GET /api/recipes.`);
  process.exit(0);
})();
