# Démarrage rapide (débutant)

Tu n’as jamais utilisé Docker ni MongoDB ? Ce guide explique le strict minimum pour faire tourner CookIter8 sur ta machine.

---

## C’est quoi ce projet ?

**CookIter8** = une application de chat avec l’IA (fork LibreChat). Comme ChatGPT, mais que tu héberges toi-même.

Le dépôt contient **plusieurs parties** qui doivent tourner en même temps :

1. **Le frontend (l’interface)**  
   Ce que tu vois dans le navigateur : pages, formulaires, conversations. En dev, c’est Vite sur le **port 3090**.

2. **Le backend (le serveur)**  
   Il reçoit les requêtes du frontend, parle à la base de données, appelle les API des modèles (OpenAI, etc.). En dev, il tourne sur le **port 3080**.

3. **MongoDB (la base de données)**  
   Où sont stockées les conversations, les comptes utilisateurs, etc. Soit sur ta machine (MongoDB installé en local), soit dans le cloud (MongoDB Atlas).

En résumé : **navigateur → frontend (3090) → backend (3080) → MongoDB**.

---

## Pourquoi « proxy error /api/config » et « ECONNREFUSED » ?

Tu as lancé **uniquement** le frontend (`npm run frontend:dev`).  
Le frontend essaie d’envoyer les requêtes (config, auth, etc.) au **backend** sur le port 3080. Comme le backend n’est pas démarré, la connexion est refusée → **ECONNREFUSED** et les erreurs de proxy.

**Il faut lancer les deux : backend + frontend.**

---

## Que faire concrètement (2 terminaux)

### Terminal 1 : le serveur (backend)

À la racine du projet :

```bash
npm run backend:dev
```

Laisse ce terminal ouvert. Tu dois voir quelque chose comme « Connected to MongoDB » et le serveur qui écoute. C’est le **backend** (port 3080).

### Terminal 2 : l’interface (frontend)

Ouvre un **second** terminal, à la racine du projet :

```bash
npm run frontend:dev
```

Laisse ce terminal ouvert. Tu verras « Local: http://localhost:3090/ ». C’est le **frontend** (port 3090).

### Navigateur

Ouvre : **http://localhost:3090**

Tu dois voir l’interface CookIter8. Les appels vers `/api/config`, `/api/auth/refresh`, etc. passent par le proxy Vite vers le backend sur 3080, donc tout fonctionne si le backend tourne bien.

---

## Récap en une image (texte)

```
[ Toi dans le navigateur ]
         ↓
   http://localhost:3090   ←  Terminal 2 : npm run frontend:dev
         ↓ (proxy /api → 3080)
   http://localhost:3080   ←  Terminal 1 : npm run backend:dev
         ↓
   MongoDB (Atlas ou local)
```

**Ordre conseillé :** d’abord Terminal 1 (backend), puis Terminal 2 (frontend), puis ouvrir 3090 dans le navigateur.

---

## Si tu n’as jamais utilisé MongoDB

- Tu n’as pas besoin de l’installer sur ton PC si tu utilises **MongoDB Atlas** (gratuit dans le cloud).
- Tu crées un cluster sur [cloud.mongodb.com](https://cloud.mongodb.com), tu récupères une chaîne de connexion (URI), et tu la mets dans ton fichier **`.env`** dans la variable **`MONGO_URI`**.
- N’oublie pas d’ajouter ton IP dans **Network Access** (whitelist) sur Atlas, sinon le backend ne peut pas se connecter.

Le reste du setup (`.env` minimal, `librechat.yaml`, build des packages) est décrit dans [setup-step-by-step.md](setup-step-by-step.md).

---

## En cas de blocage

- **Backend qui ne démarre pas** : vérifier que `MONGO_URI` dans `.env` est correct et que ton IP est autorisée sur Atlas (ou que MongoDB local tourne).
- **Fichier `client/dist/index.html` manquant** : exécuter une fois `npm run build:client`.
- **Fichier `librechat.yaml` manquant** : copier `librechat.example.yaml` vers `librechat.yaml`.
- **Packages non buildés** : exécuter `npm run build:packages` puis relancer le backend.

Tu peux revenir à ce guide à tout moment ; il est fait pour quelqu’un qui découvre le projet.
