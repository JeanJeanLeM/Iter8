/**
 * Structures a recipe text using OpenAI and returns the normalized object for DB storage.
 * Uses the same OpenAI API key as the chat (OPENAI_API_KEY).
 *
 * @param {string} recipeText - The raw recipe text from the AI assistant
 * @param {string} apiKey - OpenAI API key (from app config)
 * @param {{ variationNote?: string }} [options] - Optional. When structuring a variation, pass variationNote to merge into result.
 * @returns {Promise<object>} Structured recipe { title, description, objective?, variationNote?, portions, duration, ingredients, steps, equipment, tags }
 */
const { logger } = require('@librechat/data-schemas');
const OpenAI = require('openai').default;

const STRUCTURE_SYSTEM_PROMPT = `Tu es un assistant qui structure des recettes. Tu reçois du texte de recette et tu DOIS répondre UNIQUEMENT par un JSON valide, sans texte avant ou après.

Format JSON requis (identique au schéma de la base de données) :
{
  "title": "string (requis)",
  "objective": "string (objectif de la recette, ex: Recette de cookies moelleux pour le goûter)",
  "description": "string (résumé ou description courte)",
  "portions": number (nombre de parts/personnes),
  "duration": number | { "prep": number, "cook": number, "total": number } (minutes),
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "string (g, ml, cuillère à café, etc.)", "note": "string optionnel" }
  ],
  "steps": [
    { "order": 1, "instruction": "string" }
  ],
  "equipment": ["string"],
  "tags": ["string"],
  "restTimeMinutes": number (optionnel, temps de repos/fermentation/marinade en minutes, ex: 720 pour 12h),
  "maxStorageDays": number (optionnel, conservation max en jours, ex: 2 pour 48h)
}

Règles :
- title est obligatoire.
- ingredients : name obligatoire, quantity et unit si connus. Convertir "1 œuf" en quantity: 1 sans unit, "250 g farine" en quantity: 250, unit: "g".
- duration : si tu as "Préparation 15 min, Cuisson 10 min" → { "prep": 15, "cook": 10, "total": 25 }. Si seulement un total → number.
- steps : order 1-based, instruction claire et complète.
- equipment : liste du matériel (four, saladier, etc.).
- tags : dessert, plat, vegan, rapide, etc.
- restTimeMinutes : si la recette a un temps de repos, fermentation ou marinade (ex. pain au levain 12h), indique-le en minutes. Sinon omets.
- maxStorageDays : si le plat ne se conserve pas longtemps (ex. 1-2 jours), indique-le. Sinon omets ou mets 2 par défaut.

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

async function structureRecipeWithOpenAI(recipeText, apiKey, options = {}) {
  const resolvedKey =
    typeof apiKey === 'string' && apiKey && apiKey !== 'user_provided'
      ? apiKey
      : process.env.OPENAI_API_KEY;
  if (!resolvedKey || resolvedKey === 'user_provided') {
    throw new Error('OpenAI API key is required for recipe structuring. Set OPENAI_API_KEY in .env.');
  }
  if (!recipeText || typeof recipeText !== 'string') {
    throw new Error('Recipe text is required.');
  }

  const openai = new OpenAI({ apiKey: resolvedKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Structure cette recette en JSON :\n\n${recipeText}`,
      },
    ],
    temperature: 0.2,
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI returned empty response.');
  }

  // Extract JSON (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    logger.error('[structureRecipeWithOpenAI] Invalid JSON:', content?.slice(0, 200));
    throw new Error('Failed to parse recipe structure from OpenAI response.');
  }

  const normalized = normalizeForDb(parsed);
  if (options.variationNote != null && typeof options.variationNote === 'string') {
    normalized.variationNote = options.variationNote.trim();
  }
  return normalized;
}

function normalizeForDb(raw) {
  const recipe = {
    title: typeof raw.title === 'string' ? raw.title.trim() : 'Sans titre',
    objective: raw.objective != null ? String(raw.objective).trim() : undefined,
    description: raw.description != null ? String(raw.description).trim() : undefined,
    portions:
      typeof raw.portions === 'number' && raw.portions > 0 ? raw.portions : undefined,
    duration: raw.duration,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    equipment: Array.isArray(raw.equipment) ? raw.equipment : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    restTimeMinutes:
      typeof raw.restTimeMinutes === 'number' && raw.restTimeMinutes >= 0
        ? raw.restTimeMinutes
        : undefined,
    maxStorageDays:
      typeof raw.maxStorageDays === 'number' && raw.maxStorageDays > 0
        ? raw.maxStorageDays
        : undefined,
  };

  recipe.ingredients = recipe.ingredients
    .filter((i) => i && typeof i.name === 'string')
    .map((i) => ({
      name: String(i.name).trim(),
      quantity: typeof i.quantity === 'number' ? i.quantity : undefined,
      unit: i.unit != null ? String(i.unit).trim() : undefined,
      note: i.note != null ? String(i.note).trim() : undefined,
    }));

  recipe.steps = recipe.steps
    .filter((s) => s && typeof s.instruction === 'string')
    .map((s, idx) => ({
      order: typeof s.order === 'number' ? s.order : idx + 1,
      instruction: String(s.instruction).trim(),
    }))
    .sort((a, b) => a.order - b.order);

  recipe.equipment = recipe.equipment
    .filter((e) => typeof e === 'string')
    .map((e) => String(e).trim());
  recipe.tags = recipe.tags.filter((t) => typeof t === 'string').map((t) => String(t).trim());

  if (recipe.duration != null) {
    if (typeof recipe.duration === 'number') {
      // keep as is
    } else if (typeof recipe.duration === 'object' && recipe.duration !== null) {
      const d = recipe.duration;
      const prep = typeof d.prep === 'number' ? d.prep : undefined;
      const cook = typeof d.cook === 'number' ? d.cook : undefined;
      const total = typeof d.total === 'number' ? d.total : undefined;
      if (prep !== undefined || cook !== undefined || total !== undefined) {
        recipe.duration = { prep, cook, total };
      } else {
        recipe.duration = undefined;
      }
    } else {
      recipe.duration = undefined;
    }
  }

  return recipe;
}

module.exports = { structureRecipeWithOpenAI };
