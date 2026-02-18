/**
 * Build ingredients-processed.json from USDA Foundation Foods + usda-canonical-mapping.json.
 * Groups by canonical, averages nutrition (macros + micros), outputs one object per ingredient.
 * Run: node api/scripts/buildProcessedUsdaIngredients.js (or npm run build:usda-ingredients)
 */
const path = require('path');
const fs = require('fs');

const USDA_JSON_PATH = path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'FoodData_Central_foundation_food_json_2025-12-18.json',
);
const MAPPING_PATH = path.join(__dirname, '..', '..', 'assets', 'usda-canonical-mapping.json');
const OUT_PATH = path.join(__dirname, '..', '..', 'assets', 'ingredients-processed.json');

const usda = require('../server/services/usdaNutrition');

function average(values) {
  const defined = values.filter((v) => v != null && Number.isFinite(v));
  if (defined.length === 0) return undefined;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
}

function averageMicros(nutritionList) {
  const microKeys = new Set();
  for (const n of nutritionList) {
    if (n.nutritionMicros && typeof n.nutritionMicros === 'object') {
      Object.keys(n.nutritionMicros).forEach((k) => microKeys.add(k));
    }
  }
  const result = {};
  for (const key of microKeys) {
    const values = nutritionList
      .map((n) => n.nutritionMicros && n.nutritionMicros[key])
      .filter((v) => v != null && Number.isFinite(v));
    const avg = average(values);
    if (avg !== undefined) result[key] = Math.round(avg * 1000) / 1000;
  }
  return Object.keys(result).length ? result : undefined;
}

function main() {
  const rawUsda = fs.readFileSync(USDA_JSON_PATH, 'utf8');
  const dataUsda = JSON.parse(rawUsda);
  if (!dataUsda?.FoundationFoods || !Array.isArray(dataUsda.FoundationFoods)) {
    throw new Error('Invalid USDA JSON: missing FoundationFoods array');
  }

  const byDescription = new Map();
  for (const entry of dataUsda.FoundationFoods) {
    if (entry.description) {
      const d = entry.description.trim();
      byDescription.set(d, entry);
    }
  }

  const rawMapping = fs.readFileSync(MAPPING_PATH, 'utf8');
  const mapping = JSON.parse(rawMapping);

  const unmappedDescriptions = new Set(byDescription.keys());
  const result = [];
  const missingInUsda = [];

  for (const [canonicalName, spec] of Object.entries(mapping)) {
    const usdaDescriptions = spec.usdaDescriptions || [];
    const displayName = spec.displayName || canonicalName;

    const entries = [];
    for (const desc of usdaDescriptions) {
      const descTrim = desc.trim();
      unmappedDescriptions.delete(descTrim);
      unmappedDescriptions.delete(desc);
      const entry = byDescription.get(descTrim) || byDescription.get(desc);
      if (!entry) {
        missingInUsda.push(desc);
        continue;
      }
      entries.push(entry);
    }

    if (entries.length === 0) continue;

    const nutritionList = entries.map((e) => usda.extractNutrition(e));

    const energyKcal = average(nutritionList.map((n) => n.energyKcal));
    const proteinG = average(nutritionList.map((n) => n.proteinG));
    const fatG = average(nutritionList.map((n) => n.fatG));
    const carbohydrateG = average(nutritionList.map((n) => n.carbohydrateG));
    const fiberG = average(nutritionList.map((n) => n.fiberG));
    const nutritionMicros = averageMicros(nutritionList);

    const usdaDescription =
      entries.length === 1
        ? entries[0].description
        : `Source: USDA (moyenne de ${entries.length} aliments)`;

    const item = {
      name: canonicalName,
      displayName,
      energyKcal: energyKcal !== undefined ? Math.round(energyKcal * 1000) / 1000 : undefined,
      proteinG: proteinG !== undefined ? Math.round(proteinG * 1000) / 1000 : undefined,
      fatG: fatG !== undefined ? Math.round(fatG * 1000) / 1000 : undefined,
      carbohydrateG:
        carbohydrateG !== undefined ? Math.round(carbohydrateG * 1000) / 1000 : undefined,
      fiberG: fiberG !== undefined ? Math.round(fiberG * 1000) / 1000 : undefined,
      nutritionMicros,
      usdaDescription,
    };
    result.push(item);
  }

  if (missingInUsda.length) {
    console.warn(
      `Warning: ${missingInUsda.length} description(s) in mapping not found in USDA JSON (first 5):`,
      missingInUsda.slice(0, 5),
    );
  }
  const unmappedList = [...unmappedDescriptions].sort();
  if (unmappedList.length) {
    console.warn(
      `Info: ${unmappedList.length} USDA entry(ies) not in mapping (first 5):`,
      unmappedList.slice(0, 5),
    );
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Wrote ${result.length} ingredients to ${OUT_PATH}`);
}

main();
