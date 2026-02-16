import { atomWithLocalStorage } from './utils';

const STORAGE_KEY = 'librechat_recipe_carousel_display_mode';

export type CarouselDisplayMode = 'ancestor' | 'branch';

/**
 * Display mode for RecipeFamilyCarousel:
 * - ancestor: show root + all descendants (full lineage)
 * - branch: show parent + siblings only (no nieces/grandchildren)
 */
export const carouselDisplayMode = atomWithLocalStorage<CarouselDisplayMode>(
  STORAGE_KEY,
  'branch',
);
