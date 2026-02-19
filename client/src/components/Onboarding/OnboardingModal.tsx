import React, { useState, useEffect, useCallback } from 'react';
import {
  OGDialog,
  DialogTemplate,
  Button,
  Checkbox,
  Label,
  Input,
  Tag,
  Textarea,
  Switch,
  Dropdown,
  useToastContext,
} from '@librechat/client';
import { useGetUserQuery, useUpdateMemoryPreferencesMutation, useCompleteOnboardingMutation } from '~/data-provider';
import type { UpdateMemoryPreferencesParams } from '~/data-provider/Memories/queries';
import { useLocalize } from '~/hooks';
import {
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  ALLERGY_MAX_LENGTH,
  COOKING_LEVEL_MAX_LENGTH,
  DIET_MAX_LENGTH,
  DIETARY_PREFERENCES_MAX_LENGTH,
} from '~/constants/personalization';
import { MessageSquare, Calendar } from 'lucide-react';

const ONBOARDING_STEPS = 9;
const STEP_DIETS = 0;
const STEP_ALLERGIES = 1;
const STEP_COOKING_LEVEL = 2;
const STEP_DIETARY_PREFERENCES = 3;
const STEP_UNITS = 4;
const STEP_ASSISTANTS = 5;
const STEP_RECIPE_BOOK = 6;
const STEP_JOURNAL = 7;
const STEP_SHOPPING_LIST = 8;

