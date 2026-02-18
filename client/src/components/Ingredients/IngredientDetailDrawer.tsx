import React from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  Button,
  Spinner,
  useToastContext,
} from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useEnrichIngredientWithUsdaMutation } from '~/data-provider';
import type { TIngredient, TNutritionMicros } from 'librechat-data-provider';
import { Apple, RefreshCw } from 'lucide-react';
import { cn } from '~/utils';

function formatNum(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

interface IngredientDetailDrawerProps {
  ingredient: TIngredient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIngredientUpdated?: (ingredient: TIngredient) => void;
}

export default function IngredientDetailDrawer({
  ingredient,
  open,
  onOpenChange,
  onIngredientUpdated,
}: IngredientDetailDrawerProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const enrichMutation = useEnrichIngredientWithUsdaMutation({
    onSuccess: (updated) => {
      showToast({ message: localize('com_ui_ingredient_enrich_usda') });
      onIngredientUpdated?.(updated);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? 'USDA match not found' });
    },
  });

  if (!ingredient) return null;

  const displayName =
    ingredient.displayName?.trim() ||
    (ingredient.name.trim().charAt(0).toUpperCase() +
      ingredient.name.trim().slice(1).toLowerCase());
  const hasNutrition =
    ingredient.energyKcal != null ||
    ingredient.proteinG != null ||
    ingredient.fatG != null ||
    ingredient.carbohydrateG != null ||
    ingredient.fiberG != null ||
    (ingredient.nutritionMicros && Object.keys(ingredient.nutritionMicros).length > 0);

  const micros = ingredient.nutritionMicros as TNutritionMicros | undefined;
  const microLabels: { key: keyof TNutritionMicros; labelKey: string }[] = [
    { key: 'sodiumMg', labelKey: 'Sodium (mg)' },
    { key: 'calciumMg', labelKey: 'Calcium (mg)' },
    { key: 'ironMg', labelKey: 'Iron (mg)' },
    { key: 'potassiumMg', labelKey: 'Potassium (mg)' },
    { key: 'vitaminCMg', labelKey: 'Vitamin C (mg)' },
    { key: 'vitaminARaeUg', labelKey: 'Vitamin A RAE (µg)' },
    { key: 'vitaminDIu', labelKey: 'Vitamin D (IU)' },
    { key: 'folateUg', labelKey: 'Folate (µg)' },
    { key: 'vitaminB12Ug', labelKey: 'Vitamin B12 (µg)' },
    { key: 'zincMg', labelKey: 'Zinc (mg)' },
    { key: 'seleniumUg', labelKey: 'Selenium (µg)' },
    { key: 'magnesiumMg', labelKey: 'Magnesium (mg)' },
  ];

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-md">
        <OGDialogTitle className="flex items-center gap-3 border-b border-border-medium pb-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-active-alt/50">
            {ingredient.imageUrl ? (
              <img
                src={ingredient.imageUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Apple className="h-8 w-8 text-text-tertiary" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-text-primary">
              {displayName}
            </h2>
            {ingredient.usdaDescription && (
              <p className="mt-0.5 truncate text-xs text-text-tertiary">
                {localize('com_ui_ingredient_usda_source')}: {ingredient.usdaDescription}
              </p>
            )}
          </div>
        </OGDialogTitle>

        <div className="flex-1 overflow-auto">
          <h3 className="mb-2 text-sm font-medium text-text-secondary">
            {localize('com_ui_ingredient_nutrition')}
          </h3>
          {!hasNutrition ? (
            <p className="text-sm text-text-tertiary">
              {localize('com_ui_ingredient_no_nutrition')}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Row
                  label={localize('com_ui_ingredient_energy')}
                  value={ingredient.energyKcal != null ? `${formatNum(ingredient.energyKcal)} kcal` : undefined}
                />
                <Row
                  label={localize('com_ui_ingredient_protein')}
                  value={ingredient.proteinG != null ? `${formatNum(ingredient.proteinG)} g` : undefined}
                />
                <Row
                  label={localize('com_ui_ingredient_fat')}
                  value={ingredient.fatG != null ? `${formatNum(ingredient.fatG)} g` : undefined}
                />
                <Row
                  label={localize('com_ui_ingredient_carbohydrate')}
                  value={ingredient.carbohydrateG != null ? `${formatNum(ingredient.carbohydrateG)} g` : undefined}
                />
                <Row
                  label={localize('com_ui_ingredient_fiber')}
                  value={ingredient.fiberG != null ? `${formatNum(ingredient.fiberG)} g` : undefined}
                />
              </div>
              {micros && Object.keys(micros).length > 0 && (
                <div className="border-t border-border-medium pt-3">
                  <p className="mb-2 text-xs font-medium text-text-tertiary">
                    Micronutrients
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {microLabels.map(
                      ({ key, labelKey }) =>
                        micros[key] != null && (
                          <Row
                            key={key}
                            label={labelKey}
                            value={formatNum(micros[key] as number)}
                          />
                        ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => enrichMutation.mutate(ingredient._id)}
              disabled={enrichMutation.isLoading}
              className="w-full gap-2"
            >
              {enrichMutation.isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {localize('com_ui_ingredient_enrich_usda')}
            </Button>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
