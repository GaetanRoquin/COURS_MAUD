#!/usr/bin/env python3
"""Génère content/manifest.json à partir des dossiers content/courses/*/.

Chaque cours = un dossier contenant :
  - course.md  (obligatoire) : en-tête YAML simple (clé: valeur) + contenu Markdown
  - quiz.json  (facultatif)  : questions, exercices d'ordre, cartes

Usage :  python3 tools/build_manifest.py
Le script vérifie aussi le format des quiz et s'arrête avec un message clair en cas d'erreur.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSES = os.path.join(ROOT, 'content', 'courses')
errors = []

def front_matter(text, where):
    m = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.S)
    if not m:
        errors.append(f'{where}: en-tête --- manquant'); return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        if ':' in line:
            k, v = line.split(':', 1)
            meta[k.strip()] = v.strip()
    return meta, text[m.end():]

def check_quiz(q, where, section_ids):
    for key in ('questions', 'order', 'cards'):
        if key in q and not isinstance(q[key], list):
            errors.append(f'{where}: "{key}" doit être une liste')
    ids = set()
    for item in q.get('questions', []):
        qid = item.get('id')
        if not qid: errors.append(f'{where}: question sans id'); continue
        if qid in ids: errors.append(f'{where}: id en double "{qid}"')
        ids.add(qid)
        t = item.get('type')
        if t == 'qcm':
            ch = item.get('choices', [])
            if len(ch) < 2 or not isinstance(item.get('answer'), int) or not (0 <= item['answer'] < len(ch)):
                errors.append(f'{where}: QCM "{qid}" mal formé (choices/answer)')
        elif t == 'vf':
            if not isinstance(item.get('answer'), bool): errors.append(f'{where}: V/F "{qid}" doit avoir answer true/false')
        elif t == 'trou':
            if '___' not in item.get('q', '') or not item.get('answer'):
                errors.append(f'{where}: texte à trous "{qid}" doit contenir ___ et une answer')
        else:
            errors.append(f'{where}: type inconnu "{t}" pour "{qid}" (qcm | vf | trou)')
        sec = item.get('section')
        if sec and sec not in section_ids:
            errors.append(f'{where}: "{qid}" pointe vers une section inconnue "#{sec}"')
    for o in q.get('order', []):
        if len(o.get('items', [])) < 2: errors.append(f'{where}: exercice d\'ordre "{o.get("id")}" trop court')
    for c in q.get('cards', []):
        if not c.get('front') or not c.get('back'): errors.append(f'{where}: carte "{c.get("id")}" incomplète')

courses = []
for slug in sorted(os.listdir(COURSES)):
    d = os.path.join(COURSES, slug)
    md = os.path.join(d, 'course.md')
    if not os.path.isfile(md): continue
    text = open(md, encoding='utf-8').read()
    meta, body = front_matter(text, slug)
    for req in ('title', 'type', 'matiere'):
        if req not in meta: errors.append(f'{slug}: champ "{req}" manquant dans l\'en-tête')
    if meta.get('type') not in ('amphi', 'td'): errors.append(f'{slug}: type doit être amphi ou td')
    section_ids = set(re.findall(r'\{#([\w-]+)\}', body))
    entry = {
        'id': slug, 'title': meta.get('title', slug), 'type': meta.get('type', 'amphi'),
        'matiere': meta.get('matiere', 'Divers'), 'chapitre': meta.get('chapitre', ''),
        'order': float(meta.get('order', 0) or 0), 'emoji': meta.get('emoji', '📘'),
        'description': meta.get('description', ''), 'lang': meta.get('lang', 'fr'),
        'sections': len(re.findall(r'^## ', body, re.M)), 'quiz': None,
    }
    qp = os.path.join(d, 'quiz.json')
    if os.path.isfile(qp):
        try:
            q = json.load(open(qp, encoding='utf-8'))
            check_quiz(q, slug + '/quiz.json', section_ids)
            entry['quiz'] = {'questions': len(q.get('questions', [])), 'order': len(q.get('order', [])),
                             'cards': len(q.get('cards', [])),
                             'vf': sum(1 for x in q.get('questions', []) if x.get('type') == 'vf'),
                             'trou': sum(1 for x in q.get('questions', []) if x.get('type') == 'trou')}
        except json.JSONDecodeError as e:
            errors.append(f'{slug}/quiz.json: JSON invalide ({e})')
    courses.append(entry)

if errors:
    print('❌ Erreurs dans le contenu :'); [print('  -', e) for e in errors]; sys.exit(1)

json.dump({'courses': courses}, open(os.path.join(ROOT, 'content', 'manifest.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print(f'✅ manifest.json : {len(courses)} cours')
