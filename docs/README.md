# Documentation du projet LibreChat

Ce dossier centralise la documentation du fork/instance LibreChat pour comprendre le setup, les workflows et suivre l'avancement du projet.

## Public

- **Toi (humain)** : setup, checklist, suivi d'avancement, PRDs.
- **Agent (IA)** : contexte projet, règles, ce qu'il peut faire ; documents dans `agent-only/`.

## Contenu

| Dossier / Fichier | Description |
|-------------------|-------------|
| [setup/](setup/) | Comprendre le repo et le faire tourner (overview, étapes, config). |
| [setup/demarrage-rapide-debutant.md](setup/demarrage-rapide-debutant.md) | **Débutant** : pas de Docker/MongoDB ? Guide minimal (2 terminaux, pourquoi ECONNREFUSED). |
| [workflows/](workflows/) | Qui fait quoi : étapes pour toi, capacités de l'agent. |
| [cahier_des_charges_iter8.md](cahier_des_charges_iter8.md) | **ITER8** : cahier des charges général (recettes, variations, livre, journal, mode step-by-step). |
| [prds/](prds/) | Product Requirements Documents des futures features (dont ITER8 : livre, modèle JSON, import, commentaires, journal, mode recette). |
| [removed-features/](removed-features/) | Documentation des features supprimées (PRD + manifest) pour reconstruction si besoin. |
| [agent-only/](agent-only/) | Documents **réservés à l'agent** (contexte, règles). |
| [user-only/](user-only/) | Documents **réservés à toi** (suivi d'avancement). |

## Documentation officielle LibreChat

En complément, utilise la documentation officielle :

- **Configuration et fonctionnalités** : [https://www.librechat.ai/docs](https://www.librechat.ai/docs)
- **Configuration .env** : [https://www.librechat.ai/docs/configuration/dotenv](https://www.librechat.ai/docs/configuration/dotenv)
- **Configuration librechat.yaml** : [https://www.librechat.ai/docs/configuration/librechat_yaml](https://www.librechat.ai/docs/configuration/librechat_yaml)
