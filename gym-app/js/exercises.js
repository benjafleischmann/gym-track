// ─── Exercise Library ─────────────────────────────────────────────────────────

const EXERCISES = [
  // COMPOUND
  { id: 'squat',            name: 'Barbell Back Squat',      category: 'legs',       type: 'barbell',     muscles: ['Quads','Glutes','Hamstrings'] },
  { id: 'front-squat',      name: 'Front Squat',             category: 'legs',       type: 'barbell',     muscles: ['Quads','Core'] },
  { id: 'deadlift',         name: 'Deadlift',                category: 'back',       type: 'barbell',     muscles: ['Hamstrings','Glutes','Back','Traps'] },
  { id: 'rdl',              name: 'Romanian Deadlift',       category: 'back',       type: 'barbell',     muscles: ['Hamstrings','Glutes','Lower Back'] },
  { id: 'bench-press',      name: 'Bench Press',             category: 'chest',      type: 'barbell',     muscles: ['Chest','Triceps','Front Delts'] },
  { id: 'incline-bench',    name: 'Incline Bench Press',     category: 'chest',      type: 'barbell',     muscles: ['Upper Chest','Triceps','Front Delts'] },
  { id: 'overhead-press',   name: 'Overhead Press',          category: 'shoulders',  type: 'barbell',     muscles: ['Shoulders','Triceps','Core'] },
  { id: 'barbell-row',      name: 'Barbell Row',             category: 'back',       type: 'barbell',     muscles: ['Lats','Rhomboids','Biceps'] },
  { id: 'pullup',           name: 'Pull-Up',                 category: 'back',       type: 'bodyweight',  muscles: ['Lats','Biceps'] },
  { id: 'chinup',           name: 'Chin-Up',                 category: 'back',       type: 'bodyweight',  muscles: ['Lats','Biceps'] },
  // CHEST
  { id: 'db-bench',         name: 'Dumbbell Bench Press',    category: 'chest',      type: 'dumbbell',    muscles: ['Chest','Triceps'] },
  { id: 'db-fly',           name: 'Dumbbell Fly',            category: 'chest',      type: 'dumbbell',    muscles: ['Chest'] },
  { id: 'cable-fly',        name: 'Cable Fly',               category: 'chest',      type: 'cable',       muscles: ['Chest'] },
  { id: 'dips',             name: 'Dips',                    category: 'chest',      type: 'bodyweight',  muscles: ['Chest','Triceps'] },
  { id: 'pushup',           name: 'Push-Up',                 category: 'chest',      type: 'bodyweight',  muscles: ['Chest','Triceps','Front Delts'] },
  // SHOULDERS
  { id: 'db-shoulder-press',name: 'DB Shoulder Press',       category: 'shoulders',  type: 'dumbbell',    muscles: ['Shoulders','Triceps'] },
  { id: 'lateral-raise',    name: 'Lateral Raise',           category: 'shoulders',  type: 'dumbbell',    muscles: ['Side Delts'] },
  { id: 'front-raise',      name: 'Front Raise',             category: 'shoulders',  type: 'dumbbell',    muscles: ['Front Delts'] },
  { id: 'face-pull',        name: 'Face Pull',               category: 'shoulders',  type: 'cable',       muscles: ['Rear Delts','External Rotators'] },
  // TRICEPS
  { id: 'tricep-pushdown',  name: 'Tricep Pushdown',         category: 'arms',       type: 'cable',       muscles: ['Triceps'] },
  { id: 'skull-crusher',    name: 'Skull Crusher',           category: 'arms',       type: 'barbell',     muscles: ['Triceps'] },
  { id: 'overhead-tricep',  name: 'Overhead Tricep Ext.',    category: 'arms',       type: 'dumbbell',    muscles: ['Triceps'] },
  // BACK / BICEPS
  { id: 'lat-pulldown',     name: 'Lat Pulldown',            category: 'back',       type: 'cable',       muscles: ['Lats','Biceps'] },
  { id: 'seated-row',       name: 'Seated Cable Row',        category: 'back',       type: 'cable',       muscles: ['Rhomboids','Lats','Biceps'] },
  { id: 'db-row',           name: 'Dumbbell Row',            category: 'back',       type: 'dumbbell',    muscles: ['Lats','Rhomboids','Biceps'] },
  { id: 'barbell-curl',     name: 'Barbell Curl',            category: 'arms',       type: 'barbell',     muscles: ['Biceps'] },
  { id: 'db-curl',          name: 'Dumbbell Curl',           category: 'arms',       type: 'dumbbell',    muscles: ['Biceps'] },
  { id: 'hammer-curl',      name: 'Hammer Curl',             category: 'arms',       type: 'dumbbell',    muscles: ['Biceps','Brachialis'] },
  { id: 'cable-curl',       name: 'Cable Curl',              category: 'arms',       type: 'cable',       muscles: ['Biceps'] },
  // LEGS
  { id: 'leg-press',        name: 'Leg Press',               category: 'legs',       type: 'machine',     muscles: ['Quads','Glutes'] },
  { id: 'lunges',           name: 'Barbell Lunges',          category: 'legs',       type: 'barbell',     muscles: ['Quads','Glutes','Hamstrings'] },
  { id: 'db-lunges',        name: 'Dumbbell Lunges',         category: 'legs',       type: 'dumbbell',    muscles: ['Quads','Glutes'] },
  { id: 'bulgarian-split',  name: 'Bulgarian Split Squat',   category: 'legs',       type: 'dumbbell',    muscles: ['Quads','Glutes'] },
  { id: 'leg-curl',         name: 'Leg Curl',                category: 'legs',       type: 'machine',     muscles: ['Hamstrings'] },
  { id: 'leg-extension',    name: 'Leg Extension',           category: 'legs',       type: 'machine',     muscles: ['Quads'] },
  { id: 'hip-thrust',       name: 'Barbell Hip Thrust',      category: 'legs',       type: 'barbell',     muscles: ['Glutes'] },
  { id: 'calf-raise',       name: 'Calf Raise',              category: 'legs',       type: 'machine',     muscles: ['Calves'] },
  { id: 'good-morning',     name: 'Good Morning',            category: 'legs',       type: 'barbell',     muscles: ['Hamstrings','Lower Back'] },
  // CORE
  { id: 'plank',            name: 'Plank',                   category: 'core',       type: 'bodyweight',  muscles: ['Core'],              measureType: 'time' },
  { id: 'crunches',         name: 'Crunches',                category: 'core',       type: 'bodyweight',  muscles: ['Abs'] },
  { id: 'leg-raises',       name: 'Leg Raises',              category: 'core',       type: 'bodyweight',  muscles: ['Lower Abs'] },
  { id: 'russian-twist',    name: 'Russian Twist',           category: 'core',       type: 'bodyweight',  muscles: ['Obliques'] },
  { id: 'ab-wheel',         name: 'Ab Wheel Rollout',        category: 'core',       type: 'bodyweight',  muscles: ['Core','Lats'] },
  { id: 'cable-crunch',     name: 'Cable Crunch',            category: 'core',       type: 'cable',       muscles: ['Abs'] },
  { id: 'side-plank',       name: 'Side Plank',              category: 'core',       type: 'bodyweight',  muscles: ['Obliques'],          measureType: 'time' },
  { id: 'hanging-leg-raise',name: 'Hanging Leg Raise',       category: 'core',       type: 'bodyweight',  muscles: ['Lower Abs'] },
  // HYROX
  { id: 'ski-erg',          name: 'Ski Erg',                 category: 'hyrox',      type: 'machine',     muscles: ['Lats','Shoulders','Core'],     measureType: 'distance' },
  { id: 'sled-push',        name: 'Sled Push',               category: 'hyrox',      type: 'other',       muscles: ['Quads','Glutes','Shoulders'],  measureType: 'distance' },
  { id: 'sled-pull',        name: 'Sled Pull',               category: 'hyrox',      type: 'other',       muscles: ['Back','Biceps','Core'],        measureType: 'distance' },
  { id: 'burpee-broad-jump',name: 'Burpee Broad Jump',       category: 'hyrox',      type: 'bodyweight',  muscles: ['Full Body'] },
  { id: 'rowing-machine',   name: 'Rowing Machine',          category: 'hyrox',      type: 'machine',     muscles: ['Back','Legs','Core'],          measureType: 'distance' },
  { id: 'farmers-carry',    name: 'Farmers Carry',           category: 'hyrox',      type: 'other',       muscles: ['Forearms','Traps','Core'],     measureType: 'distance' },
  { id: 'sandbag-lunges',   name: 'Sandbag Lunges',          category: 'hyrox',      type: 'other',       muscles: ['Quads','Glutes'] },
  { id: 'wall-balls',       name: 'Wall Balls',              category: 'hyrox',      type: 'other',       muscles: ['Quads','Shoulders'] },
  { id: 'running',          name: 'Running',                 category: 'cardio',     type: 'cardio',      muscles: ['Legs','Cardiovascular'],       measureType: 'distance' },
  // CROSSFIT
  { id: 'thrusters',        name: 'Thrusters',               category: 'crossfit',   type: 'barbell',     muscles: ['Quads','Shoulders','Triceps'] },
  { id: 'box-jumps',        name: 'Box Jumps',               category: 'crossfit',   type: 'bodyweight',  muscles: ['Quads','Glutes','Calves'] },
  { id: 'double-unders',    name: 'Double Unders',           category: 'crossfit',   type: 'bodyweight',  muscles: ['Cardiovascular','Calves'] },
  { id: 'kipping-pullup',   name: 'Kipping Pull-Up',         category: 'crossfit',   type: 'bodyweight',  muscles: ['Lats','Shoulders'] },
  { id: 'muscle-up',        name: 'Muscle-Up',               category: 'crossfit',   type: 'bodyweight',  muscles: ['Lats','Triceps','Shoulders'] },
  { id: 'hspu',             name: 'Handstand Push-Up',       category: 'crossfit',   type: 'bodyweight',  muscles: ['Shoulders','Triceps'] },
  { id: 'clean-and-jerk',   name: 'Clean & Jerk',            category: 'crossfit',   type: 'barbell',     muscles: ['Full Body'] },
  { id: 'snatch',           name: 'Snatch',                  category: 'crossfit',   type: 'barbell',     muscles: ['Full Body'] },
  { id: 'power-clean',      name: 'Power Clean',             category: 'crossfit',   type: 'barbell',     muscles: ['Full Body'] },
  { id: 'toes-to-bar',      name: 'Toes to Bar',             category: 'crossfit',   type: 'bodyweight',  muscles: ['Core','Hip Flexors'] },
  { id: 'burpees',          name: 'Burpees',                 category: 'crossfit',   type: 'bodyweight',  muscles: ['Full Body'] },
  { id: 'kb-swing',         name: 'Kettlebell Swing',        category: 'crossfit',   type: 'kettlebell',  muscles: ['Glutes','Hamstrings','Core'] },
  { id: 'kb-goblet-squat',  name: 'Goblet Squat',            category: 'crossfit',   type: 'kettlebell',  muscles: ['Quads','Glutes'] },
  // BOXING & MARTIAL ARTS
  { id: 'boxing-session',  name: 'Boxing Session',         category: 'boxing', type: 'other', muscles: ['Shoulders','Arms','Core','Legs'],   measureType: 'activity' },
  { id: 'sparring',        name: 'Sparring',                category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  { id: 'heavy-bag',       name: 'Heavy Bag',               category: 'boxing', type: 'other', muscles: ['Arms','Shoulders','Core'],          measureType: 'activity' },
  { id: 'shadowboxing',    name: 'Shadow Boxing',           category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  { id: 'pad-work',        name: 'Pad Work',                category: 'boxing', type: 'other', muscles: ['Arms','Shoulders','Core'],          measureType: 'activity' },
  { id: 'muay-thai',       name: 'Muay Thai',               category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  { id: 'kickboxing-class',name: 'Kickboxing Class',        category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  { id: 'bjj',             name: 'Brazilian Jiu-Jitsu',     category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  { id: 'mma',             name: 'MMA Training',            category: 'boxing', type: 'other', muscles: ['Full Body'],                        measureType: 'activity' },
  // FITNESS CLASSES
  { id: 'body-balance',    name: 'BodyBalance',             category: 'fitness_class', type: 'other', muscles: ['Full Body','Core'],         measureType: 'activity' },
  { id: 'body-pump',       name: 'BodyPump',                category: 'fitness_class', type: 'other', muscles: ['Full Body'],                measureType: 'activity' },
  { id: 'body-combat',     name: 'BodyCombat',              category: 'fitness_class', type: 'other', muscles: ['Full Body'],                measureType: 'activity' },
  { id: 'body-attack',     name: 'BodyAttack',              category: 'fitness_class', type: 'other', muscles: ['Full Body','Legs'],         measureType: 'activity' },
  { id: 'spinning-class',  name: 'Spinning / Cycle Class',  category: 'fitness_class', type: 'cardio', muscles: ['Legs','Cardiovascular'],  measureType: 'activity' },
  { id: 'yoga',            name: 'Yoga',                    category: 'fitness_class', type: 'other', muscles: ['Full Body','Core'],         measureType: 'activity' },
  { id: 'pilates',         name: 'Pilates',                 category: 'fitness_class', type: 'other', muscles: ['Core','Full Body'],         measureType: 'activity' },
  { id: 'hiit-class',      name: 'HIIT Class',              category: 'fitness_class', type: 'other', muscles: ['Full Body'],                measureType: 'activity' },
  { id: 'bootcamp',        name: 'Bootcamp',                category: 'fitness_class', type: 'other', muscles: ['Full Body'],                measureType: 'activity' },
  { id: 'zumba',           name: 'Zumba',                   category: 'fitness_class', type: 'cardio', muscles: ['Full Body','Cardiovascular'], measureType: 'activity' },
  { id: 'dance-class',     name: 'Dance Class',             category: 'fitness_class', type: 'other', muscles: ['Full Body'],                measureType: 'activity' },
  // CARDIO
  { id: 'cycling',          name: 'Cycling',                 category: 'cardio',     type: 'cardio',      muscles: ['Legs','Cardiovascular'],       measureType: 'distance' },
  { id: 'commute-biking',   name: 'Commute Biking',          category: 'cardio',     type: 'cardio',      muscles: ['Legs','Cardiovascular'],       measureType: 'distance' },
  { id: 'swimming',         name: 'Swimming',                category: 'cardio',     type: 'cardio',      muscles: ['Full Body','Cardiovascular'],  measureType: 'distance' },
  { id: 'stair-climber',    name: 'Stair Climber',           category: 'cardio',     type: 'cardio',      muscles: ['Legs','Glutes','Cardiovascular'], measureType: 'time' },
  { id: 'elliptical',       name: 'Elliptical',              category: 'cardio',     type: 'cardio',      muscles: ['Legs','Cardiovascular'],       measureType: 'time' },
  { id: 'hiit-sprint',      name: 'Sprint Intervals',        category: 'cardio',     type: 'cardio',      muscles: ['Legs','Cardiovascular'] },
  { id: 'jump-rope',        name: 'Jump Rope',               category: 'cardio',     type: 'bodyweight',  muscles: ['Calves','Cardiovascular'],     measureType: 'time' },
];

const EXERCISE_CATEGORIES = {
  chest:     { name: 'Chest',     icon: 'chest' },
  back:      { name: 'Back',      icon: 'back' },
  shoulders: { name: 'Shoulders', icon: 'shoulders' },
  arms:      { name: 'Arms',      icon: 'arms' },
  legs:      { name: 'Legs',      icon: 'legs' },
  core:      { name: 'Core',      icon: 'core' },
  hyrox:        { name: 'Hyrox',                 icon: 'hyrox' },
  crossfit:     { name: 'CrossFit',              icon: 'crossfit' },
  cardio:       { name: 'Cardio',                icon: 'cardio' },
  boxing:       { name: 'Boxing & Martial Arts', icon: 'boxing' },
  fitness_class:{ name: 'Fitness Classes',       icon: 'fitness_class' },
};

// ─── Routine Templates ────────────────────────────────────────────────────────

const ROUTINE_TEMPLATES = [
  {
    id: 'tpl-hyrox-sim',
    name: 'Hyrox Race Sim',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 1,
    description: 'Full race simulation with 8x1km runs between each station.',
    days: [{
      id: 'day-1', name: 'Race Simulation',
      exercises: [
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'ski-erg',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'sled-push',        sets: 1, reps: '50m',   rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'sled-pull',        sets: 1, reps: '50m',   rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'burpee-broad-jump',sets: 1, reps: '80',    rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'rowing-machine',   sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'farmers-carry',    sets: 1, reps: '200m',  rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'sandbag-lunges',   sets: 1, reps: '100m',  rest: 0 },
        { exerciseId: 'running',          sets: 1, reps: '1000m', rest: 0 },
        { exerciseId: 'wall-balls',       sets: 1, reps: '75',    rest: 0 },
      ]
    }]
  },
  {
    id: 'tpl-hyrox-week',
    name: 'Hyrox Training Week',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 4,
    description: '4-day Hyrox-specific training split targeting all race stations.',
    days: [
      {
        id: 'day-1', name: 'Endurance + Ski/Row',
        exercises: [
          { exerciseId: 'running',        sets: 1, reps: '5km',   rest: 0 },
          { exerciseId: 'ski-erg',        sets: 4, reps: '500m',  rest: 90 },
          { exerciseId: 'rowing-machine', sets: 4, reps: '500m',  rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'Strength Stations',
        exercises: [
          { exerciseId: 'sled-push',      sets: 5, reps: '30m',   rest: 120 },
          { exerciseId: 'sled-pull',      sets: 5, reps: '30m',   rest: 120 },
          { exerciseId: 'farmers-carry',  sets: 4, reps: '50m',   rest: 90 },
          { exerciseId: 'sandbag-lunges', sets: 4, reps: '25m',   rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Skill + Power',
        exercises: [
          { exerciseId: 'burpee-broad-jump', sets: 5, reps: '10', rest: 60 },
          { exerciseId: 'wall-balls',     sets: 5, reps: '20',    rest: 60 },
          { exerciseId: 'box-jumps',      sets: 4, reps: '10',    rest: 60 },
          { exerciseId: 'thrusters',      sets: 4, reps: '10',    rest: 90 },
        ]
      },
      {
        id: 'day-4', name: 'Long Run + Combos',
        exercises: [
          { exerciseId: 'running',        sets: 1, reps: '10km',  rest: 0 },
          { exerciseId: 'ski-erg',        sets: 2, reps: '1000m', rest: 180 },
          { exerciseId: 'wall-balls',     sets: 2, reps: '50',    rest: 180 },
        ]
      }
    ]
  },
  {
    id: 'tpl-531',
    name: '5/3/1 Strength',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 4,
    description: 'Wendler 5/3/1 — proven strength program built around the big four lifts.',
    days: [
      {
        id: 'day-1', name: 'Press Day',
        exercises: [
          { exerciseId: 'overhead-press', sets: 3, reps: '5/3/1',rest: 180 },
          { exerciseId: 'bench-press',    sets: 3, reps: '10',    rest: 120 },
          { exerciseId: 'db-row',         sets: 3, reps: '10',    rest: 90 },
          { exerciseId: 'tricep-pushdown',sets: 3, reps: '12',    rest: 60 },
          { exerciseId: 'lateral-raise',  sets: 3, reps: '15',    rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Deadlift Day',
        exercises: [
          { exerciseId: 'deadlift',       sets: 3, reps: '5/3/1',rest: 240 },
          { exerciseId: 'rdl',            sets: 3, reps: '10',    rest: 120 },
          { exerciseId: 'leg-curl',       sets: 3, reps: '12',    rest: 90 },
          { exerciseId: 'plank',          sets: 3, reps: '60s',   rest: 60 },
          { exerciseId: 'calf-raise',     sets: 4, reps: '15',    rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Bench Day',
        exercises: [
          { exerciseId: 'bench-press',    sets: 3, reps: '5/3/1',rest: 180 },
          { exerciseId: 'incline-bench',  sets: 3, reps: '10',    rest: 120 },
          { exerciseId: 'db-fly',         sets: 3, reps: '12',    rest: 90 },
          { exerciseId: 'barbell-curl',   sets: 3, reps: '12',    rest: 60 },
          { exerciseId: 'face-pull',      sets: 3, reps: '15',    rest: 60 },
        ]
      },
      {
        id: 'day-4', name: 'Squat Day',
        exercises: [
          { exerciseId: 'squat',          sets: 3, reps: '5/3/1',rest: 240 },
          { exerciseId: 'leg-press',      sets: 3, reps: '10',    rest: 120 },
          { exerciseId: 'lunges',         sets: 3, reps: '12',    rest: 90 },
          { exerciseId: 'leg-extension',  sets: 3, reps: '15',    rest: 60 },
          { exerciseId: 'calf-raise',     sets: 4, reps: '15',    rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-ppl',
    name: 'Push / Pull / Legs',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 6,
    description: 'Classic PPL hypertrophy split. Run twice per week for 6 sessions.',
    days: [
      {
        id: 'day-1', name: 'Push',
        exercises: [
          { exerciseId: 'bench-press',    sets: 4, reps: '8',  rest: 120 },
          { exerciseId: 'incline-bench',  sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'overhead-press', sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'lateral-raise',  sets: 4, reps: '15', rest: 60 },
          { exerciseId: 'tricep-pushdown',sets: 3, reps: '12', rest: 60 },
          { exerciseId: 'overhead-tricep',sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Pull',
        exercises: [
          { exerciseId: 'deadlift',       sets: 3, reps: '5',  rest: 240 },
          { exerciseId: 'pullup',         sets: 4, reps: '8',  rest: 120 },
          { exerciseId: 'barbell-row',    sets: 4, reps: '8',  rest: 120 },
          { exerciseId: 'lat-pulldown',   sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'barbell-curl',   sets: 3, reps: '12', rest: 60 },
          { exerciseId: 'hammer-curl',    sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Legs',
        exercises: [
          { exerciseId: 'squat',          sets: 4, reps: '8',  rest: 180 },
          { exerciseId: 'rdl',            sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'leg-press',      sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'leg-curl',       sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'leg-extension',  sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'calf-raise',     sets: 4, reps: '20', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-upper-lower',
    name: 'Upper / Lower Split',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 4,
    description: '4-day upper/lower split alternating strength and hypertrophy focus.',
    days: [
      {
        id: 'day-1', name: 'Upper A — Strength',
        exercises: [
          { exerciseId: 'bench-press',    sets: 4, reps: '5',  rest: 180 },
          { exerciseId: 'barbell-row',    sets: 4, reps: '5',  rest: 180 },
          { exerciseId: 'overhead-press', sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'pullup',         sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'tricep-pushdown',sets: 3, reps: '12', rest: 60 },
          { exerciseId: 'barbell-curl',   sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Lower A — Strength',
        exercises: [
          { exerciseId: 'squat',          sets: 4, reps: '5',  rest: 240 },
          { exerciseId: 'rdl',            sets: 3, reps: '8',  rest: 180 },
          { exerciseId: 'leg-press',      sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'leg-curl',       sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'calf-raise',     sets: 4, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Upper B — Hypertrophy',
        exercises: [
          { exerciseId: 'incline-bench',      sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'db-row',             sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'lat-pulldown',       sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'db-shoulder-press',  sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'lateral-raise',      sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'face-pull',          sets: 3, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-4', name: 'Lower B — Hypertrophy',
        exercises: [
          { exerciseId: 'deadlift',       sets: 3, reps: '5',  rest: 240 },
          { exerciseId: 'bulgarian-split',sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'leg-extension',  sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'leg-curl',       sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'hip-thrust',     sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'calf-raise',     sets: 4, reps: '20', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-full-body',
    name: 'Full Body 3x/Week',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 3,
    description: 'Beginner-friendly full body program. Train 3 days with rest in between.',
    days: [
      {
        id: 'day-1', name: 'Full Body A',
        exercises: [
          { exerciseId: 'squat',          sets: 3, reps: '8',  rest: 180 },
          { exerciseId: 'bench-press',    sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'barbell-row',    sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'overhead-press', sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'plank',          sets: 3, reps: '30s',rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Full Body B',
        exercises: [
          { exerciseId: 'deadlift',           sets: 3, reps: '5',  rest: 240 },
          { exerciseId: 'incline-bench',      sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'pullup',             sets: 3, reps: '6',  rest: 120 },
          { exerciseId: 'db-shoulder-press',  sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'leg-curl',           sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Full Body C',
        exercises: [
          { exerciseId: 'front-squat',    sets: 3, reps: '8',  rest: 180 },
          { exerciseId: 'db-bench',       sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'lat-pulldown',   sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'lateral-raise',  sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'calf-raise',     sets: 3, reps: '15', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-crossfit',
    name: 'CrossFit WOD Week',
    type: 'crossfit',
    goal: 'endurance',
    daysPerWeek: 5,
    description: '5-day CrossFit program with strength, gymnastics, Olympic lifting and metcons.',
    days: [
      {
        id: 'day-1', name: 'Strength + Metcon',
        exercises: [
          { exerciseId: 'clean-and-jerk', sets: 5, reps: '3',       rest: 180 },
          { exerciseId: 'thrusters',      sets: 3, reps: '21-15-9', rest: 0 },
          { exerciseId: 'pullup',         sets: 3, reps: '21-15-9', rest: 0 },
        ]
      },
      {
        id: 'day-2', name: 'Gymnastics + Endurance',
        exercises: [
          { exerciseId: 'hspu',           sets: 5, reps: '5',    rest: 120 },
          { exerciseId: 'muscle-up',      sets: 5, reps: '3',    rest: 120 },
          { exerciseId: 'rowing-machine', sets: 1, reps: '2000m',rest: 0 },
        ]
      },
      {
        id: 'day-3', name: 'Olympic Lifting',
        exercises: [
          { exerciseId: 'snatch',         sets: 5, reps: '3',    rest: 180 },
          { exerciseId: 'power-clean',    sets: 5, reps: '3',    rest: 180 },
          { exerciseId: 'squat',          sets: 3, reps: '5',    rest: 180 },
        ]
      },
      {
        id: 'day-4', name: 'AMRAP / EMOM',
        exercises: [
          { exerciseId: 'burpees',        sets: 1, reps: 'AMRAP 20min', rest: 0 },
          { exerciseId: 'kb-swing',       sets: 10,reps: '10 EMOM',     rest: 0 },
          { exerciseId: 'box-jumps',      sets: 10,reps: '10 EMOM',     rest: 0 },
        ]
      },
      {
        id: 'day-5', name: 'Hero WOD',
        exercises: [
          { exerciseId: 'running',        sets: 5, reps: '400m', rest: 0 },
          { exerciseId: 'deadlift',       sets: 5, reps: '15',   rest: 0 },
          { exerciseId: 'pushup',         sets: 5, reps: '25',   rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-cardio',
    name: 'Cardio Base Building',
    type: 'cardio',
    goal: 'fat_loss',
    daysPerWeek: 4,
    description: 'Build aerobic base with progressive volume and intervals.',
    days: [
      {
        id: 'day-1', name: 'Easy Run',
        exercises: [{ exerciseId: 'running', sets: 1, reps: '5km', rest: 0 }]
      },
      {
        id: 'day-2', name: 'Interval Training',
        exercises: [
          { exerciseId: 'running',      sets: 1, reps: '2km warmup',  rest: 0 },
          { exerciseId: 'hiit-sprint',  sets: 8, reps: '400m',        rest: 90 },
          { exerciseId: 'running',      sets: 1, reps: '2km cooldown',rest: 0 },
        ]
      },
      {
        id: 'day-3', name: 'Cross Training',
        exercises: [
          { exerciseId: 'cycling',        sets: 1, reps: '30min',  rest: 0 },
          { exerciseId: 'rowing-machine', sets: 1, reps: '2000m',  rest: 0 },
        ]
      },
      {
        id: 'day-4', name: 'Long Run',
        exercises: [{ exerciseId: 'running', sets: 1, reps: '10km', rest: 0 }]
      }
    ]
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExercise(id) {
  return EXERCISES.find(e => e.id === id) || null;
}

function getExercisesByCategory(category) {
  return EXERCISES.filter(e => e.category === category);
}

function searchExercises(query) {
  const q = query.toLowerCase();
  return EXERCISES.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    e.muscles.some(m => m.toLowerCase().includes(q))
  );
}
