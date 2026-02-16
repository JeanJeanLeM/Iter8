# Versioning des recettes (mère / fille)

## Vue d'ensemble

Le système de recettes distingue deux types de recettes :

- **Recette mère** : recette de base, sans parent (`parentId = null`). Elle peut avoir un champ `objective` qui décrit son objectif (ex. « Recette de cookies moelleux pour le goûter »).
- **Recette fille (variation)** : recette dérivée d’une recette mère (`parentId = _id` de la mère). Elle possède un champ `variationNote` qui explique la variation (ex. « Version plus légère », « Sans gluten »).

## Modèle de données

| Champ          | Recette mère      | Recette fille              |
|----------------|-------------------|----------------------------|
| `parentId`     | `null`            | `_id` de la recette mère   |
| `variationNote`| —                 | Raison de la variation     |
| `objective`    | Objectif de la recette | —                     |

## Cas d’usage

1. **Création d’une recette dans le chat** : l’utilisateur demande une recette → l’assistant répond → « Ajouter au livre » crée une **recette mère**.
2. **Modification et création d’une variation** : l’utilisateur demande une modification (ex. « change le sucre ») → nouvelle recette affichée → le bouton **« Garder le lien »** crée une **recette fille** liée à la recette mère de la conversation.
3. **Recette indépendante** : si l’utilisateur clique sur « Ajouter au livre » sans « Garder le lien », la recette est créée comme **recette mère** (nouvelle recette sans lien).

## API

- `POST /api/recipes` : crée une recette (mère si `parentId` absent, fille si `parentId` fourni).
- `POST /api/recipes/:parentId/variation` : crée explicitement une recette fille avec `parentId` et `variationNote` (service dédié pour le cas « garder le lien »).
- `GET /api/recipes?parentId=xxx` : liste les variations d’une recette mère.

## Conversation et lien parent

Le store `recipeConversationParentMap` associe chaque `conversationId` à l’`_id` de la **première recette mère** sauvegardée dans cette conversation. Cela permet au bouton « Garder le lien » de savoir quelle recette mère lier pour les recettes filles suivantes.
