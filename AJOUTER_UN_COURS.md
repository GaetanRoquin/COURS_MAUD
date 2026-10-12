# Ajouter un cours

## 1. Créer le dossier

```
content/courses/<id-du-cours>/
  course.md     ← obligatoire
  quiz.json     ← facultatif (sans lui, le cours s'affiche mais n'a pas de jeux)
```

L'`<id-du-cours>` est en minuscules avec des tirets, par ex. `amphi-com-politique-ch2` ou `td-image-2`.
**Ne change plus jamais un id une fois publié** : les résultats et les notes y sont rattachés. Même chose pour les `{#id}` des sections et les `id` des questions.

## 2. `course.md`

```markdown
---
title: Titre du cours
type: amphi            # amphi ou td
matiere: Culture de l'image
chapitre: Chapitre 2
order: 2               # ordre dans la matière
emoji: 🎬
description: Une phrase qui résume le cours.
lang: fr               # mettre en si le cours est en anglais
---

## Titre de section {#id-de-section}

Texte normal en Markdown (listes, **gras**, tableaux…). Le texte normal = les notes reformulées.

### Sous-section {#autre-id}

:::def Nom de la notion
Définition.
:::

:::retenir
À retenir.
:::

:::exemple Titre facultatif
Exemple.
:::

:::methode Titre
1. Étape
2. Étape
:::

:::attention
Piège.
:::

:::complement Source : [Nom de la source](https://…)
Information ajoutée depuis une source externe. Toujours mettre la source.
:::

:::verifier
Point incertain, contradictoire, ou erreur corrigée par rapport aux notes. Ne jamais trancher en silence.
:::

:::schema pyramide
1. Le plus important
2. …
:::
```

Schémas disponibles : `pyramide`, `flow` (étapes numérotées), `semio`, `temps`.
Chaque `##` et `###` **doit** avoir un `{#id}` : c'est ce qui permet aux quiz de renvoyer vers la bonne section.

## 3. `quiz.json`

```json
{
  "questions": [
    { "id": "q1", "type": "qcm", "q": "La question ?", "choices": ["Bonne réponse", "Faux 1", "Faux 2", "Faux 3"], "answer": 0, "explain": "Pourquoi.", "section": "id-de-section" },
    { "id": "q2", "type": "vf", "q": "Affirmation.", "answer": false, "explain": "Pourquoi.", "section": "id-de-section" },
    { "id": "q3", "type": "trou", "q": "Phrase avec un ___ à compléter.", "answer": "mot", "alts": ["variante acceptée"], "explain": "", "section": "id-de-section" }
  ],
  "order": [
    { "id": "o1", "q": "Remets dans l'ordre…", "items": ["Étape 1", "Étape 2", "Étape 3"], "section": "id-de-section" }
  ],
  "cards": [
    { "id": "c1", "front": "Notion", "back": "Définition complète", "short": "Définition courte (pour le Memory)", "section": "id-de-section" }
  ]
}
```

- `answer` d'un QCM = **numéro** de la bonne réponse (0 = la première). Le site mélange les réponses tout seul.
- `quizSize` (facultatif, à la racine) : nombre de questions par défaut pour ce cours.
- Ce qu'il faut pour que chaque jeu soit disponible : Tirs au but ≥ 1 question · Sprint ≥ 4 QCM/VF · Cartes ≥ 1 carte · Memory ≥ 4 cartes courtes · Ordre ≥ 1 exercice · Texte à trous ≥ 3 (les cartes servent aussi de trous).

## 4. Vérifier et publier

```bash
python3 tools/build_manifest.py   # signale les erreurs (JSON invalide, section inconnue, réponse manquante…)
python3 -m http.server 8000       # vérifier le rendu
git add . && git commit -m "Ajout du cours X" && git push
```

---

## Prompt prêt à l'emploi (à coller dans Claude avec les notes)

> Voici mes notes de cours (format Word / texte). Transforme-les en un cours pour mon site de révision, en respectant **exactement** le format décrit dans le fichier AJOUTER_UN_COURS.md ci-joint.
>
> Règles de fiabilité :
> 1. N'invente aucune information, définition, date, chiffre ou concept. Le texte normal ne contient que ce qui est dans les notes (reformulé et structuré).
> 2. Si une explication manque, tu peux compléter à partir d'une source fiable, uniquement dans un bloc `:::complement` avec la source en lien.
> 3. Toute erreur probable, coquille, contradiction ou information impossible à vérifier va dans un bloc `:::verifier` qui cite ce que disent les notes et ce qui pose problème. Ne corrige jamais en silence.
> 4. Chaque `##`/`###` a un `{#id}` stable.
>
> Puis écris le `quiz.json` : 15 à 25 questions (QCM, vrai/faux, textes à trous) dont chaque réponse est vérifiable dans le cours et pointe vers sa `section`, 1 à 3 exercices `order` si le cours contient des étapes ou une chronologie, et 8 à 14 `cards` (avec `short` de moins de 60 caractères).
>
> Infos : type = amphi|td, matière = …, chapitre = …, id du dossier = …
> Donne-moi les deux fichiers complets.
