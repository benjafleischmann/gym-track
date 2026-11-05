// ─── Garmin Connect import ────────────────────────────────────────────────────
//
// Pulls completed activities from Garmin and turns them into GymTrack workouts.
//
// The watch is read-only to us: Garmin's Personal API has no write endpoints, so
// nothing here ever pushes back to the device.
//
// Everything goes through a Cloudflare Worker relay rather than straight to
// Garmin, because Garmin's API sends no CORS headers — a browser simply cannot
// call it. The Worker also holds the API key, which must never reach the client.
//
// Cardio comes straight from the activity list. Strength needs the FIT file,
// which is the only place per-set reps and weight exist — Garmin's API exposes
// no set breakdown, and older sessions recorded before the watch's set-tracking
// was on contain a single unidentified rep blob instead.

const Garmin = {

  // Garmin activity type → GymTrack exercise. Deliberately conservative: a type
  // is listed only when the match is unambiguous AND the target exercise has a
  // measureType the logger actually implements ('distance' or 'activity').
  // 'time' exercises (elliptical, stair climber) are excluded — they still log
  // as weight × reps, so importing into them would produce nonsense rows.
  TYPE_MAP: {
    running:            'running',
    street_running:     'running',
    track_running:      'running',
    trail_running:      'running',
    treadmill_running:  'running',
    indoor_running:     'running',
    virtual_run:        'running',

    cycling:            'cycling',
    road_biking:        'cycling',
    mountain_biking:    'cycling',
    gravel_cycling:     'cycling',
    virtual_ride:       'cycling',
    indoor_cycling:     'cycling',
    commuting:          'commute-biking',
    cycling_commuting:  'commute-biking',

    lap_swimming:       'swimming',
    open_water_swimming:'swimming',

    indoor_rowing:      'rowing-machine',
    rowing:             'rowing-machine',

    boxing:             'boxing-session',
    mixed_martial_arts: 'mma',

    yoga:               'yoga',
    pilates:            'pilates',
    hiit:               'hiit-class',
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  // Worker URL and sync token live in app settings. The token only authorises
  // this relay; the Garmin key itself stays server-side.
  config() {
    const s = DB.getSettings();
    return {
      url:      s.garminUrl || '',
      token:    s.garminToken || '',
      lastSync: s.garminLastSync || null,
    };
  },

  saveConfig({ url, token }) {
    const s = DB.getSettings();
    if (url   !== undefined) s.garminUrl   = url.trim().replace(/\/+$/, '');
    if (token !== undefined) s.garminToken = token.trim();
    DB.saveSettings(s);
  },

  isConfigured() {
    const c = this.config();
    return !!(c.url && c.token);
  },

  _markSynced() {
    const s = DB.getSettings();
    s.garminLastSync = new Date().toISOString();
    DB.saveSettings(s);
  },

  // ── Relay ──────────────────────────────────────────────────────────────────
  async _call(path, params = {}) {
    const c = this.config();
    if (!c.url || !c.token) throw new Error('Garmin sync is not set up yet.');

    const url = new URL(c.url + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.set(k, v);
    });

    let res;
    try {
      res = await fetch(url, { headers: { 'X-Sync-Token': c.token } });
    } catch {
      // fetch() only rejects on network/CORS failure, never on an HTTP error.
      throw new Error('Could not reach the sync relay. Check your connection.');
    }

    if (res.status === 401) throw new Error('Sync token rejected. Re-enter it in Settings.');
    if (res.status === 429) throw new Error('Garmin is rate-limiting. Try again in a few minutes.');

    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.error) || `Sync failed (HTTP ${res.status}).`);
    return body;
  },

  // ── Import ─────────────────────────────────────────────────────────────────

  /**
   * Fetch activities and classify them without writing anything, so the user
   * can see what will be imported before committing to it.
   *
   * `refreshDays` re-opens sessions that are already in GymTrack, so edits made
   * in Garmin Connect after the first import can still land. Those come back as
   * importable rows carrying `replaceId`. It is off by default because the only
   * way to tell whether a strength session changed is to download and decode
   * its FIT again, which is far too expensive to do for a whole history on
   * every check. Pass `null` to re-open the entire range.
   *
   * Returns { importable, duplicates, unsupported }.
   */
  async preview({ sinceDays = 30, limit = 50, refreshDays = 0 } = {}) {
    const params = { limit };
    if (sinceDays) {
      params.startDate = new Date(Date.now() - sinceDays * 86400000)
        .toISOString().slice(0, 10);
    }

    const { activities = [] } = await this._call('/activities', params);
    const seen = new Map();
    DB.getWorkouts().forEach(w => {
      if (w.garminId) seen.set(String(w.garminId), w);
    });

    const refreshBefore = refreshDays === null
      ? -Infinity
      : Date.now() - refreshDays * 86400000;

    const out = { importable: [], duplicates: [], unsupported: [] };

    activities.forEach(a => {
      const row = {
        garminId:  String(a.id),
        name:      a.name,
        type:      a.type,
        startedAt: this._toISO(a.startLocal, a.startGMT),
        durationSec: a.durationSec,
        distanceM:   a.distanceM,
      };

      const existing = seen.get(row.garminId);
      if (existing) {
        const when = new Date(existing.completedAt || existing.startedAt).getTime() || 0;
        if (!(when >= refreshBefore)) { out.duplicates.push(row); return; }
        row.replaceId = existing.id;
      }

      // Strength needs its FIT file to say anything useful, and that is a
      // ~100 KB download each — too much to do for a whole list the user may
      // not import. activeSets is the cheap signal that a file is worth
      // fetching: sessions recorded before set-tracking report 1 or none.
      if (a.type === 'strength_training') {
        if (!(a.totalSets > 1)) { out.unsupported.push(row); return; }
        out.importable.push({
          ...row,
          exerciseName: `${a.totalSets} sets · ${a.totalReps} reps`,
          needsFit: true,
          activity: a,
        });
        return;
      }

      const exerciseId = this.TYPE_MAP[a.type];
      if (!exerciseId) { out.unsupported.push(row); return; }

      const workout = this._toWorkout(a, exerciseId);
      if (!workout) { out.unsupported.push(row); return; }

      out.importable.push({ ...row, exerciseName: workout.exercises[0].exerciseName, workout });
    });

    return out;
  },

  /**
   * Save the workouts chosen from a preview. Strength rows download and decode
   * their FIT here rather than during preview. One failure must not lose the
   * rest of the batch, so failures are collected and reported.
   *
   * A row with `replaceId` is an existing session being re-read from Garmin.
   * It reuses the stored workout's id so DB.saveWorkout overwrites in place,
   * keeping anything that points at it intact. Garmin is the source of truth
   * here, so a corrected exercise name comes back as Garmin now has it.
   *
   * Returns { saved, updated, failed }.
   */
  async importWorkouts(rows) {
    const saved = [], updated = [], failed = [];

    for (const r of rows) {
      try {
        let workout = r.workout;
        if (!workout && r.needsFit) {
          workout = this._toStrengthWorkout(r.activity, await this._fitSets(r.garminId));
        }
        if (!workout) { failed.push({ row: r, error: 'No usable data in the file.' }); continue; }

        if (!r.replaceId) { saved.push(DB.saveWorkout(workout)); continue; }

        // Re-reading a session that has not been touched in Garmin rebuilds an
        // identical workout. Writing it anyway would report an update that did
        // not happen, so compare first and leave the stored copy alone.
        const current = DB.getWorkout(r.replaceId);
        workout.id = r.replaceId;
        if (current && this._sameWorkout(current, workout)) continue;
        updated.push(DB.saveWorkout(workout));
      } catch (err) {
        failed.push({ row: r, error: String(err && err.message || err) });
      }
    }

    if (saved.length || updated.length) this._markSynced();
    return { saved, updated, failed };
  },

  // Only the parts that come from Garmin are compared. Everything else on a
  // workout is either derived or local bookkeeping.
  _sameWorkout(a, b) {
    const shape = w => JSON.stringify({
      name: w.name,
      startedAt: w.startedAt,
      completedAt: w.completedAt,
      exercises: (w.exercises || []).map(ex => ({
        id: ex.exerciseId,
        sets: ex.sets,
      })),
    });
    return shape(a) === shape(b);
  },

  // ── Background sync ────────────────────────────────────────────────────────

  // Garmin rate-limits, and the app checks on every launch and every return to
  // the foreground, so a throttle keeps a day of app-switching down to a
  // handful of calls.
  AUTO_SYNC_MS: 15 * 60 * 1000,

  // How far back a pull-to-refresh re-reads already-imported sessions. Long
  // enough to cover tidying up last week's training, short enough that it is
  // a handful of FIT downloads rather than a history-wide re-import.
  REFRESH_DAYS: 7,

  /**
   * Pull anything new without asking. Runs on launch, on return to the app and
   * on pull-to-refresh.
   *
   * Silent in both directions: it never interrupts with a spinner, and a
   * failure is swallowed rather than surfaced, because a background check that
   * couldn't reach the network is not something the user needs to act on. The
   * manual sync screen is where errors are worth reporting.
   *
   * Returns { saved, updated } when it ran, or null when it was throttled,
   * already running, unconfigured, or failed.
   */
  async autoSync({ force = false } = {}) {
    if (!this.isConfigured() || this._syncing) return null;

    const last = this.config().lastSync;
    const lastMs = last ? new Date(last).getTime() : 0;
    if (!force && lastMs && Date.now() - lastMs < this.AUTO_SYNC_MS) return null;

    // Only ever look back as far as the gap since the last successful check.
    // Without this, a background sync on a device that has never synced would
    // quietly download a FIT file for every strength session in a month.
    const gapDays = lastMs ? Math.ceil((Date.now() - lastMs) / 86400000) + 2 : 14;
    const sinceDays = Math.min(30, Math.max(7, gapDays));

    // Pulling down is a deliberate "go and look again", so it also re-reads
    // recent sessions to catch edits made in Garmin Connect. The unattended
    // checks stay cheap and only look for sessions that are new.
    const refreshDays = force ? this.REFRESH_DAYS : 0;

    this._syncing = true;
    try {
      const { importable } = await this.preview({ sinceDays, limit: 50, refreshDays });
      if (!importable.length) { this._markSynced(); return { saved: 0, updated: 0 }; }
      const { saved, updated } = await this.importWorkouts(importable);
      // importWorkouts only marks a sync when something saved; a clean run
      // that found nothing still counts, or the throttle never engages.
      this._markSynced();
      return { saved: saved.length, updated: updated.length };
    } catch {
      return null;
    } finally {
      this._syncing = false;
    }
  },

  // ── Mapping ────────────────────────────────────────────────────────────────

  /**
   * Garmin reports a local wall-clock time with no zone ('2026-11-02 17:52:00').
   * Parsing it as local and re-serialising matches how the app timestamps its
   * own workouts, so a Garmin session and a manual one sort identically.
   * startGMT is the fallback for the rare activity missing startLocal.
   */
  _toISO(startLocal, startGMT) {
    if (startLocal) {
      const d = new Date(startLocal.replace(' ', 'T'));
      if (!isNaN(d)) return d.toISOString();
    }
    if (startGMT) {
      const d = new Date(startGMT.replace(' ', 'T') + 'Z');
      if (!isNaN(d)) return d.toISOString();
    }
    return new Date().toISOString();
  },

  _round(n, places) {
    if (n === null || n === undefined || isNaN(n)) return null;
    const f = Math.pow(10, places);
    return Math.round(n * f) / f;
  },

  _toWorkout(a, exerciseId) {
    const info = getExercise(exerciseId);
    if (!info || !App._isCardio(info.measureType)) return null;

    const startedAt = this._toISO(a.startLocal, a.startGMT);
    const secs      = a.durationSec || a.movingSec || 0;

    // Fill the same fields the manual cardio logger uses, so an imported
    // session renders and charts exactly like a hand-logged one.
    const set = App._blankSet(1, info.measureType);
    set.completed = true;
    if ('distance' in set) set.distance = this._round((a.distanceM || 0) / 1000, 2);
    if ('duration' in set) set.duration = this._round(secs / 60, 1);
    if ('avgHr'    in set) set.avgHr    = a.avgHr || null;
    if ('maxHr'    in set) set.maxHr    = a.maxHr || null;
    if ('calories' in set) set.calories = a.calories || null;

    return {
      id:           DB.uid(),
      name:         a.name || info.name,
      routineId:    null,
      routineDayId: null,
      startedAt,
      completedAt:  new Date(new Date(startedAt).getTime() + secs * 1000).toISOString(),
      // Lets the UI label the session and keeps re-imports idempotent.
      source:       'garmin',
      garminId:     String(a.id),
      garminType:   a.type,
      exercises: [{
        exerciseId,
        exerciseName: info.name,
        measureType:  info.measureType,
        targetReps:   info.measureType === 'distance' ? '1 leg' : '1 session',
        targetSets:   1,
        restSeconds:  0,
        suggestion:   null,
        sets: [set],
      }],
      notes: '',
    };
  },

  // ── Strength ───────────────────────────────────────────────────────────────

  /**
   * Garmin's exercise_category → a GymTrack exercise.
   *
   * These are approximations on purpose. The watch infers the category from
   * wrist motion and returns three ranked guesses per set, so the category is
   * a hint, not a fact — it routinely labels a 50 kg press a 'sitUp'. The reps
   * and weight it records ARE accurate, so the import keeps those verbatim and
   * marks the exercise as guessed for the user to confirm.
   *
   * Categories with no sensible single equivalent (warmUp, cardio, unknown)
   * are deliberately absent and fall back to _GUESS_FALLBACK.
   */
  CATEGORY_MAP: {
    benchPress:       'bench-press',
    calfRaise:        'calf-raise',
    carry:            'farmers-carry',
    core:             'plank',
    crunch:           'crunches',
    curl:             'db-curl',
    deadlift:         'deadlift',
    flye:             'x-dumbbell-flyes',
    hipRaise:         'hip-thrust',
    hipSwing:         'kb-swing',
    lateralRaise:     'lateral-raise',
    legCurl:          'leg-curl',
    legRaise:         'hanging-leg-raise',
    lunge:            'db-lunges',
    olympicLift:      'power-clean',
    plank:            'plank',
    plyo:             'box-jumps',
    pullUp:           'pullup',
    pushUp:           'pushup',
    row:              'db-row',
    shoulderPress:    'db-shoulder-press',
    shrug:            'x-dumbbell-shrug',
    sitUp:            'x-sit-up',
    squat:            'squat',
    totalBody:        'burpees',
    tricepsExtension: 'tricep-pushdown',
  },

  /**
   * Garmin's exercise_name → a GymTrack exercise.
   *
   * Alongside the coarse category, each set carries a categorySubtype naming
   * the specific movement, which is where a cardio machine logged mid-session
   * identifies itself. The subtype matters because the category alone is
   * actively misleading for these: an indoor rower comes back as category
   * 'row', which would otherwise be filed as a Dumbbell Row.
   *
   * Only entries that beat the category default need listing; everything else
   * falls through to CATEGORY_MAP.
   */
  SUBTYPE_MAP: {
    indoorRow:   'rowing-machine',
    calorieRow:  'rowing-machine',
    meterRow:    'rowing-machine',
    kettlebellSwing: 'kb-swing',
    boxJump:     'box-jumps',
    burpee:      'burpees',
    weightedBurpee: 'burpees',
  },

  // Where Garmin counted reps but couldn't identify the movement at all.
  _GUESS_FALLBACK: 'x-sit-up',

  /**
   * Turn a (category, subtype) pair into Garmin's own exercise name.
   * The subtype is an index into a per-category enum — rowExerciseName[38]
   * is 'indoorRow' — so the category picks the table and the subtype the row.
   */
  _exName(types, category, subtype) {
    if (!category || subtype === null || subtype === undefined) return null;
    const table = types[`${category}ExerciseName`];
    return (table && table[subtype]) || null;
  },

  /** The GymTrack exercise id for one of Garmin's ranked guesses. */
  _guessId(g) {
    return (g.name && this.SUBTYPE_MAP[g.name]) || this.CATEGORY_MAP[g.category] || null;
  },

  /**
   * The FIT SDK is ~300 KB and only strength imports need it, so it is pulled
   * from the CDN on first use rather than shipped in the app bundle.
   */
  async _fitSdk() {
    if (!this._sdk) {
      try {
        this._sdk = await import(
          'https://cdn.jsdelivr.net/npm/@garmin/fitsdk@21.221.0/src/index.js');
      } catch {
        throw new Error('Could not load the Garmin file decoder. Needs a connection the first time.');
      }
    }
    return this._sdk;
  },

  /**
   * Download and decode one activity's FIT.
   * Returns { sets, records }: the completed sets, normalised away from the
   * SDK's shape and with Garmin's ranked guesses resolved to names, plus the
   * raw heart-rate stream so a set can be scored over its own time window.
   */
  async _fitSets(activityId) {
    const c = this.config();
    const url = new URL(c.url + '/fit');
    url.searchParams.set('id', activityId);

    const res = await fetch(url, { headers: { 'X-Sync-Token': c.token } });
    if (!res.ok) throw new Error(`Could not download the Garmin file (HTTP ${res.status}).`);

    const sdk = await this._fitSdk();
    const { messages } = new sdk.Decoder(
      sdk.Stream.fromArrayBuffer(await res.arrayBuffer())).read();
    const types = sdk.Profile.types;

    // Every set carries the session's start time as its `timestamp`, so
    // messageIndex is the only reliable ordering.
    const sets = (messages.setMesgs || [])
      .filter(s => s.setType === 'active' && s.repetitions > 0)
      .sort((a, b) => (a.messageIndex || 0) - (b.messageIndex || 0))
      .map(s => ({
        reps:        s.repetitions,
        weight:      s.weight > 0 ? this._round(s.weight, 1) : null,
        durationSec: s.duration || 0,
        startMs:     +new Date(s.startTime) || null,
        // Three ranked guesses from wrist motion, best first.
        guesses: (s.category || []).map((category, i) => ({
          category,
          name: this._exName(types, category, (s.categorySubtype || [])[i]),
        })).filter(g => g.category && g.category !== 'unknown'),
      }));

    const records = (messages.recordMesgs || [])
      .map(r => ({ t: +new Date(r.timestamp), hr: r.heartRate }))
      .filter(r => r.t && r.hr > 0);

    return { sets, records };
  },

  /** Average and peak heart rate over one set's slice of the HR stream. */
  _hrWindow(records, startMs, durationSec) {
    if (!startMs || !durationSec) return { avgHr: null, maxHr: null };
    const end = startMs + durationSec * 1000;
    const hrs = records.filter(r => r.t >= startMs && r.t <= end).map(r => r.hr);
    if (!hrs.length) return { avgHr: null, maxHr: null };
    return {
      avgHr: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      maxHr: Math.max(...hrs),
    };
  },

  /**
   * Build a workout from decoded sets, merging runs of the same guessed
   * exercise into one block so the log reads like a normal session rather
   * than 31 separate one-set exercises.
   */
  _toStrengthWorkout(a, { sets: fitSets, records }) {
    const startedAt = this._toISO(a.startLocal, a.startGMT);
    const exercises = [];

    fitSets.forEach(s => {
      const id   = (s.guesses.map(g => this._guessId(g)).find(Boolean))
                   || this._GUESS_FALLBACK;
      const info = getExercise(id);
      if (!info) return;

      const cardio = App._isCardio(info.measureType);

      let block = exercises[exercises.length - 1];
      if (!block || block.exerciseId !== id) {
        block = {
          exerciseId:   id,
          exerciseName: info.name,
          measureType:  info.measureType || null,
          targetReps:   cardio ? '1 session' : '—',
          targetSets:   0,
          restSeconds:  cardio ? 0 : 90,
          suggestion:   null,
          // Drives the "needs review" affordance and offers Garmin's other
          // two candidates as one-tap corrections.
          guessed:        true,
          garminGuesses:  s.guesses.map(g => g.name || g.category),
          sets: [],
        };
        exercises.push(block);
      }

      if (cardio) {
        // On a machine Garmin counts strokes or steps, not reps, and it has no
        // sensor for distance — so the honest record of the effort is the time
        // spent and the heart rate over that window. Anything it can't measure
        // stays blank rather than being logged as a zero.
        const set = App._blankSet(block.sets.length + 1, info.measureType);
        const hr  = this._hrWindow(records, s.startMs, s.durationSec);
        set.completed = true;
        if ('duration' in set) set.duration = this._round(s.durationSec / 60, 1);
        if ('avgHr'    in set) set.avgHr    = hr.avgHr;
        if ('maxHr'    in set) set.maxHr    = hr.maxHr;
        block.sets.push(set);
      } else {
        block.sets.push({
          setNumber: block.sets.length + 1,
          weight:    s.weight,
          reps:      s.reps,
          completed: true,
          type:      'normal',
        });
      }
      block.targetSets = block.sets.length;
    });

    if (!exercises.length) return null;

    const secs = a.durationSec || a.movingSec || 0;
    return {
      id:           DB.uid(),
      name:         a.name || 'Strength',
      routineId:    null,
      routineDayId: null,
      startedAt,
      completedAt:  new Date(new Date(startedAt).getTime() + secs * 1000).toISOString(),
      source:       'garmin',
      garminId:     String(a.id),
      garminType:   a.type,
      // Exercise names are Garmin's guesses; the UI surfaces this until the
      // user confirms them.
      needsReview:  true,
      exercises,
      notes: '',
    };
  },
};
