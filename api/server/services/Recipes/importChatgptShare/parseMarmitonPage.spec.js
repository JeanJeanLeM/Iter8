const { validateMarmitonUrl, parseMarmitonHtml } = require('./parseMarmitonPage');

describe('importChatgptShare/parseMarmitonPage', () => {
  describe('validateMarmitonUrl', () => {
    it('accepts marmiton recipe URLs', () => {
      expect(
        validateMarmitonUrl(
          'https://www.marmiton.org/recettes/recette_cinnamon-rolls-de-karine_327467.aspx',
        ).valid,
      ).toBe(true);
    });

    it('rejects non-marmiton hosts', () => {
      expect(validateMarmitonUrl('https://chatgpt.com/share/abc').valid).toBe(false);
    });

    it('rejects non-recipe marmiton pages', () => {
      expect(validateMarmitonUrl('https://www.marmiton.org/recettes').valid).toBe(false);
    });
  });

  describe('parseMarmitonHtml', () => {
    it('extracts title, ingredients and steps from a marmiton-like page', () => {
      const html = `
        <html>
          <body>
            <h1>Cinnamon rolls de Karine</h1>
            <h2>Ingrédients</h2>
            <p>500 g de farine</p>
            <p>100 g de beurre</p>
            <p>2 sachets de levure</p>
            <p>Ustensiles</p>
            <h2>Préparation</h2>
            <p>Étape 1</p>
            <p>Dissoudre la levure dans le lait tiède.</p>
            <p>Étape 2</p>
            <p>Pétrir la pâte pendant 10 minutes.</p>
          </body>
        </html>
      `;
      const parsed = parseMarmitonHtml(html);
      expect(parsed.title).toBe('Cinnamon rolls de Karine');
      expect(parsed.ingredients).toEqual(
        expect.arrayContaining(['500 g de farine', '100 g de beurre', '2 sachets de levure']),
      );
      expect(parsed.steps).toHaveLength(2);
      expect(parsed.recipeText).toContain('Ingrédients :');
      expect(parsed.recipeText).toContain('Préparation :');
    });
  });
});
