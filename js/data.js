// ─── Data Layer (localStorage) ────────────────────────────────────────────────

const DB = {
  K: {
    PROFILE:        'gt_profile',
    ROUTINES:       'gt_routines',
    WORKOUTS:       'gt_workouts',
    BODY_METRICS:   'gt_body_metrics',
    ACTIVE_WORKOUT: 'gt_active_workout',
    SETTINGS:       'gt_settings',
  },

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  getProfile()         { return this._get(this.K.PROFILE); },
  saveProfile(p)       { this._set(this.K.PROFILE, p); return p; },

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings() {
    return this._get(this.K.SETTINGS) || { weightUnit: 'kg', restAlerts: true };
  },
  saveSettings(s) { this._set(this.K.SETTINGS, s); return s; },

  // ── Routines ───────────────────────────────────────────────────────────────
  getRoutines()     { return this._get(this.K.ROUTINES) || []; },
  getRoutine(id)    { return this.getRoutines().find(r => r.id === id) || null; },
  saveRoutine(r) {
    const list = this.getRoutines();
    const idx = list.findIndex(x => x.id === r.id);
    if (idx >= 0) list[idx] = r; else list.push(r);
    this._set(this.K.ROUTINES, list);
    return r;
  },
  deleteRoutine(id) {
    this._set(this.K.ROUTINES, this.getRoutines().filter(r => r.id !== id));
  },

  // ── Workouts ───────────────────────────────────────────────────────────────
  getWorkouts()        { return this._get(this.K.WORKOUTS) || []; },
  getWorkout(id)       { return this.getWorkouts().find(w => w.id === id) || null; },
  getRecentWorkouts(n) { return this.getWorkouts().slice(0, n || 10); },
  saveWorkout(w) {
    const list = this.getWorkouts();
    const idx  = list.findIndex(x => x.id === w.id);
    if (idx >= 0) list[idx] = w; else list.unshift(w);
    this._set(this.K.WORKOUTS, list);
    return w;
  },
  deleteWorkout(id) {
    this._set(this.K.WORKOUTS, this.getWorkouts().filter(w => w.id !== id));
  },

  getWorkoutsThisWeek() {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return this.getWorkouts().filter(w => new Date(w.startedAt) >= start);
  },

  getWorkoutsLastNDays(days) {
    const start = new Date(Date.now() - days * 86400000);
    return this.getWorkouts().filter(w => new Date(w.startedAt) >= start);
  },

  getLastWorkoutForExercise(exerciseId) {
    return this.getWorkouts().find(w =>
      w.exercises && w.exercises.some(e => e.exerciseId === exerciseId)
    ) || null;
  },

  getLastWorkoutForRoutineDay(routineId, dayId) {
    return this.getWorkouts().find(w =>
      w.routineId === routineId && w.routineDayId === dayId
    ) || null;
  },

  // workout calendar: { 'YYYY-MM-DD': count }
  getWorkoutCalendar(year, month) {
    const map = {};
    this.getWorkouts().forEach(w => {
      const d = new Date(w.startedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.toISOString().slice(0, 10);
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  },

  // ── Active workout (crash recovery) ───────────────────────────────────────
  getActiveWorkout()     { return this._get(this.K.ACTIVE_WORKOUT); },
  saveActiveWorkout(w)   {
    if (w) this._set(this.K.ACTIVE_WORKOUT, w);
    else localStorage.removeItem(this.K.ACTIVE_WORKOUT);
  },

  // ── Body Metrics ───────────────────────────────────────────────────────────
  _dateStr(d) {
    // Normalize Firestore Timestamps, Date objects, or strings → 'YYYY-MM-DD'
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    if (typeof d.toDate === 'function') return d.toDate().toISOString().slice(0, 10);
    if (typeof d.seconds === 'number') return new Date(d.seconds * 1000).toISOString().slice(0, 10);
    return new Date(d).toISOString().slice(0, 10) || '';
  },
  _metricSort(list) {
    return list.sort((a, b) => {
      const da = this._dateStr(a.date);
      const db = this._dateStr(b.date);
      return db > da ? 1 : db < da ? -1 : 0;
    });
  },
  getBodyMetrics() {
    const list = this._get(this.K.BODY_METRICS) || [];
    return this._metricSort(list);
  },
  getLatestBodyMetric()  { return this.getBodyMetrics()[0] || null; },
  saveBodyMetric(m) {
    // Normalize date field before saving
    if (m.date) m = { ...m, date: this._dateStr(m.date) };
    const list = this._get(this.K.BODY_METRICS) || [];
    const idx  = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = m; else list.push(m);
    this._metricSort(list);
    this._set(this.K.BODY_METRICS, list);
    return m;
  },
  deleteBodyMetric(id) {
    this._set(this.K.BODY_METRICS, this.getBodyMetrics().filter(m => m.id !== id));
  },
  getBodyMetricsLastNDays(days) {
    const start = new Date(Date.now() - days * 86400000);
    return this.getBodyMetrics().filter(m => new Date(m.date) >= start);
  },

  // ── Stats helpers ──────────────────────────────────────────────────────────
  calcTotalVolume(workouts) {
    return workouts.reduce((total, w) => {
      return total + (w.exercises || []).reduce((wt, ex) => {
        return wt + (ex.sets || []).reduce((et, s) => {
          return et + (s.completed && s.weight && s.reps ? s.weight * s.reps : 0);
        }, 0);
      }, 0);
    }, 0);
  },

  calcWeeklyVolumeByDay() {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const result = days.map(d => ({ label: d, volume: 0 }));
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    this.getWorkouts()
      .filter(w => new Date(w.startedAt) >= start)
      .forEach(w => {
        const dayIdx = new Date(w.startedAt).getDay();
        result[dayIdx].volume += this.calcTotalVolume([w]);
      });
    return result;
  },

  // ── Progression ────────────────────────────────────────────────────────────
  getProgressionSuggestion(exerciseId, routineId, dayId) {
    // Try last workout for this specific routine day first
    let lastWorkout = routineId && dayId
      ? this.getLastWorkoutForRoutineDay(routineId, dayId)
      : null;
    // Fallback: last workout that has this exercise
    if (!lastWorkout) lastWorkout = this.getLastWorkoutForExercise(exerciseId);
    if (!lastWorkout) return null;

    const lastEx = lastWorkout.exercises.find(e => e.exerciseId === exerciseId);
    if (!lastEx || !lastEx.sets || !lastEx.sets.length) return null;

    const completed = lastEx.sets.filter(s => s.completed);
    if (!completed.length) return null;

    const lastWeight  = completed[completed.length - 1].weight || 0;
    const allDone     = completed.length === lastEx.sets.length;
    const avgReps     = Math.round(completed.reduce((s, x) => s + (x.reps || 0), 0) / completed.length);

    if (allDone) {
      const increment = lastWeight >= 80 ? 2.5 : 1.25;
      return {
        weight:  lastWeight + increment,
        reps:    avgReps,
        action:  'increase',
        message: `+${increment}kg — you nailed it last time!`
      };
    }
    return {
      weight:  lastWeight,
      reps:    avgReps,
      action:  completed.length === lastEx.sets.length ? 'same' : 'retry',
      message: completed.length < lastEx.sets.length
        ? `Keep at ${lastWeight}kg — missed sets last time`
        : `Same as last session`
    };
  },

  // ── Progress queries ───────────────────────────────────────────────────────
  // All of these are derived on read. Nothing new is persisted, so they stay
  // correct when a workout is edited or deleted after the fact.

  // Only weight×reps work has a meaningful 1RM or "heaviest set". Cardio and
  // class sessions are tracked on distance/duration instead.
  _isLiftingSet(s) {
    return s && s.completed && s.weight > 0 && s.reps > 0;
  },

  _est1RM(weight, reps) {
    // Epley, same formula the recommendation engine prescribes from, so the
    // two never disagree about what a given set is worth.
    return weight * (1 + reps / 30);
  },

  // One entry per session that contains the exercise, oldest first.
  getExerciseHistory(exerciseId, sinceDays) {
    const cutoff = sinceDays ? Date.now() - sinceDays * 86400000 : null;
    const out = [];
    this.getWorkouts().forEach(w => {
      const when = new Date(w.completedAt || w.startedAt).getTime();
      if (cutoff && when < cutoff) return;
      (w.exercises || []).forEach(ex => {
        if (ex.exerciseId !== exerciseId) return;
        const sets = (ex.sets || []).filter(s => this._isLiftingSet(s));
        if (!sets.length) return;
        let topWeight = 0, best1RM = 0, volume = 0, topReps = 0;
        sets.forEach(s => {
          volume += s.weight * s.reps;
          if (s.weight > topWeight) { topWeight = s.weight; topReps = s.reps; }
          const e = this._est1RM(s.weight, s.reps);
          if (e > best1RM) best1RM = e;
        });
        out.push({
          workoutId: w.id,
          date: when,
          topWeight,
          topReps,
          est1RM: Math.round(best1RM * 10) / 10,
          volume,
          sets: sets.length
        });
      });
    });
    return out.sort((a, b) => a.date - b.date);
  },

  // Exercises worth charting: at least two sessions of real load.
  getTrackedExercises() {
    const counts = {};
    this.getWorkouts().forEach(w => {
      const seen = new Set();
      (w.exercises || []).forEach(ex => {
        if (seen.has(ex.exerciseId)) return;
        if (!(ex.sets || []).some(s => this._isLiftingSet(s))) return;
        seen.add(ex.exerciseId);
        counts[ex.exerciseId] = counts[ex.exerciseId] || { id: ex.exerciseId, name: ex.exerciseName, sessions: 0 };
        counts[ex.exerciseId].sessions++;
      });
    });
    return Object.values(counts)
      .filter(e => e.sessions >= 2)
      .sort((a, b) => b.sessions - a.sessions);
  },

  // Best-ever heaviest set, estimated 1RM and single-session volume.
  getPR(exerciseId) {
    const hist = this.getExerciseHistory(exerciseId);
    if (!hist.length) return null;
    const by = (key) => hist.reduce((best, h) => (h[key] > best[key] ? h : best), hist[0]);
    return {
      topWeight: by('topWeight'),
      est1RM:    by('est1RM'),
      volume:    by('volume'),
      sessions:  hist.length
    };
  },

  // PRs set *by* a given workout, judged against everything logged before it.
  // Used to badge the finish screen.
  detectPRs(workout) {
    if (!workout || !workout.exercises) return [];
    const when = new Date(workout.completedAt || workout.startedAt).getTime();
    const out = [];
    workout.exercises.forEach(ex => {
      const sets = (ex.sets || []).filter(s => this._isLiftingSet(s));
      if (!sets.length) return;
      const topWeight = Math.max(...sets.map(s => s.weight));
      const best1RM   = Math.max(...sets.map(s => this._est1RM(s.weight, s.reps)));
      const prior = this.getExerciseHistory(ex.exerciseId)
        .filter(h => h.date < when && h.workoutId !== workout.id);
      if (!prior.length) return;  // first ever session is not a "record"
      const prevTop = Math.max(...prior.map(h => h.topWeight));
      const prev1RM = Math.max(...prior.map(h => h.est1RM));
      if (topWeight > prevTop) {
        out.push({ exerciseId: ex.exerciseId, name: ex.exerciseName, kind: 'weight',
                   value: topWeight, previous: prevTop });
      } else if (best1RM > prev1RM + 0.05) {
        out.push({ exerciseId: ex.exerciseId, name: ex.exerciseName, kind: 'e1rm',
                   value: Math.round(best1RM * 10) / 10, previous: prev1RM });
      }
    });
    return out;
  },

  // Sets per muscle for the last `weeks` whole weeks, for comparison against
  // the ~10-sets-per-muscle-per-week benchmark used by the plan builder.
  getWeeklySetsByMuscle(weeks = 1) {
    const cutoff = Date.now() - weeks * 7 * 86400000;
    const totals = {};
    this.getWorkouts().forEach(w => {
      if (new Date(w.completedAt || w.startedAt).getTime() < cutoff) return;
      (w.exercises || []).forEach(ex => {
        const n = (ex.sets || []).filter(s => this._isLiftingSet(s)).length;
        if (!n) return;
        const info = typeof getExercise === 'function' ? getExercise(ex.exerciseId) : null;
        const muscles = (info && info.muscles && info.muscles.length) ? info.muscles : ['Other'];
        // A set trains every muscle the exercise lists, so it counts once per
        // muscle rather than being divided between them.
        muscles.forEach(m => { totals[m] = (totals[m] || 0) + n; });
      });
    });
    return Object.entries(totals)
      .map(([muscle, sets]) => ({ muscle, sets: sets / weeks }))
      .sort((a, b) => b.sets - a.sets);
  },

  // How much load has gone onto each exercise in a routine since you started
  // running it: first logged top set vs the most recent one.
  getRoutineProgress(routineId) {
    const sessions = this.getWorkouts().filter(w => w.routineId === routineId);
    if (!sessions.length) return null;
    const ids = new Set();
    sessions.forEach(w => (w.exercises || []).forEach(ex => ids.add(ex.exerciseId)));

    const rows = [];
    ids.forEach(id => {
      const hist = this.getExerciseHistory(id).filter(h =>
        sessions.some(s => s.id === h.workoutId));
      if (hist.length < 2) return;
      const first = hist[0], last = hist[hist.length - 1];
      rows.push({
        exerciseId: id,
        name: (sessions.flatMap(s => s.exercises).find(e => e.exerciseId === id) || {}).exerciseName || id,
        first: first.topWeight,
        last:  last.topWeight,
        delta: Math.round((last.topWeight - first.topWeight) * 10) / 10,
        pct:   first.topWeight ? Math.round(((last.topWeight - first.topWeight) / first.topWeight) * 100) : 0,
        sessions: hist.length
      });
    });
    rows.sort((a, b) => b.delta - a.delta);
    return {
      sessions: sessions.length,
      since: new Date(sessions[sessions.length - 1].startedAt).getTime(),
      rows,
      totalDelta: Math.round(rows.reduce((s, r) => s + r.delta, 0) * 10) / 10
    };
  },

  // ── Streak ─────────────────────────────────────────────────────────────────
  getCurrentStreak() {
    const workouts = this.getWorkouts();
    if (!workouts.length) return 0;
    const days = new Set(workouts.map(w => w.startedAt.slice(0, 10)));
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  // ── Utilities ──────────────────────────────────────────────────────────────
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  clearAll() {
    Object.values(this.K).forEach(k => localStorage.removeItem(k));
  }
};
