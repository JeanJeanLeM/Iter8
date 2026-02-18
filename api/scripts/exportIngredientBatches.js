/**
 * Export ingredients from DB into batches of 10 for illustration (Cursor 4x agents).
 * Writes assets/ingredient-batches/batch-01.json ... batch-N.json and PROMPT.md.
 *
 * Options:
 *   --missing-only  Only export ingredients that have no imageUrl yet.
 *
 * Run: node api/scripts/exportIngredientBatches.js
 * Or:  npm run export:ingredient-batches
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');

const BATCH_SIZE = 10;
const OUT_DIR = path.join(__dirname, '..', '..', 'assets', 'ingredient-batches');

const PROMPT_TEMPLATE =
  'Simple flat illustration of {{displayName}}, 3 to 4 colors only, no face eyes arms or legs, plain white background, subject centered, square frame, low resolution.';

const PROMPT_MD = `# Brief d'illustration – ingrédients

À respecter par tous les agents pour des résultats homogènes.

## Règles

- **Couleur** : 3 à 4 couleurs selon l’ingrédient.
- **Interdit** : yeux, bras, jambes, visage ou toute caractéristique humaine sur l’ingrédient.
- **Fond** : blanc uni.
- **Cadrage** : sujet centré, image **carrée**, **basse résolution** (ex. 256×256 ou 512×512).
- **Style** : simple, type icône / flat (pas de photo réaliste).

## Workflow (mode 4x)

- Chaque agent ouvre **un seul** fichier \`batch-XX.json\` (Agent 1 → batch-01, Agent 2 → batch-02, etc.).
- Pour chaque entrée du tableau \`ingredients\` : générer une image avec le champ \`prompt\` fourni.
- Enregistrer l’image avec le nom **\`{name}.png\`** (ex. \`yaourt.png\`) dans le dossier **\`client/public/images/ingredients/\`**.
- L’app sert ces images sous \`/images/ingredients/{name}.png\`.
- Après génération, lancer \`npm run assign:ingredient-images\` pour mettre à jour la DB.
`;

function buildPrompt(ingredient) {
  const displayName =
    (ingredient.displayName && ingredient.displayName.trim()) ||
    (ingredient.name && ingredient.name.trim().charAt(0).toUpperCase() + ingredient.name.trim().slice(1).toLowerCase()) ||
    'ingredient';
  return PROMPT_TEMPLATE.replace(/\{\{displayName\}\}/g, displayName);
}

async function main() {
  const missingOnly = process.argv.includes('--missing-only');

  console.log('Connecting to MongoDB...');
  await connectDb();

  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Ingredient model not found.');
  }

  let query = {};
  if (missingOnly) {
    query = { $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }] };
  }
  const list = await Ingredient.find(query).sort({ name: 1 }).lean().exec();
  console.log(`Found ${list.length} ingredient(s)${missingOnly ? ' without image' : ''}.`);

  if (list.length === 0) {
    console.log('Nothing to export.');
    process.exit(0);
    return;
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  const imagesDir = path.join(__dirname, '..', '..', 'client', 'public', 'images', 'ingredients');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`Created ${imagesDir}`);
  }

  const totalBatches = Math.ceil(list.length / BATCH_SIZE);
  for (let b = 0; b < totalBatches; b++) {
    const slice = list.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchIndex = b + 1;
    const ingredients = slice.map((ing) => ({
      _id: String(ing._id),
      name: ing.name,
      displayName: ing.displayName,
      prompt: buildPrompt(ing),
    }));
    const payload = { batchIndex, totalBatches, ingredients };
    const filename = `batch-${String(batchIndex).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(OUT_DIR, filename), JSON.stringify(payload, null, 2), 'utf8');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'PROMPT.md'), PROMPT_MD, 'utf8');
  console.log(`Wrote ${totalBatches} batch file(s) and PROMPT.md to ${OUT_DIR}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
