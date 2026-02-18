# Contexte et règles pour l'agent

**À lire en priorité** quand tu travailles sur ce repository.

## Contexte projet

- **Projet** : CookIter8 (fork LibreChat) — plateforme de chat AI self-hosted, multi-providers (OpenAI, Anthropic, Google, Azure, custom, etc.).
- **Stack** : Node 20, npm workspaces (`api`, `client`, `packages/*`), MongoDB, Meilisearch, RAG API (vectordb).
- **Code** : Backend Express en JS (`api/`), frontend React en TS/TSX (`client/`), packages partagés en TS (`packages/api`, `packages/client`, `packages/data-provider`, `packages/data-schemas`).

## Règles à respecter

1. **Nommage** (voir [.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md))  
   - Branches : slash-based (ex. `new/feature/x`).  
   - JS/TS : camelCase, composants React avec première lettre en majuscule.  
   - Docs : snake_case pour noms de fichiers de doc.

2. **Qualité**  
   - Avant de proposer un PR ou de considérer une tâche terminée : lancer `npm run lint`, les tests concernés (`test:api`, `test:client`, ou `test:all`), et si pertinent `npm run e2e`.  
   - Ne pas casser la config existante : modifier `.env.example` / `librechat.example.yaml` pour les nouveaux réglages, pas les fichiers réels de l’utilisateur (`.env`, `librechat.yaml`) sauf demande explicite.

3. **Commits**  
   - Format conventionnel : `feat:`, `fix:`, `docs:`, `refactor:`, etc., résumé au présent.

4. **Documentation**  
   - Tenir à jour `docs/` si tu changes le setup ou les workflows.  
   - Mettre à jour `docs/user-only/progress.md` seulement si l’utilisateur le demande.

5. **Secrets et déploiement**  
   - Ne pas écrire de clés API ou mots de passe dans le code ou la doc.  
   - Ne pas effectuer de déploiement en production sans instruction explicite de l’utilisateur.

En cas d’ambiguïté, demander confirmation à l’utilisateur.
