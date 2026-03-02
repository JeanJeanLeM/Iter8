const { buildImportPlan } = require('./buildImportPlan');

describe('importChatgptShare/buildImportPlan', () => {
  it('assigns suggestedParentIndex by timeline (first null, rest previous)', () => {
    const candidates = [
      { index: 2, title: 'A', rawText: '...' },
      { index: 0, title: 'B', rawText: '...' },
      { index: 1, title: 'C', rawText: '...' },
    ];
    const plan = buildImportPlan(candidates);
    expect(plan).toHaveLength(3);
    const byImportIndex = plan.sort((a, b) => a.importIndex - b.importIndex);
    expect(byImportIndex[0].importIndex).toBe(0);
    expect(byImportIndex[0].suggestedParentIndex).toBe(null);
    expect(byImportIndex[1].importIndex).toBe(1);
    expect(byImportIndex[1].suggestedParentIndex).toBe(0);
    expect(byImportIndex[2].importIndex).toBe(2);
    expect(byImportIndex[2].suggestedParentIndex).toBe(1);
  });

  it('sorts by candidate index (message order)', () => {
    const candidates = [
      { index: 10, title: 'Later', rawText: '...', recipeDate: null, userResponse: null },
      { index: 0, title: 'First', rawText: '...', recipeDate: '2026-02-20T10:00:00.000Z', userResponse: 'Can you adapt?' },
    ];
    const plan = buildImportPlan(candidates);
    expect(plan[0].title).toBe('First');
    expect(plan[0].importIndex).toBe(0);
    expect(plan[0].recipeDate).toBe('2026-02-20T10:00:00.000Z');
    expect(plan[0].userResponse).toBe('Can you adapt?');
    expect(plan[1].title).toBe('Later');
    expect(plan[1].importIndex).toBe(1);
  });
});
