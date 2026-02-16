# Environnement et configuration (.env / librechat.yaml)

Référence rapide ; pour le détail des options, voir la doc officielle.

## .env (variables d'environnement)

Fichier source : [.env.example](../../.env.example).  
Documentation : [https://www.librechat.ai/docs/configuration/dotenv](https://www.librechat.ai/docs/configuration/dotenv).

### Sections principales

| Section | Exemples / remarques |
|--------|-----------------------|
| **Server** | `HOST`, `PORT` (ex. 3080), `DOMAIN_CLIENT`, `DOMAIN_SERVER` |
| **MongoDB** | `MONGO_URI` (obligatoire), pool size, timeouts, etc. |
| **Domain / proxy** | `NO_INDEX`, `TRUST_PROXY` |
| **Auth** | `MIN_PASSWORD_LENGTH`, etc. |
| **Logging** | `CONSOLE_JSON`, `DEBUG_LOGGING`, `DEBUG_CONSOLE` |
| **Config path** | `CONFIG_PATH` : chemin vers `librechat.yaml` (optionnel) |
| **Endpoints** | `ENDPOINTS`, `PROXY` ; beaucoup de providers sont configurés via `librechat.yaml` |
| **Providers** | Clés API (OpenAI, Anthropic, Google, Azure, etc.) ; nombreuses variables optionnelles par provider |

**Minimum pour que l’app démarre** : `MONGO_URI` est **obligatoire** (sans lui le serveur lève une erreur au démarrage). En local, remplir au minimum : `MONGO_URI`, et en pratique aussi `HOST`, `PORT`, `DOMAIN_CLIENT`, `DOMAIN_SERVER` (voir [setup-step-by-step.md](setup-step-by-step.md#minimum-à-remplir-dans-le-env)). Pour les modèles et endpoints avancés, privilégier `librechat.yaml`.

## librechat.yaml

Fichier source : [librechat.example.yaml](../../librechat.example.yaml).  
Documentation : [https://www.librechat.ai/docs/configuration/librechat_yaml](https://www.librechat.ai/docs/configuration/librechat_yaml).

### Rôle

- Définir les **endpoints AI** et les **modèles** (OpenAI, Anthropic, Azure, Google, custom, etc.).
- Configurer l’**interface** (welcome, file search, privacy policy, terms, etc.).
- **Stockage des fichiers** (local, S3, Firebase), **cache**, etc.

En résumé : `.env` pour le serveur, la base, les secrets et options globales ; `librechat.yaml` pour les endpoints, modèles et comportement applicatif. Copier les exemples puis adapter selon tes besoins.
