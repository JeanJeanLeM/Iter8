# Variables Railway – liste complète (LibreChat / CookIter8)

À ajouter dans **Railway** → ton service (ex. Iter8) → **Variables**.  
Remplace les valeurs par les tiennes (surtout les secrets).

---

## Obligatoires (sans elles l’app crash ou ne fonctionne pas)

| Variable | Valeur | Où la trouver / comment la générer |
|----------|--------|------------------------------------|
| **MONGO_URI** | `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority` | **MongoDB Atlas** : Database → Connect → Drivers → copier l’URI. Remplacer `<password>` par ton mot de passe. Autoriser l’IP : Network Access → Add IP → Allow from anywhere (0.0.0.0/0). |
| **DOMAIN_CLIENT** | `https://iter8-test.up.railway.app` | **Railway** : service → Networking → domaine public (ex. iter8-test.up.railway.app). Mettre **https://** + le domaine, sans slash final. |
| **DOMAIN_SERVER** | `https://iter8-test.up.railway.app` | Même URL que DOMAIN_CLIENT (app + API sur le même service). |
| **HOST** | `0.0.0.0` | Fixe : pour écouter sur toutes les interfaces dans le conteneur. |
| **JWT_SECRET** | Une chaîne aléatoire (64 caractères hex) | Générer : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (en local). Ne pas réutiliser l’exemple du .env.example. |
| **JWT_REFRESH_SECRET** | Une autre chaîne aléatoire (64 car. hex) | Même commande que ci‑dessus, une 2e fois. Doit être **différente** de JWT_SECRET. |

---

## Recommandées (évitent 403, proxy, etc.)

| Variable | Valeur | Pourquoi |
|----------|--------|----------|
| **TRUST_PROXY** | `1` | Railway met un proxy devant l’app ; sans ça l’app peut mal voir l’IP / l’URL. |
| **ALLOW_REGISTRATION** | `true` | Permet la création de compte depuis l’interface. Sans ça → 403 en inscription. |
| **PORT** | *(ne pas définir)* ou la valeur indiquée par Railway | Souvent Railway injecte **PORT** tout seul. Si ton Networking affiche « → Port 8080 », ne pas mettre PORT=3080 : laisser Railway définir PORT. Si l’app ne démarre pas, essayer **PORT** = la valeur affichée (ex. 8080). |

---

## Optionnelles (selon tes besoins)

| Variable | Valeur | Où / pourquoi |
|----------|--------|----------------|
| **OPENAI_API_KEY** | `sk-...` | Pour utiliser les modèles OpenAI. Clé dans ton compte OpenAI. |
| **ANTHROPIC_API_KEY** | `sk-ant-...` | Pour Claude (Anthropic). |
| **MEILI_HOST** | `https://ton-service-meilisearch.up.railway.app` | Si tu as un service Meilisearch sur Railway. URL publique du service. |
| **MEILI_MASTER_KEY** | Une clé secrète | Même clé que celle configurée sur le service Meilisearch. |
| **ALLOW_SOCIAL_LOGIN** | `true` | Pour activer OAuth (Google, GitHub, etc.). Il faut aussi les variables correspondantes (ex. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET). |

---

## Résumé à copier (à personnaliser)

À créer / remplir dans Railway → Variables :

```
MONGO_URI=<ton URI Atlas>
DOMAIN_CLIENT=https://iter8-test.up.railway.app
DOMAIN_SERVER=https://iter8-test.up.railway.app
HOST=0.0.0.0
JWT_SECRET=<générer 64 car. hex>
JWT_REFRESH_SECRET=<générer une autre 64 car. hex>
TRUST_PROXY=1
ALLOW_REGISTRATION=true
```

Ne pas committer ce bloc avec de vrais secrets. Utiliser uniquement dans l’interface Railway (Variables).
