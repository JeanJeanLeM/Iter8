/**
 * Supprime de la base les ingrédients qui ne figurent pas dans la liste canonique
 * (assets/ingredients-processed.json). Utile pour enlever les anciens ingrédients
 * en anglais importés depuis l’USDA brut.
 *
 * À lancer après avoir fait : npm run build:usda-ingredients puis npm run seed:usda-ingredients
 * Exécution : node api/scripts/removeNonCanonicalIngredients.js
 * Ou : npm run remove-non-canonical-ingredients
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');

const PROCESSED_JSON_PATH = path.join(__dirname, '..', '..', 'assets', 'ingredients-processed.json');

async function main() {
  if (!fs.existsSync(PROCESSED_JSON_PATH)) {
    console.error('Fichier introuvable:', PROCESSED_JSON_PATH);
    console.error('Générez-le avec : npm run build:usda-ingredients');
    process.exit(1);
  }

  const raw = fs.readFileSync(PROCESSED_JSON_PATH, 'utf8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    console.error('ingredients-processed.json doit être un tableau.');
    process.exit(1);
  }

  const canonicalNames = list.map((item) => item.name).filter((n) => n != null && typeof n === 'string');
  const nameSet = new Set(canonicalNames);
  console.log(`${canonicalNames.length} noms canoniques (français) à conserver.`);

  console.log('Connexion à MongoDB...');
  await connectDb();

  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Modèle Ingredient introuvable.');
  }

  const result = await Ingredient.deleteMany({ name: { $nin: [...nameSet] } });
  console.log(`${result.deletedCount} ingrédient(s) supprimé(s) (noms non canoniques / anglais).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
