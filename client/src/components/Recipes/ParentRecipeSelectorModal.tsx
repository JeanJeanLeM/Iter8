import React, { useMemo, useState } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { OGDialog, OGDialogContent, OGDialogTitle, Button } from '@librechat/client';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useRecipesQuery, useRecipeFamilyQuery } from '~/data-provider';
import { recipeMessageMap, manuallySelectedParentId } from '~/store';
import type { TRecipe } from 'librechat-data-provider';
import { cn } from '~/utils';

/** Recipe with hierarchy code: M = mother, V1.1 = first variation, V1.1.1 = child of V1.1 */
export interface RecipeWithCode {
  recipe: TRecipe;
  code: string;
  depth: number;
}

function buildRecipeTree(recipes: TRecipe[], rootId: string): RecipeWithCode[] {
  const byId = new Map<string, TRecipe>();
  for (const r of recipes) byId.set(r._id, r);

  const root = byId.get(rootId);
  if (!root) return [];

  const result: RecipeWithCode[] = [];
  const assignCodes = (parent: TRecipe, parentCode: string, prefix: string) => {
    const children = recipes
      .filter((r) => String(r.parentId ?? '') === parent._id)
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    children.forEach((child, i) => {
      const code = parentCode === 'M' ? `V1.${i + 1}` : `${parentCode}.${i + 1}`;
      result.push({
        recipe: child,
        code,
        depth: prefix.split('.').length,
      });
      assignCodes(child, code, `${prefix}.${i + 1}`);
    });
  };

  result.push({ recipe: root, code: 'M', depth: 0 });
  assignCodes(root, 'M', '1');
  return result;
}

export type ParentRecipeSelectorMode = 'select-for-next' | 'change-parent';

interface ParentRecipeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When mode is 'select-for-next', used to list recipes from conversation. When 'change-parent', can be null (only book tab). */
  conversationId: string | null;
  /** When 'change-parent', selecting a recipe calls onParentChanged(recipeId); "Unlink" calls onParentChanged(null). */
  mode?: ParentRecipeSelectorMode;
  /** Required when mode is 'change-parent'. Excluded from selectable list to avoid self-parent. */
  recipeIdToUpdate?: string;
  /** Called when user selects a new parent or unlinks. Only used when mode is 'change-parent'. */
  onParentChanged?: (newParentId: string | null) => void;
  /** When false, hide "Retirer la liaison" (e.g. when recipe has no parent yet). Default true in change-parent mode. */
  showUnlink?: boolean;
}

