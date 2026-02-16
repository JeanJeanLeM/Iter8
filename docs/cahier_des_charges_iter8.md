# Cahier des charges — ITER8 (iterate)

## 1. Vision et objectif

**ITER8** est une application intégrée à LibreChat qui permet de **construire des recettes avec un LLM** sans encombrer le fil de conversation. L’utilisateur peut discuter, poser des questions et **récupérer en un clic** la ou les recettes construites. Les modifications donnent naissance à des **variations** liées à une recette mère, sur le modèle d’un système de versions (type Git) pour les recettes.

- **Public cible** : utilisateurs de LibreChat qui veulent créer, modifier et réutiliser des recettes de cuisine.
- **Différenciation** : export structuré des recettes (pas de montée infinie dans le chat), arbre de variations, et à terme partage de recettes entre utilisateurs.

---

## 2. Contexte technique

- **Base** : fork/instance LibreChat (chat AI multi-providers, self-hosted).
- **Stack** : Node 20, npm workspaces (api, client, packages), MongoDB, frontend React/TS.
- Les recettes sont des **entités structurées** (JSON) gérées par l’API et le client, avec possibilité d’outils/fonctions pour que le LLM mette à jour l’état d’une recette dans la conversation.

---

## 3. Fonctionnalités principales

### 3.1 Création et édition de recettes via le chat

- L’utilisateur dialogue avec le LLM pour décrire une recette (ingrédients, étapes, durée, matériel, etc.).
- Le LLM communique l’état de la recette via un **modèle JSON** (ingrédients, étapes, description, durée, matériel, portions, etc.).
- **Export / sauvegarde** : l’utilisateur peut exporter ou enregistrer la recette courante en un clic, sans devoir copier-coller depuis le chat. La recette est enregistrée dans le **livre de recettes** de l’utilisateur.

### 3.2 Arbre de variations (recette mère / versions)

- Toute **modification** d’une recette enregistrée peut créer une **variation** (ex. « moins sucré », « plus moelleux », « sans gluten »).
- Les variations sont **liées à la recette mère** (relation parent-enfant), comme des branches/commits dans un dépôt.
- Pour l’instant : **uniquement partagé au niveau de l’utilisateur** (ses propres recettes et variations).
- **Évolution prévue** : recettes publiques et découverte des recettes d’autres utilisateurs.

### 3.3 Livre de recettes

- Vue de **toutes les recettes** de l’utilisateur et de leurs **variations**.
- Navigation par recette mère et par version (arbre ou liste).
- Accès rapide à une recette pour la consulter, la modifier ou lancer le **mode recette** (cuisson step-by-step).

### 3.4 Import d’une recette depuis le chat

- L’utilisateur peut **importer** une recette depuis une conversation (sélection ou message contenant une recette).
- Après import, la recette est créée dans le livre et peut être **modifiée** (ex. moins sucré, plus moelleux, sans gluten), ce qui génère des variations.

### 3.5 Commentaires sur une recette effectuée

- Possibilité d’**ajouter des commentaires** sur une recette **après l’avoir réalisée** (notes, ajustements, succès/échecs).
- Ces commentaires sont associés à la recette (ou à une variation) et alimentent le **journal de cuisine**.

### 3.6 Journal de cuisine

- **Journal** qui rappelle **quelle recette** a été effectuée **quand**, avec **quel commentaire**.
- Historique des réalisations pour revoir ses essais et améliorer ses versions.

### 3.7 Mode recette (step-by-step)

- **Vue dédiée** pour suivre une recette **étape par étape**.
- **Ajustement du nombre de portions** : les quantités d’ingrédients sont recalculées et affichées à chaque étape.
- **Navigation** d’étape à étape (précédent / suivant), avec affichage clair des ingrédients et instructions par étape.

---

## 4. Modèle de données (recette)

La recette est représentée par un **modèle JSON** permettant au chat (LLM) et au client d’échanger un état cohérent. Champs principaux :

| Champ           | Description                                      |
|-----------------|--------------------------------------------------|
| `title`         | Titre de la recette                              |
| `description`   | Description courte ou contexte                   |
| `portions`      | Nombre de parts (pour le calcul des quantités)   |
| `duration`      | Durée totale (préparation + cuisson, etc.)       |
| `ingredients`   | Liste d’ingrédients (nom, quantité, unité)       |
| `steps`         | Étapes numérotées (instructions)                 |
| `equipment`     | Matériel / équipement nécessaire                |
| `tags`          | Tags optionnels (sans gluten, végétarien, etc.) |
| `parentId`      | Référence à la recette mère (pour les variations)|
| `variationNote` | Note de variation (ex. « moins sucré »)          |

Les détails du schéma et les règles de calcul des quantités selon les portions sont décrits dans le PRD dédié à la création de recette.

---

## 5. Périmètre et évolutions

| Phase   | Périmètre                                                                 |
|--------|---------------------------------------------------------------------------|
| Actuel | Recettes et variations **privées** par utilisateur (livre, import, commentaires, journal, mode step-by-step). |
| Futur  | Recettes **publiques** et découverte des recettes d’autres utilisateurs.   |

---

## 6. Documents de référence

- **PRDs** : chaque fonctionnalité détaillée dans `docs/prds/` (livre de recettes, modèle JSON, import, commentaires, journal, mode recette).
- **Contexte technique** : `docs/agent-only/context-and-rules.md`.
- **Setup** : `docs/setup/`.

---

*Document : cahier des charges général ITER8 — à jour avec les PRDs des fonctionnalités.*
