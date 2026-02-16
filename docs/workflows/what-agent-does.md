# Ce que l'agent peut faire

Rôle de l’agent (IA) sur ce repo : exécuter des tâches techniques et de doc sans prendre les décisions produit ou de déploiement à ta place.

## Ce que l'agent peut faire sans validation

- **Code** : modifier le code (api, client, packages), refactors, correctifs, nouvelles features selon les PRDs.
- **Build & tests** : lancer `npm run build:packages`, `npm run build:client`, `npm run test:api`, `npm run test:client`, `npm run test:all`, `npm run e2e`, `npm run lint`, `npm run lint:fix`.
- **Config (exemples)** : proposer des changements dans `.env.example` ou `librechat.example.yaml` (sans toucher à tes secrets dans `.env` ou `librechat.yaml`).
- **Documentation** : rédiger ou mettre à jour les fichiers dans `docs/` (setup, workflows, PRDs, agent-only, et sur demande user-only).
- **Conventions** : respecter le nommage et les conventions du projet (voir [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md) et `docs/agent-only/context-and-rules.md`).

## Ce que l'agent ne fait pas (ou demande confirmation)

- **Secrets et prod** : ne pas modifier `.env` ou des fichiers contenant des secrets en production ; ne pas déployer en prod sans ton accord.
- **Décisions produit** : ne pas prioriser les features ni définir les objectifs produit ; l’agent s’appuie sur les PRDs et tes instructions.
- **Actions destructives** : pas de suppression de données ou de branches sans que tu l’aies demandé explicitement.

En cas de doute, l’agent doit demander confirmation avant d’agir.
