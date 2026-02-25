/**
 * Generates a recipe image using OpenAI Images API (gpt-image-1.5, 1024x1024, low).
 * Uses OPENAI_API_KEY from .env. Prompt uses user personalization (recipeImageStyle, recipeImageBackground) when provided.
 *
 * @param {object} recipe - Recipe object with at least title (description optional)
 * @param {string} [apiKey] - Optional OpenAI API key (defaults to process.env.OPENAI_API_KEY)
 * @param {object} [personalization] - User personalization with recipeImageStyle, recipeImageBackground (keys from whitelist)
 * @returns {Promise<string>} Data URL of the generated image (data:image/png;base64,...)
 */
const { logger } = require('@librechat/data-schemas');
const OpenAI = require('openai').default;

const MODEL = 'gpt-image-1.5';
const SIZE = '1024x1024';
const QUALITY = 'low';

const DEFAULT_STYLE = 'hyper_realiste';
const DEFAULT_BACKGROUND = 'planche_bois';

/** Style key -> prompt description for "The style is ..." */
const STYLE_DESCRIPTIONS = {
  hyper_realiste:
    'hyper-realistic food photography, ultra detailed, professional culinary shot, lifelike textures',
  anime_japonais: 'Japanese anime style, clean lines, vibrant colors, anime food illustration',
  peinture_huile: 'oil painting style, rich brushstrokes, classical still life, artistic',
  cartoon_moderne: 'modern cartoon style, bold shapes, friendly and appetizing',
  isometrique: 'isometric 3D illustration, clean game-style food render',
  pixar_3d: 'Pixar-style 3D render, soft lighting, appealing and polished',
  dessin_crayon: 'pencil sketch style, hand-drawn, subtle shading, recipe illustration',
};

/** Background key -> prompt description for "The background is ..." */
const BACKGROUND_DESCRIPTIONS = {
  planche_bois: 'rustic wooden board or wooden surface',
  cuisine_inox: 'stainless steel kitchen counter or professional kitchen',
  table_restaurant: 'elegant restaurant table with white cloth',
  nappe_carreaux: 'checkered tablecloth, casual dining',
  street_urbain: 'urban or street food setting, casual',
  plage: 'beach or coastal setting, relaxed',
  montagne: 'mountain or alpine setting, natural',
};

function buildPrompt(recipe, personalization) {
  const dishName = recipe?.title?.trim() || 'the dish';
  const styleKey =
    personalization?.recipeImageStyle && STYLE_DESCRIPTIONS[personalization.recipeImageStyle]
      ? personalization.recipeImageStyle
      : DEFAULT_STYLE;
  const backgroundKey =
    personalization?.recipeImageBackground &&
    BACKGROUND_DESCRIPTIONS[personalization.recipeImageBackground]
      ? personalization.recipeImageBackground
      : DEFAULT_BACKGROUND;
  const styleDesc = STYLE_DESCRIPTIONS[styleKey];
  const backgroundDesc = BACKGROUND_DESCRIPTIONS[backgroundKey];
  return `Create an illustration for a recipe of ${dishName}, showing the finished dish and its fresh ingredients arranged around it, with an empty space on the side for recipe text (a blank area, like a paper label or a clean spot). The style is ${styleDesc}. The background is ${backgroundDesc}. Top-down view, natural lighting, high quality, 4k, detailed textures.`;
}

async function generateRecipeImageWithOpenAI(recipe, apiKey, personalization = null) {
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
  const prompt = buildPrompt(recipe, personalization);
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
