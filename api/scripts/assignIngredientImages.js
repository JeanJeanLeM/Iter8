/**
 * Assign generated ingredient images to DB: scan a folder of images (e.g. client/public/images/ingredients/),
 * match filename (without extension) to ingredient name, set ingredient.imageUrl to /images/ingredients/{filename}.
 *
 * Usage:
 *   node api/scripts/assignIngredientImages.js [imagesDir]
 *   Default imagesDir: client/public/images/ingredients
 *   Or set INGREDIENT_IMAGES_DIR env var.
 *
 * Run: npm run assign:ingredient-images
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');
const { updateIngredient } = require('~/models');

const DEFAULT_IMAGES_DIR = path.join(
  __dirname,
  '..',
  '..',
  'client',
  'public',
  'images',
  'ingredients',
);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function normalizeName(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const imagesDir =
    process.env.INGREDIENT_IMAGES_DIR ||
    process.argv[2] ||
    DEFAULT_IMAGES_DIR;
  const resolvedDir = path.isAbsolute(imagesDir) ? imagesDir : path.resolve(process.cwd(), imagesDir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(resolvedDir);
  const imageFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  });

  if (imageFiles.length === 0) {
    console.log(`No image files found in ${resolvedDir}`);
    process.exit(0);
    return;
  }

  console.log('Connecting to MongoDB...');
  await connectDb();

  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Ingredient model not found.');
  }

  const allIngredients = await Ingredient.find({}).lean().exec();
  const byName = new Map();
  for (const ing of allIngredients) {
    if (ing.name) byName.set(ing.name, ing);
  }
  const byNormalized = new Map();
  for (const ing of allIngredients) {
    if (ing.name) byNormalized.set(normalizeName(ing.name), ing);
  }

  let updated = 0;
  const notFound = [];

  for (const file of imageFiles) {
    const base = path.basename(file, path.extname(file));
    const nameFromFile = base.replace(/\s+/g, ' ');
    const normalized = normalizeName(nameFromFile);

    let ing = byName.get(nameFromFile) || byName.get(base) || byNormalized.get(normalized);
    if (!ing && normalized) {
      for (const [dbName, doc] of byName) {
        if (normalizeName(dbName) === normalized) {
          ing = doc;
          break;
        }
      }
    }

    if (!ing) {
      notFound.push(file);
      continue;
    }

    const imageUrl = `/images/ingredients/${file}`;
    await updateIngredient(ing._id, { imageUrl });
    updated++;
  }

  console.log(`Updated ${updated} ingredient(s) with imageUrl.`);
  if (notFound.length) {
    console.log(`File(s) with no matching ingredient: ${notFound.join(', ')}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
