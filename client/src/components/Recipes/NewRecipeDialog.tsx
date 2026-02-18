import React, { useState } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle, Button, useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useCreateRecipeMutation } from '~/data-provider';
import { cn } from '~/utils';

import { DISH_TYPES as DISH_OPTIONS, CUISINE_TYPES as CUISINE_OPTIONS, DIET_TYPES as DIET_OPTIONS } from './recipeFilterOptions';

interface NewRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewRecipeDialog({ open, onOpenChange }: NewRecipeDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dishType, setDishType] = useState<'entree' | 'plat' | 'dessert' | ''>('');
  const [cuisineType, setCuisineType] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);

  const createMutation = useCreateRecipeMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_recipe_created') });
      onOpenChange(false);
      setTitle('');
      setEmoji('');
      setDescription('');
      setImageUrl('');
      setDishType('');
      setCuisineType([]);
      setDiet([]);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_recipe_create_error') });
    },
  });

  const toggleCuisine = (c: string) => {
    setCuisineType((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const toggleDiet = (d: string) => {
    setDiet((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      showToast({ message: localize('com_ui_recipe_title_required') });
      return;
    }
    createMutation.mutate({
      title: t,
      emoji: emoji.trim() || undefined,
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      dishType: dishType || undefined,
      cuisineType: cuisineType.length ? cuisineType : undefined,
      diet: diet.length ? diet : undefined,
      ingredients: [],
      steps: [],
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md">
        <OGDialogTitle>{localize('com_ui_recipe_new')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={localize('com_ui_recipe_title_placeholder')}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_emoji')}
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🍽️"
              maxLength={4}
              className="w-16 rounded border border-border-medium bg-surface-primary-alt px-2 py-2 text-2xl text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_image_url')}
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={localize('com_ui_recipe_image_url_placeholder')}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
            />
            {imageUrl.trim() && (
              <div className="mt-1.5 overflow-hidden rounded border border-border-medium bg-surface-active-alt">
                <img
                  src={imageUrl.trim()}
                  alt=""
                  className="h-24 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_filter_dish_type')}
            </span>
            <div className="flex flex-wrap gap-1">
              {DISH_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDishType(dishType === d ? '' : d)}
                  className={cn(
                    'rounded px-2 py-1 text-xs',
                    dishType === d ? 'bg-surface-active-alt text-text-primary' : 'bg-surface-primary-alt text-text-secondary',
                  )}
                >
                  {localize(`com_ui_recipe_dish_${d}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_filter_cuisine')}
            </span>
            <div className="flex flex-wrap gap-1">
              {CUISINE_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCuisine(c)}
                  className={cn(
                    'rounded px-2 py-1 text-xs',
                    cuisineType.includes(c) ? 'bg-surface-active-alt text-text-primary' : 'bg-surface-primary-alt text-text-secondary',
                  )}
                >
                  {localize(`com_ui_recipe_cuisine_${c}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_filter_diet')}
            </span>
            <div className="flex flex-wrap gap-1">
              {DIET_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDiet(d)}
                  className={cn(
                    'rounded px-2 py-1 text-xs',
                    diet.includes(d) ? 'bg-surface-active-alt text-text-primary' : 'bg-surface-primary-alt text-text-secondary',
                  )}
                >
                  {localize(`com_ui_recipe_diet_${d}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? localize('com_ui_loading') : localize('com_ui_recipe_create')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
