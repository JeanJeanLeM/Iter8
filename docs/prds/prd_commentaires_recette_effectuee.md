# PRD : Commentaires sur une recette effectuée

## Objectif

Permettre à l’utilisateur d’ajouter des commentaires sur une recette (ou une variation) après l’avoir réalisée : notes, ajustements, succès ou échecs, pour s’en souvenir et améliorer les prochaines fois.

## User stories

- En tant qu’utilisateur, je veux ajouter un commentaire après avoir fait une recette afin de noter ce qui a bien ou moins bien fonctionné.
- En tant qu’utilisateur, je veux consulter les commentaires que j’ai laissés sur une recette ou une variation afin de m’en souvenir la prochaine fois.
- En tant qu’utilisateur, je veux que ces commentaires soient reliés à mon journal de cuisine (quelle recette, quand, quel commentaire).

## Critères d’acceptation

- [ ] Sur la fiche d’une recette (ou variation), l’utilisateur peut ajouter un commentaire « après réalisation » (texte libre, optionnellement date/heure de réalisation).
- [ ] Les commentaires sont enregistrés et associés à la recette (ou variation) et à l’utilisateur.
- [ ] L’utilisateur peut voir la liste des commentaires sur une recette (ordre chronologique ou plus récent en premier).
- [ ] Option : associer une date de réalisation au commentaire (ex. « fait le 12/02/2025 ») pour alimenter le journal de cuisine.
- [ ] Pour l’instant, les commentaires sont privés (uniquement visibles par l’utilisateur).

## Détails techniques (optionnel)

- **Modèle** : entité Commentaire ou champ sur la recette (recipeId, userId, content, realizedAt?, createdAt).
- **Zones** : `api/` (routes CRUD commentaires ou champ sur recette/realization), `client/` (formulaire et affichage des commentaires sur la fiche recette).
- **Lien journal** : une « réalisation » (recette + date + commentaire) peut être la base du journal de cuisine (PRD dédié).

## Priorité

- [ ] Moyenne

## Notes

- Complément naturel au journal de cuisine : le journal affiche les réalisations avec le commentaire associé.
