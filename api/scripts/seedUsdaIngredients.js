/**
 * Seed the Ingredient collection with USDA ingredients.
 * If assets/ingredients-processed.json exists, uses it (canonical French names, averaged nutrition).
 * Otherwise falls back to raw USDA Foundation Foods (one DB entry per USDA description).
 *
 * Run from project root: node api/scripts/seedUsdaIngredients.js
 * Or: npm run seed:usda-ingredients
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

// So that require('~/db') and require('~/server/...') resolve (base = api)
require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');
const usda = require('~/server/services/usdaNutrition');

const PROCESSED_JSON_PATH = path.join(__dirname, '..', '..', 'assets', 'ingredients-processed.json');

function toUpdatePayload(nutrition) {
  const payload = {};
  if (nutrition.energyKcal != null && Number.isFinite(nutrition.energyKcal))
    payload.energyKcal = nutrition.energyKcal;
  if (nutrition.proteinG != null && Number.isFinite(nutrition.proteinG))
    payload.proteinG = nutrition.proteinG;
  if (nutrition.fatG != null && Number.isFinite(nutrition.fatG))
    payload.fatG = nutrition.fatG;
  if (nutrition.carbohydrateG != null && Number.isFinite(nutrition.carbohydrateG))
    payload.carbohydrateG = nutrition.carbohydrateG;
  if (nutrition.fiberG != null && Number.isFinite(nutrition.fiberG))
    payload.fiberG = nutrition.fiberG;
  if (nutrition.nutritionMicros != null && typeof nutrition.nutritionMicros === 'object')
    payload.nutritionMicros = nutrition.nutritionMicros;
  if (nutrition.usdaFdcId !== undefined)
    payload.usdaFdcId = nutrition.usdaFdcId;
  if (nutrition.usdaDescription !== undefined)
    payload.usdaDescription = nutrition.usdaDescription;
  return payload;
}

async function seedFromProcessed(list) {
  let processed = 0;
  let errors = 0;
  const Ingredient = mongoose.models.Ingredient;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const name = item.name;
    if (!name || typeof name !== 'string') {
      errors++;
      continue;
    }
    try {
      const payload = toUpdatePayload(item);
      await Ingredient.findOneAndUpdate(
        { name },
        {
          $set: {
            name,
            displayName: item.displayName != null ? item.displayName : name,
            ...payload,
          },
        },
        { upsert: true, new: true },
      );
      processed++;
    } catch (err) {
      errors++;
      console.error(`[${i + 1}/${list.length}] ${name}: ${err.message}`);
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${list.length} processed...`);
    }
  }
  return { processed, errors };
}

async function seedFromRawUsda(list) {
  let processed = 0;
  let errors = 0;
  const Ingredient = mongoose.models.Ingredient;
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    const description = entry.description;
    if (!description || typeof description !== 'string') {
      errors++;
      continue;
    }
    const name = usda.normalizeForMatch(description);
    if (!name) {
      errors++;
      continue;
    }
    try {
      const nutrition = usda.extractNutrition(entry);
      const payload = toUpdatePayload(nutrition);
      await Ingredient.findOneAndUpdate(
        { name },
        {
          $set: {
            name,
            displayName: description.trim(),
            ...payload,
          },
        },
        { upsert: true, new: true },
      );
      processed++;
    } catch (err) {
      errors++;
      console.error(`[${i + 1}/${list.length}] ${description}: ${err.message}`);
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${list.length} processed...`);
    }
  }
  return { processed, errors };
}

async function main() {
  console.log('Connecting to MongoDB...');
  await connectDb();
  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Ingredient model not found. Ensure @librechat/data-schemas createModels() has run (e.g. via require("~/db")).');
  }

  let list;
  if (fs.existsSync(PROCESSED_JSON_PATH)) {
    console.log('Loading ingredients-processed.json...');
    const raw = fs.readFileSync(PROCESSED_JSON_PATH, 'utf8');
    list = JSON.parse(raw);
    if (!Array.isArray(list)) throw new Error('ingredients-processed.json must be an array');
    console.log(`Found ${list.length} ingredients. Importing...`);
    const { processed, errors } = await seedFromProcessed(list);
    console.log(`Done. Processed: ${processed}, errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
    return;
  }

  console.log('Loading USDA Foundation Foods (raw)...');
  list = usda.loadFoundationFoods();
  console.log(`Found ${list.length} foods. Importing...`);
  const { processed, errors } = await seedFromRawUsda(list);
  console.log(`Done. Processed: ${processed}, errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
