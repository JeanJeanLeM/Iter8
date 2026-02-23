import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDocumentTitle, useLocalize, useNewConvo } from '~/hooks';
import {
  useRecipeQuery,
  useRecipesQuery,
  useRecipeRootQuery,
  useRecipeFamilyQuery,
  useRecipeAiImagesQuery,
  useUpdateRecipeMutation,
  useGenerateRecipeImageMutation,
} from '~/data-provider';
import { Spinner, Button, OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  ChefHat,
  Euro,
  Share2,
  List,
  LayoutGrid,
  CookingPot,
  UtensilsCrossed,
  MessageCircle,
  HelpCircle,
  Carrot,
  ImagePlus,
  Sparkles,
  Link2,
  Images,
  Smartphone,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AlertCircle,
} from 'lucide-react';
import type { TRecipeIngredient, TRecipeDuration } from 'librechat-data-provider';
import type { TRecipeStep } from 'librechat-data-provider';
import { useGetUserQuery } from '~/data-provider';
import {
  formatIngredient as formatIngredientUtil,
  formatExactQuantity,
  getOptimalInitialPortions,
  type FormattedIngredient,
} from '~/utils/recipeIngredients';
import RecipeVoteButtons from './RecipeVoteButtons';
import RecipeCard from './RecipeCard';
import RecipeVariationsCarousel from './RecipeVariationsCarousel';
import ParentRecipeSelectorModal from './ParentRecipeSelectorModal';
import { useConversationsMentioningRecipe } from '~/hooks/Recipes/useConversationsMentioningRecipe';
import { useSetRecoilState } from 'recoil';
import { selectedRecipeForVariation } from '~/store';
import { cn } from '~/utils';

function formatDurationMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function parseDuration(duration?: TRecipeDuration): {
  total?: number;
  prep?: number;
  cook?: number;
  rest?: number;
} {
  if (duration == null) return {};
  if (typeof duration === 'number') return { total: duration };
  return {
    total: duration.total,
    prep: duration.prep,
    cook: duration.cook,
    rest: (duration as { rest?: number }).rest,
  };
}

interface StepIngredientOptions {
  ratio: number;
  unitSystem: 'si' | 'american';
  showGrams: boolean;
}

/**
 * Returns ingredients used in this step with their scaled quantity for display.
 * Uses step.ingredientsUsed if present, otherwise detects names from instruction.
 */
function getIngredientsForStep(
  step: TRecipeStep,
  allIngredients: TRecipeIngredient[],
  options: StepIngredientOptions,
): Array<{ ing: TRecipeIngredient; display: string }> {
  const { ratio, unitSystem, showGrams } = options;
  const out: Array<{ ing: TRecipeIngredient; display: string }> = [];
  const instructionLower = step.instruction.toLowerCase();
  const fmt = (ing: TRecipeIngredient) => {
    const r = formatIngredientUtil(ing, { ratio, unitSystem, showGrams });
    const capName = ing.name.trim().charAt(0).toUpperCase() + ing.name.trim().slice(1).toLowerCase();
    const text = r.displayText.replace(ing.name.trim(), capName);
    return r.gramEquivalent ? `${text} ${r.gramEquivalent}` : text;
  };

  if (step.ingredientsUsed?.length) {
    for (const usedName of step.ingredientsUsed) {
      const nameNorm = usedName.trim().toLowerCase();
      const ing = allIngredients.find(
        (i) => i.name.trim().toLowerCase() === nameNorm,
      );
      if (ing) out.push({ ing, display: fmt(ing) });
    }
    return out;
  }

  const byLength = [...allIngredients]
    .filter((i) => i.name.trim().length > 0)
    .sort((a, b) => b.name.trim().length - a.name.trim().length);
  for (const ing of byLength) {
    const nameNorm = ing.name.trim().toLowerCase();
    if (instructionLower.includes(nameNorm)) out.push({ ing, display: fmt(ing) });
  }
  return out;
}

const RELATED_LIMIT = 3;

