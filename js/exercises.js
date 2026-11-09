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
  // HIIT
  { id: 'mountain-climbers',  name: 'Mountain Climbers',     category: 'hiit',     type: 'bodyweight',  muscles: ['Core','Hip Flexors','Shoulders'] },
  { id: 'jump-squat',         name: 'Jump Squat',            category: 'hiit',     type: 'bodyweight',  muscles: ['Quads','Glutes','Calves'] },
  { id: 'high-knees',         name: 'High Knees',            category: 'hiit',     type: 'bodyweight',  muscles: ['Hip Flexors','Cardiovascular'] },
  { id: 'battle-ropes',       name: 'Battle Ropes',          category: 'hiit',     type: 'other',       muscles: ['Shoulders','Arms','Core'],        measureType: 'time' },
  { id: 'db-thruster',        name: 'DB Thruster',           category: 'hiit',     type: 'dumbbell',    muscles: ['Quads','Shoulders','Triceps'] },
  { id: 'db-renegade-row',    name: 'Renegade Row',          category: 'hiit',     type: 'dumbbell',    muscles: ['Back','Core','Biceps'] },
  { id: 'db-reverse-lunge',   name: 'DB Reverse Lunge',      category: 'hiit',     type: 'dumbbell',    muscles: ['Quads','Glutes','Hamstrings'] },
  { id: 'step-ups',           name: 'Step-Ups',              category: 'hiit',     type: 'dumbbell',    muscles: ['Quads','Glutes'] },
  { id: 'kb-clean-press',     name: 'KB Clean & Press',      category: 'hiit',     type: 'kettlebell',  muscles: ['Full Body'] },
  { id: 'kb-snatch',          name: 'KB Snatch',             category: 'hiit',     type: 'kettlebell',  muscles: ['Full Body'] },
  { id: 'broad-jump',         name: 'Broad Jump',            category: 'hiit',     type: 'bodyweight',  muscles: ['Quads','Glutes','Calves'] },
  { id: 'shuttle-run',        name: 'Shuttle Run',           category: 'hiit',     type: 'bodyweight',  muscles: ['Legs','Cardiovascular'] },
  { id: 'bear-crawl',         name: 'Bear Crawl',            category: 'hiit',     type: 'bodyweight',  muscles: ['Core','Shoulders','Legs'] },
  // MOBILITY / KNEE WARM-UP
  { id: 'leg-swing',          name: 'Leg Swings',            category: 'mobility', type: 'bodyweight',  muscles: ['Hip Flexors','Hamstrings'],       measureType: 'time' },
  { id: 'clamshell',          name: 'Clamshell',             category: 'mobility', type: 'bodyweight',  muscles: ['Glutes','Hip Abductors'] },
  { id: 'glute-bridge-bw',    name: 'Glute Bridge',          category: 'mobility', type: 'bodyweight',  muscles: ['Glutes','Hamstrings'] },
  { id: 'straight-leg-raise', name: 'Straight Leg Raise',    category: 'mobility', type: 'bodyweight',  muscles: ['Quads','Hip Flexors'] },
  { id: 'tke',                name: 'Terminal Knee Extension',category: 'mobility', type: 'other',       muscles: ['Quads','VMO'] },
  { id: 'short-arc-quad',     name: 'Short Arc Quad',        category: 'mobility', type: 'bodyweight',  muscles: ['Quads','VMO'] },
  { id: 'side-leg-raise',     name: 'Side-Lying Leg Raise',  category: 'mobility', type: 'bodyweight',  muscles: ['Glutes','Hip Abductors'] },
  { id: 'ankle-circles',      name: 'Ankle Circles',         category: 'mobility', type: 'bodyweight',  muscles: ['Ankles','Calves'],               measureType: 'time' },
  { id: 'quad-stretch',       name: 'Standing Quad Stretch', category: 'mobility', type: 'bodyweight',  muscles: ['Quads'],                         measureType: 'time' },
  { id: 'hamstring-stretch',  name: 'Supine Hamstring Stretch', category: 'mobility', type: 'bodyweight', muscles: ['Hamstrings'],                  measureType: 'time' },
  { id: 'hip-circle',         name: 'Hip Circles',           category: 'mobility', type: 'bodyweight',  muscles: ['Hips','Glutes'],                 measureType: 'time' },
  { id: 'wall-sit',           name: 'Wall Sit',              category: 'mobility', type: 'bodyweight',  muscles: ['Quads','Glutes'],                measureType: 'time' },
  // MOBILITY / REHAB — shoulder
  { id: 'band-external-rot',  name: 'Band External Rotation', category: 'mobility', type: 'other',      muscles: ['Rotator Cuff','Rear Delts'] },
  { id: 'scap-wall-slide',    name: 'Scapular Wall Slide',   category: 'mobility', type: 'bodyweight',  muscles: ['Scapular Stabilisers','Shoulders'] },
  { id: 'prone-ytw',          name: 'Prone Y-T-W Raise',     category: 'mobility', type: 'bodyweight',  muscles: ['Lower Traps','Rear Delts'] },
  { id: 'scap-pushup',        name: 'Scapular Push-Up',      category: 'mobility', type: 'bodyweight',  muscles: ['Serratus Anterior','Scapular Stabilisers'] },
  // MOBILITY / REHAB — lower back & core control
  { id: 'bird-dog',           name: 'Bird Dog',              category: 'mobility', type: 'bodyweight',  muscles: ['Lower Back','Core','Glutes'] },
  { id: 'dead-bug',           name: 'Dead Bug',              category: 'mobility', type: 'bodyweight',  muscles: ['Core','Lower Back'] },
  { id: 'cat-cow',            name: 'Cat-Cow',               category: 'mobility', type: 'bodyweight',  muscles: ['Spine','Lower Back'],            measureType: 'time' },
  { id: 'mcgill-curlup',      name: 'McGill Curl-Up',        category: 'mobility', type: 'bodyweight',  muscles: ['Core','Lower Back'] },
  // MOBILITY / REHAB — hip
  { id: 'hip-flexor-stretch', name: 'Couch / Hip Flexor Stretch', category: 'mobility', type: 'bodyweight', muscles: ['Hip Flexors'],              measureType: 'time' },
  { id: 'nine-ninety',        name: '90/90 Hip Rotation',    category: 'mobility', type: 'bodyweight',  muscles: ['Hips','Glutes'] },
  { id: 'monster-walk',       name: 'Banded Monster Walk',   category: 'mobility', type: 'other',       muscles: ['Glute Medius','Hip Abductors'] },
  // MOBILITY / REHAB — wrist & elbow
  { id: 'wrist-extensor-stretch', name: 'Wrist Extensor Stretch', category: 'mobility', type: 'bodyweight', muscles: ['Forearms','Wrists'],        measureType: 'time' },
  { id: 'eccentric-wrist-curl',   name: 'Eccentric Wrist Curl',   category: 'mobility', type: 'dumbbell',   muscles: ['Forearms','Wrists'] },
  { id: 'wrist-circles',      name: 'Wrist Circles',         category: 'mobility', type: 'bodyweight',  muscles: ['Wrists'],                        measureType: 'time' },
  // MOBILITY / REHAB — neck
  { id: 'chin-tuck',          name: 'Chin Tuck',             category: 'mobility', type: 'bodyweight',  muscles: ['Deep Neck Flexors'] },
  { id: 'upper-trap-stretch', name: 'Upper Trap Stretch',    category: 'mobility', type: 'bodyweight',  muscles: ['Upper Traps','Neck'],            measureType: 'time' },
  { id: 'scap-retraction',    name: 'Scapular Retraction',   category: 'mobility', type: 'other',       muscles: ['Rhomboids','Mid Traps'] },
  // MOBILITY / REHAB — ankle
  { id: 'eccentric-heel-drop',name: 'Eccentric Heel Drop',   category: 'mobility', type: 'bodyweight',  muscles: ['Calves','Achilles'] },
  { id: 'ankle-alphabet',     name: 'Ankle Alphabet',        category: 'mobility', type: 'bodyweight',  muscles: ['Ankles'],                        measureType: 'time' },
  { id: 'single-leg-balance', name: 'Single-Leg Balance',    category: 'mobility', type: 'bodyweight',  muscles: ['Ankles','Core'],                 measureType: 'time' },
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
  hiit:         { name: 'HIIT',                  icon: 'hiit' },
  mobility:     { name: 'Mobility & Warm-Up',    icon: 'mobility' },
};

