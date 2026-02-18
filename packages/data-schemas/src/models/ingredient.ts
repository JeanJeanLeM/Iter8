import ingredientSchema from '~/schema/ingredient';
import type { IIngredient } from '~/types/ingredient';

export function createIngredientModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.Ingredient ||
    mongoose.model<IIngredient>('Ingredient', ingredientSchema)
  );
}
