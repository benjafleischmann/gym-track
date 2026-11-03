// ─── Recommendation Engine ────────────────────────────────────────────────────
//
// Turns the onboarding assessment into a concrete training plan: which split,
// which exercises, how many sets and reps, and what load to start on.
//
// Every number in here traces back to a published source rather than taste:
//
//   ACSM position stand, "Progression Models in Resistance Training for Healthy
//   Adults" (Med Sci Sports Exerc, 2009) — rep ranges, %1RM bands and training
//   frequency per experience level.
//   https://journals.lww.com/acsm-msse/fulltext/2009/03000/progression_models_in_resistance_training_for.26.aspx
//
//   Schoenfeld, Ogborn & Krieger (2017), "Dose-response relationship between
//   weekly resistance training volume and increases in muscle mass" — the
//   ~10 sets/muscle/week target used by the volume check.
//   https://pubmed.ncbi.nlm.nih.gov/27433992/
//
//   Epley (1985) 1RM formula — used in both directions, to estimate a 1RM from
//   a logged set and to turn a 1RM back into a working load for a rep target.
//
//   ExRx.net adult strength standards — bodyweight multiples used to seed a
//   starting 1RM for someone with no logged history.
//   https://exrx.net/Testing/WeightLifting/StrengthStandards
//
//   CDC / NHS / WHO guidance on weight loss — the 0.5-1.0 kg per week band the
//   objective feasibility check is measured against.
//   https://www.cdc.gov/healthy-weight-growth/losing-weight/
//
// Nothing here is medical advice. The injury logic is deliberately additive:
// it adds supportive work and attaches cautions rather than hiding exercises,
// and only genuinely high-impact movements are held back.