// ─── Workout Library ──────────────────────────────────────────────────────────

// Display metadata for the categories workouts are grouped under. The keys are
// the same `type` values the badge CSS is derived from, so adding a category
// here also needs a matching `.badge-<key>` rule.
const WORKOUT_CATEGORIES = {
  strength:     { name: 'Strength',   icon: '🏋️', blurb: 'Barbell and dumbbell programs built around progressive overload.' },
  hyrox:        { name: 'Hyrox',      icon: '🏅', blurb: 'Race simulations and station work for the run/station format.' },
  cardio:       { name: 'Endurance',  icon: '🏃', blurb: 'Running, rowing and cycling plans from base building to race day.' },
  hiit:         { name: 'HIIT',       icon: '⚡', blurb: 'Short, hard intervals — EMOM, AMRAP and Tabata formats.' },
  crossfit:     { name: 'CrossFit',   icon: '🔥', blurb: 'Benchmark WODs and olympic-lift conditioning.' },
  boxing:       { name: 'Combat',     icon: '🥊', blurb: 'Boxing and martial-arts conditioning.' },
  mobility:     { name: 'Mobility',   icon: '🧘', blurb: 'Warm-ups, prehab and daily movement work.' },
  fitness_class:{ name: 'Classes',    icon: '🎵', blurb: 'Studio-class based weeks.' },
};

const DIFFICULTIES = {
  beginner:     { name: 'Beginner',     order: 1 },
  intermediate: { name: 'Intermediate', order: 2 },
  advanced:     { name: 'Advanced',     order: 3 },
};

// Levels a scalable workout can be run at. `intermediate` is always the workout
// exactly as it is written; the other two are derived from it by `scaleWorkout`.
const WORKOUT_LEVELS = ['beginner', 'intermediate', 'advanced'];

/**
 * Scale a single free-form rep target by a multiplier.
 *
 * Rep targets are deliberately strings so a workout can say '1000m', '45s' or
 * 'AMRAP 12min' without a schema change, which means only the simple
 * "number + optional unit" shapes can be scaled safely. Anything else — rep
 * ladders like '5/3/1', ranges like '20-15-10' — is returned untouched rather
 * than mangled, and those workouts carry an explicit `reps` override instead.
 */
function scaleReps(reps, mul) {
  if (mul === 1 || typeof reps !== 'string') return reps;

  const m = reps.trim().match(/^(\d+(?:\.\d+)?)\s*(km|m|min|s|)$/i);
  if (!m) return reps;

  const unit = m[2].toLowerCase();
  const raw  = parseFloat(m[1]) * mul;

  // Each unit gets the rounding a human would use when writing the target down:
  // metres to the nearest 10, seconds to the nearest 5, kilometres to one
  // decimal, plain reps to whole numbers.
  let val;
  if (unit === 'm')        val = Math.max(10, Math.round(raw / 10) * 10);
  else if (unit === 'km')  val = Math.max(0.5, Math.round(raw * 10) / 10);
  else if (unit === 's')   val = Math.max(5, Math.round(raw / 5) * 5);
  else if (unit === 'min') val = Math.max(1, Math.round(raw));
  else                     val = Math.max(1, Math.round(raw));

  return `${val}${unit}`;
}

/**
 * Build the version of a workout to actually train at a given level.
 *
 * Returns a deep copy so the caller can hand it straight to the workout engine
 * or save it as a custom routine without mutating the library. Workouts with no
 * `levels` block, and the intermediate level of every workout, come back as
 * written.
 */
function scaleWorkout(tpl, level) {
  if (!tpl) return tpl;
  const spec = tpl.levels && tpl.levels[level];
  if (!spec) return tpl;

  const out = JSON.parse(JSON.stringify(tpl));
  const { repsMul = 1, setsDelta = 0, restMul = 1, reps: overrides = {} } = spec;

  out.days.forEach(day => {
    day.exercises.forEach(ex => {
      ex.reps = overrides[ex.exerciseId] !== undefined
        ? overrides[ex.exerciseId]
        : scaleReps(ex.reps, repsMul);
      ex.sets = Math.max(1, (ex.sets || 1) + setsDelta);
      if (ex.rest) ex.rest = Math.max(0, Math.round(ex.rest * restMul / 5) * 5);
    });
  });

  out.level      = level;
  out.difficulty = level;
  if (tpl.durationMin) out.durationMin = Math.max(10, Math.round(tpl.durationMin * repsMul / 5) * 5);
  if (spec.note) out.description = `${tpl.description} ${spec.note}`;

  return out;
}

