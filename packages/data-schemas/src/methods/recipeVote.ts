import { Types } from 'mongoose';
import type { SetRecipeVoteParams, RecipeVoteResult } from '~/types/recipe';

export function createRecipeVoteMethods(mongoose: typeof import('mongoose')) {
  const RecipeVote = mongoose.models.RecipeVote;
  const Recipe = mongoose.models.Recipe;

  async function setRecipeVote(params: SetRecipeVoteParams): Promise<RecipeVoteResult> {
    const { userId, recipeId, value } = params;
    const userIdObj = new Types.ObjectId(userId as string);
    const recipeIdObj = new Types.ObjectId(recipeId as string);

    const recipe = await Recipe.findOne({
      _id: recipeIdObj,
      userId: userIdObj,
    }).exec();
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    await RecipeVote.findOneAndUpdate(
      { userId: userIdObj, recipeId: recipeIdObj },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).exec();

    const votes = await RecipeVote.find({ recipeId: recipeIdObj }).lean().exec();
    const score = votes.reduce((sum, v) => sum + v.value, 0);

    return { ok: true, score };
  }

  return {
    setRecipeVote,
  };
}

export type RecipeVoteMethods = ReturnType<typeof createRecipeVoteMethods>;
