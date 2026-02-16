import realizationSchema from '~/schema/realization';
import type { IRealization } from '~/types/realization';

export function createRealizationModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.Realization ||
    mongoose.model<IRealization>('Realization', realizationSchema)
  );
}