const ROUTINE_TEMPLATES = [
  {
    id: 'tpl-hyrox-sim',
    name: 'Hyrox Race Sim',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 1,
    difficulty: 'advanced',
    durationMin: 90,
    description: 'Full race simulation with 8x1km runs between each station.',
    // There is nothing above a full race, so this one only scales downwards.
    levels: {
      beginner: { repsMul: 0.5, note: 'Half distances on every run and station — the full format at half the volume.' },
    },
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
    difficulty: 'intermediate',
    durationMin: 60,
    description: '4-day Hyrox-specific training split targeting all race stations.',
    levels: {
      beginner: { repsMul: 0.6, setsDelta: -1, restMul: 1.3, note: 'Shorter intervals and an extra 30s of recovery between efforts.' },
      advanced: { repsMul: 1.25, setsDelta: 1, restMul: 0.8, note: 'Race-pace volume on tighter rest.' },
    },
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
    difficulty: 'intermediate',
    durationMin: 60,
    // Not scalable: the 5/3/1 rep ladder is the program. Changing it makes it a
    // different program rather than an easier version of this one.
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
    difficulty: 'intermediate',
    durationMin: 65,
    description: 'Classic PPL hypertrophy split. Run twice per week for 6 sessions.',
    levels: {
      beginner: { setsDelta: -1, restMul: 1.2, note: 'One less set per exercise while you build work capacity.' },
      advanced: { setsDelta: 1, restMul: 0.85, note: 'An extra set per exercise on shorter rest.' },
    },
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
    difficulty: 'intermediate',
    durationMin: 55,
    description: '4-day upper/lower split alternating strength and hypertrophy focus.',
    levels: {
      beginner: { setsDelta: -1, restMul: 1.25, note: 'Trimmed to the main lifts\u2019 working sets with longer recovery.' },
      advanced: { setsDelta: 1, restMul: 0.85, note: 'Added volume on every lift.' },
    },
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
    difficulty: 'beginner',
    durationMin: 50,
    description: 'Beginner-friendly full body program. Train 3 days with rest in between.',
    levels: {
      advanced: { setsDelta: 1, restMul: 0.85, note: 'An extra set per lift once three days a week feels comfortable.' },
    },
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
    difficulty: 'advanced',
    durationMin: 55,
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
    difficulty: 'beginner',
    durationMin: 40,
    description: 'Build aerobic base with progressive volume and intervals.',
    levels: {
      advanced: { repsMul: 1.5, note: 'Half again the distance once the base sessions feel easy.' },
    },
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
  },
  // ── HIIT ─────────────────────────────────────────────────────────────────────
  {
    id: 'tpl-tabata',
    name: 'Tabata Full Body',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 48,
    description: '8 rounds × 20s on / 10s off per exercise. ~48 min. Rest 60s between exercises.',
    levels: {
      beginner: { setsDelta: -3, restMul: 1.5, note: 'Five rounds instead of eight, with longer rest between exercises.' },
      advanced: { setsDelta: 2, restMul: 0.5, note: 'Ten rounds per exercise and half the rest between them.' },
    },
    days: [
      {
        id: 'day-1', name: 'Tabata A — Lower + Core',
        exercises: [
          { exerciseId: 'jump-squat',         sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'mountain-climbers',   sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'kb-swing',            sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'burpees',             sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'high-knees',          sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'plank',               sets: 8, reps: '20s', rest: 10 },
        ]
      },
      {
        id: 'day-2', name: 'Tabata B — Upper + Full Body',
        exercises: [
          { exerciseId: 'pushup',              sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'db-thruster',         sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'db-renegade-row',     sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'burpees',             sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'battle-ropes',        sets: 8, reps: '20s', rest: 10 },
          { exerciseId: 'mountain-climbers',   sets: 8, reps: '20s', rest: 10 },
        ]
      }
    ]
  },
  {
    id: 'tpl-amrap',
    name: 'AMRAP Gauntlet',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 54,
    description: '3 × 12-min AMRAP blocks. Do as many rounds as possible each block. 3 min rest between blocks. ~54 min.',
    days: [
      {
        id: 'day-1', name: 'Block A — Lower (AMRAP 12)',
        exercises: [
          { exerciseId: 'squat',       sets: 5, reps: '10', rest: 0 },
          { exerciseId: 'jump-squat',  sets: 5, reps: '10', rest: 0 },
          { exerciseId: 'db-reverse-lunge', sets: 5, reps: '12', rest: 0 },
          { exerciseId: 'kb-swing',    sets: 5, reps: '15', rest: 180 },
        ]
      },
      {
        id: 'day-2', name: 'Block B — Upper (AMRAP 12)',
        exercises: [
          { exerciseId: 'pushup',      sets: 5, reps: '15', rest: 0 },
          { exerciseId: 'db-row',      sets: 5, reps: '10', rest: 0 },
          { exerciseId: 'db-thruster', sets: 5, reps: '10', rest: 0 },
          { exerciseId: 'dips',        sets: 5, reps: '12', rest: 180 },
        ]
      },
      {
        id: 'day-3', name: 'Block C — Full Body (AMRAP 12)',
        exercises: [
          { exerciseId: 'burpees',           sets: 5, reps: '10', rest: 0 },
          { exerciseId: 'mountain-climbers', sets: 5, reps: '20', rest: 0 },
          { exerciseId: 'kb-swing',          sets: 5, reps: '15', rest: 0 },
          { exerciseId: 'box-jumps',         sets: 5, reps: '10', rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-db-circuit',
    name: 'Dumbbell HIIT Circuit',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 50,
    description: '4 rounds of 6 exercises. 40s work / 20s rest. 90s rest between rounds. ~50 min.',
    levels: {
      advanced: { setsDelta: 2, restMul: 0.7, note: 'Six rounds on shorter rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'DB Circuit A',
        exercises: [
          { exerciseId: 'db-thruster',      sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-renegade-row',  sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-reverse-lunge', sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-bench',         sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-curl',          sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'mountain-climbers',sets: 4, reps: '40s', rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'DB Circuit B',
        exercises: [
          { exerciseId: 'db-shoulder-press',sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-row',           sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'bulgarian-split',  sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'db-fly',           sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'hammer-curl',      sets: 4, reps: '40s', rest: 20 },
          { exerciseId: 'high-knees',       sets: 4, reps: '40s', rest: 90 },
        ]
      }
    ]
  },
  {
    id: 'tpl-kb-flow',
    name: 'Kettlebell Flow',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 45,
    description: '4–5 rounds of kettlebell exercises with short rests. ~45 min.',
    levels: {
      beginner: { setsDelta: -2, restMul: 1.5, note: 'Fewer rounds and double the rest while the hinge pattern settles.' },
    },
    days: [
      {
        id: 'day-1', name: 'KB Power Flow',
        exercises: [
          { exerciseId: 'kb-swing',      sets: 4, reps: '20', rest: 30 },
          { exerciseId: 'kb-goblet-squat',sets: 4, reps: '15', rest: 30 },
          { exerciseId: 'kb-clean-press', sets: 4, reps: '10', rest: 30 },
          { exerciseId: 'kb-snatch',      sets: 4, reps: '8',  rest: 30 },
          { exerciseId: 'burpees',        sets: 4, reps: '10', rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'KB Endurance Flow',
        exercises: [
          { exerciseId: 'kb-swing',         sets: 5, reps: '30', rest: 20 },
          { exerciseId: 'kb-goblet-squat',  sets: 5, reps: '20', rest: 20 },
          { exerciseId: 'kb-clean-press',   sets: 5, reps: '12', rest: 20 },
          { exerciseId: 'mountain-climbers',sets: 5, reps: '20', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-interval-strength',
    name: 'Interval Strength',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'advanced',
    durationMin: 60,
    description: 'Alternate sprint intervals with strength blocks. ~60 min.',
    levels: {
      beginner: { setsDelta: -1, restMul: 1.4, note: 'One less round of each block and longer recovery between sprints.' },
    },
    days: [
      {
        id: 'day-1', name: 'Run + Push / Pull',
        exercises: [
          { exerciseId: 'hiit-sprint', sets: 1, reps: '400m',  rest: 90 },
          { exerciseId: 'pushup',      sets: 3, reps: '15',     rest: 0 },
          { exerciseId: 'db-row',      sets: 3, reps: '12',     rest: 60 },
          { exerciseId: 'hiit-sprint', sets: 1, reps: '400m',  rest: 90 },
          { exerciseId: 'db-thruster', sets: 3, reps: '12',     rest: 0 },
          { exerciseId: 'pullup',      sets: 3, reps: '8',      rest: 60 },
          { exerciseId: 'hiit-sprint', sets: 1, reps: '400m',  rest: 90 },
          { exerciseId: 'burpees',     sets: 3, reps: '12',     rest: 60 },
          { exerciseId: 'hiit-sprint', sets: 1, reps: '400m',  rest: 90 },
          { exerciseId: 'plank',       sets: 3, reps: '45s',    rest: 30 },
        ]
      },
      {
        id: 'day-2', name: 'Run + Legs / Core',
        exercises: [
          { exerciseId: 'hiit-sprint',       sets: 1, reps: '400m', rest: 90 },
          { exerciseId: 'squat',             sets: 3, reps: '15',   rest: 0 },
          { exerciseId: 'kb-swing',          sets: 3, reps: '15',   rest: 60 },
          { exerciseId: 'hiit-sprint',       sets: 1, reps: '400m', rest: 90 },
          { exerciseId: 'mountain-climbers', sets: 3, reps: '20',   rest: 0 },
          { exerciseId: 'ab-wheel',          sets: 3, reps: '10',   rest: 60 },
          { exerciseId: 'hiit-sprint',       sets: 1, reps: '400m', rest: 90 },
          { exerciseId: 'battle-ropes',      sets: 3, reps: '30s',  rest: 60 },
          { exerciseId: 'plank',             sets: 3, reps: '45s',  rest: 30 },
        ]
      }
    ]
  },
  {
    id: 'tpl-partner-wod',
    name: 'Partner Power Hour',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 2,
    difficulty: 'intermediate',
    durationMin: 60,
    description: 'Alternate sets with your partner — one works while the other rests. ~60 min.',
    days: [
      {
        id: 'day-1', name: 'Partner WOD A — Push / Pull',
        exercises: [
          { exerciseId: 'battle-ropes',      sets: 6, reps: '30s', rest: 30 },
          { exerciseId: 'burpee-broad-jump', sets: 6, reps: '10',  rest: 30 },
          { exerciseId: 'db-thruster',       sets: 6, reps: '10',  rest: 30 },
          { exerciseId: 'pullup',            sets: 6, reps: '8',   rest: 30 },
          { exerciseId: 'kb-swing',          sets: 6, reps: '15',  rest: 30 },
          { exerciseId: 'box-jumps',         sets: 6, reps: '10',  rest: 30 },
        ]
      },
      {
        id: 'day-2', name: 'Partner WOD B — Full Body Grind',
        exercises: [
          { exerciseId: 'squat',             sets: 6, reps: '15',  rest: 30 },
          { exerciseId: 'pushup',            sets: 6, reps: '15',  rest: 30 },
          { exerciseId: 'mountain-climbers', sets: 6, reps: '20',  rest: 30 },
          { exerciseId: 'db-row',            sets: 6, reps: '12',  rest: 30 },
          { exerciseId: 'jump-squat',        sets: 6, reps: '10',  rest: 30 },
          { exerciseId: 'burpees',           sets: 6, reps: '10',  rest: 30 },
        ]
      }
    ]
  },
  // ── Mobility / Knee Warm-Up ───────────────────────────────────────────────────
  {
    id: 'tpl-knee-warmup',
    name: 'Knee Warm-Up',
    type: 'mobility',
    goal: 'health',
    daysPerWeek: 7,
    difficulty: 'beginner',
    durationMin: 12,
    description: 'Low-impact knee prep routine for post-ACL recovery. Activates glutes, VMO and hip stabilisers before any workout. No impact, no pivoting.',
    days: [
      {
        id: 'day-1', name: 'Knee Activation & Mobility',
        exercises: [
          { exerciseId: 'ankle-circles',      sets: 2, reps: '30s', rest: 15 },
          { exerciseId: 'leg-swing',          sets: 2, reps: '30s', rest: 15 },
          { exerciseId: 'hip-circle',         sets: 2, reps: '30s', rest: 15 },
          { exerciseId: 'glute-bridge-bw',    sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'clamshell',          sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'side-leg-raise',     sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'straight-leg-raise', sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'short-arc-quad',     sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'tke',                sets: 3, reps: '15',  rest: 30 },
          { exerciseId: 'calf-raise',         sets: 3, reps: '20',  rest: 30 },
          { exerciseId: 'wall-sit',           sets: 3, reps: '30s', rest: 45 },
          { exerciseId: 'hamstring-stretch',  sets: 2, reps: '45s', rest: 15 },
          { exerciseId: 'quad-stretch',       sets: 2, reps: '45s', rest: 15 },
        ]
      }
    ]
  },

  // ── Hyrox ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-hyrox-intro',
    name: 'Hyrox Starter',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 45,
    description: 'First four weeks of Hyrox prep — learn the stations at a manageable volume before touching race distances.',
    levels: {
      advanced: { repsMul: 1.5, restMul: 0.8, note: 'Half again the distance on every station.' },
    },
    days: [
      {
        id: 'day-1', name: 'Run + Erg',
        exercises: [
          { exerciseId: 'running',        sets: 1, reps: '3km',  rest: 0 },
          { exerciseId: 'ski-erg',        sets: 3, reps: '250m', rest: 90 },
          { exerciseId: 'rowing-machine', sets: 3, reps: '250m', rest: 90 },
          { exerciseId: 'plank',          sets: 3, reps: '45s',  rest: 45 },
        ]
      },
      {
        id: 'day-2', name: 'Station Practice',
        exercises: [
          { exerciseId: 'sled-push',      sets: 3, reps: '20m',  rest: 120 },
          { exerciseId: 'sled-pull',      sets: 3, reps: '20m',  rest: 120 },
          { exerciseId: 'farmers-carry',  sets: 3, reps: '30m',  rest: 90 },
          { exerciseId: 'wall-balls',     sets: 3, reps: '15',   rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Easy Run + Lunges',
        exercises: [
          { exerciseId: 'running',        sets: 1, reps: '4km',  rest: 0 },
          { exerciseId: 'sandbag-lunges', sets: 3, reps: '20m',  rest: 90 },
          { exerciseId: 'burpee-broad-jump', sets: 3, reps: '8', rest: 90 },
        ]
      }
    ]
  },
  {
    id: 'tpl-hyrox-halfsim',
    name: 'Hyrox Half Sim',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 1,
    difficulty: 'intermediate',
    durationMin: 50,
    description: 'Every station in race order at half distance — a race rehearsal that does not need a full recovery week afterwards.',
    levels: {
      beginner: { repsMul: 0.6, note: 'Shorter again, to learn the running-into-station transitions.' },
      advanced: { repsMul: 1.6, note: 'Close to full race distance without the final run.' },
    },
    days: [{
      id: 'day-1', name: 'Half Race',
      exercises: [
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'ski-erg',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'sled-push',         sets: 1, reps: '25m',  rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'sled-pull',         sets: 1, reps: '25m',  rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'burpee-broad-jump', sets: 1, reps: '40',   rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'rowing-machine',    sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'farmers-carry',     sets: 1, reps: '100m', rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'sandbag-lunges',    sets: 1, reps: '50m',  rest: 0 },
        { exerciseId: 'running',           sets: 1, reps: '500m', rest: 0 },
        { exerciseId: 'wall-balls',        sets: 1, reps: '40',   rest: 0 },
      ]
    }]
  },
  {
    id: 'tpl-hyrox-compromised',
    name: 'Compromised Running',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 2,
    difficulty: 'intermediate',
    durationMin: 55,
    description: 'Running with tired legs is what decides a Hyrox. Every run here starts straight off a station.',
    levels: {
      beginner: { repsMul: 0.7, setsDelta: -1, restMul: 1.4, note: 'Fewer rounds with real rest between them.' },
      advanced: { setsDelta: 1, restMul: 0.5, note: 'An extra round and almost no rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'Sled into Run',
        exercises: [
          { exerciseId: 'sled-push',      sets: 4, reps: '25m',  rest: 30 },
          { exerciseId: 'running',        sets: 4, reps: '800m', rest: 60 },
          { exerciseId: 'wall-balls',     sets: 4, reps: '20',   rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Erg into Run',
        exercises: [
          { exerciseId: 'rowing-machine', sets: 4, reps: '500m', rest: 30 },
          { exerciseId: 'running',        sets: 4, reps: '600m', rest: 60 },
          { exerciseId: 'farmers-carry',  sets: 4, reps: '50m',  rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-hyrox-stations',
    name: 'Station Skills Lab',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 2,
    difficulty: 'intermediate',
    durationMin: 50,
    description: 'No running. Two sessions spent purely on technique and capacity at the eight stations.',
    days: [
      {
        id: 'day-1', name: 'Push / Pull / Carry',
        exercises: [
          { exerciseId: 'sled-push',      sets: 6, reps: '25m', rest: 90 },
          { exerciseId: 'sled-pull',      sets: 6, reps: '25m', rest: 90 },
          { exerciseId: 'farmers-carry',  sets: 5, reps: '50m', rest: 75 },
          { exerciseId: 'sandbag-lunges', sets: 4, reps: '25m', rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'Erg / Burpee / Wall Ball',
        exercises: [
          { exerciseId: 'ski-erg',           sets: 5, reps: '400m', rest: 75 },
          { exerciseId: 'rowing-machine',    sets: 5, reps: '400m', rest: 75 },
          { exerciseId: 'burpee-broad-jump', sets: 5, reps: '12',   rest: 75 },
          { exerciseId: 'wall-balls',        sets: 5, reps: '25',   rest: 75 },
        ]
      }
    ]
  },
  {
    id: 'tpl-hyrox-doubles',
    name: 'Hyrox Doubles Prep',
    type: 'hyrox',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'advanced',
    durationMin: 75,
    description: 'Peak-phase block for the doubles format — split-station volume plus the full running load.',
    days: [
      {
        id: 'day-1', name: 'Split Stations',
        exercises: [
          { exerciseId: 'ski-erg',        sets: 8, reps: '250m', rest: 45 },
          { exerciseId: 'rowing-machine', sets: 8, reps: '250m', rest: 45 },
          { exerciseId: 'wall-balls',     sets: 6, reps: '25',   rest: 45 },
        ]
      },
      {
        id: 'day-2', name: 'Heavy Carries',
        exercises: [
          { exerciseId: 'sled-push',      sets: 8, reps: '25m',  rest: 75 },
          { exerciseId: 'sled-pull',      sets: 8, reps: '25m',  rest: 75 },
          { exerciseId: 'farmers-carry',  sets: 6, reps: '100m', rest: 75 },
          { exerciseId: 'sandbag-lunges', sets: 5, reps: '50m',  rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Long Run + Finisher',
        exercises: [
          { exerciseId: 'running',           sets: 1, reps: '12km', rest: 0 },
          { exerciseId: 'burpee-broad-jump', sets: 3, reps: '25',   rest: 90 },
        ]
      }
    ]
  },

  // ── Strength ──────────────────────────────────────────────────────────────
  {
    id: 'tpl-starting-strength',
    name: 'Starting Strength',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 45,
    description: 'Two alternating full-body days built on squat, press and pull. Add weight every session for as long as it keeps working.',
    levels: {
      advanced: { setsDelta: 2, restMul: 1.2, note: 'Five working sets per lift with full rest between them.' },
    },
    days: [
      {
        id: 'day-1', name: 'Workout A',
        exercises: [
          { exerciseId: 'squat',          sets: 3, reps: '5',  rest: 180 },
          { exerciseId: 'bench-press',    sets: 3, reps: '5',  rest: 180 },
          { exerciseId: 'deadlift',       sets: 1, reps: '5',  rest: 240 },
          { exerciseId: 'plank',          sets: 3, reps: '45s',rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Workout B',
        exercises: [
          { exerciseId: 'squat',          sets: 3, reps: '5',  rest: 180 },
          { exerciseId: 'overhead-press', sets: 3, reps: '5',  rest: 180 },
          { exerciseId: 'barbell-row',    sets: 3, reps: '5',  rest: 150 },
          { exerciseId: 'chinup',         sets: 3, reps: '8',  rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Workout A (heavy)',
        exercises: [
          { exerciseId: 'squat',          sets: 3, reps: '5',  rest: 210 },
          { exerciseId: 'bench-press',    sets: 3, reps: '5',  rest: 210 },
          { exerciseId: 'rdl',            sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'calf-raise',     sets: 3, reps: '15', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-madcow',
    name: 'Madcow 5×5',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 70,
    description: 'Ramping 5×5 with a heavy, light and medium day each week — the usual step up once linear progression stalls.',
    levels: {
      beginner: { setsDelta: -2, restMul: 1.2, note: 'Three ramping sets instead of five while you learn the pacing.' },
    },
    days: [
      {
        id: 'day-1', name: 'Heavy',
        exercises: [
          { exerciseId: 'squat',          sets: 5, reps: '5',  rest: 180 },
          { exerciseId: 'bench-press',    sets: 5, reps: '5',  rest: 180 },
          { exerciseId: 'barbell-row',    sets: 5, reps: '5',  rest: 150 },
        ]
      },
      {
        id: 'day-2', name: 'Light',
        exercises: [
          { exerciseId: 'squat',          sets: 4, reps: '5',  rest: 120 },
          { exerciseId: 'overhead-press', sets: 4, reps: '5',  rest: 120 },
          { exerciseId: 'deadlift',       sets: 4, reps: '5',  rest: 180 },
        ]
      },
      {
        id: 'day-3', name: 'Medium + Back-off',
        exercises: [
          { exerciseId: 'squat',          sets: 4, reps: '5',  rest: 150 },
          { exerciseId: 'bench-press',    sets: 4, reps: '5',  rest: 150 },
          { exerciseId: 'barbell-row',    sets: 4, reps: '5',  rest: 120 },
          { exerciseId: 'dips',           sets: 3, reps: '8',  rest: 90 },
          { exerciseId: 'barbell-curl',   sets: 3, reps: '10', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-gzclp',
    name: 'GZCLP Linear',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 4,
    difficulty: 'intermediate',
    durationMin: 60,
    description: 'Three tiers per session: a heavy main lift, a volume secondary, then accessories to fill the gaps.',
    days: [
      {
        id: 'day-1', name: 'Squat / Bench',
        exercises: [
          { exerciseId: 'squat',           sets: 5, reps: '3',  rest: 180 },
          { exerciseId: 'bench-press',     sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'lat-pulldown',    sets: 3, reps: '15', rest: 75 },
          { exerciseId: 'leg-curl',        sets: 3, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Press / Deadlift',
        exercises: [
          { exerciseId: 'overhead-press',  sets: 5, reps: '3',  rest: 180 },
          { exerciseId: 'deadlift',        sets: 3, reps: '10', rest: 150 },
          { exerciseId: 'db-row',          sets: 3, reps: '15', rest: 75 },
          { exerciseId: 'face-pull',       sets: 3, reps: '20', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Bench / Squat',
        exercises: [
          { exerciseId: 'bench-press',     sets: 5, reps: '3',  rest: 180 },
          { exerciseId: 'front-squat',     sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'seated-row',      sets: 3, reps: '15', rest: 75 },
          { exerciseId: 'tricep-pushdown', sets: 3, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-4', name: 'Deadlift / Press',
        exercises: [
          { exerciseId: 'deadlift',        sets: 5, reps: '3',  rest: 210 },
          { exerciseId: 'db-shoulder-press',sets: 3,reps: '10', rest: 120 },
          { exerciseId: 'pullup',          sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'hanging-leg-raise',sets: 3,reps: '12', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-phul',
    name: 'Power / Hypertrophy Upper Lower',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 4,
    difficulty: 'intermediate',
    durationMin: 65,
    description: 'Two heavy power days and two higher-rep hypertrophy days — strength and size in the same week.',
    levels: {
      beginner: { setsDelta: -1, restMul: 1.25, note: 'Fewer sets with longer rest; keep the rep targets.' },
      advanced: { setsDelta: 1, restMul: 0.85, note: 'More volume on every slot.' },
    },
    days: [
      {
        id: 'day-1', name: 'Upper Power',
        exercises: [
          { exerciseId: 'bench-press',     sets: 4, reps: '5',  rest: 180 },
          { exerciseId: 'barbell-row',     sets: 4, reps: '5',  rest: 150 },
          { exerciseId: 'overhead-press',  sets: 3, reps: '6',  rest: 150 },
          { exerciseId: 'pullup',          sets: 3, reps: '8',  rest: 120 },
          { exerciseId: 'skull-crusher',   sets: 3, reps: '10', rest: 75 },
        ]
      },
      {
        id: 'day-2', name: 'Lower Power',
        exercises: [
          { exerciseId: 'squat',           sets: 4, reps: '5',  rest: 210 },
          { exerciseId: 'deadlift',        sets: 3, reps: '5',  rest: 240 },
          { exerciseId: 'leg-press',       sets: 3, reps: '10', rest: 120 },
          { exerciseId: 'leg-curl',        sets: 3, reps: '10', rest: 90 },
          { exerciseId: 'calf-raise',      sets: 4, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Upper Hypertrophy',
        exercises: [
          { exerciseId: 'incline-bench',   sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'seated-row',      sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'db-fly',          sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'lateral-raise',   sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'hammer-curl',     sets: 3, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-4', name: 'Lower Hypertrophy',
        exercises: [
          { exerciseId: 'front-squat',     sets: 4, reps: '12', rest: 120 },
          { exerciseId: 'rdl',             sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'bulgarian-split', sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'leg-extension',   sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'cable-crunch',    sets: 3, reps: '15', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-arnold',
    name: 'Arnold Split',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 6,
    difficulty: 'advanced',
    durationMin: 80,
    description: 'Six days, each muscle twice a week. High volume — only worth running if recovery and nutrition are already handled.',
    days: [
      {
        id: 'day-1', name: 'Chest & Back',
        exercises: [
          { exerciseId: 'bench-press',     sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'barbell-row',     sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'incline-bench',   sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'pullup',          sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'db-fly',          sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Shoulders & Arms',
        exercises: [
          { exerciseId: 'overhead-press',  sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'lateral-raise',   sets: 4, reps: '15', rest: 60 },
          { exerciseId: 'barbell-curl',    sets: 4, reps: '10', rest: 60 },
          { exerciseId: 'skull-crusher',   sets: 4, reps: '10', rest: 60 },
          { exerciseId: 'hammer-curl',     sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Legs & Core',
        exercises: [
          { exerciseId: 'squat',           sets: 5, reps: '10', rest: 120 },
          { exerciseId: 'leg-press',       sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'leg-curl',        sets: 4, reps: '12', rest: 75 },
          { exerciseId: 'calf-raise',      sets: 5, reps: '15', rest: 60 },
          { exerciseId: 'crunches',        sets: 4, reps: '20', rest: 45 },
        ]
      },
      {
        id: 'day-4', name: 'Chest & Back (2)',
        exercises: [
          { exerciseId: 'db-bench',        sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'lat-pulldown',    sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'dips',            sets: 4, reps: '12', rest: 75 },
          { exerciseId: 'seated-row',      sets: 4, reps: '12', rest: 75 },
          { exerciseId: 'cable-fly',       sets: 3, reps: '15', rest: 60 },
        ]
      },
      {
        id: 'day-5', name: 'Shoulders & Arms (2)',
        exercises: [
          { exerciseId: 'db-shoulder-press',sets: 4,reps: '12', rest: 90 },
          { exerciseId: 'front-raise',     sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'face-pull',       sets: 4, reps: '20', rest: 60 },
          { exerciseId: 'cable-curl',      sets: 4, reps: '12', rest: 60 },
          { exerciseId: 'overhead-tricep', sets: 4, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-6', name: 'Legs & Core (2)',
        exercises: [
          { exerciseId: 'deadlift',        sets: 4, reps: '8',  rest: 150 },
          { exerciseId: 'lunges',          sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'leg-extension',   sets: 4, reps: '15', rest: 60 },
          { exerciseId: 'hip-thrust',      sets: 4, reps: '12', rest: 75 },
          { exerciseId: 'ab-wheel',        sets: 3, reps: '12', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-dumbbell-only',
    name: 'Dumbbell Only',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 45,
    description: 'A full-body week that needs nothing but a pair of dumbbells — built for home gyms and hotel rooms.',
    levels: {
      advanced: { setsDelta: 1, repsMul: 1.3, restMul: 0.8, note: 'More sets and reps to make up for the lighter loading.' },
    },
    days: [
      {
        id: 'day-1', name: 'Push Focus',
        exercises: [
          { exerciseId: 'db-bench',         sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'db-shoulder-press',sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'db-lunges',        sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'overhead-tricep',  sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'plank',            sets: 3, reps: '45s',rest: 45 },
        ]
      },
      {
        id: 'day-2', name: 'Pull Focus',
        exercises: [
          { exerciseId: 'db-row',           sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'rdl',              sets: 4, reps: '12', rest: 90 },
          { exerciseId: 'db-curl',          sets: 3, reps: '12', rest: 60 },
          { exerciseId: 'face-pull',        sets: 3, reps: '20', rest: 60 },
          { exerciseId: 'dead-bug',         sets: 3, reps: '12', rest: 45 },
        ]
      },
      {
        id: 'day-3', name: 'Legs & Core',
        exercises: [
          { exerciseId: 'kb-goblet-squat',  sets: 4, reps: '15', rest: 90 },
          { exerciseId: 'bulgarian-split',  sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'db-renegade-row',  sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'calf-raise',       sets: 4, reps: '20', rest: 45 },
          { exerciseId: 'side-plank',       sets: 3, reps: '30s',rest: 45 },
        ]
      }
    ]
  },
  {
    id: 'tpl-bodyweight-strength',
    name: 'Bodyweight Strength',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 35,
    description: 'No equipment beyond somewhere to hang. Progress by slowing each rep down before adding more of them.',
    levels: {
      advanced: { repsMul: 1.5, setsDelta: 1, restMul: 0.7, note: 'More reps, more sets, less rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'Push',
        exercises: [
          { exerciseId: 'pushup',          sets: 4, reps: '15', rest: 75 },
          { exerciseId: 'dips',            sets: 3, reps: '10', rest: 75 },
          { exerciseId: 'scap-pushup',     sets: 3, reps: '12', rest: 45 },
          { exerciseId: 'plank',           sets: 3, reps: '60s',rest: 45 },
        ]
      },
      {
        id: 'day-2', name: 'Pull',
        exercises: [
          { exerciseId: 'pullup',          sets: 4, reps: '8',  rest: 90 },
          { exerciseId: 'chinup',          sets: 3, reps: '8',  rest: 90 },
          { exerciseId: 'prone-ytw',       sets: 3, reps: '12', rest: 45 },
          { exerciseId: 'hanging-leg-raise',sets: 3,reps: '10', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'Legs',
        exercises: [
          { exerciseId: 'squat',           sets: 4, reps: '20', rest: 75 },
          { exerciseId: 'bulgarian-split', sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'glute-bridge-bw', sets: 3, reps: '20', rest: 45 },
          { exerciseId: 'calf-raise',      sets: 4, reps: '25', rest: 45 },
          { exerciseId: 'wall-sit',        sets: 3, reps: '45s',rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-posterior',
    name: 'Posterior Chain Focus',
    type: 'strength',
    goal: 'muscle',
    daysPerWeek: 2,
    difficulty: 'intermediate',
    durationMin: 50,
    description: 'Two sessions a week for the glutes, hamstrings and upper back — the usual weak link for desk-bound lifters.',
    days: [
      {
        id: 'day-1', name: 'Hinge',
        exercises: [
          { exerciseId: 'deadlift',        sets: 4, reps: '6',  rest: 180 },
          { exerciseId: 'hip-thrust',      sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'leg-curl',        sets: 3, reps: '12', rest: 75 },
          { exerciseId: 'good-morning',    sets: 3, reps: '12', rest: 90 },
          { exerciseId: 'bird-dog',        sets: 3, reps: '12', rest: 45 },
        ]
      },
      {
        id: 'day-2', name: 'Pull & Brace',
        exercises: [
          { exerciseId: 'rdl',             sets: 4, reps: '8',  rest: 120 },
          { exerciseId: 'barbell-row',     sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'face-pull',       sets: 4, reps: '20', rest: 60 },
          { exerciseId: 'monster-walk',    sets: 3, reps: '15', rest: 45 },
          { exerciseId: 'mcgill-curlup',   sets: 3, reps: '10', rest: 45 },
        ]
      }
    ]
  },

  // ── Cardio & Endurance ────────────────────────────────────────────────────
  {
    id: 'tpl-c25k',
    name: 'Couch to 5K',
    type: 'cardio',
    goal: 'health',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 30,
    description: 'Run/walk intervals that build to a continuous 5K. Repeat each week until it feels repeatable, then move on.',
    levels: {
      advanced: { repsMul: 1.6, note: 'Longer continuous blocks for anyone returning to running rather than starting out.' },
    },
    days: [
      {
        id: 'day-1', name: 'Intervals',
        exercises: [
          { exerciseId: 'running',       sets: 8, reps: '400m', rest: 90 },
          { exerciseId: 'hamstring-stretch', sets: 2, reps: '45s', rest: 15 },
        ]
      },
      {
        id: 'day-2', name: 'Steady',
        exercises: [
          { exerciseId: 'running',       sets: 4, reps: '800m', rest: 120 },
          { exerciseId: 'quad-stretch',  sets: 2, reps: '45s',  rest: 15 },
        ]
      },
      {
        id: 'day-3', name: 'Long Effort',
        exercises: [
          { exerciseId: 'running',       sets: 2, reps: '1500m', rest: 180 },
          { exerciseId: 'hip-flexor-stretch', sets: 2, reps: '45s', rest: 15 },
        ]
      }
    ]
  },
  {
    id: 'tpl-zone2',
    name: 'Zone 2 Base',
    type: 'cardio',
    goal: 'health',
    daysPerWeek: 4,
    difficulty: 'beginner',
    durationMin: 50,
    description: 'Four easy aerobic sessions a week, all at a pace you could hold a conversation at. Dull on purpose.',
    levels: {
      advanced: { repsMul: 1.5, note: 'Longer sessions for a bigger weekly aerobic load.' },
    },
    days: [
      {
        id: 'day-1', name: 'Easy Run',
        exercises: [{ exerciseId: 'running',        sets: 1, reps: '8km',  rest: 0 }]
      },
      {
        id: 'day-2', name: 'Bike',
        exercises: [{ exerciseId: 'cycling',        sets: 1, reps: '25km', rest: 0 }]
      },
      {
        id: 'day-3', name: 'Row',
        exercises: [{ exerciseId: 'rowing-machine', sets: 1, reps: '8000m',rest: 0 }]
      },
      {
        id: 'day-4', name: 'Long Easy Run',
        exercises: [{ exerciseId: 'running',        sets: 1, reps: '12km', rest: 0 }]
      }
    ]
  },
  {
    id: 'tpl-10k-builder',
    name: '10K Builder',
    type: 'cardio',
    goal: 'endurance',
    daysPerWeek: 4,
    difficulty: 'intermediate',
    durationMin: 55,
    description: 'Threshold work, intervals and a weekly long run — the standard shape of a 10K block.',
    levels: {
      beginner: { repsMul: 0.7, restMul: 1.3, note: 'Reduced distances for a first 10K.' },
      advanced: { repsMul: 1.3, restMul: 0.8, note: 'Half-marathon-adjacent volume.' },
    },
    days: [
      {
        id: 'day-1', name: 'Threshold',
        exercises: [
          { exerciseId: 'running',     sets: 4, reps: '1600m', rest: 120 },
        ]
      },
      {
        id: 'day-2', name: 'Easy + Strides',
        exercises: [
          { exerciseId: 'running',     sets: 1, reps: '6km',  rest: 0 },
          { exerciseId: 'hiit-sprint', sets: 6, reps: '100m', rest: 60 },
        ]
      },
      {
        id: 'day-3', name: 'VO2 Intervals',
        exercises: [
          { exerciseId: 'running',     sets: 6, reps: '800m', rest: 150 },
        ]
      },
      {
        id: 'day-4', name: 'Long Run',
        exercises: [
          { exerciseId: 'running',     sets: 1, reps: '14km', rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-run-intervals',
    name: 'Track Intervals',
    type: 'cardio',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'advanced',
    durationMin: 60,
    description: 'Three hard interval sessions a week. Only sustainable on top of an established aerobic base.',
    levels: {
      beginner: { repsMul: 0.6, setsDelta: -2, restMul: 1.5, note: 'Shorter reps, fewer of them, and full recovery.' },
      intermediate: { setsDelta: -1, restMul: 1.2, note: 'One less rep per set with a little more recovery.' },
    },
    days: [
      {
        id: 'day-1', name: 'Short Reps',
        exercises: [
          { exerciseId: 'hiit-sprint', sets: 12, reps: '400m', rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'Long Reps',
        exercises: [
          { exerciseId: 'running',     sets: 5, reps: '1000m', rest: 150 },
        ]
      },
      {
        id: 'day-3', name: 'Pyramid',
        exercises: [
          { exerciseId: 'running',     sets: 2, reps: '1200m', rest: 150 },
          { exerciseId: 'running',     sets: 2, reps: '800m',  rest: 120 },
          { exerciseId: 'running',     sets: 2, reps: '400m',  rest: 90 },
        ]
      }
    ]
  },
  {
    id: 'tpl-half-marathon',
    name: 'Half Marathon Build',
    type: 'cardio',
    goal: 'endurance',
    daysPerWeek: 5,
    difficulty: 'advanced',
    durationMin: 70,
    description: 'Peak week of a half-marathon block — roughly 55km across five runs, with the long run doing most of the work.',
    days: [
      {
        id: 'day-1', name: 'Easy',
        exercises: [{ exerciseId: 'running', sets: 1, reps: '8km',  rest: 0 }]
      },
      {
        id: 'day-2', name: 'Tempo',
        exercises: [
          { exerciseId: 'running', sets: 1, reps: '2km',  rest: 0 },
          { exerciseId: 'running', sets: 3, reps: '3km',  rest: 120 },
        ]
      },
      {
        id: 'day-3', name: 'Recovery',
        exercises: [{ exerciseId: 'running', sets: 1, reps: '6km',  rest: 0 }]
      },
      {
        id: 'day-4', name: 'Intervals',
        exercises: [{ exerciseId: 'running', sets: 6, reps: '1000m', rest: 120 }]
      },
      {
        id: 'day-5', name: 'Long Run',
        exercises: [{ exerciseId: 'running', sets: 1, reps: '21km', rest: 0 }]
      }
    ]
  },
  {
    id: 'tpl-erg-engine',
    name: 'Row & Ski Engine',
    type: 'cardio',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 45,
    description: 'Indoor-only aerobic work on the rower and ski erg. Useful in winter, and directly transferable to Hyrox.',
    levels: {
      beginner: { repsMul: 0.6, setsDelta: -1, restMul: 1.4, note: 'Shorter pieces with generous rest.' },
      advanced: { repsMul: 1.4, restMul: 0.7, note: 'Longer pieces on shorter rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'Intervals',
        exercises: [
          { exerciseId: 'rowing-machine', sets: 8, reps: '500m', rest: 90 },
        ]
      },
      {
        id: 'day-2', name: 'Alternating',
        exercises: [
          { exerciseId: 'ski-erg',        sets: 5, reps: '750m', rest: 90 },
          { exerciseId: 'rowing-machine', sets: 5, reps: '750m', rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Long Piece',
        exercises: [
          { exerciseId: 'rowing-machine', sets: 1, reps: '6000m', rest: 0 },
          { exerciseId: 'ski-erg',        sets: 1, reps: '2000m', rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-brick',
    name: 'Bike-Run Brick',
    type: 'cardio',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 75,
    description: 'Riding straight into a run, so the legs learn the transition. Built for duathlon and triathlon prep.',
    days: [
      {
        id: 'day-1', name: 'Short Brick',
        exercises: [
          { exerciseId: 'cycling', sets: 1, reps: '20km', rest: 0 },
          { exerciseId: 'running', sets: 1, reps: '5km',  rest: 0 },
        ]
      },
      {
        id: 'day-2', name: 'Repeat Brick',
        exercises: [
          { exerciseId: 'cycling', sets: 3, reps: '8km',  rest: 0 },
          { exerciseId: 'running', sets: 3, reps: '2km',  rest: 120 },
        ]
      },
      {
        id: 'day-3', name: 'Long Brick',
        exercises: [
          { exerciseId: 'cycling', sets: 1, reps: '45km', rest: 0 },
          { exerciseId: 'running', sets: 1, reps: '8km',  rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-swim-base',
    name: 'Swim Base',
    type: 'cardio',
    goal: 'health',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 45,
    description: 'Low-impact aerobic work in the pool. Worth keeping in the week when the knees need a break from running.',
    levels: {
      advanced: { repsMul: 1.6, restMul: 0.7, note: 'Bigger sets on shorter rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'Technique',
        exercises: [{ exerciseId: 'swimming', sets: 10, reps: '100m', rest: 45 }]
      },
      {
        id: 'day-2', name: 'Intervals',
        exercises: [{ exerciseId: 'swimming', sets: 6,  reps: '200m', rest: 60 }]
      },
      {
        id: 'day-3', name: 'Continuous',
        exercises: [{ exerciseId: 'swimming', sets: 1,  reps: '1500m',rest: 0 }]
      }
    ]
  },

  // ── HIIT ──────────────────────────────────────────────────────────────────
  {
    id: 'tpl-emom-30',
    name: '30-Minute EMOM',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 30,
    description: 'Every minute on the minute for 30 minutes. Whatever is left of the minute is your rest.',
    levels: {
      beginner: { repsMul: 0.6, setsDelta: -4, restMul: 1, note: 'Twenty minutes and lighter rep targets.' },
      advanced: { repsMul: 1.4, setsDelta: 2, note: 'Higher reps per minute across a longer clock.' },
    },
    days: [
      {
        id: 'day-1', name: 'Full Body EMOM',
        exercises: [
          { exerciseId: 'burpees',          sets: 10, reps: '10', rest: 0 },
          { exerciseId: 'kb-swing',         sets: 10, reps: '15', rest: 0 },
          { exerciseId: 'box-jumps',        sets: 10, reps: '10', rest: 0 },
        ]
      },
      {
        id: 'day-2', name: 'Upper EMOM',
        exercises: [
          { exerciseId: 'pushup',           sets: 10, reps: '15', rest: 0 },
          { exerciseId: 'db-renegade-row',  sets: 10, reps: '10', rest: 0 },
          { exerciseId: 'db-thruster',      sets: 10, reps: '10', rest: 0 },
        ]
      },
      {
        id: 'day-3', name: 'Lower EMOM',
        exercises: [
          { exerciseId: 'jump-squat',       sets: 10, reps: '15', rest: 0 },
          { exerciseId: 'db-reverse-lunge', sets: 10, reps: '12', rest: 0 },
          { exerciseId: 'step-ups',         sets: 10, reps: '16', rest: 0 },
        ]
      }
    ]
  },
  {
    id: 'tpl-bodyweight-hiit',
    name: 'No-Equipment HIIT',
    type: 'hiit',
    goal: 'fat_loss',
    daysPerWeek: 4,
    difficulty: 'beginner',
    durationMin: 25,
    description: 'Four short sessions a week needing nothing but floor space. 30s work, 30s rest.',
    levels: {
      advanced: { setsDelta: 2, repsMul: 1.5, restMul: 0.5, note: 'More rounds, longer work, half the rest.' },
    },
    days: [
      {
        id: 'day-1', name: 'Circuit A',
        exercises: [
          { exerciseId: 'burpees',          sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'mountain-climbers',sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'jump-squat',       sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'plank',            sets: 4, reps: '30s', rest: 30 },
        ]
      },
      {
        id: 'day-2', name: 'Circuit B',
        exercises: [
          { exerciseId: 'high-knees',       sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'pushup',           sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'bear-crawl',       sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'russian-twist',    sets: 4, reps: '30s', rest: 30 },
        ]
      },
      {
        id: 'day-3', name: 'Circuit C',
        exercises: [
          { exerciseId: 'shuttle-run',      sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'broad-jump',       sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'crunches',         sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'side-plank',       sets: 4, reps: '30s', rest: 30 },
        ]
      },
      {
        id: 'day-4', name: 'Circuit D',
        exercises: [
          { exerciseId: 'jump-rope',        sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'step-ups',         sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'leg-raises',       sets: 4, reps: '30s', rest: 30 },
          { exerciseId: 'dead-bug',         sets: 4, reps: '30s', rest: 30 },
        ]
      }
    ]
  },

  // ── CrossFit ──────────────────────────────────────────────────────────────
  {
    id: 'tpl-crossfit-intro',
    name: 'CrossFit Foundations',
    type: 'crossfit',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 40,
    description: 'Scaled WODs for the first months in a box — the movement patterns before the benchmark times.',
    levels: {
      advanced: { repsMul: 1.5, setsDelta: 1, restMul: 0.7, note: 'Closer to prescribed volume.' },
    },
    days: [
      {
        id: 'day-1', name: 'Squat & Metcon',
        exercises: [
          { exerciseId: 'squat',           sets: 5, reps: '5',  rest: 150 },
          { exerciseId: 'kb-goblet-squat', sets: 3, reps: '15', rest: 60 },
          { exerciseId: 'burpees',         sets: 3, reps: '12', rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Gymnastics',
        exercises: [
          { exerciseId: 'pullup',          sets: 5, reps: '5',  rest: 120 },
          { exerciseId: 'pushup',          sets: 4, reps: '15', rest: 75 },
          { exerciseId: 'toes-to-bar',     sets: 3, reps: '8',  rest: 90 },
        ]
      },
      {
        id: 'day-3', name: 'Barbell Cycling',
        exercises: [
          { exerciseId: 'power-clean',     sets: 5, reps: '3',  rest: 150 },
          { exerciseId: 'thrusters',       sets: 4, reps: '10', rest: 90 },
          { exerciseId: 'double-unders',   sets: 4, reps: '30', rest: 60 },
        ]
      }
    ]
  },
  {
    id: 'tpl-girls-wod',
    name: 'Benchmark Girls',
    type: 'crossfit',
    goal: 'endurance',
    daysPerWeek: 3,
    difficulty: 'advanced',
    durationMin: 35,
    description: 'Fran, Grace and Cindy as written. Short, prescribed, and a hard yardstick to measure against.',
    days: [
      {
        id: 'day-1', name: 'Fran',
        exercises: [
          { exerciseId: 'thrusters',     sets: 3, reps: '21-15-9', rest: 0 },
          { exerciseId: 'kipping-pullup',sets: 3, reps: '21-15-9', rest: 0 },
        ]
      },
      {
        id: 'day-2', name: 'Grace',
        exercises: [
          { exerciseId: 'clean-and-jerk',sets: 1, reps: '30',  rest: 0 },
        ]
      },
      {
        id: 'day-3', name: 'Cindy',
        exercises: [
          { exerciseId: 'pullup',        sets: 20, reps: '5',  rest: 0 },
          { exerciseId: 'pushup',        sets: 20, reps: '10', rest: 0 },
          { exerciseId: 'squat',         sets: 20, reps: '15', rest: 0 },
        ]
      }
    ]
  },

  // ── Combat ────────────────────────────────────────────────────────────────
  {
    id: 'tpl-boxing-base',
    name: 'Boxing Conditioning',
    type: 'boxing',
    goal: 'fat_loss',
    daysPerWeek: 3,
    difficulty: 'intermediate',
    durationMin: 60,
    description: 'Bag work, pads and roadwork in the week shape a fighter actually uses.',
    levels: {
      beginner: { setsDelta: -1, restMul: 1.3, note: 'Fewer rounds with a full minute between them.' },
    },
    days: [
      {
        id: 'day-1', name: 'Bag & Technique',
        exercises: [
          { exerciseId: 'shadowboxing',  sets: 1, reps: '1 session', rest: 60 },
          { exerciseId: 'heavy-bag',     sets: 1, reps: '1 session', rest: 60 },
          { exerciseId: 'jump-rope',     sets: 3, reps: '180s',      rest: 60 },
        ]
      },
      {
        id: 'day-2', name: 'Pads & Core',
        exercises: [
          { exerciseId: 'pad-work',      sets: 1, reps: '1 session', rest: 60 },
          { exerciseId: 'russian-twist', sets: 4, reps: '30',  rest: 45 },
          { exerciseId: 'plank',         sets: 4, reps: '60s', rest: 45 },
        ]
      },
      {
        id: 'day-3', name: 'Roadwork',
        exercises: [
          { exerciseId: 'running',       sets: 1, reps: '8km',  rest: 0 },
          { exerciseId: 'hiit-sprint',   sets: 8, reps: '200m', rest: 60 },
        ]
      }
    ]
  },

  // ── Mobility ──────────────────────────────────────────────────────────────
  {
    id: 'tpl-shoulder-prehab',
    name: 'Shoulder Prehab',
    type: 'mobility',
    goal: 'health',
    daysPerWeek: 3,
    difficulty: 'beginner',
    durationMin: 15,
    description: 'Rotator cuff and scapular work to keep pressing volume sustainable. Light loads, strict tempo.',
    days: [{
      id: 'day-1', name: 'Cuff & Scap',
      exercises: [
        { exerciseId: 'band-external-rot',  sets: 3, reps: '15',  rest: 30 },
        { exerciseId: 'scap-wall-slide',    sets: 3, reps: '12',  rest: 30 },
        { exerciseId: 'prone-ytw',          sets: 3, reps: '10',  rest: 30 },
        { exerciseId: 'scap-pushup',        sets: 3, reps: '12',  rest: 30 },
        { exerciseId: 'scap-retraction',    sets: 3, reps: '15',  rest: 30 },
        { exerciseId: 'face-pull',          sets: 3, reps: '20',  rest: 45 },
        { exerciseId: 'upper-trap-stretch', sets: 2, reps: '45s', rest: 15 },
      ]
    }]
  },
  {
    id: 'tpl-daily-mobility',
    name: 'Daily Mobility Flow',
    type: 'mobility',
    goal: 'health',
    daysPerWeek: 7,
    difficulty: 'beginner',
    durationMin: 15,
    description: 'A short full-body flow for every day — hips, spine and ankles, no equipment, no impact.',
    days: [{
      id: 'day-1', name: 'Flow',
      exercises: [
        { exerciseId: 'cat-cow',             sets: 2, reps: '45s', rest: 15 },
        { exerciseId: 'hip-circle',          sets: 2, reps: '30s', rest: 15 },
        { exerciseId: 'leg-swing',           sets: 2, reps: '30s', rest: 15 },
        { exerciseId: 'nine-ninety',         sets: 2, reps: '10',  rest: 30 },
        { exerciseId: 'hip-flexor-stretch',  sets: 2, reps: '45s', rest: 15 },
        { exerciseId: 'hamstring-stretch',   sets: 2, reps: '45s', rest: 15 },
        { exerciseId: 'ankle-circles',       sets: 2, reps: '30s', rest: 15 },
        { exerciseId: 'bird-dog',            sets: 2, reps: '12',  rest: 30 },
        { exerciseId: 'dead-bug',            sets: 2, reps: '12',  rest: 30 },
        { exerciseId: 'single-leg-balance',  sets: 2, reps: '45s', rest: 15 },
      ]
    }]
  },
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
