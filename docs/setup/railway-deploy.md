# Déployer sur Railway – pas à pas

Tu déploies ton app CookIter8 (avec recettes, journal, etc.) sur Railway. L'app aura une URL du type `https://ton-projet.up.railway.app` que ta mère pourra ouvrir.

---

## Important : un seul service, build Dockerfile

Railway peut détecter le monorepo et créer **plusieurs** services (data-schemas, api, frontend, etc.). Pour cette app il faut **un seul** service qui build avec le **Dockerfile** à la racine. Dès la création du projet, dans le service : **Settings** → **Build** → Builder = **Dockerfile**, Root Directory = racine du repo. Si tu vois 5–6 services, supprime les autres et garde un seul service configuré en Dockerfile.

---

## Prérequis

- Le code est sur **ton** dépôt GitHub.
- Un cluster **MongoDB Atlas** (gratuit) avec une URI de connexion dans ton `.env` local. Tu réutiliseras cette URI sur Railway.

---

## 1. Créer le projet Railway

1. Va sur **[railway.app](https://railway.app)** et connecte-toi avec **GitHub**.
2. Clique sur **New Project**.
3. Choisis **Deploy from GitHub repo**.
4. Autorise Railway à accéder à tes repos si demandé, puis sélectionne **ton** dépôt (ton fork, pas `danny-avila/LibreChat`).
5. Railway crée un projet et détecte en général le **Dockerfile** → il lance un build. Laisse faire.

---

## 2. MongoDB : utiliser Atlas (recommandé)

Tu as déjà MongoDB Atlas. Sur Railway, on n'ajoute pas de base : on donne l'URI Atlas.

- Dans ton projet Atlas : **Database** → **Connect** → **Drivers** → copie l'URI (du type `mongodb+srv://user:password@cluster....mongodb.net/...`).
- Assure-toi que le mot de passe dans l'URI est **celui que tu as changé** après l'alerte GitHub (pas l'ancien exposé).
- Sur Atlas, **Network Access** : ajoute **0.0.0.0/0** (Allow from anywhere) pour que Railway puisse se connecter.

Tu mettras cette URI dans les variables d'environnement à l'étape 4.

---

## 3. Récupérer l'URL publique du service

1. Dans le projet Railway, clique sur le **service** (la carte de ton app).
2. Onglet **Settings** → section **Networking** → **Generate Domain** (ou **Public Networking**).
3. Railway te donne une URL, par ex. `https://librechat-production-xxxx.up.railway.app`. **Copie cette URL** : tu en auras besoin pour `DOMAIN_CLIENT` et `DOMAIN_SERVER`.

Si tu génères le domaine après avoir mis les variables, pense à mettre à jour `DOMAIN_CLIENT` et `DOMAIN_SERVER` avec cette URL.

---

## 4. Variables d'environnement

1. Toujours dans le service, va dans l'onglet **Variables** (ou **Settings** → **Variables**).
2. Ajoute les variables une par une (ou import si Railway propose un import).  
   **Minimum pour que ça tourne :**

| Variable        | Valeur |
|----------------|--------|
| `MONGO_URI`    | Ton URI MongoDB Atlas complète (avec le nouveau mot de passe). |
| `DOMAIN_CLIENT`| L'URL Railway du service, ex. `https://ton-projet.up.railway.app` |
| `DOMAIN_SERVER`| La même URL, ex. `https://ton-projet.up.railway.app` |
| `HOST`         | `0.0.0.0` |
| `PORT`         | `3080` |
| `JWT_SECRET`   | **Obligatoire.** Chaîne aléatoire (64 car. hex). Sans elle → **500** au login. Génère avec : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | **Obligatoire.** Autre chaîne aléatoire (différente de JWT_SECRET). |
| `ALLOW_REGISTRATION` | `true` (pour permettre la création de compte ; sans elle → **403 Forbidden**). |

3. **Optionnel** (tu peux ajouter plus tard) :  
   - Clés API (OpenAI, Anthropic, etc.) si tu veux que l'app utilise des modèles.  
   - `MEILI_*` seulement si tu ajoutes Meilisearch plus tard (pas obligatoire pour un premier déploiement).

4. Sauvegarde. Railway redéploie automatiquement si le build est déclenché par les variables.

---

## 5. Port exposé

Railway utilise souvent le `PORT` fourni par la plateforme. Vérifie dans **Settings** → **Networking** / **Deploy** :

- Soit Railway injecte `PORT` (ex. 3000 ou autre) : dans ce cas mets **`PORT`** dans les variables avec la valeur que Railway attend (souvent on laisse Railway le définir et on met seulement `HOST=0.0.0.0`).
- Si la doc Railway dit d'exposer un port précis, mets `PORT=3080` et vérifie que le Dockerfile expose bien **3080** (c'est le cas dans ton projet).

En pratique : ajouter **PORT** = **3080** dans les variables suffit souvent.

---

## 6. Déploiement

1. Après avoir mis **MONGO_URI**, **DOMAIN_CLIENT**, **DOMAIN_SERVER**, **HOST**, **PORT**, **JWT_SECRET**, **JWT_REFRESH_SECRET**, sauvegarde les variables.
2. Si le build a échoué ou n'a pas redéclenché : onglet **Deployments** → **Redeploy** (ou push un petit commit sur GitHub pour relancer le build).
3. Quand le statut est vert (Success), ouvre l'URL générée à l'étape 3 : tu devrais voir la page de login CookIter8.

---

## 7. Premier utilisateur

- La première fois, tu peux créer un compte depuis l'interface (si l'inscription est activée) ou utiliser un script d'invitation / création d'utilisateur du projet (voir la doc du projet ou `config/invite-user.js`).
- **Connexion après inscription** : si la connexion échoue après la création du compte (erreur 401 ou « identifiants incorrects »), vérifie ton mot de passe. Si la vérification d'email est activée, ajoute **`ALLOW_UNVERIFIED_EMAIL_LOGIN=true`** dans les variables pour autoriser la connexion avant vérification du mail (ou consulte tes mails pour le lien de vérification).
- Donne ensuite le **lien Railway** (ex. `https://ton-projet.up.railway.app`) à ta mère.

