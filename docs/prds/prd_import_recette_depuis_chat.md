# PRD : Import d’une recette depuis le chat

## Objectif

Permettre d’importer une recette depuis une conversation (sélection ou message) pour l’ajouter au livre de recettes et commencer à la modifier (ex. moins sucré, plus moelleux, sans gluten), en créant des variations liées à la recette mère.

## User stories

- En tant qu’utilisateur, je veux importer une recette depuis un message du chat afin de ne pas avoir à la ressaisir.
- En tant qu’utilisateur, je veux qu’après import la recette soit enregistrée dans mon livre et que je puisse la modifier pour créer des variations (ex. moins sucré, sans gluten).
- En tant qu’utilisateur, je veux que les variations créées à partir de cette recette restent liées à la recette mère (historique type Git).

## Critères d’acceptation

- [ ] Depuis le chat, l’utilisateur peut sélectionner un message contenant une recette (ou utiliser un bouton « Importer cette recette » si le message est reconnu comme recette).
- [ ] L’import parse le contenu (texte ou JSON) pour produire une recette conforme au modèle JSON du projet.
- [ ] La recette importée est enregistrée comme recette mère dans le livre de recettes (sans parentId).
- [ ] Après import, l’utilisateur peut ouvrir la recette et demander des modifications (via chat ou formulaire) ; les modifications enregistrées créent des variations (parentId = recette importée).
- [ ] Les variations affichent une note de variation (ex. « moins sucré », « sans gluten ») et sont visibles dans le livre sous la recette mère.

## Détails techniques (optionnel)

- **Zones** : `client/` (bouton import sur message, parsing ou appel API), `api/` (endpoint import recette, validation, création en base avec parentId pour les futures variations).
- **Parsing** : si le message contient du JSON recette, utilisation directe ; sinon extraction/LLM ou règles pour remplir le schéma.
- **Config** : pas de .env supplémentaire attendu pour cette feature.

## Priorité

- [x] Haute

## Notes

- Dépend du modèle JSON (PRD création recette) et du livre de recettes (PRD livre de recettes).
