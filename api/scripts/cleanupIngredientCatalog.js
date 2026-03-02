/**
 * Cleanup pass for Ingredient catalog:
 * - normalizes noisy names produced from filenames
 * - applies explicit typo/alias corrections
 * - merges duplicates into a canonical ingredient name
 *
 * Usage:
 *   node api/scripts/cleanupIngredientCatalog.js
 *   node api/scripts/cleanupIngredientCatalog.js --dry-run
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');

const SOURCE_PREFIXES = ['ee ', 'ey ', 'ed ', 'na ', 'nd ', 'ne ', 'nee ', 'se '];

/** Explicit, business-safe corrections for names observed in imported filenames. */
const NAME_CORRECTIONS = {
  'papier toileltte': 'papier toilette',
  'jus dananas': 'jus d ananas',
  'jus dorange': 'jus d orange',
  'flocons davoine': 'flocons d avoine',
  'coupe ongnes': 'coupe ongles',
  'ee mousse rasar': 'mousse raser',
  'mousse rasar': 'mousse raser',
  'ey lotion hydrtante': 'lotion hydratante',
  'lotion hydrtante': 'lotion hydratante',
  'nee apres shampoing': 'apres shampoing',
  'na pastis': 'pastis',
  'nd rhum blanc': 'rhum blanc',
  'ne vodka': 'vodka',
  'se schnapps peche': 'schnapps peche',
  'pile dentifrice': 'dentifrice',
  'loquilie saint jacques': 'coquilles saint jacques',
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['’`]/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDisplayName(name) {
  const t = String(name || '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function canonicalizeName(original) {
  let out = String(original || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!out) return out;

  for (const prefix of SOURCE_PREFIXES) {
    if (out.startsWith(prefix) && out.length > prefix.length + 1) {
      out = out.slice(prefix.length).trim();
      break;
    }
  }

  out = out.replace(/\s+\d+$/, '').trim(); // "crevette 1" -> "crevette"

  const correction =
    NAME_CORRECTIONS[out] || NAME_CORRECTIONS[normalizeKey(out)];
  if (correction) {
    out = correction;
  }

  return out;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Running ingredient cleanup (${dryRun ? 'dry-run' : 'apply'})`);
  await connectDb();

  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Ingredient model not found.');
  }

  const docs = await Ingredient.find({}).sort({ name: 1 }).lean().exec();
  const byName = new Map();
  const byKey = new Map();
  for (const doc of docs) {
    byName.set(String(doc.name), doc);
    byKey.set(normalizeKey(doc.name), doc);
  }

  /** @type {Array<{from:string,to:string,action:string}>} */
  const actions = [];
  let merged = 0;
  let renamed = 0;
  let unchanged = 0;

  for (const source of docs) {
    const sourceName = String(source.name);
    const canonical = canonicalizeName(sourceName);
    if (!canonical || canonical === sourceName) {
      unchanged++;
      continue;
    }

    const target = byName.get(canonical) || byKey.get(normalizeKey(canonical));
    if (target && String(target._id) !== String(source._id)) {
      actions.push({ from: sourceName, to: canonical, action: 'merge' });
      if (!dryRun) {
        const updatePayload = {};
        if ((!target.imageUrl || !String(target.imageUrl).trim()) && source.imageUrl) {
          updatePayload.imageUrl = source.imageUrl;
        }
        if ((!target.displayName || !String(target.displayName).trim()) && source.displayName) {
          updatePayload.displayName = source.displayName;
        }
        if (Object.keys(updatePayload).length > 0) {
          await Ingredient.updateOne({ _id: target._id }, { $set: updatePayload }).exec();
        }
        await Ingredient.deleteOne({ _id: source._id }).exec();
      }
      merged++;
      continue;
    }

    actions.push({ from: sourceName, to: canonical, action: 'rename' });
    if (!dryRun) {
      await Ingredient.updateOne(
        { _id: source._id },
        {
          $set: {
            name: canonical,
            displayName: toDisplayName(canonical),
          },
        },
      ).exec();
      byName.delete(sourceName);
      byName.set(canonical, { ...source, name: canonical });
      byKey.set(normalizeKey(canonical), { ...source, name: canonical });
    }
    renamed++;
  }

  console.log(`Renamed: ${renamed}`);
  console.log(`Merged: ${merged}`);
  console.log(`Unchanged: ${unchanged}`);

  if (actions.length > 0) {
    console.log('Changes:');
    for (const item of actions) {
      console.log(`- [${item.action}] ${item.from} -> ${item.to}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

