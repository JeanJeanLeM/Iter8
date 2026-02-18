# Brief d'illustration – ingrédients

À respecter par tous les agents pour des résultats homogènes.

## Règles

- **Couleur** : 3 à 4 couleurs selon l’ingrédient.
- **Interdit** : yeux, bras, jambes, visage ou toute caractéristique humaine sur l’ingrédient.
- **Fond** : blanc uni.
- **Cadrage** : sujet centré, image **carrée**, **basse résolution** (ex. 256×256 ou 512×512).
- **Style** : simple, type icône / flat (pas de photo réaliste).

## Workflow (mode 4x)

- Chaque agent ouvre **un seul** fichier `batch-XX.json` (Agent 1 → batch-01, Agent 2 → batch-02, etc.).
- Pour chaque entrée du tableau `ingredients` : générer une image avec le champ `prompt` fourni.
- Enregistrer l’image avec le nom **`{name}.png`** (ex. `yaourt.png`) dans le dossier **`client/public/images/ingredients/`**.
- L’app sert ces images sous `/images/ingredients/{name}.png`.
- Après génération, lancer `npm run assign:ingredient-images` pour mettre à jour la DB.
