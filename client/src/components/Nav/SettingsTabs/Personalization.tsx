import { useState, useEffect, useCallback } from 'react';
import {
  Switch,
  useToastContext,
  Checkbox,
  Label,
  Input,
  Button,
  Tag,
  Dropdown,
  Textarea,
} from '@librechat/client';
import { useGetUserQuery, useUpdateMemoryPreferencesMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import {
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  EQUIPMENT_OPTIONS,
  ALLERGY_MAX_LENGTH,
  COOKING_LEVEL_MAX_LENGTH,
  DIET_MAX_LENGTH,
  DIETARY_PREFERENCES_MAX_LENGTH,
  EQUIPMENT_MAX_LENGTH,
} from '~/constants/personalization';

interface PersonalizationProps {
  hasMemoryOptOut: boolean;
  hasAnyPersonalizationFeature: boolean;
}

export default function Personalization({
  hasMemoryOptOut,
  hasAnyPersonalizationFeature,
}: PersonalizationProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: user } = useGetUserQuery();
  const [referenceSavedMemories, setReferenceSavedMemories] = useState(true);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [customDietInput, setCustomDietInput] = useState('');
  const [cookingLevel, setCookingLevel] = useState<string>('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [unitSystem, setUnitSystem] = useState<'si' | 'american' | ''>('');
  const [showIngredientGrams, setShowIngredientGrams] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [customEquipmentInput, setCustomEquipmentInput] = useState('');

  const updateMemoryPreferencesMutation = useUpdateMemoryPreferencesMutation({
    onSuccess: () => {
      showToast({
        message: localize('com_ui_preferences_updated'),
        status: 'success',
      });
    },
    onError: (_, variables) => {
      showToast({
        message: localize('com_ui_error_updating_preferences'),
        status: 'error',
      });
      if (typeof variables.memories === 'boolean') {
        setReferenceSavedMemories((prev) => !prev);
      }
      if (variables.diets !== undefined) {
        setSelectedDiets(user?.personalization?.diets ?? []);
      }
      if (variables.allergies !== undefined) {
        setSelectedAllergies(user?.personalization?.allergies ?? []);
      }
      if (variables.cookingLevel !== undefined) {
        setCookingLevel(user?.personalization?.cookingLevel ?? '');
      }
      if (variables.dietaryPreferences !== undefined) {
        setDietaryPreferences(user?.personalization?.dietaryPreferences ?? '');
      }
      if (variables.unitSystem !== undefined) {
        setUnitSystem((user?.personalization?.unitSystem as 'si' | 'american' | '') ?? '');
      }
      if (variables.showIngredientGrams !== undefined) {
        setShowIngredientGrams(user?.personalization?.showIngredientGrams ?? false);
      }
      if (variables.equipment !== undefined) {
        setSelectedEquipment(user?.personalization?.equipment ?? []);
      }
    },
  });

  // Initialize state from user data
  useEffect(() => {
    if (user?.personalization?.memories !== undefined) {
      setReferenceSavedMemories(user.personalization.memories);
    }
  }, [user?.personalization?.memories]);

  useEffect(() => {
    if (user?.personalization?.diets !== undefined) {
      setSelectedDiets(user.personalization.diets);
    }
  }, [user?.personalization?.diets]);

  useEffect(() => {
    if (user?.personalization?.allergies !== undefined) {
      setSelectedAllergies(user.personalization.allergies);
    }
  }, [user?.personalization?.allergies]);

  useEffect(() => {
    if (user?.personalization?.cookingLevel !== undefined) {
      setCookingLevel(user.personalization.cookingLevel);
    }
  }, [user?.personalization?.cookingLevel]);

  useEffect(() => {
    if (user?.personalization?.dietaryPreferences !== undefined) {
      setDietaryPreferences(user.personalization.dietaryPreferences);
    }
  }, [user?.personalization?.dietaryPreferences]);

  useEffect(() => {
    if (user?.personalization?.unitSystem !== undefined) {
      setUnitSystem(user.personalization.unitSystem ?? '');
    }
  }, [user?.personalization?.unitSystem]);

  useEffect(() => {
    if (user?.personalization?.showIngredientGrams !== undefined) {
      setShowIngredientGrams(user.personalization.showIngredientGrams ?? false);
    }
  }, [user?.personalization?.showIngredientGrams]);

  useEffect(() => {
    if (user?.personalization?.equipment !== undefined) {
      setSelectedEquipment(user.personalization.equipment ?? []);
    }
  }, [user?.personalization?.equipment]);

  const handleMemoryToggle = (checked: boolean) => {
    setReferenceSavedMemories(checked);
    updateMemoryPreferencesMutation.mutate({ memories: checked });
  };

  const toggleDiet = useCallback(
    (value: string) => {
      const next = selectedDiets.includes(value)
        ? selectedDiets.filter((d) => d !== value)
        : [...selectedDiets, value];
      setSelectedDiets(next);
      updateMemoryPreferencesMutation.mutate({ diets: next });
    },
    [selectedDiets, updateMemoryPreferencesMutation],
  );

  const toggleAllergy = useCallback(
    (value: string) => {
      const next = selectedAllergies.includes(value)
        ? selectedAllergies.filter((a) => a !== value)
        : [...selectedAllergies, value];
      setSelectedAllergies(next);
      updateMemoryPreferencesMutation.mutate({ allergies: next });
    },
    [selectedAllergies, updateMemoryPreferencesMutation],
  );

  const customAllergies = selectedAllergies.filter(
    (a) => !(ALLERGY_OPTIONS as readonly string[]).includes(a),
  );

  const customDiets = selectedDiets.filter(
    (d) => !(DIET_OPTIONS as readonly string[]).includes(d),
  );

  const addCustomDiet = useCallback(() => {
    const value = customDietInput.trim();
    if (!value) {
      return;
    }
    if (selectedDiets.some((d) => d.toLowerCase() === value.toLowerCase())) {
      showToast({
        message: localize('com_ui_personalization_diet_already_added'),
        status: 'error',
      });
      return;
    }
    if (value.length > DIET_MAX_LENGTH) {
      showToast({
        message: localize('com_ui_personalization_diet_too_long', {
          max: String(DIET_MAX_LENGTH),
        }),
        status: 'error',
      });
      return;
    }
    const next = [...selectedDiets, value];
    setSelectedDiets(next);
    setCustomDietInput('');
    updateMemoryPreferencesMutation.mutate({ diets: next });
  }, [
    customDietInput,
    selectedDiets,
    updateMemoryPreferencesMutation,
    showToast,
    localize,
  ]);

  const removeCustomDiet = useCallback(
    (value: string) => {
      const next = selectedDiets.filter((d) => d !== value);
      setSelectedDiets(next);
      updateMemoryPreferencesMutation.mutate({ diets: next });
    },
    [selectedDiets, updateMemoryPreferencesMutation],
  );

  const addCustomAllergy = useCallback(() => {
    const value = customAllergyInput.trim();
    if (!value) {
      return;
    }
    if (selectedAllergies.some((a) => a.toLowerCase() === value.toLowerCase())) {
      showToast({
        message: localize('com_ui_personalization_allergy_already_added'),
        status: 'error',
      });
      return;
    }
    if (value.length > ALLERGY_MAX_LENGTH) {
      showToast({
        message: localize('com_ui_personalization_allergy_too_long', {
          max: String(ALLERGY_MAX_LENGTH),
        }),
        status: 'error',
      });
      return;
    }
    const next = [...selectedAllergies, value];
    setSelectedAllergies(next);
    setCustomAllergyInput('');
    updateMemoryPreferencesMutation.mutate({ allergies: next });
  }, [
    customAllergyInput,
    selectedAllergies,
    updateMemoryPreferencesMutation,
    showToast,
    localize,
  ]);

  const removeCustomAllergy = useCallback(
    (value: string) => {
      const next = selectedAllergies.filter((a) => a !== value);
      setSelectedAllergies(next);
      updateMemoryPreferencesMutation.mutate({ allergies: next });
    },
    [selectedAllergies, updateMemoryPreferencesMutation],
  );

  const toggleEquipment = useCallback(
    (value: string) => {
      const next = selectedEquipment.includes(value)
        ? selectedEquipment.filter((e) => e !== value)
        : [...selectedEquipment, value];
      setSelectedEquipment(next);
      updateMemoryPreferencesMutation.mutate({ equipment: next });
    },
    [selectedEquipment, updateMemoryPreferencesMutation],
  );

  const addCustomEquipment = useCallback(() => {
    const value = customEquipmentInput.trim();
    if (!value) return;
    if (selectedEquipment.some((e) => e.toLowerCase() === value.toLowerCase())) {
      showToast({
        message: localize('com_ui_personalization_allergy_already_added'),
        status: 'error',
      });
      return;
    }
    if (value.length > EQUIPMENT_MAX_LENGTH) {
      showToast({
        message: localize('com_ui_personalization_allergy_too_long', { max: String(EQUIPMENT_MAX_LENGTH) }),
        status: 'error',
      });
      return;
    }
    const next = [...selectedEquipment, value];
    setSelectedEquipment(next);
    setCustomEquipmentInput('');
    updateMemoryPreferencesMutation.mutate({ equipment: next });
  }, [customEquipmentInput, selectedEquipment, updateMemoryPreferencesMutation, showToast, localize]);

  const removeCustomEquipment = useCallback(
    (value: string) => {
      const next = selectedEquipment.filter((e) => e !== value);
      setSelectedEquipment(next);
      updateMemoryPreferencesMutation.mutate({ equipment: next });
    },
    [selectedEquipment, updateMemoryPreferencesMutation],
  );

  const handleCookingLevelBlur = useCallback(() => {
    const value = cookingLevel.trim();
    if (value.length > COOKING_LEVEL_MAX_LENGTH) {
      showToast({
        message: localize('com_ui_personalization_cooking_level_too_long', {
          max: String(COOKING_LEVEL_MAX_LENGTH),
        }),
        status: 'error',
      });
      setCookingLevel(user?.personalization?.cookingLevel ?? '');
      return;
    }
    updateMemoryPreferencesMutation.mutate({ cookingLevel: value });
  }, [
    cookingLevel,
    updateMemoryPreferencesMutation,
    showToast,
    localize,
    user?.personalization?.cookingLevel,
  ]);

  const handleUnitSystemChange = useCallback(
    (value: string) => {
      const v = value === 'si' || value === 'american' ? value : '';
      setUnitSystem(v);
      updateMemoryPreferencesMutation.mutate({ unitSystem: v });
    },
    [updateMemoryPreferencesMutation],
  );

  const handleShowIngredientGramsChange = useCallback(
    (checked: boolean) => {
      setShowIngredientGrams(checked);
      updateMemoryPreferencesMutation.mutate({ showIngredientGrams: checked });
    },
    [updateMemoryPreferencesMutation],
  );

  const handleDietaryPreferencesBlur = useCallback(() => {
    const value = dietaryPreferences.trim();
    if (value.length > DIETARY_PREFERENCES_MAX_LENGTH) {
      showToast({
        message: localize('com_ui_personalization_dietary_preferences_too_long', {
          max: String(DIETARY_PREFERENCES_MAX_LENGTH),
        }),
        status: 'error',
      });
      setDietaryPreferences(user?.personalization?.dietaryPreferences ?? '');
      return;
    }
    updateMemoryPreferencesMutation.mutate({ dietaryPreferences: value });
  }, [
    dietaryPreferences,
    updateMemoryPreferencesMutation,
    showToast,
    localize,
    user?.personalization?.dietaryPreferences,
  ]);

  if (!hasAnyPersonalizationFeature) {
    return (
      <div className="flex flex-col gap-3 text-sm text-text-primary">
        <div className="text-text-secondary">{localize('com_ui_no_personalization_available')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm text-text-primary">
      {/* Memory Settings Section */}
      {hasMemoryOptOut && (
        <>
          <div className="border-b border-border-medium pb-3">
            <div className="text-base font-semibold">{localize('com_ui_memory')}</div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div id="reference-saved-memories-label" className="flex items-center gap-2">
                {localize('com_ui_reference_saved_memories')}
              </div>
              <div
                id="reference-saved-memories-description"
                className="mt-1 text-xs text-text-secondary"
              >
                {localize('com_ui_reference_saved_memories_description')}
              </div>
            </div>
            <Switch
              checked={referenceSavedMemories}
              onCheckedChange={handleMemoryToggle}
              disabled={updateMemoryPreferencesMutation.isLoading}
              aria-labelledby="reference-saved-memories-label"
              aria-describedby="reference-saved-memories-description"
            />
          </div>
        </>
      )}

      {/* Recipes & dietary preferences */}
      <div className="border-b border-border-medium pb-3">
        <div className="text-base font-semibold">
          {localize('com_ui_personalization_recipes_diet_section')}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {localize('com_ui_personalization_recipes_diet_description')}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Label className="text-sm font-medium">{localize('com_ui_personalization_diets')}</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {DIET_OPTIONS.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`diet-${value}`}
                  checked={selectedDiets.includes(value)}
                  onCheckedChange={() => toggleDiet(value)}
                  disabled={updateMemoryPreferencesMutation.isLoading}
                />
                <label
                  htmlFor={`diet-${value}`}
                  className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed"
                >
                  {localize(`com_ui_diet_${value}`)}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Label className="text-xs text-text-secondary">
              {localize('com_ui_personalization_diet_custom_section')}
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={customDietInput}
                onChange={(e) => setCustomDietInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomDiet();
                  }
                }}
                placeholder={localize('com_ui_personalization_diet_add_placeholder')}
                className="max-w-[220px]"
                maxLength={DIET_MAX_LENGTH + 1}
                disabled={updateMemoryPreferencesMutation.isLoading}
                aria-label={localize('com_ui_personalization_diet_add_placeholder')}
              />
              <Button
                type="button"
                onClick={addCustomDiet}
                disabled={
                  updateMemoryPreferencesMutation.isLoading || !customDietInput.trim()
                }
                className="h-10"
              >
                {localize('com_ui_personalization_diet_add_button')}
              </Button>
            </div>
            {customDiets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customDiets.map((value) => (
                  <Tag
                    key={value}
                    label={value}
                    onRemove={() => removeCustomDiet(value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            {localize('com_ui_personalization_allergies')}
          </Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {ALLERGY_OPTIONS.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`allergy-${value}`}
                  checked={selectedAllergies.includes(value)}
                  onCheckedChange={() => toggleAllergy(value)}
                  disabled={updateMemoryPreferencesMutation.isLoading}
                />
                <label
                  htmlFor={`allergy-${value}`}
                  className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed"
                >
                  {localize(`com_ui_allergy_${value}`)}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Label className="text-xs text-text-secondary">
              {localize('com_ui_personalization_allergy_custom_section')}
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={customAllergyInput}
                onChange={(e) => setCustomAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomAllergy();
                  }
                }}
                placeholder={localize('com_ui_personalization_allergy_add_placeholder')}
                className="max-w-[220px]"
                maxLength={ALLERGY_MAX_LENGTH + 1}
                disabled={updateMemoryPreferencesMutation.isLoading}
                aria-label={localize('com_ui_personalization_allergy_add_placeholder')}
              />
              <Button
                type="button"
                onClick={addCustomAllergy}
                disabled={
                  updateMemoryPreferencesMutation.isLoading || !customAllergyInput.trim()
                }
                className="h-10"
              >
                {localize('com_ui_personalization_allergy_add_button')}
              </Button>
            </div>
            {customAllergies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {customAllergies.map((value) => (
                  <Tag
                    key={value}
                    label={value}
                    onRemove={() => removeCustomAllergy(value)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            {localize('com_ui_personalization_equipment')}
          </Label>
          <div className="mt-1 text-xs text-text-secondary">
            {localize('com_ui_personalization_equipment_description')}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {EQUIPMENT_OPTIONS.map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`equipment-${value}`}
                  checked={selectedEquipment.includes(value)}
                  onCheckedChange={() => toggleEquipment(value)}
                  disabled={updateMemoryPreferencesMutation.isLoading}
                />
                <label
                  htmlFor={`equipment-${value}`}
                  className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed"
                >
                  {localize(`com_ui_equipment_${value}`)}
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Label className="text-xs text-text-secondary">
              {localize('com_ui_personalization_equipment_custom_section')}
            </Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={customEquipmentInput}
                onChange={(e) => setCustomEquipmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomEquipment();
                  }
                }}
                placeholder={localize('com_ui_personalization_equipment_add_placeholder')}
                className="max-w-[220px]"
                maxLength={EQUIPMENT_MAX_LENGTH + 1}
                disabled={updateMemoryPreferencesMutation.isLoading}
                aria-label={localize('com_ui_personalization_equipment_add_placeholder')}
              />
              <Button
                type="button"
                onClick={addCustomEquipment}
                disabled={
                  updateMemoryPreferencesMutation.isLoading || !customEquipmentInput.trim()
                }
                className="h-10"
              >
                {localize('com_ui_personalization_equipment_add_button')}
              </Button>
            </div>
            {selectedEquipment.filter((e) => !(EQUIPMENT_OPTIONS as readonly string[]).includes(e)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedEquipment
                  .filter((e) => !(EQUIPMENT_OPTIONS as readonly string[]).includes(e))
                  .map((value) => (
                    <Tag
                      key={value}
                      label={value}
                      onRemove={() => removeCustomEquipment(value)}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            {localize('com_ui_personalization_cooking_level')}
          </Label>
          <Input
            value={cookingLevel}
            onChange={(e) => setCookingLevel(e.target.value)}
            onBlur={handleCookingLevelBlur}
            placeholder={localize('com_ui_personalization_cooking_level_placeholder')}
            className="mt-2 max-w-md"
            maxLength={COOKING_LEVEL_MAX_LENGTH + 1}
            disabled={updateMemoryPreferencesMutation.isLoading}
            aria-label={localize('com_ui_personalization_cooking_level')}
          />
        </div>

        <div className="flex w-full items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">
              {localize('com_ui_personalization_unit_system')}
            </Label>
            <div className="mt-1 text-xs text-text-secondary">
              {localize('com_ui_personalization_unit_system_description')}
            </div>
          </div>
          <Dropdown
            value={unitSystem || 'none'}
            options={[
              { value: 'none', label: localize('com_ui_personalization_unit_system_none') },
              { value: 'si', label: localize('com_ui_personalization_unit_system_si') },
              { value: 'american', label: localize('com_ui_personalization_unit_system_american') },
            ]}
            onChange={(value) => handleUnitSystemChange(value === 'none' ? '' : value)}
            testId="unit-system-selector"
            sizeClasses="w-[180px]"
            popoverClassName="z-[100]"
            aria-label={localize('com_ui_personalization_unit_system')}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div id="show-ingredient-grams-label" className="text-sm font-medium">
              {localize('com_ui_personalization_show_ingredient_grams')}
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              {localize('com_ui_personalization_show_ingredient_grams_description')}
            </div>
          </div>
          <Switch
            checked={showIngredientGrams}
            onCheckedChange={handleShowIngredientGramsChange}
            disabled={updateMemoryPreferencesMutation.isLoading}
            aria-labelledby="show-ingredient-grams-label"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">
            {localize('com_ui_personalization_dietary_preferences')}
          </Label>
          <div className="mt-1 text-xs text-text-secondary">
            {localize('com_ui_personalization_dietary_preferences_description')}
          </div>
          <Textarea
            value={dietaryPreferences}
            onChange={(e) => setDietaryPreferences(e.target.value)}
            onBlur={handleDietaryPreferencesBlur}
            placeholder={localize('com_ui_personalization_dietary_preferences_placeholder')}
            className="mt-2 min-h-[80px]"
            maxLength={DIETARY_PREFERENCES_MAX_LENGTH + 1}
            disabled={updateMemoryPreferencesMutation.isLoading}
            aria-label={localize('com_ui_personalization_dietary_preferences')}
          />
        </div>
      </div>
    </div>
  );
}