export default function RecipeDetailView() {
  const localize = useLocalize();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user } = useGetUserQuery();
  const { data: recipe, isLoading, isError } = useRecipeQuery(id ?? null);
  const unitSystem =
    user?.personalization?.unitSystem === 'american' ? 'american' : 'si';
  const showIngredientGrams = user?.personalization?.showIngredientGrams ?? false;
  const parentId = recipe?.parentId ? String(recipe.parentId) : null;
  const { data: parentData } = useRecipeQuery(parentId);
  const parentRecipe = parentData ?? null;
  // Root of current recipe (V0): for carousel we show root + all descendants (multi-level)
  const { data: rootRecipe } = useRecipeRootQuery(id ?? null);
  const rootId = useMemo(() => {
    if (!recipe) return null;
    if (!recipe.parentId) return recipe._id;
    return rootRecipe?._id ?? null;
  }, [recipe?.parentId, recipe?._id, rootRecipe?._id]);
  const { data: familyData } = useRecipeFamilyQuery(rootId);
  // Carousel: root (V0) + all descendants (V0.1, V0.1.1, V0.1.1.1, …). Order: root first, then by depth, then createdAt.
  const carouselItems = useMemo(() => {
    const list = familyData?.recipes ?? [];
    if (list.length === 0 || !rootId) return [];
    const byId = new Map(list.map((r) => [r._id, r]));
    const depth = (rid: string): number => {
      const r = byId.get(rid);
      if (!r || !r.parentId) return 0;
      return 1 + depth(String(r.parentId));
    };
    const sorted = [...list].sort((a, b) => {
      if (a._id === rootId) return -1;
      if (b._id === rootId) return 1;
      const d = depth(a._id) - depth(b._id);
      if (d !== 0) return d;
      return (
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    });
    return sorted.map((r) => ({
      recipe: r,
      isParent: r._id === rootId,
    }));
  }, [familyData?.recipes, rootId]);

  const [portionsChosen, setPortionsChosen] = useState(1);
  const [ingredientsViewMode, setIngredientsViewMode] = useState<'grid' | 'list'>('grid');
  const [objectiveExpanded, setObjectiveExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [changeParentModalOpen, setChangeParentModalOpen] = useState(false);
  const [imageGalleryModalOpen, setImageGalleryModalOpen] = useState<'none' | 'all' | 'ai'>('none');
  const [aiGalleryPage, setAiGalleryPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recipe?.portions != null && recipe?.ingredients?.length != null) {
      setPortionsChosen(getOptimalInitialPortions(recipe));
    }
  }, [recipe?._id, recipe?.portions, recipe?.ingredients?.length]);

  const updateRecipeMutation = useUpdateRecipeMutation();
  const generateRecipeImageMutation = useGenerateRecipeImageMutation();
  const { newConversation } = useNewConvo();
  const setSelectedRecipeForVariation = useSetRecoilState(selectedRecipeForVariation);
  const { conversations, isLoading: conversationsLoading } =
    useConversationsMentioningRecipe(recipe?._id, recipe?.conversationId);

  const { data: aiImagesData, isLoading: aiImagesLoading } = useRecipeAiImagesQuery(
    recipe?._id ?? null,
    aiGalleryPage,
    imageGalleryModalOpen === 'ai',
    10,
  );

  const recipeImages = useMemo(() => {
    if (!recipe) return [];
    if (Array.isArray(recipe.images) && recipe.images.length > 0) return recipe.images;
    if (recipe.imageUrl) return [{ url: recipe.imageUrl, source: 'upload' as const }];
    return [];
  }, [recipe?.images, recipe?.imageUrl]);
  const parentImages = useMemo(() => {
    if (!parentRecipe) return [];
    if (Array.isArray(parentRecipe.images) && parentRecipe.images.length > 0) return parentRecipe.images;
    if (parentRecipe.imageUrl) return [{ url: parentRecipe.imageUrl, source: 'upload' as const }];
    return [];
  }, [parentRecipe?.images, parentRecipe?.imageUrl]);
  const displayImages = useMemo(() => {
    if (recipeImages.length > 0) return recipeImages;
    if (recipe?.parentId && parentImages.length > 0) return parentImages;
    return [];
  }, [recipeImages, recipe?.parentId, parentImages]);
  const isDisplayingParentImage = recipeImages.length === 0 && !!recipe?.parentId && parentImages.length > 0;
  const hasAiImage = recipeImages.some((img) => img.source === 'ai');
  const aiImagesOnly = useMemo(
    () => recipeImages.filter((img) => img.source === 'ai'),
    [recipeImages],
  );
  const canAddAiImage = !hasAiImage && !generateRecipeImageMutation.isLoading;
  const galleryImages =
    imageGalleryModalOpen === 'ai' ? aiImagesOnly : recipeImages;
  const galleryRecipeIndices = useMemo(
    () =>
      imageGalleryModalOpen === 'ai'
        ? recipeImages
            .map((img, i) => (img.source === 'ai' ? i : -1))
            .filter((i) => i >= 0)
        : recipeImages.map((_, i) => i),
    [recipeImages, imageGalleryModalOpen],
  );
  const currentImage = displayImages[currentImageIndex];
  const imageCount = displayImages.length;
  useEffect(() => {
    setCurrentImageIndex((i) => (imageCount ? Math.min(i, imageCount - 1) : 0));
  }, [imageCount]);

  const portionsRef = recipe?.portions ?? 1;
  const ratio = portionsRef > 0 ? portionsChosen / portionsRef : 1;

  const timing = useMemo(() => parseDuration(recipe?.duration), [recipe?.duration]);
  const sortedSteps = useMemo(() => {
    if (!recipe?.steps?.length) return [];
    return [...recipe.steps].sort((a, b) => a.order - b.order);
  }, [recipe?.steps]);
  const scaledIngredients = useMemo((): FormattedIngredient[] => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ing) =>
      formatIngredientUtil(ing, { ratio, unitSystem, showIngredientGrams }),
    );
  }, [recipe?.ingredients, ratio, unitSystem, showIngredientGrams]);

  const relatedFilters = useMemo(
    () => ({
      parentsOnly: true,
      ...(recipe?.dishType ? { dishType: recipe.dishType } : {}),
    }),
    [recipe?.dishType],
  );
  const { data: relatedData } = useRecipesQuery(relatedFilters);
  const relatedRecipes = useMemo(() => {
    const list = relatedData?.recipes ?? [];
    return list.filter((r) => r._id !== id).slice(0, RELATED_LIMIT);
  }, [relatedData?.recipes, id]);

  useDocumentTitle(recipe ? `${recipe.title} | ${localize('com_ui_recipe_book')}` : localize('com_ui_recipe_book'));

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: recipe?.title ?? '', url }).catch(() => copyUrl(url));
    } else {
      copyUrl(url);
    }
  };

  const handleOpenInNewChat = () => {
    if (!recipe) return;
    setSelectedRecipeForVariation({
      recipeId: recipe._id,
      title: recipe.title,
      parentId: recipe.parentId ? String(recipe.parentId) : null,
      recipeData: {
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        description: recipe.description,
        duration: recipe.duration,
        tags: recipe.tags,
        equipment: recipe.equipment,
      },
    });
    newConversation();
  };

  const handleImageFromDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recipe) return;
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newImages = [...recipeImages, { url: dataUrl, source: 'upload' as const }];
      updateRecipeMutation.mutate(
        {
          id: recipe._id,
          data: { images: newImages, imageUrl: newImages[0].url },
        },
        { onError: () => {} },
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddImageFromDevice = () => {
    fileInputRef.current?.click();
  };

  const handleSetAsMainByIndex = (imageIndex: number) => {
    if (!recipe || recipeImages.length <= 1 || imageIndex === 0) return;
    const reordered = [
      recipeImages[imageIndex],
      ...recipeImages.slice(0, imageIndex),
      ...recipeImages.slice(imageIndex + 1),
    ];
    updateRecipeMutation.mutate({
      id: recipe._id,
      data: { images: reordered, imageUrl: reordered[0].url },
    });
    setCurrentImageIndex(0);
    setImageGalleryModalOpen('none');
  };

  const handleAddImageByAI = () => {
    if (!recipe || !canAddAiImage) return;
    generateRecipeImageMutation.mutate(recipe._id);
  };

  const handleUseParentImage = () => {
    if (!recipe || parentImages.length === 0) return;
    updateRecipeMutation.mutate({
      id: recipe._id,
      data: { images: parentImages, imageUrl: parentImages[0].url },
    });
  };

  const handleSetAsMainImage = () => {
    if (!recipe || recipeImages.length <= 1 || currentImageIndex === 0) return;
    const reordered = [
      recipeImages[currentImageIndex],
      ...recipeImages.slice(0, currentImageIndex),
      ...recipeImages.slice(currentImageIndex + 1),
    ];
    updateRecipeMutation.mutate({
      id: recipe._id,
      data: { images: reordered, imageUrl: reordered[0].url },
    });
    setCurrentImageIndex(0);
  };

  /** Add a global AI image to the current recipe and close the AI gallery modal. */
  const handleSelectGlobalAiImage = (url: string) => {
    if (!recipe) return;
    const newImages = [...recipeImages, { url, source: 'ai' as const }];
    updateRecipeMutation.mutate(
      {
        id: recipe._id,
        data: { images: newImages, imageUrl: url },
      },
      { onSuccess: () => setImageGalleryModalOpen('none') },
    );
  };

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      // Could add a small toast
    });
  }

  if (!id) {
    navigate('/r', { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-primary">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-primary p-4">
        <p className="text-text-secondary">{localize('com_ui_recipe_not_found')}</p>
        <Link to="/r" className="text-text-primary hover:underline">
          {localize('com_ui_recipe_back_to_book')}
        </Link>
      </div>
    );
  }

  const totalTimeLabel =
    timing.total != null
      ? formatDurationMinutes(timing.total)
      : timing.prep != null || timing.cook != null
        ? [timing.prep, timing.cook].filter(Boolean).map(formatDurationMinutes).join(' + ')
        : null;

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 flex flex-shrink-0 items-center gap-2 border-b border-border-medium bg-surface-primary px-4 py-3">
        <Link
          to="/r"
          className="flex shrink-0 items-center gap-1 text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">{localize('com_ui_recipe_back_to_book')}</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {/* Title + rating */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{recipe.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              {(recipe.score ?? 0).toFixed(1)}/5
            </span>
            <RecipeVoteButtons
              recipeId={recipe._id}
              score={recipe.score ?? 0}
              userVote={recipe.userVote}
            />
          </div>
          {/* Unroll: objective (parent) or variationNote (variation) */}
          {((recipe.parentId && recipe.variationNote) || (!recipe.parentId && (recipe.objective ?? recipe.description))) && (
            <div className="mt-3 rounded-lg border border-border-medium bg-surface-primary-alt p-2">
              <button
                type="button"
                onClick={() => setObjectiveExpanded((e) => !e)}
                className="flex w-full items-center gap-2 text-left text-sm text-text-secondary hover:text-text-primary"
              >
                {objectiveExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>
                  {recipe.parentId
                    ? localize('com_ui_recipe_variation_reason')
                    : localize('com_ui_recipe_objective')}
                </span>
              </button>
              {objectiveExpanded && (
                <p className="mt-2 whitespace-pre-wrap pl-6 text-sm text-text-primary">
                  {recipe.parentId ? recipe.variationNote : (recipe.objective ?? recipe.description ?? '')}
                </p>
              )}
            </div>
          )}
          {/* Parent recipe link + change parent (when this is a variation) */}
          {recipe.parentId && parentId && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2">
              <span className="text-sm text-text-secondary">
                {localize('com_ui_recipe_parent_recipe')}:
              </span>
              {parentRecipe ? (
                <Link
                  to={`/r/${parentId}`}
                  className="text-sm font-medium text-text-primary underline hover:no-underline"
                >
                  {parentRecipe.title}
                </Link>
              ) : (
                <span className="text-sm text-text-secondary">
                  {localize('com_ui_recipe_loading')}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangeParentModalOpen(true)}
                className="gap-1.5"
              >
                <Link2 className="h-4 w-4" />
                {localize('com_ui_recipe_change_parent_link')}
              </Button>
            </div>
          )}
          {/* Link to a parent when this recipe is currently a "mother" (no parent) */}
          {!recipe.parentId && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2">
              <span className="text-sm text-text-secondary">
                {localize('com_ui_recipe_no_parent')}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangeParentModalOpen(true)}
                className="gap-1.5"
              >
                <Link2 className="h-4 w-4" />
                {localize('com_ui_recipe_link_to_parent')}
              </Button>
            </div>
          )}
        </div>

        <ParentRecipeSelectorModal
          open={changeParentModalOpen}
          onOpenChange={setChangeParentModalOpen}
          conversationId={null}
          mode="change-parent"
          recipeIdToUpdate={recipe._id}
          showUnlink={!!recipe.parentId}
          onParentChanged={(newParentId) => {
            updateRecipeMutation.mutate({
              id: recipe._id,
              data: { parentId: newParentId },
            });
          }}
        />

        {/* Variations carousel (parent + variations) */}
        {carouselItems.length > 0 && (
          <RecipeVariationsCarousel items={carouselItems} />
        )}

        {/* Recipe image gallery */}
        <section className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            onChange={handleImageFromDevice}
          />
          <div className="relative">
            {/* Loading overlay when generating AND we already have an image to cover */}
            {generateRecipeImageMutation.isLoading && (currentImage || isDisplayingParentImage) && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-black/50 dark:bg-black/60 backdrop-blur-sm"
                aria-live="polite"
                role="status"
                aria-label={localize('com_ui_recipe_image_generating')}
              >
                <Spinner className="h-14 w-14 text-white" />
                <span className="text-base font-semibold text-white">
                  {localize('com_ui_recipe_image_generating')}
                </span>
                <span className="text-sm text-white/90">
                  {localize('com_ui_recipe_image_generating_hint')}
                </span>
              </div>
            )}
            {currentImage ? (
              <>
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface-active-alt">
                  <img
                    src={currentImage.url}
                    alt={recipe.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                {imageCount > 1 && (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-b-lg border border-t-0 border-border-medium bg-surface-primary-alt px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex((i) => Math.max(0, i - 1))}
                      disabled={currentImageIndex === 0}
                      className="rounded p-1 text-text-primary hover:bg-surface-active disabled:opacity-50"
                      aria-label={localize('com_ui_recipe_image_prev')}
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="flex items-center gap-2 text-sm text-text-secondary">
                      {currentImageIndex + 1} / {imageCount}
                      {currentImage.source === 'ai' && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {localize('com_ui_recipe_image_source_ai')}
                        </span>
                      )}
                      {currentImage.source === 'upload' && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          {localize('com_ui_recipe_image_source_upload')}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentImageIndex((i) => Math.min(imageCount - 1, i + 1))
                      }
                      disabled={currentImageIndex === imageCount - 1}
                      className="rounded p-1 text-text-primary hover:bg-surface-active disabled:opacity-50"
                      aria-label={localize('com_ui_recipe_image_next')}
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
                {recipeImages.length > 1 && currentImageIndex > 0 && (
                  <div className="mt-1 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSetAsMainImage}
                      disabled={updateRecipeMutation.isLoading}
                    >
                      {localize('com_ui_recipe_image_set_as_main')}
                    </Button>
                  </div>
                )}
              </>
            ) : isDisplayingParentImage ? (
              <div className="flex flex-col gap-2">
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface-active-alt">
                  <img
                    src={displayImages[0]?.url}
                    alt={parentRecipe?.title ?? ''}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-center text-sm text-text-secondary">
                  {localize('com_ui_recipe_image_from_parent')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseParentImage}
                  disabled={updateRecipeMutation.isLoading}
                  className="self-center"
                >
                  {localize('com_ui_recipe_use_parent_image')}
                </Button>
              </div>
            ) : generateRecipeImageMutation.isLoading ? (
              /* No image yet: show loading state directly in the placeholder so it's always visible on web */
              <div
                className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border-medium bg-surface-active-alt"
                role="status"
                aria-live="polite"
                aria-label={localize('com_ui_recipe_image_generating')}
              >
                <Spinner className="h-16 w-16 text-text-primary" />
                <span className="text-base font-semibold text-text-primary">
                  {localize('com_ui_recipe_image_generating')}
                </span>
                <span className="text-sm text-text-secondary">
                  {localize('com_ui_recipe_image_generating_hint')}
                </span>
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-medium bg-surface-active-alt text-text-secondary">
                <span>{localize('com_ui_recipe_no_image')}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImageFromDevice}
              disabled={updateRecipeMutation.isLoading || generateRecipeImageMutation.isLoading}
              className="flex items-center gap-2"
              title={localize('com_ui_recipe_image_device_permission')}
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              {localize('com_ui_recipe_image_from_device')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImageGalleryModalOpen('all')}
              disabled={
                updateRecipeMutation.isLoading ||
                generateRecipeImageMutation.isLoading ||
                recipeImages.length === 0
              }
              className="flex items-center gap-2"
              title={localize('com_ui_recipe_image_gallery_tooltip')}
            >
              <Images className="h-4 w-4 shrink-0" />
              {localize('com_ui_recipe_image_gallery')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAiGalleryPage(1);
                setImageGalleryModalOpen('ai');
              }}
              disabled={
                updateRecipeMutation.isLoading || generateRecipeImageMutation.isLoading
              }
              className="flex items-center gap-2"
              title={localize('com_ui_recipe_image_ai_gallery_tooltip')}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              {localize('com_ui_recipe_image_ai_gallery')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImageByAI}
              disabled={!canAddAiImage || generateRecipeImageMutation.isLoading}
              aria-busy={generateRecipeImageMutation.isLoading}
              aria-label={
                generateRecipeImageMutation.isLoading
                  ? localize('com_ui_recipe_image_generating')
                  : localize('com_ui_recipe_image_ai')
              }
              className={cn(
                'flex items-center gap-2',
                generateRecipeImageMutation.isLoading &&
                  'ring-2 ring-amber-500/70 ring-offset-2 ring-offset-surface-primary dark:ring-offset-surface-primary',
              )}
              title={
                generateRecipeImageMutation.isLoading
                  ? localize('com_ui_recipe_image_generating')
                  : hasAiImage
                    ? localize('com_ui_recipe_image_ai_already')
                    : localize('com_ui_recipe_image_ai_coming')
              }
            >
              {generateRecipeImageMutation.isLoading ? (
                <Spinner className="h-4 w-4 shrink-0" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" />
              )}
              {generateRecipeImageMutation.isLoading
                ? localize('com_ui_recipe_image_ai_generating')
                : localize('com_ui_recipe_image_ai')}
            </Button>
          </div>

          {/* Modal: Galerie (current recipe) / Galerie IA (all user AI images, paginated) */}
          <OGDialog
            open={imageGalleryModalOpen !== 'none'}
            onOpenChange={(open) => !open && setImageGalleryModalOpen('none')}
          >
            <OGDialogContent className="max-w-lg">
              <OGDialogTitle>
                {imageGalleryModalOpen === 'ai'
                  ? localize('com_ui_recipe_image_ai_gallery')
                  : localize('com_ui_recipe_image_gallery')}
              </OGDialogTitle>
              {imageGalleryModalOpen === 'ai' ? (
                <>
                  {aiImagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-10 w-10 text-text-primary" />
                    </div>
                  ) : !aiImagesData?.images?.length ? (
                    <p className="py-4 text-center text-sm text-text-secondary">
                      {localize('com_ui_recipe_image_ai_gallery_global_empty')}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {aiImagesData.images.map((img, i) => (
                          <button
                            key={`${img.url}-${img.recipeId}-${i}`}
                            type="button"
                            onClick={() => handleSelectGlobalAiImage(img.url)}
                            disabled={updateRecipeMutation.isLoading}
                            className="relative aspect-video overflow-hidden rounded-lg border-2 border-border-medium bg-surface-active-alt transition hover:border-green-500/50"
                          >
                            <img
                              src={img.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                              {img.recipeTitle || ''}
                            </span>
                          </button>
                        ))}
                      </div>
                      {aiImagesData.totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAiGalleryPage((p) => Math.max(1, p - 1))}
                            disabled={aiGalleryPage <= 1}
                            className="gap-1"
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                            {localize('com_ui_recipe_image_prev')}
                          </Button>
                          <span className="text-sm text-text-secondary">
                            {localize('com_ui_recipe_image_page', {
                              page: String(aiGalleryPage),
                              total: String(aiImagesData.totalPages),
                            })}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAiGalleryPage((p) =>
                                Math.min(aiImagesData.totalPages, p + 1),
                              )
                            }
                            disabled={aiGalleryPage >= aiImagesData.totalPages}
                            className="gap-1"
                          >
                            {localize('com_ui_recipe_image_next')}
                            <ChevronRightIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : galleryImages.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-secondary">
                  {localize('com_ui_recipe_image_gallery_empty')}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryImages.map((img, i) => {
                    const recipeIndex = galleryRecipeIndices[i];
                    const isMain = recipeIndex === 0;
                    return (
                      <button
                        key={`${img.url}-${i}`}
                        type="button"
                        onClick={() => !isMain && handleSetAsMainByIndex(recipeIndex)}
                        disabled={isMain || updateRecipeMutation.isLoading}
                        className={cn(
                          'relative aspect-video overflow-hidden rounded-lg border-2 bg-surface-active-alt transition',
                          isMain
                            ? 'border-green-600 opacity-100'
                            : 'border-border-medium hover:border-green-500/50',
                        )}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {img.source === 'ai' && (
                          <span className="absolute right-1 top-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            {localize('com_ui_recipe_image_source_ai')}
                          </span>
                        )}
                        {isMain && (
                          <span className="absolute bottom-1 left-1 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                            {localize('com_ui_recipe_image_main_badge')}
                          </span>
                        )}
                        {!isMain && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                            {localize('com_ui_recipe_image_click_to_set_main')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </OGDialogContent>
          </OGDialog>
        </section>

        {/* Chats où cette recette est mentionnée */}
        <section className="mb-6 rounded-lg border border-border-medium bg-surface-primary-alt p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text-primary">
            <MessageCircle className="h-5 w-5 text-text-secondary" />
            {localize('com_ui_recipe_chats_mentioning')}
          </h2>
          {conversationsLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner className="h-4 w-4" />
              {localize('com_ui_loading')}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {localize('com_ui_recipe_no_chats_mentioning')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversations.map(({ id, title }) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border-medium bg-surface-primary px-3 py-2"
                >
                  <span className="truncate text-sm text-text-primary" title={title ?? id}>
                    {title ?? id}
                  </span>
                  <Link
                    to={`/c/${id}`}
                    state={{ focusChat: true }}
                    className="shrink-0 rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    {localize('com_ui_recipe_open_chat')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Petits infos: durée, difficulté, prix, partage, j'aime, portions */}
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border-medium bg-surface-primary-alt p-4">
          {totalTimeLabel && (
            <span className="flex items-center gap-2 text-sm text-text-primary">
              <Clock className="h-4 w-4 text-text-secondary" />
              {totalTimeLabel}
            </span>
          )}
          <span className="flex items-center gap-2 text-sm text-text-primary">
            <ChefHat className="h-4 w-4 text-text-secondary" />
            {localize('com_ui_recipe_difficulty')}: <span className="text-text-secondary">—</span>
          </span>
          <span className="flex items-center gap-2 text-sm text-text-primary">
            <Euro className="h-4 w-4 text-text-secondary" />
            {localize('com_ui_recipe_price')}: <span className="text-text-secondary">—</span>
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenInNewChat}
              className="flex items-center gap-1.5"
              title={localize('com_ui_recipe_open_in_new_chat')}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{localize('com_ui_recipe_open_in_new_chat')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-1.5"
              title={localize('com_ui_recipe_share')}
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">{localize('com_ui_recipe_share')}</span>
            </Button>
            <RecipeVoteButtons
              recipeId={recipe._id}
              score={recipe.score ?? 0}
              userVote={recipe.userVote}
            />
          </div>
          <span className="flex items-center gap-2 text-sm text-text-primary">
            {localize('com_ui_recipe_portions')}:{' '}
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPortionsChosen((p) => Math.max(1, p - 1))}
                className="rounded border border-border-medium bg-surface-primary px-2 py-0.5 text-text-primary hover:bg-surface-active-alt"
                aria-label="-"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center font-medium">{portionsChosen}</span>
              <button
                type="button"
                onClick={() => setPortionsChosen((p) => p + 1)}
                className="rounded border border-border-medium bg-surface-primary px-2 py-0.5 text-text-primary hover:bg-surface-active-alt"
                aria-label="+"
              >
                +
              </button>
            </span>
          </span>
        </section>

        {/* Ingrédients */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-medium pb-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
              <CookingPot className="h-5 w-5 text-text-secondary" />
              {localize('com_ui_recipe_ingredients')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {portionsChosen} {localize('com_ui_recipe_persons')}
              </span>
              <div className="flex rounded border border-border-medium bg-surface-primary-alt p-0.5">
                <button
                  type="button"
                  onClick={() => setIngredientsViewMode('grid')}
                  className={cn(
                    'rounded p-1',
                    ingredientsViewMode === 'grid'
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  title={localize('com_ui_recipe_view_gallery')}
                  aria-label="Grid"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIngredientsViewMode('list')}
                  className={cn(
                    'rounded p-1',
                    ingredientsViewMode === 'list'
                      ? 'bg-surface-active-alt text-text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  title={localize('com_ui_recipe_view_list')}
                  aria-label="List"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {ingredientsViewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {scaledIngredients.map((line, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-start gap-1 rounded-lg border border-border-medium bg-surface-primary-alt p-3 text-sm text-text-primary"
                >
                  <span className="min-w-0 flex-1">{line.displayText}</span>
                  {line.gramEquivalent && (
                    <span className="text-text-secondary">{line.gramEquivalent}</span>
                  )}
                  {line.roundedFrom != null && (
                    <span
                      className="shrink-0 text-amber-600 dark:text-amber-400"
                      title={localize('com_ui_recipe_ingredient_rounded_tooltip', {
                        exact: formatExactQuantity(line.roundedFrom),
                      })}
                      aria-label={localize('com_ui_recipe_ingredient_rounded_tooltip', {
                        exact: formatExactQuantity(line.roundedFrom),
                      })}
                    >
                      <AlertCircle className="h-4 w-4" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-inside list-disc space-y-1 rounded-lg border border-border-medium bg-surface-primary-alt p-4 text-text-primary">
              {scaledIngredients.map((line, idx) => (
                <li key={idx}>
                  {line.displayText}
                  {line.gramEquivalent && (
                    <span className="text-text-secondary"> {line.gramEquivalent}</span>
                  )}
                  {line.roundedFrom != null && (
                    <span
                      className="ml-1 inline-flex shrink-0 align-middle text-amber-600 dark:text-amber-400"
                      title={localize('com_ui_recipe_ingredient_rounded_tooltip', {
                        exact: formatExactQuantity(line.roundedFrom),
                      })}
                      aria-label={localize('com_ui_recipe_ingredient_rounded_tooltip', {
                        exact: formatExactQuantity(line.roundedFrom),
                      })}
                    >
                      <AlertCircle className="h-4 w-4" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Préparation */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
            <UtensilsCrossed className="h-5 w-5 text-text-secondary" />
            {localize('com_ui_recipe_preparation')}
          </h2>
          {(timing.prep != null || timing.cook != null || timing.total != null) && (
            <div className="mb-4 rounded-lg bg-surface-active-alt/50 px-4 py-3 text-sm text-text-secondary">
              {timing.total != null && (
                <div className="font-medium text-text-primary">
                  {localize('com_ui_recipe_total_time')}: {formatDurationMinutes(timing.total)}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-4">
                {timing.prep != null && (
                  <span>
                    {localize('com_ui_recipe_prep_time')}: {formatDurationMinutes(timing.prep)}
                  </span>
                )}
                {timing.rest != null && (
                  <span>
                    {localize('com_ui_recipe_rest_time')}: {formatDurationMinutes(timing.rest)}
                  </span>
                )}
                {timing.cook != null && (
                  <span>
                    {localize('com_ui_recipe_cook_time')}: {formatDurationMinutes(timing.cook)}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {sortedSteps.map((step, idx) => {
              const stepIngredients = getIngredientsForStep(
                step,
                recipe.ingredients ?? [],
                { ratio, unitSystem, showGrams: showIngredientGrams },
              );
              return (
                <div
                  key={step.order}
                  className="rounded-xl border border-border-medium bg-surface-primary-alt p-4 shadow-sm"
                >
                  <h3 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    {localize('com_ui_recipe_step_label', {
                      current: idx + 1,
                      total: sortedSteps.length,
                    })}
                  </h3>
                  <p className="mb-3 whitespace-pre-wrap font-medium text-text-primary">
                    {step.instruction}
                  </p>
                  {stepIngredients.length > 0 && (
                    <ul className="flex flex-col gap-1.5 border-t border-border-medium pt-3">
                      {stepIngredients.map(({ ing, display }) => (
                        <li
                          key={ing.name}
                          className="flex items-center gap-2 text-sm text-text-primary"
                        >
                          <Carrot className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                          <span>{display}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Description */}
        {recipe.description && (
          <section className="mb-8">
            <h2 className="mb-3 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
              {localize('com_ui_recipe_description')}
            </h2>
            <p className="whitespace-pre-wrap rounded-lg border border-border-medium bg-surface-primary-alt p-4 text-text-primary">
              {recipe.description}
            </p>
          </section>
        )}

        {/* Ustensiles / Equipment */}
        {recipe.equipment && recipe.equipment.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
              <CookingPot className="h-5 w-5 text-text-secondary" />
              {localize('com_ui_recipe_equipment')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {recipe.equipment.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border-medium bg-surface-primary-alt px-3 py-1.5 text-sm text-text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Vous aimerez */}
        {relatedRecipes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
              {localize('com_ui_recipe_you_might_like')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {relatedRecipes.map((r) => (
                <RecipeCard key={r._id} recipe={r} />
              ))}
            </div>
          </section>
        )}

        {/* Avis / Commentaires */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
            <MessageCircle className="h-5 w-5 text-text-secondary" />
            {localize('com_ui_recipe_comments')} (0)
          </h2>
          <div className="rounded-lg border border-border-medium bg-surface-primary-alt p-4 text-center text-sm text-text-secondary">
            {localize('com_ui_recipe_finished_give_opinion')}
          </div>
          <p className="mt-2 text-center text-sm text-text-secondary">
            {localize('com_ui_recipe_comments_placeholder')}
          </p>
        </section>

        {/* FAQ placeholder (optional) */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 border-b border-border-medium pb-2 text-lg font-semibold text-text-primary">
            <HelpCircle className="h-5 w-5 text-text-secondary" />
            {localize('com_ui_recipe_faq')}
          </h2>
          <p className="text-sm text-text-secondary">{localize('com_ui_recipe_faq_placeholder')}</p>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-border-medium pt-6">
          <Link to={`/r/${recipe._id}/step`}>
            <Button type="button" variant="default" className="flex items-center gap-2">
              {localize('com_ui_recipe_step_mode')}
            </Button>
          </Link>
          <Link to={`/journal?add=${encodeURIComponent(recipe._id)}`}>
            <Button type="button" variant="outline">
              {localize('com_ui_journal_add_short')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
