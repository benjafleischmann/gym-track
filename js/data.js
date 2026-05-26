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
  getBodyMetrics() {
    const list = this._get(this.K.BODY_METRICS) || [];
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  getLatestBodyMetric()  { return this.getBodyMetrics()[0] || null; },
  saveBodyMetric(m) {
    const list = this._get(this.K.BODY_METRICS) || [];
    const idx  = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = m; else list.push(m);
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
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
