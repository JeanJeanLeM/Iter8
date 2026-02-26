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
  const plan = sorted.map((c, i) => ({
    importIndex: i,
    index: c.index,
    title: c.title,
    rawText: c.rawText,
    suggestedParentIndex: i === 0 ? null : i - 1,
  }));
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4d0408' }, body: JSON.stringify({ sessionId: '4d0408', runId: 'preview', hypothesisId: 'H3', location: 'buildImportPlan.js:build', message: 'build import plan', data: { candidateCount: sorted.length, rootCount: plan.filter((p) => p.suggestedParentIndex == null).length }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  return plan;
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
