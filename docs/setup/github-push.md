# Connecter ce projet à ton GitHub et pousser

## Déjà fait

- Toutes les modifications ont été commitées (commit : `feat: LibreChat fork with recipes, journal and customizations`).
- Le remote du projet original a été renommé en **upstream** (tu peux faire `git pull upstream main` plus tard pour récupérer les mises à jour de LibreChat).

## À faire de ton côté

### 1. Créer un dépôt sur GitHub

1. Va sur [github.com](https://github.com) et connecte-toi.
2. Clique sur **New** (ou **+** → **New repository**).
3. Choisis un nom (ex. `CookIter8`, `iter8-librechat`).
4. Laisse le dépôt **vide** (pas de README, pas de .gitignore).
5. Crée le dépôt.

### 2. Connecter et pousser

Dans un terminal, à la racine du projet, exécute (en remplaçant **TON_USERNAME** et **TON_REPO** par ton compte GitHub et le nom du dépôt) :

```powershell
cd "c:\Users\cramp\Documents\Iter8\iter8v0\LibreChat"
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git
git push -u origin main
```

Exemple si ton compte est `cramp` et le dépôt `CookIter8` :

```powershell
git remote add origin https://github.com/cramp/CookIter8.git
git push -u origin main
```

### 3. Après le premier push

- Ton code sera sur `https://github.com/TON_USERNAME/TON_REPO`.
- Pour les prochains push : `git push`.
- Pour récupérer les mises à jour du LibreChat officiel : `git fetch upstream` puis `git merge upstream/main` (ou `git pull upstream main`).
