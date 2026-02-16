import React, { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle, Button, useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useRecipesQuery, useCreateJournalEntryMutation } from '~/data-provider';

interface AddJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRecipeId?: string;
}

export default function AddJournalEntryDialog({
  open,
  onOpenChange,
  initialRecipeId,
}: AddJournalEntryDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [recipeId, setRecipeId] = useState(initialRecipeId ?? '');
  const [realizedAt, setRealizedAt] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && initialRecipeId) {
      setRecipeId(initialRecipeId);
    }
  }, [open, initialRecipeId]);

  const { data: recipesData } = useRecipesQuery({ parentsOnly: true });
  const recipes = recipesData?.recipes ?? [];

  const createMutation = useCreateJournalEntryMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_journal_entry_created') });
      onOpenChange(false);
      setRecipeId('');
      setRealizedAt(new Date().toISOString().slice(0, 10));
      setComment('');
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_journal_entry_create_error') });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId.trim()) {
      showToast({ message: localize('com_ui_journal_recipe_required') });
      return;
    }
    createMutation.mutate({
      recipeId: recipeId.trim(),
      realizedAt: realizedAt || undefined,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md">
        <OGDialogTitle>{localize('com_ui_journal_add')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_recipe_title')} *
            </label>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              required
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
            >
              <option value="">{localize('com_ui_journal_select_recipe')}</option>
              {recipes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_realized_on')}
            </label>
            <input
              type="date"
              value={realizedAt}
              onChange={(e) => setRealizedAt(e.target.value)}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              {localize('com_ui_journal_comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={localize('com_ui_journal_comment_placeholder')}
              className="w-full rounded border border-border-medium bg-surface-primary-alt px-3 py-2 text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isLoading}>
              {localize('com_ui_journal_add')}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
