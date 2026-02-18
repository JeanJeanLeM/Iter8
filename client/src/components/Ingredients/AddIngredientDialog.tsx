import React, { useState, useEffect } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  Button,
  useToastContext,
} from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useCreateIngredientMutation } from '~/data-provider';

interface AddIngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

export default function AddIngredientDialog({
  open,
  onOpenChange,
  onAdded,
}: AddIngredientDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');

  const createMutation = useCreateIngredientMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_ingredient_add') });
      onOpenChange(false);
      onAdded?.();
    },
    onError: (err) => {
      showToast({ message: err?.message ?? 'Error' });
    },
  });

  useEffect(() => {
    if (open) {
      setName('');
      setDisplayName('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast({ message: localize('com_ui_ingredient_name') });
      return;
    }
    createMutation.mutate({
      name: trimmed,
      displayName: displayName.trim() || undefined,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="sm:max-w-md">
        <OGDialogTitle>
          {localize('com_ui_ingredient_add_manual')}
        </OGDialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="ingredient-name"
              className="mb-1 block text-sm font-medium text-text-secondary"
            >
              {localize('com_ui_ingredient_name')} *
            </label>
            <input
              id="ingredient-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. tomate"
              className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="ingredient-display-name"
              className="mb-1 block text-sm font-medium text-text-secondary"
            >
              {localize('com_ui_ingredient_display_name')}
            </label>
            <input
              id="ingredient-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Tomate"
              className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isLoading || !name.trim()}>
              {localize('com_ui_ingredient_add')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
