/**
 * Sync ingredient images from a folder into DB.
 * - Links imageUrl to existing ingredients (name/displayName match)
 * - Creates missing ingredients when no match is found
 *
 * Usage:
 *   node api/scripts/assignIngredientImages.js [imagesDir]
 *   node api/scripts/assignIngredientImages.js --dry-run
 *   node api/scripts/assignIngredientImages.js --no-create-missing
 *
 * Default dir:
 *   1) INGREDIENT_IMAGES_DIR env var
 *   2) client/public/images/Ingrédients (if exists)
 *   3) client/public/images/ingredients
 *
 * Run:
 *   npm run assign:ingredient-images
 *   npm run assign:ingredient-images -- --dry-run
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

require('module-alias').addAlias('~', path.resolve(__dirname, '..'));

const mongoose = require('mongoose');
const { connectDb } = require('~/db');
const { updateIngredient, createIngredient } = require('~/models');

const INGREDIENTS_DIR_ASCII = path.join(
  __dirname,
  '..',
  '..',
  'client',
  'public',
  'images',
  'ingredients',
);
const INGREDIENTS_DIR_ACCENTED = path.join(
  __dirname,
  '..',
  '..',
  'client',
  'public',
  'images',
  'Ingrédients',
);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const KNOWN_PREFIXES = new Set(['ee', 'ey', 'ed', 'na', 'ne']);
const KNOWN_CORRECTIONS = {
  papier_toileltte: 'papier toilette',
};

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

function toDisplayName(name) {
  const t = String(name || '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function getDefaultImagesDir() {
  if (fs.existsSync(INGREDIENTS_DIR_ACCENTED)) {
    return INGREDIENTS_DIR_ACCENTED;
  }
  return INGREDIENTS_DIR_ASCII;
}

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    createMissing: true,
    imagesDir: '',
  };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      flags.dryRun = true;
      continue;
    }
    if (arg === '--no-create-missing') {
      flags.createMissing = false;
      continue;
    }
    if (!arg.startsWith('--') && !flags.imagesDir) {
      flags.imagesDir = arg;
    }
  }
  return flags;
}

function buildImageUrl(relativeFolder, fileName) {
  const parts = ['images', relativeFolder, fileName].map((part) =>
    encodeURIComponent(part),
  );
  return `/${parts.join('/')}`;
}

function buildCandidateNames(baseName) {
  const raw = String(baseName || '').trim();
  if (!raw) return [];

  const candidates = new Set();
  const withoutIndex = raw.replace(/_\d+$/, '');

  const add = (value) => {
    const clean = String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean) {
      candidates.add(clean);
    }
  };

  add(raw);
  add(withoutIndex);

  const rawPrefix = raw.match(/^([a-z]{2})_(.+)$/i);
  if (rawPrefix && KNOWN_PREFIXES.has(rawPrefix[1].toLowerCase())) {
    add(rawPrefix[2]);
  }
  const idxPrefix = withoutIndex.match(/^([a-z]{2})_(.+)$/i);
  if (idxPrefix && KNOWN_PREFIXES.has(idxPrefix[1].toLowerCase())) {
    add(idxPrefix[2]);
  }

  const corrected = KNOWN_CORRECTIONS[raw.toLowerCase()];
  if (corrected) {
    add(corrected);
  }

  return Array.from(candidates);
}

async function main() {
  const { dryRun, createMissing, imagesDir } = parseArgs(process.argv.slice(2));
  const selectedDir = process.env.INGREDIENT_IMAGES_DIR || imagesDir || getDefaultImagesDir();
  const resolvedDir = path.isAbsolute(selectedDir)
    ? selectedDir
    : path.resolve(process.cwd(), selectedDir);

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

  const relativeFromImagesRoot = path.relative(
    path.join(__dirname, '..', '..', 'client', 'public', 'images'),
    resolvedDir,
  );
  const relativeFolder = relativeFromImagesRoot.split(path.sep).join('/');
  if (!relativeFolder || relativeFolder.startsWith('..')) {
    throw new Error(`Expected images directory under client/public/images, got: ${resolvedDir}`);
  }

  console.log(
    `Processing ${imageFiles.length} file(s) from "${resolvedDir}" (${dryRun ? 'dry-run' : 'apply'})`,
  );

  console.log('Connecting to MongoDB...');
  await connectDb();

  const Ingredient = mongoose.models.Ingredient;
  if (!Ingredient) {
    throw new Error('Ingredient model not found.');
  }

  const allIngredients = await Ingredient.find({}).lean().exec();
  const byExactName = new Map();
  const byNormalizedName = new Map();
  const byNormalizedDisplayName = new Map();
  for (const ing of allIngredients) {
    if (ing.name) {
      byExactName.set(ing.name, ing);
      byNormalizedName.set(normalizeName(ing.name), ing);
    }
    if (ing.displayName) {
      const key = normalizeName(ing.displayName);
      if (!key) continue;
      const arr = byNormalizedDisplayName.get(key) || [];
      arr.push(ing);
      byNormalizedDisplayName.set(key, arr);
    }
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skippedAmbiguous = 0;
  const createdNames = [];
  const unmatched = [];
  const ambiguous = [];

  for (const file of imageFiles) {
    const base = path.basename(file, path.extname(file));
    const candidates = buildCandidateNames(base);
    let ing = null;
    let canonicalName = '';

    for (const candidate of candidates) {
      const normalized = normalizeName(candidate);
      if (!normalized) {
        continue;
      }
      canonicalName = canonicalName || candidate;
      const exact = byExactName.get(candidate);
      if (exact) {
        ing = exact;
        break;
      }
      const byName = byNormalizedName.get(normalized);
      if (byName) {
        ing = byName;
        break;
      }
      const byDisplay = byNormalizedDisplayName.get(normalized) || [];
      if (byDisplay.length === 1) {
        ing = byDisplay[0];
        break;
      }
      if (byDisplay.length > 1) {
        skippedAmbiguous++;
        ambiguous.push(`${file} -> ${byDisplay.map((x) => x.name).join(', ')}`);
        canonicalName = '';
        ing = null;
        break;
      }
    }

    if (!ing && !canonicalName) {
      continue;
    }
    if (!ing && !createMissing) {
      unmatched.push(file);
      continue;
    }
    if (!ing) {
      const createName = normalizeName(canonicalName);
      if (!createName) {
        unmatched.push(file);
        continue;
      }
      if (dryRun) {
        created++;
        createdNames.push(createName);
      } else {
        const createdDoc = await createIngredient({
          name: createName,
          displayName: toDisplayName(canonicalName),
        });
        ing = createdDoc;
        byExactName.set(createdDoc.name, createdDoc);
        byNormalizedName.set(normalizeName(createdDoc.name), createdDoc);
        if (createdDoc.displayName) {
          const key = normalizeName(createdDoc.displayName);
          const arr = byNormalizedDisplayName.get(key) || [];
          arr.push(createdDoc);
          byNormalizedDisplayName.set(key, arr);
        }
        created++;
        createdNames.push(createdDoc.name);
      }
    }

    const imageUrl = buildImageUrl(relativeFolder, file);
    if (ing && ing.imageUrl === imageUrl) {
      unchanged++;
      continue;
    }
    if (dryRun) {
      updated++;
      continue;
    }
    if (!ing) {
      continue;
    }
    await updateIngredient(ing._id, { imageUrl });
    updated++;
  }

  console.log(`Created: ${created}`);
  console.log(`Updated imageUrl: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  if (createdNames.length) {
    console.log(`Created ingredients: ${createdNames.join(', ')}`);
  }
  if (unmatched.length) {
    console.log(`No match (not created): ${unmatched.join(', ')}`);
  }
  if (ambiguous.length) {
    console.log('Ambiguous matches (skipped):');
    for (const row of ambiguous) {
      console.log(`- ${row}`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
