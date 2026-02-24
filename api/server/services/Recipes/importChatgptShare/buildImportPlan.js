/**
 * Builds default parent mapping by timeline: recipe at index i has parent at index i-1.
 * Used for ChatGPT share import preview and commit.
 */

/**
 * Build preview items with default parent by timeline order.
 * importIndex is the stable 0-based index used in commit (which to import, parent reference).
 * @param {Array<{ index: number; title: string; rawText: string }>} candidates
 * @returns {Array<{ importIndex: number; index: number; title: string; rawText: string; suggestedParentIndex: number | null }>}
 */
function buildImportPlan(candidates) {
  const sorted = [...candidates].sort((a, b) => a.index - b.index);
  return sorted.map((c, i) => ({
    importIndex: i,
    index: c.index,
    title: c.title,
    rawText: c.rawText,
    suggestedParentIndex: i === 0 ? null : i - 1,
  }));
}

/**
 * Resolve parent id for each item from user selection (importIndex -> parentImportIndex or null).
 * When committing, we create recipes in order; parentId is the created recipe id of the parent.
 * @param {Array<{ importIndex: number; parentImportIndex: number | null }>} selection - which to import and chosen parent
 * @returns {Map<number, number | null>} importIndex -> parentImportIndex (null = no parent)
 */
function buildParentMapFromSelection(selection) {
  const map = new Map();
  for (const { importIndex, parentImportIndex } of selection) {
    map.set(importIndex, parentImportIndex ?? null);
  }
  return map;
}

module.exports = {
  buildImportPlan,
  buildParentMapFromSelection,
};
