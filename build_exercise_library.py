#!/usr/bin/env python3
"""Generate js/exercise-library.js from the free-exercise-db dataset.

Source: https://github.com/yuhonas/free-exercise-db (MIT licence)
Images are served from jsDelivr and lazy-loaded, never bundled.

Preset B: everything except the 'stretching' category.

The 120 hand-written entries in js/exercises.js are the source of truth:
their ids are referenced by ROUTINE_TEMPLATES and by every logged workout,
so this script never emits an entry whose name collides with one of them.
"""
import json
import re
import urllib.request

SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
OUT = 'js/exercise-library.js'

# dataset equipment -> existing `type` vocabulary in js/exercises.js
TYPE_MAP = {
    'barbell': 'barbell', 'e-z curl bar': 'barbell',
    'dumbbell': 'dumbbell', 'kettlebells': 'kettlebell',
    'cable': 'cable', 'machine': 'machine',
    'body only': 'bodyweight',
}

# dataset primaryMuscle -> existing category vocabulary
CAT_MAP = {
    'chest': 'chest',
    'lats': 'back', 'middle back': 'back', 'lower back': 'back', 'traps': 'back',
    'quadriceps': 'legs', 'hamstrings': 'legs', 'glutes': 'legs',
    'calves': 'legs', 'adductors': 'legs', 'abductors': 'legs',
    'shoulders': 'shoulders', 'neck': 'shoulders',
    'biceps': 'arms', 'triceps': 'arms', 'forearms': 'arms',
    'abdominals': 'core',
}

MUSCLE_LABEL = {
    'abdominals': 'Abs', 'abductors': 'Abductors', 'adductors': 'Adductors',
    'biceps': 'Biceps', 'calves': 'Calves', 'chest': 'Chest',
    'forearms': 'Forearms', 'glutes': 'Glutes', 'hamstrings': 'Hamstrings',
    'lats': 'Lats', 'lower back': 'Lower Back', 'middle back': 'Upper Back',
    'neck': 'Neck', 'quadriceps': 'Quads', 'shoulders': 'Shoulders',
    'traps': 'Traps', 'triceps': 'Triceps',
}

# Hand-written exercise (normalised name) -> dataset exercise to borrow a photo
# from. Only needed where the automatic match is wrong or finds nothing; the
# value is also a normalised name. Targets that don't exist are simply ignored.
ALIASES = {
    # automatic match picked the wrong movement
    'barbell row': 'bent over barbell row',
    'cable fly': 'flat bench cable flyes',
    'cable curl': 'high cable curls',
    'dumbbell row': 'one arm dumbbell row',
    'pull up': 'pullups',
    'dips': 'parallel bar dip',
    'deadlift': 'barbell deadlift',
    'calf raise': 'calf raises',
    'hammer curl': 'hammer curls',
    'leg curl': 'lying leg curls',
    'leg extension': 'leg extensions',
    'lat pulldown': 'wide grip lat pulldown',
    'front raise': 'front dumbbell raise',
    'shoulder press': 'barbell shoulder press',
    'bench press': 'barbell bench press',
    'heavy bag': None,          # dataset's only "heavy bag" entry is a sled drag
    # no automatic match, but the dataset has an equivalent
    'ab wheel rollout': 'barbell ab rollout',
    'barbell back squat': 'barbell squat',
    'barbell lunges': 'barbell lunge',
    'battle ropes': 'battling ropes',
    'box jumps': 'box jump',
    'commute biking': 'bicycling',
    'cycling': 'bicycling',
    'spinning cycle class': 'bicycling stationary',
    'double unders': 'rope jumping',
    'jump rope': 'rope jumping',
    'dumbbell fly': 'dumbbell flyes',
    'reverse lunge': 'dumbbell rear lunge',
    'bulgarian split squat': 'split squat with dumbbells',
    'farmers carry': 'rickshaw carry',
    'handstand push up': 'handstand push ups',
    'kettlebell swing': 'one arm kettlebell swings',
    'kipping pull up': 'pullups',
    'leg raises': 'flat bench lying leg raise',
    'straight leg raise': 'flat bench lying leg raise',
    'overhead press': 'barbell shoulder press',
    'overhead tricep ext': 'cable rope overhead triceps extension',
    'rowing machine': 'rowing stationary',
    'seated cable row': 'seated cable rows',
    'side plank': 'push up to side plank',
    'sprint intervals': 'wind sprints',
    'stair climber': 'stairmaster',
    'thrusters': 'kettlebell thruster',
    'toes to bar': 'hanging leg raise',
    'tricep pushdown': 'triceps pushdown',
}

# trailing qualifiers that add noise without changing the movement
NAME_NOISE = re.compile(
    r'\s*-\s*(Medium Grip|Medium|Wide Grip|Narrow Grip|Close Grip|'
    r'With Bands|Band Assisted|Gethin Variation|Pronated Grip|Supinated Grip|'
    r'multiple response|Male|Female)\s*$', re.I)


def clean_name(n):
    n = n.strip()
    prev = None
    while prev != n:                      # strip stacked qualifiers
        prev = n
        n = NAME_NOISE.sub('', n).strip()
    n = re.sub(r'\s*\(.*?\)\s*$', '', n).strip()   # drop trailing parentheticals
    return re.sub(r'\s+', ' ', n)


def norm(s):
    """Loose key for duplicate detection against the hand-written library."""
    s = s.lower().replace('-', ' ').replace('/', ' ')
    s = re.sub(r'\b(db|bb|kb)\b', '', s)
    s = re.sub(r'[^a-z0-9 ]', '', s)
    return ' '.join(s.split())


