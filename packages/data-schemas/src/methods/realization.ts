import { Types } from 'mongoose';
import type { PipelineStage } from 'mongoose';
import type {
  IRealizationWithRecipe,
  IRealizationLean,
  GetRealizationsParams,
  RealizationListResult,
  CreateRealizationParams,
} from '~/types/realization';
import type { IRecipeLean } from '~/types/recipe';

export function createRealizationMethods(mongoose: typeof import('mongoose')) {
  const Realization = mongoose.models.Realization;
  const Recipe = mongoose.models.Recipe;

  const defaultSort: GetRealizationsParams['sort'] = 'realizedAtDesc';

  async function getRealizations(
    params: GetRealizationsParams,
  ): Promise<RealizationListResult> {
    const {
      userId,
      recipeId,
      fromDate,
      toDate,
      sort = defaultSort,
    } = params;

    const userIdObj = new Types.ObjectId(userId as string);
    const match: Record<string, unknown> = { userId: userIdObj };
    if (recipeId) {
      match.recipeId = new Types.ObjectId(recipeId as string);
    }
    if (fromDate) {
      match.realizedAt = match.realizedAt || {};
      (match.realizedAt as Record<string, Date>).$gte = fromDate;
    }
    if (toDate) {
      match.realizedAt = match.realizedAt || {};
      (match.realizedAt as Record<string, Date>).$lte = toDate;
    }

    const sortDir = sort === 'realizedAtAsc' ? 1 : -1;
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { realizedAt: sortDir } },
      {
        $lookup: {
          from: 'recipes',
          localField: 'recipeId',
          foreignField: '_id',
          as: 'recipeDoc',
        },
      },
      {
        $unwind: {
          path: '$recipeDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          recipeTitle: '$recipeDoc.title',
          recipeImageUrl: '$recipeDoc.imageUrl',
          recipeEmoji: '$recipeDoc.emoji',
          recipeParentId: '$recipeDoc.parentId',
          variationNote: '$recipeDoc.variationNote',
        },
      },
      {
        $project: {
          recipeDoc: 0,
        },
      },
    ];

    const docs = (await Realization.aggregate(pipeline).exec()) as IRealizationWithRecipe[];
    return { realizations: docs };
  }

  async function getRealization(
    userId: string | Types.ObjectId,
    realizationId: string | Types.ObjectId,
  ): Promise<IRealizationWithRecipe | null> {
    const doc = (await Realization.findOne({
      _id: new Types.ObjectId(realizationId as string),
      userId: new Types.ObjectId(userId as string),
    })
      .lean()
      .exec()) as IRealizationLean | null;
    if (!doc) return null;

    const recipe = (await Recipe.findById(doc.recipeId)
      .lean()
      .exec()) as IRecipeLean | null;
    return {
      ...doc,
      recipeTitle: recipe?.title,
      recipeImageUrl: recipe?.imageUrl,
      recipeEmoji: recipe?.emoji,
      recipeParentId: recipe?.parentId ?? null,
      variationNote: recipe?.variationNote,
    } as IRealizationWithRecipe;
  }

  async function createRealization(
    data: CreateRealizationParams,
  ): Promise<IRealizationLean> {
    const userIdObj = new Types.ObjectId(data.userId as string);
    const recipeIdObj = new Types.ObjectId(data.recipeId as string);

    const recipe = await Recipe.findOne({
      _id: recipeIdObj,
      userId: userIdObj,
    }).exec();
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const realizedAt = data.realizedAt ?? new Date();
    const doc = await Realization.create({
      userId: userIdObj,
      recipeId: recipeIdObj,
      realizedAt,
      comment: data.comment ?? undefined,
    });
    return doc.toObject() as IRealizationLean;
  }

  async function deleteRealization(
    userId: string | Types.ObjectId,
    realizationId: string | Types.ObjectId,
  ): Promise<boolean> {
    const result = await Realization.findOneAndDelete({
      _id: new Types.ObjectId(realizationId as string),
      userId: new Types.ObjectId(userId as string),
    }).exec();
    return !!result;
  }

  return {
    getRealizations,
    getRealization,
    createRealization,
    deleteRealization,
  };
}

export type RealizationMethods = ReturnType<typeof createRealizationMethods>;
