# PRD (supprimé) : [Nom de la feature]

> Ce document décrit une feature **retirée** du projet. Il sert de référence pour la reconstruire si nécessaire.

## Objectif

Une phrase ou un paragraphe décrivant le but de la feature et la valeur pour l'utilisateur.

## User stories

- En tant que …, je veux … afin de …
- …

## Critères d'acceptation

- [ ] …
- [ ] …

## Détails techniques (pour reconstruction)

### Zones du code impactées

- **API** : routes, contrôleurs, services concernés.
- **Client** : composants React, routes, hooks.
- **Packages** : `packages/*` si applicable.
- **Config** : `.env`, `librechat.yaml`, variables d’environnement.

### Dépendances

- Nouvelles libs, services externes (ex. Meilisearch).
- Config (.env, librechat.yaml) si nécessaire.

### Fichiers / dossiers supprimés ou modifiés

| Fichier | Action (supprimé / modifié) |
|---------|-----------------------------|
| `api/server/routes/xxx.js` | supprimé |
| `client/src/components/Xxx.tsx` | modifié (retrait des imports/usage) |

### Commits de référence

- `hash` — description du commit de suppression (à remplir après suppression).

## Priorité (au moment de la suppression)

- [ ] Haute / Moyenne / Basse (utilité pour réintégration future)

## Notes

- Raison de la suppression : …
- Compatibilité : version LibreChat de référence, branches, etc.
