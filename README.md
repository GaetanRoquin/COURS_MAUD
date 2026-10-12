# ⚽ Révisions — site de cours, quiz et progression

Site statique (HTML/CSS/JS, sans framework ni build) pensé pour GitHub Pages.
Toutes les données de la personne (résultats, records, notes, cartes) restent **dans son navigateur** (`localStorage`), avec un bouton de sauvegarde/restauration dans ⚙️ Réglages.

## Mettre en ligne (une seule fois)

1. Crée un dépôt GitHub (public) et pousse tout le contenu de ce dossier sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
3. Le workflow `.github/workflows/deploy.yml` se lance à chaque push : il régénère `content/manifest.json`, vérifie les quiz, puis publie.
4. Le lien est du type `https://<ton-pseudo>.github.io/<nom-du-depot>/` : c'est ce lien que tu envoies.

## Tester en local

Le site charge les cours avec `fetch`, donc il ne marche pas en double-cliquant sur `index.html`. Lance un petit serveur :

```bash
python3 tools/build_manifest.py      # après chaque ajout/modif de cours
python3 -m http.server 8000          # puis ouvre http://localhost:8000
```

## Structure

```
index.html
assets/css/style.css
assets/js/app.js        routeur (#/cours, #/entrainement, #/progres…)
assets/js/views.js      les pages
assets/js/games.js      les 6 mini-jeux
assets/js/store.js      données locales, maîtrise, records, répétition espacée
assets/js/fx.js         mascotte, animations, sons
assets/js/content.js    chargement + rendu Markdown des cours, recherche
assets/vendor/marked.min.js
content/manifest.json   GÉNÉRÉ automatiquement, ne pas éditer à la main
content/courses/<id>/course.md
content/courses/<id>/quiz.json
tools/build_manifest.py
```

## Ajouter un cours

Voir **[AJOUTER_UN_COURS.md](AJOUTER_UN_COURS.md)** (format + prompt prêt à coller dans Claude).
En résumé : un nouveau dossier dans `content/courses/` avec `course.md` (+ `quiz.json`), puis push. Rien d'autre à modifier.

## Règles de calcul

- **Maîtrise** d'un cours = moyenne pondérée des séances récentes. Poids d'une séance = 0,5^(âge en jours / 21) × min(1, nb de questions / 5). Le résultat est multiplié par un facteur de confiance min(1, somme des poids / 2,5) : une seule séance à 100 % donne environ 40 %, il faut plusieurs séances récentes pour approcher 100 %.
- **Classement / records** : tri par score, puis par temps uniquement pour départager. Un temps rapide ne passe jamais devant un meilleur score. Les parties en mode « erreurs » ou de moins de 5 questions ne comptent pas pour les records (mais comptent pour la maîtrise).
- **Cartes mémoire** : système de Leitner à 5 boîtes (revue après 0, 1, 3, 7, 16 jours).
- **XP** : +10 par bonne réponse ; tenues de la mascotte débloquées à 100, 300, 600, 1000 et 1600 XP.
