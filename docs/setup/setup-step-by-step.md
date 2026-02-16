# Setup pas à pas

## Option 1 : Développement local

### Prérequis

- Node.js 20.x
- TypeScript global : `npm i -g typescript`
- MongoDB (Community Edition) installé et démarré, `mongosh` connecté en local
- (Optionnel) Meilisearch si tu utilises la recherche

### Étapes

1. **Cloner / ouvrir le repo** et aller à la racine.

2. **Installer les dépendances**  
   ```bash
   npm ci
   ```

3. **Builder les packages** (dans cet ordre)  
   ```bash
   npm run build:data-provider
   npm run build:data-schemas
   npm run build:api
   npm run build:client-package
   ```
   Ou en une commande :  
   ```bash
   npm run build:packages
   ```

4. **Configurer l'environnement**  
   - Copier `.env.example` vers `.env` et adapter (voir ci‑dessous le minimum requis).  
   - Copier `librechat.example.yaml` vers `librechat.yaml` et adapter si besoin.  
   Voir [env-and-config.md](env-and-config.md).

### Minimum à remplir dans le `.env`

Pour que l'application démarre **sans erreur**, il faut au minimum :

| Variable | Obligatoire | Exemple / remarque |
|----------|-------------|---------------------|
| `MONGO_URI` | **Oui** | URI de connexion MongoDB (local : `mongodb://127.0.0.1:27017/LibreChat` ; Atlas : `mongodb+srv://user:password@cluster..../LibreChat`) |
| `HOST` | Non | Défaut : `localhost` |
| `PORT` | Non | Défaut : `3080` |
| `DOMAIN_CLIENT` | Recommandé | URL du client, ex. `http://localhost:3080` (pour le bon fonctionnement des liens et du base href) |
| `DOMAIN_SERVER` | Non | Défaut dans le code : `http://localhost:3080` ; à définir si tu sers l’API ailleurs |

**Exemple minimal (développement local avec MongoDB sur la machine) :**

```env
MONGO_URI=mongodb://127.0.0.1:27017/LibreChat
HOST=localhost
PORT=3080
DOMAIN_CLIENT=http://localhost:3080
DOMAIN_SERVER=http://localhost:3080
```

Sans aucune clé API configurée, l’app tourne mais tu devras ajouter au moins un fournisseur (OpenAI, Anthropic, etc.) ou un endpoint dans `librechat.yaml` pour utiliser les modèles. Les clés peuvent être fournies dans `.env` ou par l’utilisateur dans l’interface selon la config.

5. **Lancer l'API** (terminal 1)  
   ```bash
   npm run backend:dev
   ```

6. **Lancer le client** (terminal 2)  
   ```bash
   npm run frontend:dev
   ```

7. **Ouvrir l'app**  
   Par défaut : `http://localhost:3080` (ou le PORT défini dans `.env`).

### Scripts utiles (package.json)

| Script | Usage |
|--------|--------|
| `npm run update:local` | Mettre à jour les deps en local |
| `npm run backend:dev` | API en mode dev (nodemon) |
| `npm run frontend:dev` | Client en mode dev |
| `npm run build:packages` | Builder tous les packages |
| `npm run test:all` | Tous les tests unitaires |
| `npm run e2e` | Tests E2E (Playwright, config locale) |
| `npm run lint` | Vérifier le lint |

### Tests unitaires (optionnel)

- Backend : `cp api/test/.env.test.example api/test/.env.test` puis `npm run test:api`
- Frontend : `npm run test:client`
- E2E : build client, MongoDB à jour, `cp e2e/config.local.example.ts e2e/config.local.ts`, `cp librechat.example.yaml librechat.yaml`, `npx playwright install`, puis `npm run e2e`

Référence détaillée : [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md).

---

## Docker : est-ce nécessaire ?

**Non.** Docker n’est pas obligatoire pour faire tourner LibreChat.

- **Sans Docker** : tu installes Node 20, MongoDB (et optionnellement Meilisearch) sur ta machine, tu lances le backend et le client en dev (Option 1 ci‑dessus). Idéal pour le **développement** et si tu préfères tout contrôler en local.
- **Avec Docker** : toute la stack (app, MongoDB, Meilisearch, RAG, vectordb) tourne dans des conteneurs. Pratique pour un **déploiement** ou si tu ne veux pas installer MongoDB/Meilisearch à la main. Le `docker-compose.yml` utilise une image pré‑buildée de LibreChat ; tu ne rebuilds pas le code à chaque fois.

En résumé : développement local → Option 1. Déploiement ou env “tout-en-un” → Option 2 (Docker).

---

## Option 2 : Setup Docker

### Prérequis

- **Docker** et **Docker Compose** installés sur la machine.
- Fichier **`.env`** à la racine du repo (copie de `.env.example`).

### Variables `.env` pour Docker

Le `docker-compose.yml` attend au minimum :

| Variable | Rôle | Exemple |
|----------|------|---------|
| `PORT` | Port exposé (API + client) | `3080` |
| `UID` | User ID dans les conteneurs (évite fichiers en root) | Sous Linux/macOS : `id -u` ; Windows : souvent `1000` |
| `GID` | Group ID dans les conteneurs | Sous Linux/macOS : `id -g` ; Windows : souvent `1000` |
| `MEILI_MASTER_KEY` | Clé Meilisearch (utilisée par le service meilisearch) | Une chaîne secrète (ex. générée aléatoirement) |

Dans Docker, **MongoDB est dans le conteneur** : le service `api` utilise déjà `MONGO_URI=mongodb://mongodb:27017/LibreChat`. Tu peux laisser `MONGO_URI` dans ton `.env` pour d’éventuelles commandes en dehors des conteneurs ; à l’intérieur du conteneur `api`, c’est la valeur du `docker-compose` qui prime.

**Exemple minimal `.env` pour Docker :**

```env
PORT=3080
UID=1000
GID=1000
MEILI_MASTER_KEY=une_cle_secrete_longue_et_aleatoire
```

Sous Windows (PowerShell), si tu n’as pas `id`, tu peux mettre `UID=1000` et `GID=1000` par défaut.

### Étapes

1. **Créer `.env`**  
   `cp .env.example .env` (ou copier à la main), puis remplir au moins `PORT`, `UID`, `GID`, `MEILI_MASTER_KEY` comme ci‑dessus.

2. **Lancer toute la stack**  
   À la racine du repo :
   ```bash
   docker compose up -d
   ```
   Services démarrés : **api** (LibreChat), **mongodb**, **meilisearch**, **vectordb**, **rag_api**.

3. **Volumes (données persistantes)**  
   - `./data-node` : données MongoDB  
   - `./meili_data_v1.12` : données Meilisearch  
   - `./images`, `./uploads`, `./logs` : montés dans le conteneur api  
   - Volume nommé `pgdata2` : données PostgreSQL (vectordb)

4. **Accès**  
   Ouvrir dans le navigateur : `http://localhost:3080` (ou la valeur de `PORT`).

5. **Arrêter**  
   ```bash
   docker compose down
   ```

Pour changer des ports, variables ou services, utiliser un fichier **`docker-compose.override.yaml`** (voir `docker-compose.override.yml.example`).