const Recommend = {

  // ── Reference data ─────────────────────────────────────────────────────────

  // Estimated 1RM as a multiple of bodyweight, from the ExRx adult standards.
  // We map our three experience levels one rung DOWN the standards ladder on
  // purpose: starting too light costs one session, starting too heavy costs an
  // injury. Logged sets override these as soon as there is any history.
  STANDARDS: {
    male: {
      novice:       { squat: 0.75, bench: 0.50, deadlift: 1.00, ohp: 0.35, row: 0.50 },
      intermediate: { squat: 1.00, bench: 0.75, deadlift: 1.25, ohp: 0.45, row: 0.70 },
      advanced:     { squat: 1.25, bench: 1.00, deadlift: 1.50, ohp: 0.60, row: 0.90 },
    },
    female: {
      novice:       { squat: 0.50, bench: 0.25, deadlift: 0.50, ohp: 0.20, row: 0.30 },
      intermediate: { squat: 0.75, bench: 0.45, deadlift: 0.95, ohp: 0.30, row: 0.45 },
      advanced:     { squat: 1.00, bench: 0.60, deadlift: 1.25, ohp: 0.40, row: 0.60 },
    },
  },

  // Working load for an exercise, as a fraction of the base lift's 1RM. The
  // number is what the user actually types into the weight field, so dumbbell
  // entries are already per-hand. Anything missing from this map falls back to
  // reps-in-reserve guidance instead of inventing a number.
  LOAD_MODEL: {
    'squat':            ['squat', 1.00], 'front-squat':   ['squat', 0.80],
    'leg-press':        ['squat', 1.80], 'hack-squat':    ['squat', 1.20],
    'lunges':           ['squat', 0.45], 'db-lunges':     ['squat', 0.22],
    'bulgarian-split':  ['squat', 0.20], 'db-reverse-lunge': ['squat', 0.22],
    'step-ups':         ['squat', 0.20], 'leg-extension': ['squat', 0.35],
    'leg-curl':         ['squat', 0.30], 'calf-raise':    ['squat', 0.70],
    'hip-thrust':       ['squat', 1.10], 'kb-goblet-squat': ['squat', 0.30],
    'wall-balls':       ['squat', 0.12],

    'deadlift':         ['deadlift', 1.00], 'rdl':        ['deadlift', 0.70],
    'good-morning':     ['deadlift', 0.35], 'kb-swing':   ['deadlift', 0.22],
    'power-clean':      ['deadlift', 0.60], 'farmers-carry': ['deadlift', 0.35],

    'bench-press':      ['bench', 1.00], 'incline-bench': ['bench', 0.80],
    'db-bench':         ['bench', 0.40], 'db-fly':        ['bench', 0.18],
    'cable-fly':        ['bench', 0.22], 'skull-crusher': ['bench', 0.30],
    'tricep-pushdown':  ['bench', 0.35], 'overhead-tricep': ['bench', 0.22],

    'overhead-press':   ['ohp', 1.00], 'db-shoulder-press': ['ohp', 0.40],
    'lateral-raise':    ['ohp', 0.15], 'front-raise':   ['ohp', 0.15],
    'face-pull':        ['ohp', 0.35], 'thrusters':     ['ohp', 0.80],
    'db-thruster':      ['ohp', 0.35], 'kb-clean-press': ['ohp', 0.35],

    'barbell-row':      ['row', 1.00], 'db-row':         ['row', 0.42],
    'seated-row':       ['row', 0.90], 'lat-pulldown':   ['row', 0.90],
    'barbell-curl':     ['row', 0.45], 'db-curl':        ['row', 0.20],
    'hammer-curl':      ['row', 0.22], 'cable-curl':     ['row', 0.35],
    'db-renegade-row':  ['row', 0.25], 'cable-crunch':   ['row', 0.40],
  },

  // Rep target and rest per goal. Rep ranges and rest periods follow the ACSM
  // position stand; the load that goes with them is derived from the rep count
  // via Epley rather than hard-coded, so the two can never disagree.
  PRESCRIPTION: {
    strength:  { sets: 4, reps: 5,  rest: 180, accessoryReps: 8,  label: 'Heavy, long rests' },
    muscle:    { sets: 4, reps: 8,  rest: 120, accessoryReps: 12, label: 'Moderate load, moderate volume' },
    bulking:   { sets: 4, reps: 8,  rest: 120, accessoryReps: 12, label: 'Moderate load, moderate volume' },
    fat_loss:  { sets: 3, reps: 12, rest: 60,  accessoryReps: 15, label: 'Lighter load, short rests' },
    endurance: { sets: 3, reps: 15, rest: 45,  accessoryReps: 18, label: 'Light load, minimal rest' },
    health:    { sets: 3, reps: 12, rest: 60,  accessoryReps: 15, label: 'Moderate and sustainable' },
  },

  // ACSM training frequency per experience level. Used to sanity-check the
  // number of days the user says they have available.
  FREQUENCY: {
    novice:       { min: 2, max: 3, note: 'ACSM recommends 2-3 days a week while you are learning the movements.' },
    intermediate: { min: 3, max: 4, note: 'ACSM recommends 3-4 days a week at this stage.' },
    advanced:     { min: 4, max: 5, note: 'ACSM recommends 4-5 days a week for advanced trainees.' },
  },

  // Injury handling is additive by design. `supportive` work gets prepended to
  // every session as a prep block, `caution` attaches a note to an exercise the
  // user keeps, and `avoid` is reserved for movements whose whole point is a
  // hard landing or a loaded end-range that cannot be scaled down in-app.
  INJURY: {
    knee: {
      label: 'Knee',
      supportive: ['tke', 'short-arc-quad', 'glute-bridge-bw', 'clamshell', 'side-leg-raise'],
      caution: {
        'squat':           'Work to a pain-free depth before adding load.',
        'leg-press':       'Stop short of locking out at the top.',
        'leg-extension':   'Keep the load light; avoid the last few degrees of extension.',
        'lunges':          'Shorten the step if you feel it at the kneecap.',
        'bulgarian-split': 'Shorten the step if you feel it at the kneecap.',
      },
      avoid: ['burpee-broad-jump', 'broad-jump', 'box-jumps', 'jump-squat'],
      avoidReason: 'repeated hard landings',
    },
    lower_back: {
      label: 'Lower back',
      supportive: ['bird-dog', 'dead-bug', 'cat-cow', 'mcgill-curlup', 'glute-bridge-bw'],
      caution: {
        'deadlift':     'Start well below your usual load and keep the spine neutral.',
        'rdl':          'Reduce range until you can hold a neutral spine throughout.',
        'barbell-row':  'Try a chest-supported row if the hinge position aggravates it.',
        'good-morning': 'Very light load, or swap for a hip thrust.',
        'russian-twist':'Loaded rotation under fatigue is a common aggravator.',
      },
      avoid: ['burpee-broad-jump'],
      avoidReason: 'repeated loaded flexion under fatigue',
    },
    shoulder: {
      label: 'Shoulder',
      supportive: ['band-external-rot', 'scap-wall-slide', 'prone-ytw', 'face-pull', 'scap-pushup'],
      caution: {
        'bench-press':    'A slightly narrower grip is usually kinder to the front of the shoulder.',
        'overhead-press': 'Build up overhead load gradually; stop if there is a pinch.',
        'dips':           'Limit depth to where the shoulder stays comfortable.',
        'lateral-raise':  'Stay at or below shoulder height.',
        'upright-row':    'Often provocative; swap for a face pull if so.',
      },
      avoid: ['muscle-up', 'kipping-pullup', 'hspu', 'snatch'],
      avoidReason: 'ballistic overhead loading',
    },
    hip: {
      label: 'Hip',
      supportive: ['nine-ninety', 'hip-flexor-stretch', 'monster-walk', 'clamshell', 'glute-bridge-bw'],
      caution: {
        'squat':        'Widen your stance slightly if you feel a pinch at the front of the hip.',
        'deadlift':     'Reduce range to what stays comfortable.',
        'leg-raises':   'Hip-flexor dominant; stop if it grabs at the front.',
        'hanging-leg-raise': 'Hip-flexor dominant; stop if it grabs at the front.',
      },
      avoid: [],
      avoidReason: '',
    },
    wrist: {
      label: 'Wrist / elbow',
      supportive: ['wrist-extensor-stretch', 'eccentric-wrist-curl', 'wrist-circles'],
      caution: {
        'front-squat':  'Use straps or a cross-arm grip to unload the wrist.',
        'pushup':       'Push-up handles or dumbbells keep the wrist neutral.',
        'barbell-curl': 'An EZ bar or hammer curl is usually more comfortable.',
        'thrusters':    'The rack position loads the wrist; go light.',
        'ab-wheel':     'Heavy on the wrist in extension.',
      },
      avoid: [],
      avoidReason: '',
    },
    neck: {
      label: 'Neck',
      supportive: ['chin-tuck', 'upper-trap-stretch', 'scap-retraction', 'prone-ytw'],
      caution: {
        'overhead-press': 'Avoid craning the head forward to clear the bar.',
        'shrugs':         'Keep the range small and the load moderate.',
        'crunches':       'Support the head; do not pull on the neck.',
        'russian-twist':  'Keep the gaze steady rather than whipping the head around.',
      },
      avoid: ['hspu'],
      avoidReason: 'direct loading through the head and neck',
    },
    ankle: {
      label: 'Ankle',
      supportive: ['eccentric-heel-drop', 'ankle-alphabet', 'ankle-circles', 'single-leg-balance'],
      caution: {
        'squat':   'Raising the heel slightly can help if the ankle limits depth.',
        'running': 'Build mileage slowly; stop if it swells afterwards.',
        'lunges':  'Keep the front foot flat and the knee tracking over the toes.',
      },
      avoid: ['box-jumps', 'broad-jump', 'burpee-broad-jump', 'double-unders'],
      avoidReason: 'repeated impact through the ankle',
    },
  },

  EQUIPMENT: {
    full_gym:   { label: 'Full gym',       allow: null },
    dumbbells:  { label: 'Dumbbells / home', allow: ['dumbbell', 'kettlebell', 'bodyweight', 'cardio', 'other'] },
    bodyweight: { label: 'Bodyweight only',  allow: ['bodyweight', 'cardio'] },
  },

  // ── Maths helpers ──────────────────────────────────────────────────────────

  // Epley: 1RM = w × (1 + r/30), and its inverse, the fraction of 1RM you can
  // expect to move for a given number of reps.
  oneRepMax(weight, reps) { return weight * (1 + reps / 30); },
  pctForReps(reps)        { return 1 / (1 + reps / 30); },

  // Barbells load in 2.5 kg jumps, so round down to one. Rounding down rather
  // than to nearest keeps the first session on the forgiving side.
  roundLoad(kg) {
    if (!kg || kg <= 0) return null;
    if (kg < 10) return Math.max(2.5, Math.floor(kg * 2) / 2);
    return Math.floor(kg / 2.5) * 2.5;
  },

  // Starting 1RM for one of the five base lifts, from bodyweight standards.
  baseOneRepMax(lift, profile) {
    const sex   = profile.sex === 'female' ? 'female' : 'male';
    const level = this.STANDARDS[sex][profile.experience] ? profile.experience : 'novice';
    const mult  = this.STANDARDS[sex][level][lift];
    const bw    = parseFloat(profile.weightKg);
    return mult && bw ? mult * bw : null;
  },

  // Suggested working weight for an exercise at a given rep target. Prefers
  // real logged history over the bodyweight estimate whenever it exists.
  suggestLoad(exerciseId, reps, profile) {
    const logged = this._loggedOneRepMax(exerciseId);
    const entry  = this.LOAD_MODEL[exerciseId];

    if (logged) return { kg: this.roundLoad(logged * this.pctForReps(reps)), source: 'history' };
    if (!entry) return { kg: null, source: 'rir' };

    const base = this.baseOneRepMax(entry[0], profile);
    if (!base) return { kg: null, source: 'rir' };

    // Shade the very first prescription down a notch — the standards describe a
    // population, not this person, and the next session corrects it upwards.
    const est = base * entry[1] * 0.9;
    return { kg: this.roundLoad(est * this.pctForReps(reps)), source: 'estimate' };
  },

  // Best estimated 1RM from anything already logged for this exercise.
  _loggedOneRepMax(exerciseId) {
    if (typeof DB === 'undefined') return null;
    let best = 0;
    DB.getWorkouts().forEach(w => (w.exercises || []).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      (ex.sets || []).forEach(s => {
        const wt = parseFloat(s.weight), rp = parseInt(s.reps);
        if (s.completed && wt > 0 && rp > 0 && rp <= 15) {
          best = Math.max(best, this.oneRepMax(wt, rp));
        }
      });
    }));
    return best || null;
  },

  // ── Objective feasibility ──────────────────────────────────────────────────

  // Measures the stated objective against the 0.5-1.0 kg per week band that the
  // CDC, NHS and WHO all converge on, expressed as a share of bodyweight so it
  // scales with the person. This is the part most apps skip: if the target is
  // not reachable in the time given, say so and show what is.
  assessObjective(profile) {
    const bw     = parseFloat(profile.weightKg);
    const target = parseFloat(profile.targetWeightKg);
    const weeks  = parseFloat(profile.targetWeeks);
    if (!bw || !target || !weeks || weeks <= 0) return null;

    const delta = target - bw;
    if (Math.abs(delta) < 0.5) {
      return { kind: 'maintain', verdict: 'safe', weeks,
        message: 'Your target is roughly your current weight, so this is a maintenance plan.' };
    }

    const losing  = delta < 0;
    const perWeek = Math.abs(delta) / weeks;
    const pct     = (perWeek / bw) * 100;

    // Loss: up to 1% of bodyweight a week is the usual ceiling for holding on
    // to muscle. Gain: lean mass simply cannot be added much faster than
    // ~0.25-0.5 kg a week, and past that the surplus is mostly fat.
    const safeRate = losing ? Math.min(1.0, bw * 0.01) : 0.35;
    const pushRate = losing ? Math.min(1.5, bw * 0.015) : 0.5;

    let verdict = 'safe';
    if (perWeek > pushRate)      verdict = 'unrealistic';
    else if (perWeek > safeRate) verdict = 'aggressive';

    const safeWeeks = Math.ceil(Math.abs(delta) / safeRate);
    const realistic = new Date(Date.now() + safeWeeks * 7 * 86400000);

    const verb = losing ? 'lose' : 'gain';
    let message;
    if (verdict === 'safe') {
      message = `${Math.abs(delta).toFixed(1)} kg to ${verb} over ${weeks} weeks is about `
              + `${perWeek.toFixed(2)} kg a week. That sits inside the recommended range.`;
    } else if (verdict === 'aggressive') {
      message = `That works out at ${perWeek.toFixed(2)} kg a week (${pct.toFixed(1)}% of your bodyweight). `
              + `It is doable but on the aggressive side — expect to ${losing ? 'lose some strength' : 'add some fat'} along the way.`;
    } else {
      message = `${Math.abs(delta).toFixed(1)} kg in ${weeks} weeks means ${perWeek.toFixed(2)} kg a week, `
              + `well above the ${safeRate.toFixed(2)} kg a week that is sustainable for you. `
              + `A realistic target date is ${realistic.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`;
    }

    return {
      kind: losing ? 'loss' : 'gain',
      deltaKg: Math.abs(delta), weeks, perWeek, pct, verdict,
      safeRate, safeWeeks, realisticDate: realistic, message,
    };
  },

  // ── Split selection ────────────────────────────────────────────────────────

  // Which exercises each training day draws from, per split. Days are listed in
  // the order they should be run.
  SPLITS: {
    full_body_2: { name: 'Full Body', days: ['full_a', 'full_b'] },
    full_body_3: { name: 'Full Body', days: ['full_a', 'full_b', 'full_c'] },
    upper_lower: { name: 'Upper / Lower', days: ['upper_a', 'lower_a', 'upper_b', 'lower_b'] },
    ppl_5:       { name: 'Push / Pull / Legs', days: ['push', 'pull', 'legs', 'upper_a', 'lower_a'] },
    ppl_6:       { name: 'Push / Pull / Legs', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
  },

  DAY_TEMPLATES: {
    full_a:  { name: 'Full Body A', ids: ['squat', 'bench-press', 'barbell-row', 'plank'] },
    full_b:  { name: 'Full Body B', ids: ['deadlift', 'overhead-press', 'lat-pulldown', 'leg-press', 'side-plank'] },
    full_c:  { name: 'Full Body C', ids: ['front-squat', 'incline-bench', 'seated-row', 'hip-thrust', 'ab-wheel'] },
    upper_a: { name: 'Upper (Push focus)', ids: ['bench-press', 'overhead-press', 'barbell-row', 'lateral-raise', 'tricep-pushdown', 'face-pull'] },
    upper_b: { name: 'Upper (Pull focus)', ids: ['pullup', 'incline-bench', 'seated-row', 'db-shoulder-press', 'barbell-curl', 'face-pull'] },
    lower_a: { name: 'Lower (Squat focus)', ids: ['squat', 'rdl', 'leg-press', 'leg-curl', 'calf-raise', 'plank'] },
    lower_b: { name: 'Lower (Hinge focus)', ids: ['deadlift', 'bulgarian-split', 'hip-thrust', 'leg-extension', 'calf-raise', 'hanging-leg-raise'] },
    push:    { name: 'Push', ids: ['bench-press', 'overhead-press', 'incline-bench', 'lateral-raise', 'tricep-pushdown', 'overhead-tricep'] },
    pull:    { name: 'Pull', ids: ['deadlift', 'pullup', 'barbell-row', 'seated-row', 'face-pull', 'barbell-curl'] },
    legs:    { name: 'Legs', ids: ['squat', 'rdl', 'leg-press', 'leg-curl', 'calf-raise', 'ab-wheel'] },
  },

  // Equipment-constrained stand-ins, tried in order.
  SUBSTITUTES: {
    // Chains run barbell → dumbbell/kettlebell → bodyweight. Each one ends in
    // enough distinct bodyweight options that a gym-free day still fills out:
    // the resolver skips anything already used, so short chains leave holes.
    'squat':          ['kb-goblet-squat', 'bulgarian-split', 'x-bodyweight-squat', 'jump-squat'],
    'front-squat':    ['kb-goblet-squat', 'db-lunges', 'x-split-jump', 'wall-sit'],
    'deadlift':       ['kb-swing', 'rdl', 'x-natural-glute-ham-raise', 'glute-bridge-bw'],
    'rdl':            ['kb-swing', 'x-single-leg-glute-bridge', 'glute-bridge-bw'],
    'bench-press':    ['db-bench', 'pushup', 'x-push-ups-with-feet-elevated'],
    'incline-bench':  ['db-bench', 'x-incline-push-up', 'x-push-up-wide', 'pushup'],
    'overhead-press': ['db-shoulder-press', 'x-handstand-push-ups', 'pike-pushup', 'pushup'],
    'barbell-row':    ['db-row', 'seated-row', 'pullup', 'x-v-bar-pullup'],
    'lat-pulldown':   ['pullup', 'db-row', 'chinup'],
    'seated-row':     ['db-row', 'pullup', 'chinup'],
    'leg-press':      ['bulgarian-split', 'db-lunges', 'x-step-up-with-knee-raise', 'wall-sit'],
    'leg-curl':       ['glute-bridge-bw', 'kb-swing', 'x-natural-glute-ham-raise'],
    'leg-extension':  ['wall-sit', 'step-ups', 'x-leg-lift'],
    'hip-thrust':     ['glute-bridge-bw', 'x-single-leg-glute-bridge'],
    'calf-raise':     ['eccentric-heel-drop'],
    'pullup':         ['lat-pulldown', 'db-row', 'chinup'],
    'barbell-curl':   ['db-curl', 'hammer-curl', 'chinup'],
    'tricep-pushdown':['overhead-tricep', 'dips', 'x-bench-dips', 'x-push-ups-close-triceps-position'],
    'face-pull':      ['band-external-rot', 'prone-ytw', 'scap-wall-slide'],
    'lateral-raise':  ['front-raise', 'x-isometric-chest-squeezes'],
    'bulgarian-split':['db-lunges', 'step-ups', 'x-split-jump'],
    'cable-crunch':   ['crunches', 'x-reverse-crunch'],
    'ab-wheel':       ['plank', 'dead-bug'],
  },

  chooseSplit(daysPerWeek) {
    const d = Math.max(2, Math.min(6, parseInt(daysPerWeek) || 3));
    if (d <= 2) return { key: 'full_body_2', days: 2 };
    if (d === 3) return { key: 'full_body_3', days: 3 };
    if (d === 4) return { key: 'upper_lower', days: 4 };
    if (d === 5) return { key: 'ppl_5', days: 5 };
    return { key: 'ppl_6', days: 6 };
  },

  // ── Plan construction ──────────────────────────────────────────────────────

  _injuryAreas(profile) {
    return (profile.injuries || []).map(i => i.area).filter(a => this.INJURY[a]);
  },

  // Everything the user's injuries say about a given exercise.
  injuryNotes(exerciseId, profile) {
    const notes = [];
    this._injuryAreas(profile).forEach(area => {
      const note = this.INJURY[area].caution[exerciseId];
      if (note) notes.push({ area, label: this.INJURY[area].label, note });
    });
    return notes;
  },

  _isAvoided(exerciseId, profile) {
    return this._injuryAreas(profile).some(a => this.INJURY[a].avoid.includes(exerciseId));
  },

  _equipmentOk(exerciseId, profile) {
    const allow = this.EQUIPMENT[profile.equipment]?.allow;
    if (!allow) return true;
    const info = typeof getExercise === 'function' ? getExercise(exerciseId) : null;
    return info ? allow.includes(info.type) : false;
  },

  // Resolve one slot in a day template into something this person can actually
  // do, walking the substitute chain if equipment or an injury rules it out.
  // `used` holds what the day already contains. Without it, several slots can
  // fall down to the same substitute — on bodyweight-only equipment three
  // different presses all land on the push-up — and the day repeats itself.
  _resolve(exerciseId, profile, used) {
    const candidates = [exerciseId, ...(this.SUBSTITUTES[exerciseId] || [])];
    for (const id of candidates) {
      const info = typeof getExercise === 'function' ? getExercise(id) : null;
      if (!info) continue;
      if (used && used.has(id)) continue;
      if (this._isAvoided(id, profile)) continue;
      if (!this._equipmentOk(id, profile)) continue;
      return { id, swappedFrom: id === exerciseId ? null : exerciseId };
    }
    return null;
  },

  // The supportive prep block that leads every session when injuries are flagged.
  // Capped at 6 movements total. Three per area is fine for one injury, but
  // someone who ticks every box would otherwise open each session with 21
  // rehab movements and never reach the training.
  _prepBlock(profile) {
    const seen  = new Set();
    const out   = [];
    const areas = this._injuryAreas(profile);
    const perArea = areas.length > 2 ? 1 : 3;
    areas.forEach(area => {
      this.INJURY[area].supportive.slice(0, perArea).forEach(id => {
        if (out.length >= 6) return;
        if (seen.has(id)) return;
        const info = typeof getExercise === 'function' ? getExercise(id) : null;
        if (!info) return;
        seen.add(id);
        out.push({
          exerciseId: id,
          sets: 2,
          reps: info.measureType === 'time' ? '30s' : '10',
          rest: 30,
          prep: true,
          forArea: this.INJURY[area].label,
        });
      });
    });
    return out;
  },

  // Builds the full routine. Returns the same shape as a stored routine so the
  // rest of the app — routine detail, workout start, progression — needs no
  // special cases, plus a `meta` block the Recommended tab renders.
  buildPlan(profile) {
    if (!profile || !profile.weightKg || !profile.experience) return null;

    const goal   = this.PRESCRIPTION[profile.goal] ? profile.goal : 'muscle';
    const rx     = this.PRESCRIPTION[goal];
    const split  = this.chooseSplit(profile.daysPerWeek);
    const prep   = this._prepBlock(profile);
    const swaps  = [];

    const days = this.SPLITS[split.key].days.map((dayKey, i) => {
      const tpl = this.DAY_TEMPLATES[dayKey];
      const exercises = [...prep];
      const used = new Set(prep.map(p => p.exerciseId));

      tpl.ids.forEach((slotId, idx) => {
        const picked = this._resolve(slotId, profile, used);
        if (!picked) return;
        used.add(picked.id);
        if (picked.swappedFrom && !swaps.some(s => s.from === picked.swappedFrom && s.to === picked.id)) {
          swaps.push({ from: picked.swappedFrom, to: picked.id });
        }

        const info      = getExercise(picked.id);
        const isCompound = idx < 2;
        const reps      = isCompound ? rx.reps : rx.accessoryReps;
        const cardio    = info.measureType === 'distance' || info.measureType === 'activity';
        const timed     = info.measureType === 'time';
        const load      = cardio || timed ? { kg: null, source: 'na' }
                                          : this.suggestLoad(picked.id, reps, profile);

        exercises.push({
          exerciseId:  picked.id,
          sets:        isCompound ? rx.sets : Math.max(2, rx.sets - 1),
          reps:        timed ? '45s' : String(reps),
          // Accessories rest shorter, rounded to 15s so the timer shows a
          // number anyone would actually set on a clock.
          rest:        isCompound ? rx.rest : Math.max(30, Math.round(rx.rest * 0.6 / 15) * 15),
          suggestedKg: load.kg,
          loadSource:  load.source,
        });
      });

      // A conditioning finisher only earns its place when the goal needs it.
      if (goal === 'fat_loss' || goal === 'endurance') {
        const cardio = this._resolve('running', profile) || this._resolve('cycling', profile);
        if (cardio) exercises.push({ exerciseId: cardio.id, sets: 1, reps: '20min', rest: 0, finisher: true });
      }

      return { id: `day-${i + 1}`, name: tpl.name, exercises };
    });

    return {
      id:          'rec-plan',
      name:        `${this.SPLITS[split.key].name} · ${split.days} days`,
      type:        goal === 'endurance' ? 'cardio' : 'strength',
      goal,
      daysPerWeek: split.days,
      description: `Built for you from your assessment. ${rx.label}.`,
      days,
      meta: this.planMeta(profile, goal, rx, split, swaps, prep),
    };
  },

  planMeta(profile, goal, rx, split, swaps, prep) {
    const freq     = this.FREQUENCY[profile.experience] || this.FREQUENCY.novice;
    const asked    = parseInt(profile.daysPerWeek) || split.days;
    const notes    = [];

    if (asked > freq.max) {
      notes.push({ kind: 'warn', text:
        `You picked ${asked} days a week. ${freq.note} The extra days are yours to use, but recovery is where the adaptation happens.` });
    } else if (asked < freq.min) {
      notes.push({ kind: 'info', text:
        `${freq.note} At ${asked} days a week this plan uses full-body sessions so every muscle still gets trained often enough.` });
    }

    if (prep.length) {
      const areas = [...new Set(prep.map(p => p.forArea))].join(', ');
      notes.push({ kind: 'info', text:
        `Every session opens with ${prep.length} prep movements for your ${areas.toLowerCase()}. Nothing has been removed from your plan — the supportive work is added on top.` });
    }

    if (swaps.length) {
      const list = swaps.slice(0, 3).map(s => `${getExercise(s.from)?.name} → ${getExercise(s.to)?.name}`).join(', ');
      notes.push({ kind: 'info', text: `Adjusted for your equipment and injuries: ${list}.` });
    }

    return {
      goalLabel:   rx.label,
      splitName:   this.SPLITS[split.key].name,
      objective:   this.assessObjective(profile),
      volume:      this.weeklyVolume(split, goal),
      notes,
      swaps,
    };
  },

  // Weekly sets landing on each major muscle, checked against the ~10 sets a
  // week that Schoenfeld et al. found to be the point where gains step up.
  weeklyVolume(split, goal) {
    const rx     = this.PRESCRIPTION[goal];
    const counts = {};
    this.SPLITS[split.key].days.forEach(dayKey => {
      this.DAY_TEMPLATES[dayKey].ids.forEach((id, idx) => {
        const info = typeof getExercise === 'function' ? getExercise(id) : null;
        if (!info || info.category === 'mobility') return;
        const sets = idx < 2 ? rx.sets : Math.max(2, rx.sets - 1);
        counts[info.category] = (counts[info.category] || 0) + sets;
      });
    });
    const low = Object.entries(counts).filter(([, n]) => n < 10).map(([c]) => c);
    return { counts, low, target: 10 };
  },

  // ── Template ranking ───────────────────────────────────────────────────────

  // Scores the built-in templates against the profile so the Recommended tab can
  // offer alternatives. Nothing is filtered out — every template stays available
  // on its own tab; this only decides the order and explains the reasoning.
  scoreTemplates(profile) {
    if (!profile || !profile.experience) return [];
    const asked = parseInt(profile.daysPerWeek) || 3;

    return ROUTINE_TEMPLATES.map(t => {
      let score = 50;
      const reasons = [];

      if (t.goal === profile.goal) { score += 25; reasons.push('matches your goal'); }
      if (t.type === profile.trainingType) { score += 20; reasons.push('matches your training style'); }
      else if (profile.trainingType === 'mixed') { score += 8; }

      const dayGap = Math.abs((t.daysPerWeek || 3) - asked);
      score += Math.max(0, 15 - dayGap * 7);
      if (dayGap === 0) reasons.push(`${t.daysPerWeek} days a week, like you asked for`);

      // Olympic and high-skill work is a poor first stop for a true beginner.
      if (profile.experience === 'novice' && (t.type === 'crossfit' || t.id === 'tpl-531')) {
        score -= 20;
        reasons.push('demanding technically for a beginner');
      }

      // Count how much of the routine the user's injuries have something to say
      // about, so the card can be upfront about it.
      const flagged = new Set();
      (t.days || []).forEach(d => (d.exercises || []).forEach(ex => {
        if (this._isAvoided(ex.exerciseId, profile)) flagged.add(ex.exerciseId);
      }));
      if (flagged.size) {
        score -= flagged.size * 4;
        reasons.push(`${flagged.size} movement${flagged.size > 1 ? 's' : ''} to approach carefully`);
      }

      return { template: t, score: Math.max(5, Math.min(99, score)), reasons, flagged: [...flagged] };
    }).sort((a, b) => b.score - a.score);
  },

  // ── Profile completeness ───────────────────────────────────────────────────

  isAssessed(profile) {
    return !!(profile && profile.weightKg && profile.heightCm && profile.experience);
  },
};