def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def existing_names():
    src = open('js/exercises.js').read()
    block = src[src.index('const EXERCISES'):src.index('const EXERCISE_CATEGORIES')]
    return re.findall(r"name:\s*'([^']+)'", block)


def main():
    raw = json.loads(urllib.request.urlopen(SRC).read())

    hand_written = {norm(n) for n in existing_names()}
    taken = set(hand_written)
    seen_ids = set()
    out = []
    # (normalised name, image) for every usable dataset entry, used afterwards to
    # find a photo for each hand-written exercise.
    candidates = []
    skipped_no_img = skipped_dupe = 0

    for e in sorted(raw, key=lambda x: x['name']):
        if e.get('category') == 'stretching':      # preset B
            continue
        if not e.get('images'):
            skipped_no_img += 1
            continue

        primary = e.get('primaryMuscles') or []
        # The dataset files every cardio machine under 'quadriceps', which would
        # bucket treadmills and rowers with leg presses and log them as weight x
        # reps. Trust the dataset's own category instead and mark them distance-
        # measured so the app offers km / time / HR / calories.
        is_cardio = e.get('category') == 'cardio'
        cat = 'cardio' if is_cardio else next((CAT_MAP[m] for m in primary if m in CAT_MAP), None)
        if not cat:
            continue

        name = clean_name(e['name'])
        key = norm(name)
        candidates.append((key, e['name'], e['images'][0]))

        if not name or key in taken:
            skipped_dupe += 1
            continue
        taken.add(key)

        eid = 'x-' + slug(name)
        if eid in seen_ids:
            skipped_dupe += 1
            continue
        seen_ids.add(eid)

        muscles = [MUSCLE_LABEL.get(m, m.title())
                   for m in primary + (e.get('secondaryMuscles') or [])][:3]

        out.append({
            'id': eid,
            'name': name,
            'category': cat,
            'type': 'cardio' if is_cardio else TYPE_MAP.get(e.get('equipment'), 'other'),
            'muscles': muscles or ['Full Body'],
            'image': e['images'][0],
            'level': e.get('level') or 'beginner',
            'measureType': 'distance' if is_cardio else None,
        })

    # Photos for the hand-written exercises. Exact normalised name first; then a
    # conservative fallback that only accepts a dataset entry containing every
    # word of the hand-written name (so 'Bench Press' may match 'Barbell Bench
    # Press' but never the other way round), preferring the fewest extra words.
    # Several dataset entries collapse to the same cleaned name (e.g. the plain
    # lift and its '- With Bands' variant). Keep the one whose original name is
    # shortest, which is the plainest version of the movement.
    by_key = {}
    for key, orig, img in candidates:
        if key not in by_key or len(orig) < by_key[key][0]:
            by_key[key] = (len(orig), img)

    photos = {}
    for hw in hand_written:
        if hw in ALIASES:
            target = ALIASES[hw]
            if target and target in by_key:
                photos[hw] = by_key[target][1]
            continue
        if hw in by_key:
            photos[hw] = by_key[hw][1]
            continue
        words = set(hw.split())
        best = None
        for key, (olen, img) in by_key.items():
            kw = set(key.split())
            if words and words <= kw:
                rank = (len(kw - words), olen)
                if best is None or rank < best[0]:
                    best = (rank, img)
        if best and best[0][0] <= 2:
            photos[hw] = best[1]

    def esc(s):
        return s.replace('\\', '\\\\').replace("'", "\\'")

    lines = [
        '// ─── Extended exercise library ────────────────────────────────────────────────',
        '// Generated by build_exercise_library.py — do not edit by hand.',
        '// Source: https://github.com/yuhonas/free-exercise-db (MIT licence)',
        '// Photos are lazy-loaded from jsDelivr and cached by the service worker;',
        '// they are deliberately NOT precached (873 x 2 images is roughly 66MB).',
        "const EXERCISE_IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';",
        '',
        'const EXERCISE_LIBRARY = [',
    ]
    for x in out:
        muscles = ','.join(f"'{esc(m)}'" for m in x['muscles'])
        measure = f", measureType: '{x['measureType']}'" if x['measureType'] else ''
        lines.append(
            f"  {{ id: '{x['id']}', name: '{esc(x['name'])}', "
            f"category: '{x['category']}', type: '{x['type']}', "
            f"muscles: [{muscles}], image: '{esc(x['image'])}', "
            f"level: '{x['level']}'{measure} }},"
        )
    lines += [
        '];',
        '',
        '// Photos for the hand-written exercises in js/exercises.js, keyed by the',
        '// same loose-normalised name used for duplicate detection.',
        'const EXERCISE_PHOTOS = {',
    ]
    for k in sorted(photos):
        lines.append(f"  '{esc(k)}': '{esc(photos[k])}',")
    lines += ['};', '']

    with open(OUT, 'w') as f:
        f.write('\n'.join(lines))

    import collections
    print(f'wrote {OUT}: {len(out)} exercises')
    print(f'  photos for hand-written exercises: {len(photos)} / {len(hand_written)}')
    print(f'  skipped (no image): {skipped_no_img}')
    print(f'  skipped (duplicate of existing or each other): {skipped_dupe}')
    print('  by category:', dict(collections.Counter(x['category'] for x in out).most_common()))


if __name__ == '__main__':
    main()
