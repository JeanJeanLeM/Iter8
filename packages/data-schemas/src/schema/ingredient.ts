import { Schema } from 'mongoose';
import type { IIngredient } from '~/types/ingredient';

const nutritionMicrosSchema = new Schema(
  {
    sodiumMg: { type: Number },
    calciumMg: { type: Number },
    ironMg: { type: Number },
    potassiumMg: { type: Number },
    vitaminCMg: { type: Number },
    vitaminARaeUg: { type: Number },
    vitaminDIu: { type: Number },
    folateUg: { type: Number },
    vitaminB12Ug: { type: Number },
    zincMg: { type: Number },
    seleniumUg: { type: Number },
    magnesiumMg: { type: Number },
  },
  { _id: false },
);

const ingredientSchema: Schema<IIngredient> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    energyKcal: { type: Number },
    proteinG: { type: Number },
    fatG: { type: Number },
    carbohydrateG: { type: Number },
    fiberG: { type: Number },
    nutritionMicros: { type: nutritionMicrosSchema },
    usdaFdcId: { type: Schema.Types.Mixed },
    usdaDescription: { type: String, trim: true },
  },
  { timestamps: true },
);

ingredientSchema.index({ name: 1 });

export default ingredientSchema;
