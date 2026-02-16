# Fonctionnalités supprimées

Ce dossier documente les features retirées du projet LibreChat pour permettre de les reconstruire facilement si besoin.

## Objectif

- **Traçabilité** : garder une trace claire de ce qui a été enlevé et pourquoi.
- **Reconstruction** : fournir assez de détails techniques pour réintégrer la feature rapidement.
- **Historique** : PRD de la feature supprimée pour comprendre son rôle et ses critères d’acceptation.

## Structure

Pour chaque feature supprimée, créer un sous-dossier avec :

| Fichier | Description |
|---------|-------------|
| `README.md` ou `prd_<nom_feature>.md` | PRD de la feature retirée (objectif, user stories, critères d’acceptation, zones impactées). |
| `manifest.md` (optionnel) | Liste des fichiers/snippets supprimés, commits de référence, ou liens vers des patchs. |

Le nom du dossier doit être en `snake_case` (ex. `agents_marketplace`, `share_conversations`, `mcp_servers`).

## Workflow de suppression

1. **Avant de supprimer** : créer le dossier et rédiger le PRD basé sur `_template_removed.md`.
2. **Lors de la suppression** : noter les fichiers modifiés/supprimés dans `manifest.md`.
3. **Après** : vérifier build et tests (`npm run build:packages`, `npm run build:client`, `npm run test:all`).

## Liste des features candidates à la suppression

Fonctionnalités identifiées comme potentiellement retirables (sélectionner celles à enlever) :

| Feature | Description | Fichiers principaux (API / client) |
|---------|-------------|-----------------------------------|
| **Agents Marketplace** | Marché d’agents, catégories, browsing | `api/server/routes/agents/`, `client/src/components/Agents/Marketplace*`, routes `/agents` |
| **Share** | Partage de conversations par lien public | `api/server/routes/share.js`, `client/src/routes/ShareRoute.tsx` |
| **Search** | Recherche globale (Meilisearch) | `api/server/routes/search.js`, `client/src/routes/Search.tsx` |
| **MCP** | Model Context Protocol (servers, tools) | `api/server/routes/mcp.js`, services MCP, config |
| **OAuth / Social Login** | Connexion Google, GitHub, etc. | `api/server/routes/oauth.js`, `configureSocialLogins`, `client/src/components/OAuth` |
| **Memories** | Mémoire persistante utilisateur | `api/server/routes/memories.js`, composants memories |
| **Tags** | Étiquetage des conversations | `api/server/routes/tags.js`, UI tags |
| **Remote Agents / API Keys** | Agents distants, clés API custom | `api/server/routes/apiKeys.js`, config remote-agents |
| **Assistants** | Assistants (OpenAI style) | `api/server/routes/assistants/` |
| **2FA** | Authentification à deux facteurs | `api/server/controllers/TwoFactorController.js`, `client/src/components/Auth` |

Indiquer dans une demande ou dans un ticket les features à retirer pour générer la documentation et procéder à la suppression.
