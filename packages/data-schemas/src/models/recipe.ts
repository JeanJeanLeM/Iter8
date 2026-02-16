import recipeSchema from '~/schema/recipe';
import type { IRecipe } from '~/types/recipe';

export function createRecipeModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', recipeSchema);
}