export default function ParentRecipeSelectorModal({
  open,
  onOpenChange,
  conversationId,
  mode = 'select-for-next',
  recipeIdToUpdate,
  onParentChanged,
  showUnlink = true,
}: ParentRecipeSelectorModalProps) {
  const localize = useLocalize();
  const isChangeParent = mode === 'change-parent';
  const [activeTab, setActiveTab] = useState<'conversation' | 'book'>(
    isChangeParent ? 'book' : 'conversation',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBookRootId, setExpandedBookRootId] = useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      setExpandedBookRootId(null);
      setActiveTab(isChangeParent ? 'book' : 'conversation');
    }
  }, [open, isChangeParent]);
  const recipeMap = useRecoilValue(recipeMessageMap);
  const setManualParent = useSetRecoilState(manuallySelectedParentId);

  const conversationRecipeIds = useMemo(() => {
    if (!conversationId) return [];
    const byMessage = recipeMap[conversationId];
    if (!byMessage || typeof byMessage !== 'object') return [];
    return [...new Set(Object.values(byMessage))].filter(Boolean);
  }, [recipeMap, conversationId]);

  const { data: conversationRecipesData, isLoading: conversationLoading } = useRecipesQuery(
    conversationRecipeIds.length > 0 ? { ids: conversationRecipeIds } : undefined,
    { enabled: open && activeTab === 'conversation' && conversationRecipeIds.length > 0 },
  );

  const { data: bookRecipesData, isLoading: bookLoading } = useRecipesQuery(
    { parentsOnly: true },
    { enabled: open && activeTab === 'book' && !expandedBookRootId },
  );

  const { data: familyData, isLoading: familyLoading } = useRecipeFamilyQuery(
    expandedBookRootId,
    { enabled: open && activeTab === 'book' && !!expandedBookRootId },
  );

  const conversationRecipes = conversationRecipesData?.recipes ?? [];
  const bookRecipes = bookRecipesData?.recipes ?? [];
  const familyRecipes = familyData?.recipes ?? [];

  const isExcluded = (recipeId: string) =>
    isChangeParent && !!recipeIdToUpdate && String(recipeId) === String(recipeIdToUpdate);

  const bookRecipesFiltered = useMemo(() => {
    let list = bookRecipes;
    if (recipeIdToUpdate && isChangeParent) {
      list = list.filter((r) => !isExcluded(r._id));
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.variationNote?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [bookRecipes, searchQuery, recipeIdToUpdate, isChangeParent]);

  const rawRecipes = activeTab === 'conversation' ? conversationRecipes : [];
  const recipes = useMemo(() => {
    if (!searchQuery.trim()) return rawRecipes;
    const q = searchQuery.trim().toLowerCase();
    return rawRecipes.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.variationNote?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [rawRecipes, searchQuery]);

  const bookTree = useMemo(() => {
    if (!expandedBookRootId || familyRecipes.length === 0) return [];
    const tree = buildRecipeTree(familyRecipes, expandedBookRootId);
    return recipeIdToUpdate ? tree.filter(({ recipe }) => !isExcluded(recipe._id)) : tree;
  }, [familyRecipes, expandedBookRootId, recipeIdToUpdate, isChangeParent]);

  const isLoading =
    activeTab === 'conversation'
      ? conversationLoading
      : expandedBookRootId
        ? familyLoading
        : bookLoading;

  const handleSelect = (recipe: TRecipe) => {
    if (isChangeParent && onParentChanged) {
      onParentChanged(recipe._id);
      onOpenChange(false);
      return;
    }
    setManualParent(recipe._id);
    onOpenChange(false);
  };

  const handleUnlink = () => {
    if (isChangeParent && onParentChanged) {
      onParentChanged(null);
      onOpenChange(false);
    }
  };

  const emptyMessage =
    activeTab === 'conversation'
      ? conversationId
        ? localize('com_ui_recipe_no_recipes_in_conversation') ?? 'Aucune recette dans cette conversation.'
        : localize('com_ui_recipe_no_conversation') ?? 'Aucune conversation sélectionnée.'
      : localize('com_ui_recipe_no_recipes_in_book') ?? 'Aucune recette dans votre livre.';

  const conversationFiltered = useMemo(
    () =>
      recipeIdToUpdate
        ? recipes.filter((r) => String(r._id) !== String(recipeIdToUpdate))
        : recipes,
    [recipes, recipeIdToUpdate],
  );

  const renderConversationContent = () => (
    <ul className="space-y-1">
      {conversationFiltered.map((r) => (
        <li key={r._id}>
          <button
            type="button"
            onClick={() => handleSelect(r)}
            className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
          >
            {r.title}
            {r.variationNote && (
              <span className="ml-2 text-xs text-text-secondary">
                — {r.variationNote}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <OGDialogTitle>
          {isChangeParent
            ? (localize('com_ui_recipe_change_parent') ?? 'Changer la recette mère')
            : localize('com_ui_recipe_choose_parent')}
        </OGDialogTitle>
        {!isChangeParent && (
        <div className="flex gap-1 border-b border-border-medium pb-2">
          <button
            type="button"
            onClick={() => { setActiveTab('conversation'); setExpandedBookRootId(null); }}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium',
              activeTab === 'conversation'
                ? 'bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover',
            )}
          >
            {localize('com_ui_recipe_choose_parent_tab_conversation')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('book'); setExpandedBookRootId(null); }}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium',
              activeTab === 'book'
                ? 'bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover',
            )}
          >
            {localize('com_ui_recipe_choose_parent_tab_book')}
          </button>
        </div>
        )}
        {activeTab === 'book' && !expandedBookRootId && (
          <div className="relative py-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={localize('com_ui_recipe_search_placeholder') ?? 'Rechercher une recette...'}
              className="w-full rounded-lg border border-border-medium bg-surface-primary-alt py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
          </div>
        )}
        {activeTab === 'conversation' && (
          <div className="relative py-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={localize('com_ui_recipe_search_placeholder') ?? 'Rechercher une recette...'}
              className="w-full rounded-lg border border-border-medium bg-surface-primary-alt py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
          </div>
        )}
        <div className="min-h-[200px] flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Loader2 className="mb-3 h-8 w-8 animate-spin" aria-hidden="true" />
              <p className="text-sm">
                {localize('com_ui_loading') ?? 'Chargement...'}
              </p>
            </div>
          )}
          {!isLoading && activeTab === 'book' && expandedBookRootId && (
            bookTree.length === 0 && !familyLoading ? (
              <p className="py-4 text-center text-sm text-text-secondary">{emptyMessage}</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setExpandedBookRootId(null)}
                  className="mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {localize('com_ui_recipe_back')}
                </button>
                <ul className="space-y-1">
                  {bookTree.map(({ recipe, code, depth }) => (
                    <li key={recipe._id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(recipe)}
                        className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                        style={{ paddingLeft: 12 + depth * 16 }}
                      >
                        <span className="mr-2 inline-flex min-w-[3ch] font-mono text-xs font-medium text-text-secondary">
                          {code}
                        </span>
                        {recipe.title}
                        {recipe.variationNote && (
                          <span className="ml-2 text-xs text-text-secondary">
                            — {recipe.variationNote}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )
          )}
          {!isLoading && activeTab === 'book' && !expandedBookRootId && bookRecipesFiltered.length === 0 && (
            <p className="py-4 text-center text-sm text-text-secondary">
              {searchQuery.trim() ? (localize('com_ui_recipe_no_match') ?? 'Aucune recette ne correspond à votre recherche.') : emptyMessage}
            </p>
          )}
          {!isLoading && activeTab === 'book' && !expandedBookRootId && bookRecipesFiltered.length > 0 && (
            <ul className="space-y-1">
              {bookRecipesFiltered.map((r) => (
                <li key={r._id}>
                  <button
                    type="button"
                    onClick={() => setExpandedBookRootId(r._id)}
                    className="w-full rounded-lg border border-border-medium bg-surface-primary-alt px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                  >
                    {r.title}
                    {(r.variationCount ?? 0) > 0 && (
                      <span className="ml-2 text-xs text-text-secondary">
                        ({(r.variationCount ?? 0)} {localize('com_ui_recipe_variations')})
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && activeTab === 'conversation' && conversationFiltered.length === 0 && (
            <p className="py-4 text-center text-sm text-text-secondary">
              {searchQuery.trim() ? (localize('com_ui_recipe_no_match') ?? 'Aucune recette ne correspond à votre recherche.') : emptyMessage}
            </p>
          )}
          {!isLoading && activeTab === 'conversation' && conversationFiltered.length > 0 && renderConversationContent()}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {isChangeParent && showUnlink && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnlink}
              className="mr-auto"
            >
              {localize('com_ui_recipe_unlink_parent') ?? 'Retirer la liaison'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {localize('com_ui_cancel')}
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
