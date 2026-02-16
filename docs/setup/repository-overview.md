# Vue d'ensemble du repository

## Stack technique

- **Runtime** : Node.js 20.x
- **Package manager** : npm (workspaces)
- **Workspaces** : `api`, `client`, `packages/*` (api, client, data-provider, data-schemas)
- **Base de données** : MongoDB (principal), optionnel Meilisearch (recherche), pgvector (vectordb pour RAG)
- **Backend** : Express (api en JS), packages en TypeScript
- **Frontend** : React (client en TS/TSX)
- **RAG** : RAG API (service séparé, dépend de vectordb)

## Fichiers clés à la racine

| Fichier | Rôle |
|---------|------|
| `package.json` | Scripts npm, workspaces, dépendances |
| `docker-compose.yml` | Stack Docker : api, mongodb, meilisearch, vectordb, rag_api |
| `.env.example` | Modèle des variables d'environnement |
| `librechat.example.yaml` | Modèle de configuration (endpoints, modèles, interface, etc.) |

## Structure des répertoires

| Répertoire | Rôle |
|------------|------|
| `api/` | Serveur Express (JavaScript), routes, logique métier |
| `client/` | Application React (TypeScript/TSX), UI |
| `packages/api/` | Code API partagé (TypeScript), compilé et utilisé par le projet |
| `packages/client/` | Composants et thème partagés (TypeScript) |
| `packages/data-provider/` | Couche data / requêtes partagées |
| `packages/data-schemas/` | Schémas et types partagés |
| `config/` | Scripts utilitaires (create-user, update, migrations, etc.) |
| `e2e/` | Tests E2E Playwright |
| `helm/` | Charts Helm pour déploiement Kubernetes |

## Ordre de build (développement local)

1. `npm ci`
2. `npm run build:data-provider`
3. `npm run build:data-schemas`
4. `npm run build:api`
5. Ensuite : `npm run backend:dev` (API) et `npm run frontend:dev` (client)

Voir [setup-step-by-step.md](setup-step-by-step.md) pour les étapes détaillées.
