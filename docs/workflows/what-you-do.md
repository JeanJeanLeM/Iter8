# Ce que tu dois faire (humain)

Checklist et points où ta décision ou ton action est nécessaire.

## Setup initial

- [ ] Installer Node 20, MongoDB (et optionnellement Meilisearch) ou utiliser Docker.
- [ ] Copier `.env.example` → `.env` et remplir au minimum : `PORT`, `MONGO_URI`, `DOMAIN_CLIENT`, `DOMAIN_SERVER`.
- [ ] Décider et renseigner les clés API (OpenAI, Anthropic, Google, etc.) dans `.env` ou dans l’interface selon la config.
- [ ] Copier `librechat.example.yaml` → `librechat.yaml` et adapter les endpoints / modèles si besoin.
- [ ] Lancer la stack (local : `backend:dev` + `frontend:dev` ; ou Docker : `docker compose up -d`).
- [ ] Vérifier que l’app répond (ex. http://localhost:3080).
- [ ] Créer un utilisateur si nécessaire : `npm run create-user` (voir config/).

## Au quotidien

- [ ] Décider des prochaines features et rédiger ou mettre à jour les PRDs dans `docs/prds/`.
- [ ] Mettre à jour `docs/user-only/progress.md` avec l’état d’avancement, les blocages, les prochaines étapes.
- [ ] Donner à l’agent les priorités et les contraintes (branches, ne pas toucher à X, etc.).

## Points de décision

- **Secrets et prod** : ne pas laisser l’agent modifier des secrets en production ; toi seul décides des déploiements sensibles.
- **Choix produit** : les PRDs et la priorisation te reviennent ; l’agent implémente selon tes specs.
- **Config** : les changements de `.env` ou `librechat.yaml` qui impactent la prod ou la sécurité doivent être validés par toi.
