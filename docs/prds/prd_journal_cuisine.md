# PRD : Journal de cuisine

## Objectif

Proposer un journal qui rappelle quelle recette a été effectuée, quand, et avec quel commentaire, pour garder un historique des réalisations et s’améliorer.

## User stories

- En tant qu’utilisateur, je veux voir un journal de mes réalisations (recette + date + commentaire) afin de me souvenir de ce que j’ai fait et de mes retours.
- En tant qu’utilisateur, je veux filtrer ou trier le journal par date ou par recette afin de retrouver rapidement une réalisation passée.
- En tant qu’utilisateur, je veux ouvrir une entrée du journal pour revoir la recette et le commentaire associé.

## Critères d’acceptation

- [ ] Une section ou page « Journal de cuisine » affiche les réalisations : recette (ou variation), date de réalisation, commentaire éventuel.
- [ ] Chaque entrée est cliquable pour accéder à la fiche recette et au détail du commentaire.
- [ ] Les entrées sont créées lorsqu’un commentaire « recette effectuée » est ajouté avec une date de réalisation (ou à la date du commentaire par défaut).
- [ ] Tri par date (plus récent en premier par défaut) ; option de filtre par recette ou par période.
- [ ] Données persistées en base (réalisation = recette + user + date + commentaire).

## Détails techniques (optionnel)

- **Modèle** : Realization ou JournalEntry (userId, recipeId, realizedAt, commentId ou comment inline).
- **Zones** : `api/` (routes journal, agrégation réalisations), `client/` (page ou composant Journal de cuisine).
- **Dépendances** : PRD commentaires sur recette effectuée (pour lier commentaire et date de réalisation).

## Priorité

- [ ] Moyenne

## Notes

- Le journal peut être alimenté automatiquement à chaque ajout d’un commentaire « recette effectuée » avec date.