---

## Agents (Assistant Recettes, Planificateur de repas) : visibles pour tout le monde

CookIter8 n’est pas une base vide pour créer des agents : ce sont des **agents préconstruits** (recettes, meal planner) que tous les utilisateurs doivent voir.

### Pourquoi les agents créés en local ne sont pas visibles sur Railway ?

1. **Base de données différente**  
   Les agents sont stockés dans **MongoDB**. Si Railway utilise une autre base (autre `MONGO_URI` que ton poste), la collection des agents sur Railway est vide ou différente. Les agents créés en local n’existent pas dans cette base.

2. **Même base mais permissions**  
   Même avec la **même** `MONGO_URI` (ex. Atlas partagé), par défaut seuls l’auteur et les partages explicites voient un agent. Les autres utilisateurs (ou un nouvel utilisateur sur Railway) n’ont pas la permission VIEW.

### S’assurer que les agents sont visibles pour tout le monde

- **Utiliser la même MongoDB**  
  Configure **la même** `MONGO_URI` (ex. ton cluster Atlas) en local et sur Railway. Ainsi les agents créés une fois sont dans la même base.

- **Créer les agents une fois, visibles par tous**  
  Les scripts `config/create-recipe-agent.js` et `config/create-meal-planner-agent.js` créent les agents **et** leur donnent un accès **public** (VIEW pour tout le monde). Dès qu’ils sont exécutés contre la base utilisée par Railway, tous les utilisateurs (y compris sur l’app hébergée) voient « Assistant Recettes » et « Planificateur de repas ».

**Sur Railway (premier déploiement ou nouvelle base) :**

1. Déploie l’app avec la bonne `MONGO_URI` (Atlas ou autre).
2. Crée au moins un utilisateur (inscription ou `config/invite-user.js`).
3. Exécute les scripts **une fois** contre cette base (en local avec la même `MONGO_URI`, ou via une tâche/commande Railway si tu en mets une en place) :
   - `npm run create-recipe-agent`
   - `npm run create-meal-planner-agent`  
   Tu peux passer un utilisateur précis : `npm run create-recipe-agent -- --email=admin@example.com`.
4. Après ça, tous les utilisateurs (local + Railway) voient ces agents et peuvent les utiliser.

