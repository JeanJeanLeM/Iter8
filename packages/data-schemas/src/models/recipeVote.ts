import recipeVoteSchema from '~/schema/recipeVote';
import type { IRecipeVote } from '~/types/recipe';

export function createRecipeVoteModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.RecipeVote || mongoose.model<IRecipeVote>('RecipeVote', recipeVoteSchema)
  );
}
