# Schéma JSON de recette

Modèle de données utilisé pour la communication LLM–client et la persistance des recettes.

## Champs principaux

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `title` | string | oui | Titre de la recette |
| `description` | string | non | Description ou résumé |
| `portions` | number | non | Nombre de portions (les quantités sont exprimées pour ce nombre) |
| `duration` | number \| object | non | Durée totale en minutes, ou `{ prep?, cook?, total? }` (chacun en minutes) |
| `ingredients` | array | non | Liste d’ingrédients (défaut: `[]`) |
| `steps` | array | non | Étapes de la recette (défaut: `[]`) |
| `equipment` | string[] | non | Matériel nécessaire (défaut: `[]`) |
| `tags` | string[] | non | Tags (défaut: `[]`) |

## Objet ingrédient

```json
{
  "name": "farine",
  "quantity": 250,
  "unit": "g",
  "note": "tamiser"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `name` | string | oui | Nom de l’ingrédient |
| `quantity` | number | non | Quantité (pour `portions` portions) |
| `unit` | string | non | Unité (g, ml, c. à soupe, etc.) |
| `note` | string | non | Note optionnelle |

## Objet étape

```json
{
  "order": 1,
  "instruction": "Préchauffer le four à 180°C.",
  "ingredientsUsed": ["farine", "œufs"]
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `order` | number | oui | Ordre de l’étape (1-based) |
| `instruction` | string | oui | Instruction textuelle |
| `ingredientsUsed` | string[] | non | Noms des ingrédients utilisés dans cette étape |

## Durée

- **number** : durée totale en minutes (ex. `45`)
- **object** : détail prep / cook / total (ex. `{ "prep": 15, "cook": 30, "total": 45 }`)

## Exemple complet

```json
{
  "title": "Gâteau au chocolat",
  "description": "Un gâteau moelleux et rapide.",
  "portions": 6,
  "duration": { "prep": 15, "cook": 35, "total": 50 },
  "ingredients": [
    { "name": "chocolat noir", "quantity": 200, "unit": "g" },
    { "name": "beurre", "quantity": 150, "unit": "g" },
    { "name": "farine", "quantity": 100, "unit": "g", "note": "tamiser" },
    { "name": "œufs", "quantity": 3, "unit": "" }
  ],
  "steps": [
    { "order": 1, "instruction": "Faire fondre le chocolat et le beurre au bain-marie." },
    { "order": 2, "instruction": "Incorporer la farine et les œufs.", "ingredientsUsed": ["farine", "œufs"] }
  ],
  "equipment": ["saladier", "moule à gâteau", "four"],
  "tags": ["dessert", "chocolat", "facile"]
}
```

## Champs supplémentaires (persistance)

Pour la base MongoDB et le livre de recettes, des champs supplémentaires sont gérés côté API :

- `userId`, `parentId`, `variationNote` (variations)
- `dishType` (`entree` | `plat` | `dessert`), `cuisineType`, `diet`
- `imageUrl`

Ces champs ne sont pas requis pour le flux chat (outil `update_recipe`).

## Agent par défaut

Pour créer un agent « Assistant Recettes » avec l’outil `update_recipe` activé par défaut :

```bash
npm run create-recipe-agent
```

L’agent est créé pour le premier utilisateur de la base. Pour cibler un utilisateur précis :

```bash
npm run create-recipe-agent -- --email=user@example.com
```

Après création, sélectionnez l’agent « Assistant Recettes » dans le chat pour utiliser la fonctionnalité de création de recettes.