**En local avec la même `MONGO_URI` que Railway :**  
Exécuter les deux scripts en local suffit : les agents et les permissions publiques sont dans la base partagée, donc visibles sur l’app hébergée.

**Résumé :** même MongoDB partagée + exécution une fois des scripts de création = agents CookIter8 (recettes, meal planner) visibles pour tout le monde, partout (local et Railway).

**Agents déjà créés (sans accès public) :** si tu as créé les agents avant que les scripts n’ajoutent l’accès public, exécute une fois : `npm run grant-public-cookiter8-agents`. Cela accorde la permission VIEW à tous pour « Assistant Recettes » et « Planificateur de repas ».

---

## Ajouter Meilisearch (recherche dans les conversations)

Meilisearch sert à la **recherche** (messages, conversations). Sans lui, l'app tourne mais la recherche peut être désactivée ou limitée. Pour l'ajouter sur Railway :

### 1. Créer un service Meilisearch sur Railway

1. Dans le **même projet** Railway, clique sur **+ New** (ou **Add Service**).
2. Choisis **Deploy from Docker Image** (ou **Empty Service** puis dans Settings → Source → **Docker Image**).
3. **Image** : `getmeili/meilisearch:v1.12.3`
4. **Variables** pour ce service :
   - `MEILI_MASTER_KEY` = une clé secrète de ton choix (ex. une longue chaîne aléatoire). **Note-la** : tu la réutiliseras dans l'app.
   - `MEILI_NO_ANALYTICS` = `true`
5. **Settings** → **Networking** → **Generate Domain** pour ce service. Tu obtiens une URL du type `https://meilisearch-xxx.up.railway.app`. **Copie l'URL** (sans le `https://` pour l'hôte si besoin : Meilisearch écoute sur le port 80 en public, donc l'URL complète suffit).

### 2. Brancher l'app à Meilisearch

1. Ouvre le service de ton app (ex. CookIter8).
2. **Variables** → ajoute :
   - `MEILI_HOST` = l'URL **publique** du service Meilisearch, ex. `https://meilisearch-xxx.up.railway.app` (avec `https://`).
   - `MEILI_MASTER_KEY` = **la même** clé que celle du service Meilisearch.
   - `MEILI_NO_ANALYTICS` = `true`
   - (Optionnel) `SEARCH` = `true` si ce n'est pas déjà activé.
3. Sauvegarde. Railway redéploie l'app.

### 3. Vérifier

Après redéploiement, la recherche dans les conversations devrait fonctionner. Si l'app affiche une erreur Meilisearch, vérifie que `MEILI_HOST` est bien l'URL complète (avec `https://`) et que la clé est identique des deux côtés.

**Résumé des variables Meilisearch (côté app) :**

| Variable | Valeur |
|----------|--------|
| `MEILI_HOST` | URL du service Meilisearch (ex. `https://meilisearch-xxx.up.railway.app`) |
| `MEILI_MASTER_KEY` | Même clé que sur le service Meilisearch |
| `MEILI_NO_ANALYTICS` | `true` |

---

## Résumé rapide

