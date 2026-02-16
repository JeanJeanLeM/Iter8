/**
 * Calls a custom LLM API to generate a short summary of the user's dietary preferences.
 * Used to inject a compact "hidden context" into agent runs.
 *
 * Env: PREFERENCES_SUMMARY_API_URL (required to enable), PREFERENCES_SUMMARY_API_KEY (optional).
 * API is expected to be OpenAI-compatible: POST with { model?, messages } and response.choices[0].message.content.
 */
const { logger } = require('@librechat/data-schemas');

const DEFAULT_MODEL = 'gpt-4o-mini';

function buildPrompt(personalization) {
  const parts = [];
  if (personalization.diets?.length) {
    parts.push(`Régimes: ${personalization.diets.join(', ')}.`);
  }
  if (personalization.allergies?.length) {
    parts.push(`Allergies: ${personalization.allergies.join(', ')}.`);
  }
  if (personalization.cookingLevel) {
    parts.push(`Niveau de cuisine: ${personalization.cookingLevel}.`);
  }
  if (personalization.dietaryPreferences) {
    parts.push(`Goûts: ${personalization.dietaryPreferences}.`);
  }
  if (parts.length === 0) {
    return null;
  }
  return [
    'Résume en une ou deux phrases courtes les préférences alimentaires suivantes, pour qu\'un assistant recettes sache quoi proposer ou éviter:',
    '',
    parts.join('\n'),
    '',
    'Réponds uniquement par le résumé, sans préambule.',
  ].join('\n');
}

/**
 * @param {object} personalization - { diets?, allergies?, cookingLevel?, dietaryPreferences? }
 * @returns {Promise<string|null>} Summary text or null if no API or no content
 */
async function generatePreferencesSummary(personalization) {
  const apiUrl = process.env.PREFERENCES_SUMMARY_API_URL;
  if (!apiUrl || !apiUrl.trim()) {
    return null;
  }
  const prompt = buildPrompt(personalization || {});
  if (!prompt) {
    return null;
  }
  const apiKey = process.env.PREFERENCES_SUMMARY_API_KEY || '';
  const model = process.env.PREFERENCES_SUMMARY_API_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
      }),
    });
    if (!res.ok) {
      logger.warn('[PreferencesSummaryService] API non-OK', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return null;
    }
    return content.trim();
  } catch (err) {
    logger.error('[PreferencesSummaryService] Error calling LLM API', err);
    return null;
  }
}

module.exports = { generatePreferencesSummary, buildPrompt };
