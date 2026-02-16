# PRD : Création de recette (modèle JSON)

## Objectif

Définir le modèle JSON de recette qui permet au chat (LLM) de communiquer l’état d’une recette (ingrédients, étapes, description, durée, matériel, portions, etc.) et au client d’afficher et persister cette structure.

## User stories

- En tant qu’utilisateur, je veux que le LLM puisse proposer ou mettre à jour une recette structurée dans la conversation afin d’éviter du texte libre non exploitable.
- En tant qu’utilisateur, je veux que la recette affichée côté interface reflète exactement ce que le LLM a décrit (ingrédients, étapes, durée, matériel).
- En tant qu’utilisateur, je veux pouvoir enregistrer cette recette en un clic depuis le chat afin de la retrouver dans le livre de recettes.

## Critères d’acceptation

- [ ] Un schéma JSON de recette est défini et documenté (title, description, portions, duration, ingredients, steps, equipment, tags, etc.).
- [ ] Le LLM peut mettre à jour la recette via un outil/fonction (tool/function call) ou un format convenu dans le flux du chat.
- [ ] Le client affiche un bloc « Recette » (ingrédients, étapes, durée, matériel) mis à jour en temps réel ou après réponse du LLM.
- [ ] Un bouton « Enregistrer la recette » (ou équivalent) enregistre l’état courant dans le livre de recettes.
- [ ] Les quantités d’ingrédients peuvent être exprimées en fonction du nombre de portions (champ `portions` et calcul côté client ou côté outil).

## Détails techniques (optionnel)

- **Schéma proposé** (exemple) :
  - `title`, `description`, `portions` (number), `duration` (string ou objet { prep, cook, total })
  - `ingredients`: `[{ name, quantity?, unit?, note? }]`
  - `steps`: `[{ order, instruction, ingredientsUsed? }]` (optionnel : lier étapes et ingrédients)
  - `equipment`: `string[]`, `tags`: `string[]`
- **Zones** : `api/` (validation, persistance), `client/` (affichage recette dans le chat, bouton export), `packages/data-schemas` (RecipeSchema), outils LLM (tools/functions).
- **Dépendances** : définition d’un outil « update_recipe » ou équivalent pour le provider de chat utilisé.

## Priorité

- [x] Haute

## Notes

- Ce modèle est la base pour l’import depuis le chat, le mode step-by-step et le calcul des quantités par portion.
