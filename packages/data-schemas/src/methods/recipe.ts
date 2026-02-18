import { Types } from 'mongoose';
import type {
  IRecipeLean,
  GetRecipesParams,
  RecipeListResult,
  IRecipe,
  IRecipeIngredient,
  IRecipeStep,
  IRecipeDuration,
} from '~/types/recipe';

export function createRecipeMethods(mongoose: typeof import('mongoose')) {
  const Recipe = mongoose.models?.Recipe;
  const RecipeVote = mongoose.models?.RecipeVote;
  if (!Recipe || !RecipeVote) {
    throw new Error(
      'Recipe model not registered. Ensure require("~/db") or createModels(mongoose) runs before createMethods(mongoose) (e.g. in api/models/index.js).',
    );
  }

  async function getRecipes(params: GetRecipesParams): Promise<RecipeListResult> {
    const {
      userId,
      ingredientsInclude = [],
      ingredientsExclude = [],
      dishType,
      cuisineType = [],
      diet = [],
      parentsOnly = true,
      parentId: parentIdParam,
      ids: idsParam,
    } = params;

    const match: Record<string, unknown> = { userId: new Types.ObjectId(userId as string) };
    if (idsParam != null && Array.isArray(idsParam) && idsParam.length > 0) {
      match._id = { $in: idsParam.map((id) => new Types.ObjectId(id as string)) };
    } else if (parentIdParam != null) {
      match.parentId = new Types.ObjectId(parentIdParam as string);
    } else if (parentsOnly) {
      match.parentId = null;
    }
    if (dishType) {
      match.dishType = dishType;
    }
    if (cuisineType.length > 0) {
      match.cuisineType = { $in: cuisineType };
    }
    if (diet.length > 0) {
      match.diet = { $in: diet };
    }

    const pipeline: Record<string, unknown>[] = [{ $match: match }];

    if (ingredientsInclude.length > 0) {
      pipeline.push({
        $match: {
          'ingredients.name': {
            $in: ingredientsInclude.map((s) => new RegExp(escapeRegex(s), 'i')),
          },
        },
      });
    }
    if (ingredientsExclude.length > 0) {
      pipeline.push({
        $match: {
          $nor: ingredientsExclude.map((s) => ({
            'ingredients.name': new RegExp(escapeRegex(s), 'i'),
          })),
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    const userIdObj = new Types.ObjectId(userId as string);
    pipeline.push(
      {
        $lookup: {
          from: 'recipes',
          localField: '_id',
          foreignField: 'parentId',
          as: 'variations',
        },
      },
      {
        $addFields: {
          variationCount: { $size: '$variations' },
        },
      },
      {
        $lookup: {
          from: 'recipevotes',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'votes',
        },
      },
      {
        $addFields: {
          score: { $sum: '$votes.value' },
        },
      },
      {
        $lookup: {
          from: 'recipevotes',
          let: { rid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$recipeId', '$$rid'] },
                    { $eq: ['$userId', userIdObj] }],
                },
              },
            },
            { $project: { value: 1 } },
          ],
          as: 'userVoteArr',
        },
      },
      {
        $addFields: {
          userVote: { $arrayElemAt: ['$userVoteArr.value', 0] },
        },
      },
      {
        $project: {
          variations: 0,
          votes: 0,
          userVoteArr: 0,
        },
      },
    );

    const recipes = (await Recipe.aggregate(pipeline).exec()) as IRecipeLean[];
    return { recipes };
  }

  async function getRecipeRoot(
    userId: string | Types.ObjectId,
    recipeId: string | Types.ObjectId,
  ): Promise<IRecipeLean | null> {
    let current = await Recipe.findOne({
      _id: new Types.ObjectId(recipeId as string),
      userId: new Types.ObjectId(userId as string),
    })
      .lean()
      .exec();
    if (!current) return null;
    while (current?.parentId) {
      const parent = await Recipe.findOne({
        _id: current.parentId,
        userId: new Types.ObjectId(userId as string),
      })
        .lean()
        .exec();
      if (!parent) break;
      current = parent as IRecipeLean & { parentId?: Types.ObjectId };
    }
    if (!current) return null;
    const variationCount = await Recipe.countDocuments({
      parentId: current._id,
    }).exec();
    const votes = await RecipeVote.find({ recipeId: current._id }).lean().exec();
    const score = votes.reduce((sum, v) => sum + v.value, 0);
    const userVoteDoc = votes.find(
      (v) => v.userId.toString() === (userId as string).toString(),
    );
    const userVote = userVoteDoc ? userVoteDoc.value : undefined;
    return {
      ...current,
      variationCount,
      score,
      userVote,
    } as IRecipeLean;
  }

  async function getRecipe(
    userId: string | Types.ObjectId,
    recipeId: string | Types.ObjectId,
  ): Promise<IRecipeLean | null> {
    const recipe = await Recipe.findOne({
      _id: new Types.ObjectId(recipeId as string),
      userId: new Types.ObjectId(userId as string),
    })
      .lean()
      .exec();
    if (!recipe) return null;

    const variationCount = await Recipe.countDocuments({
      parentId: recipe._id,
    }).exec();
    const votes = await RecipeVote.find({ recipeId: recipe._id }).lean().exec();
    const score = votes.reduce((sum, v) => sum + v.value, 0);
    const userVoteDoc = votes.find(
      (v) => v.userId.toString() === (userId as string).toString(),
    );
    const userVote = userVoteDoc ? userVoteDoc.value : undefined;

    return {
      ...recipe,
      variationCount,
      score,
      userVote,
    } as IRecipeLean;
  }

  async function createRecipe(data: {
    userId: string | Types.ObjectId;
    parentId?: string | Types.ObjectId | null;
    variationNote?: string;
    objective?: string;
    emoji?: string;
    title: string;
    description?: string;
    portions?: number;
    duration?: IRecipeDuration;
    ingredients?: IRecipeIngredient[];
    steps?: IRecipeStep[];
    equipment?: string[];
    tags?: string[];
    dishType?: 'entree' | 'plat' | 'dessert';
    cuisineType?: string[];
    diet?: string[];
    imageUrl?: string;
    restTimeMinutes?: number;
    maxStorageDays?: number;
  }): Promise<IRecipe> {
    const doc = await Recipe.create({
      ...data,
      userId: new Types.ObjectId(data.userId as string),
      parentId: data.parentId ? new Types.ObjectId(data.parentId as string) : null,
      ingredients: data.ingredients ?? [],
      steps: data.steps ?? [],
      equipment: data.equipment ?? [],
      tags: data.tags ?? [],
      cuisineType: data.cuisineType ?? [],
      diet: data.diet ?? [],
    });
    return doc as IRecipe;
  }

  async function updateRecipe(
    userId: string | Types.ObjectId,
    recipeId: string | Types.ObjectId,
    data: Partial<{
      variationNote: string;
      objective: string;
      emoji: string;
      title: string;
      description: string;
      portions: number;
      duration: IRecipeDuration;
      ingredients: IRecipeIngredient[];
      steps: IRecipeStep[];
      equipment: string[];
      tags: string[];
      dishType: 'entree' | 'plat' | 'dessert';
      cuisineType: string[];
      diet: string[];
      imageUrl: string;
      images: Array<{ url: string; source: 'ai' | 'upload' }>;
      parentId: string | Types.ObjectId | null;
      restTimeMinutes?: number;
      maxStorageDays?: number;
    }>,
  ): Promise<IRecipe | null> {
    const updated = await Recipe.findOneAndUpdate(
      { _id: new Types.ObjectId(recipeId as string), userId: new Types.ObjectId(userId as string) },
      { $set: data },
      { new: true },
    ).exec();
    return updated as IRecipe | null;
  }

  async function deleteRecipe(
    userId: string | Types.ObjectId,
    recipeId: string | Types.ObjectId,
  ): Promise<boolean> {
    const result = await Recipe.findOneAndDelete({
      _id: new Types.ObjectId(recipeId as string),
      userId: new Types.ObjectId(userId as string),
    }).exec();
    if (result) {
      await RecipeVote.deleteMany({ recipeId: new Types.ObjectId(recipeId as string) }).exec();
      await Recipe.deleteMany({ parentId: new Types.ObjectId(recipeId as string) }).exec();
    }
    return !!result;
  }

  async function getRecipeFamily(
    userId: string | Types.ObjectId,
    rootId: string | Types.ObjectId,
  ): Promise<RecipeListResult> {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'recipe.ts:getRecipeFamily entry',
        message: 'getRecipeFamily entry',
        data: { rootId: String(rootId), userId: String(userId) },
        timestamp: Date.now(),
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    const rootObjId = new Types.ObjectId(rootId as string);
    const userIdObj = new Types.ObjectId(userId as string);

    const root = await Recipe.findOne({
      _id: rootObjId,
      userId: userIdObj,
    })
      .lean()
      .exec();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'recipe.ts:getRecipeFamily after root',
        message: 'after root',
        data: { hasRoot: !!root },
        timestamp: Date.now(),
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    if (!root) return { recipes: [] };

    const [withDescendants] = await Recipe.aggregate([
      { $match: { _id: rootObjId, userId: userIdObj } },
      {
        $graphLookup: {
          from: 'recipes',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'descendants',
          restrictSearchWithMatch: { userId: userIdObj },
        },
      },
      {
        $project: {
          descendants: 1,
        },
      },
    ]).exec();

    const descendants = (withDescendants?.descendants ?? []) as IRecipeLean[];
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'recipe.ts:getRecipeFamily after graphLookup',
        message: 'after graphLookup',
        data: { descendantsCount: descendants?.length },
        timestamp: Date.now(),
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion

    const pipeline: Record<string, unknown>[] = [
      {
        $match: {
          userId: userIdObj,
          $or: [
            { _id: rootObjId },
            { _id: { $in: descendants.map((d) => d._id) } },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'recipes',
          localField: '_id',
          foreignField: 'parentId',
          as: 'variations',
        },
      },
      { $addFields: { variationCount: { $size: '$variations' } } },
      {
        $lookup: {
          from: 'recipevotes',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'votes',
        },
      },
      { $addFields: { score: { $sum: '$votes.value' } } },
      {
        $lookup: {
          from: 'recipevotes',
          let: { rid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$recipeId', '$$rid'] },
                    { $eq: ['$userId', userIdObj] },
                  ],
                },
              },
            },
            { $project: { value: 1 } },
          ],
          as: 'userVoteArr',
        },
      },
      { $addFields: { userVote: { $arrayElemAt: ['$userVoteArr.value', 0] } } },
      { $project: { variations: 0, votes: 0, userVoteArr: 0 } },
    ];
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'recipe.ts:getRecipeFamily before second aggregate',
        message: 'before second aggregate',
        data: { pipelineLength: pipeline?.length },
        timestamp: Date.now(),
        hypothesisId: 'D',
      }),
    }).catch(() => {});
    // #endregion

    const allRecipes = (await Recipe.aggregate(pipeline).exec()) as IRecipeLean[];
    const byCreation = [...allRecipes].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
    return { recipes: byCreation };
  }

  return {
    getRecipes,
    getRecipe,
    getRecipeRoot,
    getRecipeFamily,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type RecipeMethods = ReturnType<typeof createRecipeMethods>;
