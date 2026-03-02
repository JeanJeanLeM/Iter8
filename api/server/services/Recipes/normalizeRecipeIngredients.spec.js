const {
  normalizeRecipeIngredients,
  normalizeOne,
  trySplitStateFromName,
} = require('./normalizeRecipeIngredients');

describe('trySplitStateFromName', () => {
  it('splits trailing state phrase from name', () => {
    expect(trySplitStateFromName('beurre fondu')).toEqual({ name: 'beurre', state: 'fondu' });
    expect(trySplitStateFromName('beurre mou')).toEqual({ name: 'beurre', state: 'mou' });
    expect(trySplitStateFromName('fromage râpé')).toEqual({ name: 'fromage', state: 'râpé' });
  });

  it('returns name unchanged when no known state phrase', () => {
    expect(trySplitStateFromName('farine')).toEqual({ name: 'farine' });
    expect(trySplitStateFromName('œuf')).toEqual({ name: 'œuf' });
    expect(trySplitStateFromName('beurre salé')).toEqual({ name: 'beurre salé' });
  });

  it('handles empty or invalid input', () => {
    expect(trySplitStateFromName('')).toEqual({ name: '' });
    expect(trySplitStateFromName(null)).toEqual({ name: '' });
  });
});

describe('normalizeOne', () => {
  it('returns null when name is missing or empty', () => {
    expect(normalizeOne({})).toBeNull();
    expect(normalizeOne({ name: '' })).toBeNull();
    expect(normalizeOne({ name: '   ' })).toBeNull();
  });

  it('preserves explicit state and does not split name', () => {
    const out = normalizeOne({ name: 'beurre', quantity: 30, unit: 'g', state: 'fondu' });
    expect(out).toEqual({
      name: 'beurre',
      quantity: 30,
      unit: 'g',
      state: 'fondu',
    });
  });

  it('splits state from name when state not provided', () => {
    const out = normalizeOne({ name: 'beurre fondu', quantity: 30 });
    expect(out.name).toBe('beurre');
    expect(out.state).toBe('fondu');
    expect(out.quantity).toBe(30);
  });

  it('preserves note and section', () => {
    const out = normalizeOne({
      name: 'chocolat',
      note: 'noir',
      section: 'Pour le glaçage',
    });
    expect(out.name).toBe('chocolat');
    expect(out.note).toBe('noir');
    expect(out.section).toBe('Pour le glaçage');
  });

  it('handles legacy ingredient without state', () => {
    const out = normalizeOne({ name: 'farine', quantity: 250, unit: 'g' });
    expect(out).toEqual({ name: 'farine', quantity: 250, unit: 'g' });
  });
});

describe('normalizeRecipeIngredients', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeRecipeIngredients(null)).toEqual([]);
    expect(normalizeRecipeIngredients(undefined)).toEqual([]);
  });

  it('normalizes mixed array and filters invalid items', () => {
    const input = [
      { name: 'beurre mou', quantity: 50 },
      {},
      { name: 'farine', quantity: 200, unit: 'g' },
      { name: 'œufs', quantity: 2, state: 'battus' },
    ];
    const out = normalizeRecipeIngredients(input);
    expect(out).toHaveLength(3);
    expect(out[0].name).toBe('beurre');
    expect(out[0].state).toBe('mou');
    expect(out[1].name).toBe('farine');
    expect(out[1].state).toBeUndefined();
    expect(out[2].name).toBe('œufs');
    expect(out[2].state).toBe('battus');
  });

  it('does not block creation when uncertain', () => {
    const out = normalizeRecipeIngredients([{ name: 'ingrédient inconnu xyz', quantity: 1 }]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('ingrédient inconnu xyz');
  });
});

describe('update_recipe schema parity', () => {
  it('runtime tool schema includes ingredient state and section', () => {
    const UpdateRecipe = require('~/app/clients/tools/structured/UpdateRecipe');
    const schema = UpdateRecipe.jsonSchema;
    const props = schema?.properties?.ingredients?.items?.properties;
    expect(props).toBeDefined();
    expect(props.name).toBeDefined();
    expect(props.state).toBeDefined();
    expect(props.section).toBeDefined();
    expect(schema.properties.ingredients.items.required).toContain('name');
  });
});
