/**
 * Generates a recipe image using OpenAI Images API (gpt-image-1.5, 1024x1024, low).
 * Uses OPENAI_API_KEY from .env.
 *
 * @param {object} recipe - Recipe object with at least title (description optional)
 * @param {string} [apiKey] - Optional OpenAI API key (defaults to process.env.OPENAI_API_KEY)
 * @returns {Promise<string>} Data URL of the generated image (data:image/png;base64,...)
 */
const { logger } = require('@librechat/data-schemas');
const OpenAI = require('openai').default;

const MODEL = 'gpt-image-1.5';
const SIZE = '1024x1024';
const QUALITY = 'low';

function buildPrompt(recipe) {
  const title = recipe?.title?.trim() || 'Plat';
  const desc = recipe?.description?.trim();
  if (desc) {
    return `Appétissante photo de plat pour la recette "${title}". ${desc} Style: photo réaliste de cuisine, plat prêt à servir, éclairage naturel, fond neutre.`;
  }
  return `Appétissante photo de plat pour la recette "${title}". Style: photo réaliste de cuisine, plat prêt à servir, éclairage naturel, fond neutre.`;
}

async function generateRecipeImageWithOpenAI(recipe, apiKey) {
  const resolvedKey =
    typeof apiKey === 'string' && apiKey && apiKey !== 'user_provided'
      ? apiKey
      : process.env.OPENAI_API_KEY;
  if (!resolvedKey || resolvedKey === 'user_provided') {
    throw new Error(
      'OpenAI API key is required for recipe image generation. Set OPENAI_API_KEY in .env.',
    );
  }
  if (!recipe || !recipe.title) {
    throw new Error('Recipe with title is required.');
  }

  const openai = new OpenAI({ apiKey: resolvedKey });
  const prompt = buildPrompt(recipe);
  let resp;
  try {
    resp = await openai.images.generate({
      model: MODEL,
      prompt,
      n: 1,
      size: SIZE,
      quality: QUALITY,
    });
  } catch (apiErr) {
    throw apiErr;
  }
  if (!resp?.data?.[0]?.b64_json) {
    throw new Error('No image data returned from OpenAI API.');
  }

  const base64 = resp.data[0].b64_json;
  const dataUrl = `data:image/png;base64,${base64}`;
  logger.debug('[generateRecipeImageWithOpenAI] Image generated for recipe:', recipe.title);
  return dataUrl;
}

module.exports = { generateRecipeImageWithOpenAI };