export default function OnboardingModal({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: user } = useGetUserQuery();
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [customDietInput, setCustomDietInput] = useState('');
  const [cookingLevel, setCookingLevel] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [unitSystem, setUnitSystem] = useState<'si' | 'american' | ''>('');
  const [showIngredientGrams, setShowIngredientGrams] = useState(false);

  useEffect(() => {
    if (user?.personalization) {
      const p = user.personalization;
      if (p.diets?.length) setSelectedDiets(p.diets);
      if (p.allergies?.length) setSelectedAllergies(p.allergies);
      if (p.cookingLevel !== undefined) setCookingLevel(p.cookingLevel ?? '');
      if (p.dietaryPreferences !== undefined) setDietaryPreferences(p.dietaryPreferences ?? '');
      if (p.unitSystem) setUnitSystem((p.unitSystem as 'si' | 'american') ?? '');
      if (p.showIngredientGrams !== undefined) setShowIngredientGrams(!!p.showIngredientGrams);
    }
  }, [user?.personalization]);

  const updateMemoryPreferencesMutation = useUpdateMemoryPreferencesMutation({
    onError: () => {
      showToast({ message: localize('com_ui_error_updating_preferences'), status: 'error' });
    },
  });

  const completeOnboardingMutation = useCompleteOnboardingMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_updating_preferences'), status: 'error' });
    },
  });

  const toggleDiet = useCallback((value: string) => {
    setSelectedDiets((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }, []);

  const toggleAllergy = useCallback((value: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
    );
  }, []);

  const addCustomDiet = useCallback(() => {
    const value = customDietInput.trim();
    if (!value || selectedDiets.some((d) => d.toLowerCase() === value.toLowerCase())) return;
    if (value.length > DIET_MAX_LENGTH) return;
    setSelectedDiets((prev) => [...prev, value]);
    setCustomDietInput('');
  }, [customDietInput, selectedDiets]);

  const removeCustomDiet = useCallback((value: string) => {
    setSelectedDiets((prev) => prev.filter((d) => d !== value));
  }, []);

  const addCustomAllergy = useCallback(() => {
    const value = customAllergyInput.trim();
    if (!value || selectedAllergies.some((a) => a.toLowerCase() === value.toLowerCase())) return;
    if (value.length > ALLERGY_MAX_LENGTH) return;
    setSelectedAllergies((prev) => [...prev, value]);
    setCustomAllergyInput('');
  }, [customAllergyInput, selectedAllergies]);

  const removeCustomAllergy = useCallback((value: string) => {
    setSelectedAllergies((prev) => prev.filter((a) => a !== value));
  }, []);

  const customDiets = selectedDiets.filter((d) => !(DIET_OPTIONS as readonly string[]).includes(d));
  const customAllergies = selectedAllergies.filter(
    (a) => !(ALLERGY_OPTIONS as readonly string[]).includes(a),
  );

  const buildPreferencesPayload = useCallback((): UpdateMemoryPreferencesParams => {
    return {
      memories: true,
      diets: selectedDiets.length ? selectedDiets : undefined,
      allergies: selectedAllergies.length ? selectedAllergies : undefined,
      cookingLevel: cookingLevel.trim() || undefined,
      dietaryPreferences: dietaryPreferences.trim() || undefined,
      unitSystem: unitSystem || undefined,
      showIngredientGrams,
    };
  }, [selectedDiets, selectedAllergies, cookingLevel, dietaryPreferences, unitSystem, showIngredientGrams]);

  const handleFinish = useCallback(() => {
    const payload = buildPreferencesPayload();
    updateMemoryPreferencesMutation.mutate(payload, {
      onSuccess: () => {
        completeOnboardingMutation.mutate({ onboardingCompleted: true });
      },
    });
  }, [buildPreferencesPayload, updateMemoryPreferencesMutation, completeOnboardingMutation]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (open && !isOpen) return;
    },
    [open],
  );

  const stepTitles: Record<number, string> = {
    [STEP_DIETS]: localize('com_onboarding_step_diets'),
    [STEP_ALLERGIES]: localize('com_onboarding_step_allergies'),
    [STEP_COOKING_LEVEL]: localize('com_onboarding_step_cooking_level'),
    [STEP_DIETARY_PREFERENCES]: localize('com_onboarding_step_dietary_preferences'),
    [STEP_UNITS]: localize('com_onboarding_step_units'),
    [STEP_ASSISTANTS]: localize('com_onboarding_step_assistants'),
    [STEP_RECIPE_BOOK]: localize('com_onboarding_step_recipe_book'),
    [STEP_JOURNAL]: localize('com_onboarding_step_journal'),
    [STEP_SHOPPING_LIST]: localize('com_onboarding_step_shopping_list'),
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_DIETS:
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {DIET_OPTIONS.map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`onboarding-diet-${value}`}
                    checked={selectedDiets.includes(value)}
                    onCheckedChange={() => toggleDiet(value)}
                  />
                  <label htmlFor={`onboarding-diet-${value}`} className="cursor-pointer text-sm">
                    {localize(`com_ui_diet_${value}`)}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={customDietInput}
                onChange={(e) => setCustomDietInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomDiet())}
                placeholder={localize('com_ui_personalization_diet_add_placeholder')}
                className="max-w-[220px]"
                maxLength={DIET_MAX_LENGTH + 1}
              />
              <Button type="button" onClick={addCustomDiet} disabled={!customDietInput.trim()}>
                {localize('com_ui_personalization_diet_add_button')}
              </Button>
            </div>
            {customDiets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customDiets.map((value) => (
                  <Tag key={value} label={value} onRemove={() => removeCustomDiet(value)} />
                ))}
              </div>
            )}
          </div>
        );
      case STEP_ALLERGIES:
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {ALLERGY_OPTIONS.map((value) => (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`onboarding-allergy-${value}`}
                    checked={selectedAllergies.includes(value)}
                    onCheckedChange={() => toggleAllergy(value)}
                  />
                  <label htmlFor={`onboarding-allergy-${value}`} className="cursor-pointer text-sm">
                    {localize(`com_ui_allergy_${value}`)}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={customAllergyInput}
                onChange={(e) => setCustomAllergyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergy())}
                placeholder={localize('com_ui_personalization_allergy_add_placeholder')}
                className="max-w-[220px]"
                maxLength={ALLERGY_MAX_LENGTH + 1}
              />
              <Button type="button" onClick={addCustomAllergy} disabled={!customAllergyInput.trim()}>
                {localize('com_ui_personalization_allergy_add_button')}
              </Button>
            </div>
            {customAllergies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customAllergies.map((value) => (
                  <Tag key={value} label={value} onRemove={() => removeCustomAllergy(value)} />
                ))}
              </div>
            )}
          </div>
        );
      case STEP_COOKING_LEVEL:
        return (
          <Input
            value={cookingLevel}
            onChange={(e) => setCookingLevel(e.target.value)}
            placeholder={localize('com_ui_personalization_cooking_level_placeholder')}
            className="max-w-md"
            maxLength={COOKING_LEVEL_MAX_LENGTH + 1}
            aria-label={localize('com_ui_personalization_cooking_level')}
          />
        );
      case STEP_DIETARY_PREFERENCES:
        return (
          <Textarea
            value={dietaryPreferences}
            onChange={(e) => setDietaryPreferences(e.target.value)}
            placeholder={localize('com_ui_personalization_dietary_preferences_placeholder')}
            className="min-h-[80px] max-w-md"
            maxLength={DIETARY_PREFERENCES_MAX_LENGTH + 1}
            aria-label={localize('com_ui_personalization_dietary_preferences')}
          />
        );
      case STEP_UNITS:
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">
                {localize('com_ui_personalization_unit_system')}
              </Label>
              <Dropdown
                value={unitSystem || 'none'}
                options={[
                  { value: 'none', label: localize('com_ui_personalization_unit_system_none') },
                  { value: 'si', label: localize('com_ui_personalization_unit_system_si') },
                  { value: 'american', label: localize('com_ui_personalization_unit_system_american') },
                ]}
                onChange={(value) => setUnitSystem(value === 'none' ? '' : (value as 'si' | 'american'))}
                testId="onboarding-unit-system"
                sizeClasses="w-[180px]"
                className="z-50"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm font-medium">
                {localize('com_ui_personalization_show_ingredient_grams')}
              </Label>
              <Switch
                checked={showIngredientGrams}
                onCheckedChange={setShowIngredientGrams}
              />
            </div>
          </div>
        );
      case STEP_ASSISTANTS:
        return (
          <div className="flex flex-col gap-4 text-sm text-text-secondary">
            <div className="flex gap-2">
              <MessageSquare className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <div className="font-medium text-text-primary">
                  {localize('com_faq_assistant_title')}
                </div>
                <p className="mt-1">{localize('com_faq_assistant_description')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Calendar className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <div className="font-medium text-text-primary">
                  {localize('com_ui_meal_planner_assistant')}
                </div>
                <p className="mt-1">{localize('com_onboarding_meal_planner_description')}</p>
              </div>
            </div>
          </div>
        );
      case STEP_RECIPE_BOOK:
        return (
          <div className="text-sm text-text-secondary">
            <p>{localize('com_faq_recipes_description')}</p>
            <p className="mt-2">{localize('com_faq_recipes_save')}</p>
          </div>
        );
      case STEP_JOURNAL:
        return (
          <p className="text-sm text-text-secondary">{localize('com_faq_journal_description')}</p>
        );
      case STEP_SHOPPING_LIST:
        return (
          <p className="text-sm text-text-secondary">
            {localize('com_faq_shopping_list_description')}
          </p>
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === ONBOARDING_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const isSaving =
    updateMemoryPreferencesMutation.isLoading || completeOnboardingMutation.isLoading;

  return (
    <OGDialog open={open} onOpenChange={handleOpenChange}>
      <DialogTemplate
        title={stepTitles[currentStep]}
        className="w-11/12 max-w-lg sm:w-3/4 md:w-2/3"
        showCloseButton={false}
        showCancelButton={false}
        main={
          <section
            tabIndex={0}
            className="max-h-[55vh] overflow-y-auto p-4"
            aria-label={stepTitles[currentStep]}
          >
            <div className="flex flex-col gap-2 text-text-primary">{renderStepContent()}</div>
            <div className="mt-4 flex items-center justify-between text-xs text-text-tertiary">
              <span>
                {currentStep + 1} / {ONBOARDING_STEPS}
              </span>
            </div>
          </section>
        }
        buttons={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  disabled={isSaving}
                >
                  {localize('com_onboarding_previous')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isLastStep ? (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  {localize('com_onboarding_finish')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setCurrentStep((s) => s + 1)}
                  disabled={isSaving}
                >
                  {localize('com_onboarding_next')}
                </Button>
              )}
            </div>
          </div>
        }
      />
    </OGDialog>
  );
}
