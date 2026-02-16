# PRD : Mode recette (step-by-step)

## Objectif

Offrir un mode dédié pour suivre une recette étape par étape : affichage des ingrédients et instructions par étape, modification du nombre de portions avec recalcul des quantités, et navigation claire d’étape à étape.

## User stories

- En tant qu’utilisateur, je veux suivre une recette étape par étape afin de ne pas me perdre pendant la préparation.
- En tant qu’utilisateur, je veux modifier le nombre de portions et voir les quantités d’ingrédients mises à jour à chaque étape.
- En tant qu’utilisateur, je veux naviguer entre les étapes (précédent / suivant) sans avoir à scroller tout le document.
- En tant qu’utilisateur, je veux voir clairement l’étape courante, les ingrédients nécessaires pour cette étape (ou pour toute la recette selon le modèle), et l’instruction.

## Critères d’acceptation

- [ ] Un « mode recette » (vue ou page dédiée) affiche une recette de manière step-by-step.
- [ ] Sélecteur ou champ « Nombre de portions » : modification possible ; les quantités d’ingrédients sont recalculées en fonction du ratio portions de base / portions choisies.
- [ ] Navigation étape à étape : boutons ou liens « Étape précédente » / « Étape suivante », avec indication de l’étape courante (ex. « Étape 2 / 6 »).
- [ ] Pour chaque étape (ou en en-tête), affichage des ingrédients concernés ou de la liste complète avec quantités recalculées.
- [ ] La recette affichée est celle du livre (recette ou variation sélectionnée) ; les champs `ingredients` et `steps` du modèle JSON sont la source.
- [ ] Option : mode plein écran ou mise en page adaptée « cuisine » (lisibilité, grosses polices).

## Détails techniques (optionnel)

- **Calcul des quantités** : stocker les quantités pour une référence de portions (ex. `portions` dans le JSON) ; côté client : `quantity * (portionsChoisies / portionsReference)`.
- **Zones** : `client/` (composant ou page Mode recette, sélecteur de portions, liste d’étapes avec navigation).
- **Modèle** : réutilisation du schéma recette (ingredients avec quantity/unit, steps avec order/instruction) ; si besoin, lier `steps` aux ingrédients utilisés par étape pour n’afficher que les ingrédients pertinents par étape.
- **Config** : pas de .env spécifique.

## Priorité

- [x] Haute

## Notes

- Dépend du modèle JSON de recette (PRD création recette) et du livre de recettes pour choisir la recette à suivre.
