import React, { useState, useMemo } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  Button,
  Spinner,
  useToastContext,
} from '@librechat/client';
import { Link2, Loader2, FileDown } from 'lucide-react';
import { useLocalize } from '~/hooks';
import {
  useChatgptSharePreviewMutation,
  useCommitChatgptShareImportMutation,
} from '~/data-provider';
import type { ChatgptSharePreviewCandidate } from '~/data-provider';
import { cn } from '~/utils';

interface ImportChatgptShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportDone?: () => void;
}

export default function ImportChatgptShareDialog({
  open,
  onOpenChange,
  onImportDone,
}: ImportChatgptShareDialogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [shareUrl, setShareUrl] = useState('');
  const [previewData, setPreviewData] = useState<{
    title: string;
    candidates: ChatgptSharePreviewCandidate[];
  } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parentOverrides, setParentOverrides] = useState<Map<number, number | null>>(new Map());

  const previewMutation = useChatgptSharePreviewMutation({
    onSuccess: (data) => {
      setPreviewData({ title: data.title, candidates: data.candidates });
      const all = new Set(data.candidates.map((c) => c.importIndex));
      setSelected(all);
      const defaults = new Map<number, number | null>();
      data.candidates.forEach((c) => {
        defaults.set(c.importIndex, c.suggestedParentIndex);
      });
      setParentOverrides(defaults);
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_recipe_import_preview_error') });
    },
  });

  const commitMutation = useCommitChatgptShareImportMutation({
    onSuccess: (data) => {
      showToast({
        message: localize('com_ui_recipe_import_done', { count: String(data.recipes?.length ?? 0) }),
      });
      onOpenChange(false);
      setShareUrl('');
      setPreviewData(null);
      setSelected(new Set());
      setParentOverrides(new Map());
      onImportDone?.();
    },
    onError: (err) => {
      showToast({ message: err?.message ?? localize('com_ui_recipe_import_commit_error') });
    },
  });

  const handleAnalyze = () => {
    const url = shareUrl.trim();
    if (!url) {
      showToast({ message: localize('com_ui_recipe_import_url_required') });
      return;
    }
    previewMutation.mutate(url);
  };

  const toggleSelect = (importIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(importIndex)) next.delete(importIndex);
      else next.add(importIndex);
      return next;
    });
  };

  const setParent = (importIndex: number, parentImportIndex: number | null) => {
    setParentOverrides((prev) => {
      const next = new Map(prev);
      next.set(importIndex, parentImportIndex);
      return next;
    });
  };

  const selectedList = useMemo(() => {
    if (!previewData) return [];
    return previewData.candidates
      .filter((c) => selected.has(c.importIndex))
      .sort((a, b) => a.importIndex - b.importIndex);
  }, [previewData, selected]);

  const handleCommit = () => {
    if (selectedList.length === 0) {
      showToast({ message: localize('com_ui_recipe_import_select_at_least_one') });
      return;
    }
    const selectedSet = new Set(selectedList.map((c) => c.importIndex));
    const items = selectedList.map((c) => {
      const rawParent = parentOverrides.get(c.importIndex) ?? c.suggestedParentIndex;
      const parentImportIndex =
        rawParent != null && selectedSet.has(rawParent) ? rawParent : null;
      return {
        importIndex: c.importIndex,
        rawText: c.rawText,
        parentImportIndex,
      };
    });
    commitMutation.mutate(items);
  };

  const resetAndClose = () => {
    setShareUrl('');
    setPreviewData(null);
    setSelected(new Set());
    setParentOverrides(new Map());
    onOpenChange(false);
  };

  return (
    <OGDialog open={open} onOpenChange={(o) => (!o ? resetAndClose() : onOpenChange(o))}>
      <OGDialogContent className="max-h-[90vh] max-w-lg flex flex-col">
        <OGDialogTitle>
          {previewData
            ? localize('com_ui_recipe_import_select')
            : localize('com_ui_recipe_import_from_chatgpt')}
        </OGDialogTitle>

        {!previewData ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-text-secondary">
              {localize('com_ui_recipe_import_from_chatgpt_hint')}
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                placeholder="https://chatgpt.com/share/..."
                className="flex-1 rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={localize('com_ui_recipe_import_url_placeholder')}
              />
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={previewMutation.isLoading || !shareUrl.trim()}
                className="flex items-center gap-1.5"
              >
                {previewMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {localize('com_ui_recipe_import_analyze')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              {localize('com_ui_recipe_import_conversation_title')}: {previewData.title}
            </p>
            <div className="min-h-[200px] flex-1 overflow-y-auto rounded-lg border border-border-medium bg-surface-primary-alt p-2">
              <ul className="space-y-2">
                {previewData.candidates.map((c) => (
                  <li
                    key={c.importIndex}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      selected.has(c.importIndex)
                        ? 'border-primary/50 bg-surface-active-alt/50'
                        : 'border-border-medium',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.importIndex)}
                        onChange={() => toggleSelect(c.importIndex)}
                        className="mt-1 h-4 w-4 rounded border-border-medium"
                        aria-label={c.title}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-text-primary">{c.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-text-secondary">
                            {localize('com_ui_recipe_import_parent')}:
                          </span>
                          <select
                            value={
                              selected.has(c.importIndex)
                                ? String(parentOverrides.get(c.importIndex) ?? 'none')
                                : 'none'
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setParent(c.importIndex, v === 'none' ? null : parseInt(v, 10));
                            }}
                            disabled={!selected.has(c.importIndex)}
                            className="rounded border border-border-medium bg-surface-primary px-2 py-0.5 text-xs text-text-primary"
                          >
                            <option value="none">{localize('com_ui_recipe_no_parent')}</option>
                            {previewData.candidates
                              .filter((p) => p.importIndex < c.importIndex && selected.has(p.importIndex))
                              .map((p) => (
                                <option key={p.importIndex} value={String(p.importIndex)}>
                                  {p.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-medium pt-3">
              <Button type="button" variant="outline" onClick={() => setPreviewData(null)}>
                {localize('com_ui_recipe_import_back')}
              </Button>
              <Button
                type="button"
                onClick={handleCommit}
                disabled={commitMutation.isLoading || selectedList.length === 0}
                className="flex items-center gap-1.5"
              >
                {commitMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {localize('com_ui_recipe_import_sync')}
              </Button>
            </div>
          </>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
