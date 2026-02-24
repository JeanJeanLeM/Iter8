const { detectRecipes, findIngredientsSection, extractTitle } = require('./detectRecipes');

describe('importChatgptShare/detectRecipes', () => {
  describe('findIngredientsSection', () => {
    it('returns hasSection true when enough bullet lines after ingredients header', () => {
      const text = `
Tarte aux pommes

Ingrédients :
- 3 pommes
- 200 g farine
- 50 g beurre

Préparation
Mélanger...
`;
      const r = findIngredientsSection(text);
      expect(r.hasSection).toBe(true);
      expect(r.bulletCount).toBeGreaterThanOrEqual(3);
    });

    it('returns hasSection false when fewer than 3 ingredient lines', () => {
      const text = `
Ingrédients :
- pommes
- farine
`;
      const r = findIngredientsSection(text);
      expect(r.hasSection).toBe(false);
    });

    it('accepts English ingredients header', () => {
      const text = `
Ingredients:
- 1 cup flour
- 2 eggs
- 1/2 cup sugar
`;
      const r = findIngredientsSection(text);
      expect(r.hasSection).toBe(true);
    });
  });

  describe('extractTitle', () => {
    it('returns first non-empty line as title', () => {
      expect(extractTitle('Gel fruit de la passion\n\nIngrédients')).toBe('Gel fruit de la passion');
    });
    it('returns Sans titre when no suitable line', () => {
      expect(extractTitle('')).toBe('Sans titre');
      expect(extractTitle('\n\n')).toBe('Sans titre');
    });
  });

  describe('detectRecipes', () => {
    it('returns candidates only for assistant messages with ingredients section', () => {
      const messages = [
        { role: 'user', content: 'Give me a recipe' },
        {
          role: 'assistant',
          content: `
Gel fruit de la passion

Ingrédients :
- 4 fruits de la passion
- 50 g sucre
- 2 g agar-agar

Étapes
1. Ouvrir les fruits...
2. Mélanger...
3. Porter à ébullition...
`,
        },
      ];
      const candidates = detectRecipes(messages);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].title).toBe('Gel fruit de la passion');
      expect(candidates[0].rawText).toContain('Ingrédients');
    });

    it('returns empty when no message has enough ingredient lines', () => {
      const messages = [
        { role: 'assistant', content: 'Just a short reply with no recipe.' },
      ];
      expect(detectRecipes(messages)).toHaveLength(0);
    });
  });
});