| Où | Quoi |
|----|------|
| **Railway** | New Project → Deploy from GitHub → ton repo. |
| **MongoDB** | Garder Atlas, URI avec le **nouveau** mot de passe, 0.0.0.0/0 autorisé. |
| **Variables** | `MONGO_URI`, `DOMAIN_CLIENT`, `DOMAIN_SERVER`, `HOST=0.0.0.0`, `PORT=3080`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOW_REGISTRATION=true`. |
| **Domaine** | Générer un domaine dans Settings → Networking, et l'utiliser dans `DOMAIN_CLIENT` / `DOMAIN_SERVER`. |

Si une étape ne colle pas à ce que tu vois (nouvelle interface Railway), dis-moi à quelle étape tu es et ce qui s'affiche, et on ajuste.

---

## Erreur 500 (Internal Server Error) au login

Si le login renvoie **500** avec le message « Something went wrong » :

- Il manque **`JWT_SECRET`** et/ou **`JWT_REFRESH_SECRET`** sur Railway.
- Ajoute ces deux variables avec des chaînes aléatoires (voir tableau ci-dessus).
- Sauvegarde → Railway redéploie → réessaie.

---

## Erreur 403 (Forbidden) sur la création de compte

Si en créant un compte tu obtiens **POST …/api/auth/register 403 (Forbidden)** :

- L'inscription est désactivée côté serveur. Dans Railway → ton service → **Variables**, ajoute **`ALLOW_REGISTRATION`** = **`true`**.
- Sauvegarde (Railway redéploie). Réessaie ensuite la création de compte.

---

## Erreur « Cannot find module @librechat/data-schemas/dist/index.cjs »

Ça arrive quand Railway **ne build pas** les packages du monorepo avant de lancer le backend. Deux solutions :

### A. Utiliser le Dockerfile (recommandé)

Dans le service → **Settings** → **Build** : **Builder** = **Dockerfile**, **Root Directory** = racine du repo. Le Dockerfile fait déjà `npm run frontend` puis `npm run backend`. Redéploie.

### B. Forcer le build au démarrage du conteneur (contournement fiable)

Si Railway lance le conteneur **sans** utiliser l'image buildée par le Dockerfile (par ex. il exécute seulement `npm run backend`), les `dist/` des packages sont absents. Contournement :

1. Dans Railway → ton service → **Settings** → **Deploy** (ou **Start Command**).
2. Remplace la commande de démarrage par : **`npm start`**
3. Le script **`start`** dans `package.json` fait : `npm run frontend` puis `npm run backend`. Au premier lancement le build s'exécute dans le conteneur (2–5 min), puis le backend démarre.

Inconvénient : chaque redémarrage du conteneur refait un build. Pour éviter ça, il faut que Railway utilise vraiment l'image produite par le Dockerfile (vérifier Root Directory = racine, pas de surcharge de la commande de run).

### C. Builder avec le repo (Nixpacks)

Le fichier **`railway.toml`** à la racine impose Build = `npm run frontend`, Start = `npm run backend`. Utile si tu n'utilises pas le Dockerfile. Commit et push, puis redéploie.

---

## Erreur 401 (Unauthorized) – le chat agent / meal planner ne termine jamais

En production (Railway), si la console navigateur affiche **401 error, refreshing token** et que les appels au Planificateur de repas (ou tout agent) ne se terminent jamais (POST `/api/agents/chat/agents` ou `/api/agents/chat/abort` en 401), l’authentification est rejetée côté serveur.

### Vérifications

1. **DOMAIN_CLIENT et DOMAIN_SERVER**
   - Doivent être **exactement** l’URL publique du service, sans slash final, en **https**.
   - Ex. : `https://iter8-test.up.railway.app` (et non `http://...` ni `https://.../`).
   - Si l’URL Railway a changé (nouveau domaine généré), mets à jour ces deux variables et redéploie.

2. **JWT_SECRET et JWT_REFRESH_SECRET**
   - Doivent être définis sur Railway (voir section « Variables d’environnement »).
   - Si tu les as modifiés après un déploiement, **tous les anciens tokens deviennent invalides** : il faut se **déconnecter puis se reconnecter** (ou vider les cookies du site et se reconnecter).

3. **Reconnexion après déploiement**
   - Après un redéploiement ou un changement de `JWT_*` ou de domaine, les tokens en mémoire/cookies peuvent être invalides. **Se déconnecter et se reconnecter** règle la plupart des 401 sur le chat agent.

4. **Cookies (refresh token)**
   - L’app utilise un cookie `refreshToken` (httpOnly, secure en production) pour renouveler le token. Si tu accèdes à l’app via une URL différente de celle configurée (ex. ancien lien, redirect, autre sous-domaine), le cookie peut ne pas être envoyé → le refresh échoue et tu restes en 401. Utilise **toujours** l’URL définie dans `DOMAIN_CLIENT` / `DOMAIN_SERVER`.

### En résumé

- Vérifier **DOMAIN_CLIENT** / **DOMAIN_SERVER** (https, pas de slash final).
- Ne pas changer **JWT_SECRET** / **JWT_REFRESH_SECRET** sans que les utilisateurs se reconnectent.
- En cas de 401 persistant : **se déconnecter, se reconnecter**, puis réessayer le meal planner.
