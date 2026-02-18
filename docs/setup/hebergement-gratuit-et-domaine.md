# Héberger l’app (gratuit) et donner un lien à ta mère

Objectif : l’app tourne 24/7 sans ton PC, ta mère ouvre un lien (idéalement un nom de domaine personnalisé).

---

## Option 1 : La plus simple (quelques clics) — Railway ou Zeabur

**Idéal pour commencer.** Tu connectes ton GitHub, tu déploies, tu récupères un lien du type `ton-app.railway.app` ou `ton-app.zeabur.app`.

### Prérequis

- Le code du projet est déjà sur **ton** dépôt GitHub (voir [github-push.md](./github-push.md)).

### Railway (recommandé pour la simplicité)

1. Va sur [railway.app](https://railway.app) et crée un compte (GitHub = 1 clic).
2. **New Project** → **Deploy from GitHub repo**.
3. Choisis **ton** dépôt (ton fork LibreChat, pas celui de danny-avila).
4. Railway détecte souvent un Dockerfile : il build et déploie.  
   Si le projet a besoin de **plusieurs services** (API + MongoDB + Meilisearch, etc.), il faudra peut‑être utiliser un **template** ou ajouter les services (MongoDB, etc.) dans le même projet. Les templates “LibreChat” sur Railway ciblent le repo officiel ; pour ton fork, tu peux déployer le repo puis ajouter MongoDB (plugin Railway) et les variables d’environnement depuis ton `.env.example`.
5. Une fois déployé, Railway te donne une URL : **https://xxx.railway.app** → c’est le lien pour ta mère.

**Domaine personnalisé (optionnel)**  
- Dans le projet Railway : ton service → **Settings** → **Domains** → **Custom Domain**.  
- Tu ajoutes un domaine que tu possèdes (ex. `chat.mafamille.fr`). Railway t’indique quoi mettre en CNAME (souvent `xxx.railway.app`).  
- Le **nom de domaine** lui-même, il faut l’acheter (OVH, Gandi, Namecheap, etc. — souvent 6–12 €/an pour un .fr ou .com).

**Gratuit / limites**  
- Railway offre un crédit gratuit par mois (ex. ~5 $). Une petite app peut tenir dessus, mais au-delà il faut ajouter une carte. Donc “gratuit” = limité dans le temps ou en usage.

### Zeabur

- [zeabur.com](https://zeabur.com) : même idée — **Login with GitHub**, **New Project**, déploie **ton** repo.  
- Tu obtiens une URL du type **https://ton-app.zeabur.app**.  
- Domaine personnalisé : dans les paramètres du service, section domaines / custom domain.  
- Gratuit : pareil, souvent un quota gratuit puis payant.

---

## Option 2 : Gratuit 24/7 “pour de vrai” — Oracle Cloud + domaine

Là, rien à payer (sauf le nom de domaine si tu en veux un personnalisé). En contrepartie, tu fais un peu plus de config.

1. **Créer une VM gratuite sur Oracle Cloud**
   - [cloud.oracle.com](https://www.oracle.com/cloud/free/) → **Start for free**.
   - Crée un compte, puis une instance “Always Free” (petite VM Linux).

2. **Sur la VM : installer Docker et lancer l’app**
   - Connexion en SSH à la VM.
   - Installer Docker + Docker Compose, cloner **ton** repo GitHub, copier un `.env` (à partir de `.env.example`), puis par exemple :  
     `docker compose up -d`  
   (en adaptant selon que tu utilises `docker-compose.yml` ou `deploy-compose.yml` et les services nécessaires : MongoDB, Meilisearch, etc.)

3. **Lien pour ta mère**
   - **Sans domaine** : elle utilise l’IP publique de la VM (ex. `http://123.45.67.89:3080`). Pas joli mais ça marche.
   - **Avec domaine** : tu achètes un domaine (ex. 6–12 €/an), tu crées un enregistrement **A** pointant vers l’IP de la VM (et éventuellement un reverse proxy + HTTPS avec Nginx + Let’s Encrypt sur la VM).

---

## Nom de domaine personnalisé (pour “un lien avec un nom à nous”)

- **Sans payer** : utilise le sous-domaine fourni par l’hébergeur (ex. `ton-app.railway.app`). C’est déjà un lien fixe et partageable.
- **Avec un vrai nom** (ex. `chat.mafamille.fr`) : il faut **acheter** le domaine chez un registrar (OVH, Gandi, Namecheap, etc.), puis dans l’outil d’hébergement (Railway, Zeabur, ou sur ta VM) tu ajoutes ce domaine et tu configures CNAME ou A comme indiqué.

---

## En résumé : prochaine étape la plus simple et gratuite

1. **Pousser le code sur ton GitHub** (si ce n’est pas déjà fait) — voir [github-push.md](./github-push.md).
2. **Aller sur [railway.app](https://railway.app)** (ou Zeabur), se connecter avec GitHub.
3. **Créer un projet** et **déployer depuis ton dépôt** (ton fork LibreChat).
4. **Configurer** les variables d’environnement (comme dans `.env.example`) et les services nécessaires (MongoDB, etc.) si Railway ne les inclut pas dans un template.
5. **Récupérer l’URL** (ex. `https://xxx.railway.app`) → c’est le lien à donner à ta mère.
6. **Optionnel** : plus tard, acheter un domaine et l’ajouter en “custom domain” dans Railway (ou Zeabur) pour avoir un lien avec un nom personnalisé.

Si tu veux, on peut détailler étape par étape “Railway : clic par clic” (avec les écrans) ou “Oracle : commandes exactes pour la VM”.
