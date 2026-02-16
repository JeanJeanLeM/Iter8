# PRD : Livre de recettes

## Objectif

Offrir une vue centralisée de toutes les recettes de l’utilisateur et de leurs variations, avec navigation par recette mère et par version, pour consulter, modifier ou lancer le mode recette.

## User stories

- En tant qu’utilisateur, je veux voir la liste de toutes mes recettes afin de retrouver rapidement une recette.
- En tant qu’utilisateur, je veux voir les variations d’une recette (liées à la recette mère) afin de comparer les versions (ex. avec/sans gluten).
- En tant qu’utilisateur, je veux ouvrir une recette ou une variation pour la consulter, la modifier ou la suivre en mode step-by-step.
- En tant qu’utilisateur, je veux filtrer ou rechercher dans mon livre de recettes afin de trouver une recette par nom, tag ou ingrédient.

## Critères d’acceptation

- [ ] Une page ou section « Livre de recettes » liste toutes les recettes de l’utilisateur (recettes mères).
- [ ] Pour chaque recette mère, les variations sont visibles (arbre ou liste) avec un lien parent-enfant explicite.
- [ ] Clic sur une recette ou variation ouvre la fiche détaillée (consultation, édition, mode recette).
- [ ] Recherche ou filtres par titre, tags, ingrédients (selon implémentation).
- [ ] Les recettes sont persistées en base (MongoDB) et associées à l’utilisateur.
- [ ] Pour l’instant, aucune recette d’autres utilisateurs n’est visible (privé).

## Détails techniques (optionnel)

- **Zones** : `api/` (routes, contrôleurs, modèles recette), `client/` (pages/composants Livre de recettes), `packages/data-schemas` (schémas recette si partagés).
- **Données** : modèle Recette avec `userId`, `parentId` (null pour recette mère), `variationNote`, champs du JSON recette.
- **Config** : pas de nouveau .env obligatoire pour cette feature seule.

## Priorité

- [x] Haute

## Notes

- À terme : recettes publiques et recettes d’autres users (hors scope de ce PRD).
