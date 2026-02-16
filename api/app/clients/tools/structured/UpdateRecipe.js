const { Tool } = require('@langchain/core/tools');

const updateRecipeJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Recipe title' },
    description: { type: 'string', description: 'Recipe description or summary' },
    portions: {
      type: 'number',
      description: 'Number of portions (ingredient quantities are for this count)',
    },
    duration: {
      oneOf: [
        { type: 'number', description: 'Total duration in minutes' },
        {
          type: 'object',
          properties: {
            prep: { type: 'number', description: 'Prep time in minutes' },
            cook: { type: 'number', description: 'Cook time in minutes' },
            total: { type: 'number', description: 'Total time in minutes' },
          },
          additionalProperties: false,
        },
      ],
      description: 'Duration: number (total minutes) or { prep, cook, total }',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Ingredient name' },
          quantity: { type: 'number', description: 'Quantity for the given portions' },
          unit: { type: 'string', description: 'Unit (g, ml, tbsp, etc.)' },
          note: { type: 'string', description: 'Optional note (e.g. "finely chopped")' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      description: 'List of ingredients',
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order: { type: 'number', description: 'Step order (1-based)' },
          instruction: { type: 'string', description: 'Step instruction' },
          ingredientsUsed: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ingredient names used in this step',
          },
        },
        required: ['order', 'instruction'],
        additionalProperties: false,
      },
      description: 'Recipe steps in order',
    },
    equipment: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required equipment (e.g. oven, mixer)',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags (e.g. dessert, vegan, quick)',
    },
    objective: {
      type: 'string',
      description:
        'Objective of the recipe for new/standalone recipes (e.g. "Recette de cookies moelleux pour le goûter")',
    },
    variationNote: {
      type: 'string',
      description:
        'When creating a variation: short text explaining what was changed (e.g. "25% de sucre en moins", "Version sans gluten"). REQUIRED when modifying an existing recipe.',
    },
  },
  required: ['title'],
  additionalProperties: false,
};

function normalizeRecipe(args) {
  const recipe = {
    title: typeof args.title === 'string' ? args.title.trim() : 'Sans titre',
    description: args.description != null ? String(args.description).trim() : undefined,
    portions: typeof args.portions === 'number' && args.portions > 0 ? args.portions : undefined,
    duration: args.duration,
    ingredients: Array.isArray(args.ingredients) ? args.ingredients : [],
    steps: Array.isArray(args.steps) ? args.steps : [],
    equipment: Array.isArray(args.equipment) ? args.equipment : [],
    tags: Array.isArray(args.tags) ? args.tags : [],
    objective: args.objective != null ? String(args.objective).trim() : undefined,
    variationNote: args.variationNote != null ? String(args.variationNote).trim() : undefined,
  };

  if (recipe.ingredients.length > 0) {
    recipe.ingredients = recipe.ingredients
      .filter((i) => i && typeof i.name === 'string')
      .map((i) => ({
        name: String(i.name).trim(),
        quantity: typeof i.quantity === 'number' ? i.quantity : undefined,
        unit: i.unit != null ? String(i.unit).trim() : undefined,
        note: i.note != null ? String(i.note).trim() : undefined,
      }));
  }

  if (recipe.steps.length > 0) {
    recipe.steps = recipe.steps
      .filter((s) => s && typeof s.instruction === 'string')
      .map((s, idx) => ({
        order: typeof s.order === 'number' ? s.order : idx + 1,
        instruction: String(s.instruction).trim(),
        ingredientsUsed: Array.isArray(s.ingredientsUsed) ? s.ingredientsUsed : undefined,
      }))
      .sort((a, b) => a.order - b.order);
  }

  if (recipe.equipment.length > 0) {
    recipe.equipment = recipe.equipment.filter((e) => typeof e === 'string').map((e) => String(e).trim());
  }
  if (recipe.tags.length > 0) {
    recipe.tags = recipe.tags.filter((t) => typeof t === 'string').map((t) => String(t).trim());
  }

  if (recipe.duration != null) {
    if (typeof recipe.duration === 'number') {
      recipe.duration = recipe.duration;
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

class UpdateRecipe extends Tool {
  name = 'update_recipe';
  description =
    'Update or propose a structured recipe (title, ingredients, steps, duration, equipment, portions, tags). ' +
    'Quantities can be expressed for X portions. Use this tool to output a complete recipe that the user can view and save to their recipe book. ' +
    'For new recipes: include "objective" describing the recipe goal. For variations/modifications: ALWAYS include "variationNote" with a short text explaining what was changed (e.g. "25% less sugar", "Gluten-free version").';

  schema = updateRecipeJsonSchema;

  static get jsonSchema() {
    return updateRecipeJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
  }

  async _call(args) {
    try {
      const recipe = normalizeRecipe(args);
      return JSON.stringify(recipe);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }
}

module.exports = UpdateRecipe;
