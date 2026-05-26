// ─── GymTrack App ─────────────────────────────────────────────────────────────

const App = {
  state: {
    screen: 'dashboard',
    params: {},
    activeWorkout: null,
    pastWorkoutDraft: null,
    restTimer: null,
    workoutTimer: null,
    charts: {},
    activeTab: {},        // screen → active tab index
    exercisePickerCb: null,
    confirmCb: null,
  },

  // ── Boot ───────────────────────────────────────────────────────────────────
  init() {
    // Recover crash-persisted active workout
    const saved = DB.getActiveWorkout();
    if (saved) this.state.activeWorkout = saved;

    const profile = DB.getProfile();
    if (!profile) {
      this.showOnboarding();
    } else {
      document.getElementById('bottom-nav').classList.remove('hidden');
      // If there's an active workout in progress, go straight there
      if (this.state.activeWorkout) {
        this.navigate('active-workout');
      } else {
        this.navigate('dashboard');
      }
    }

    this._bindNav();
    this._bindGlobal();

    // Init Firebase in background — non-blocking
    Firebase.init().then(() => {
      if (window._pendingFriendInvite) {
        this._handleFriendInvite(window._pendingFriendInvite);
        window._pendingFriendInvite = null;
      }
    }).catch(() => {});

    // React to auth state changes (sign-in / sign-out)
    Firebase.onAuthChange(uid => {
      if (uid) {
        Firebase.restoreFromCloud().then(count => {
          if (count > 0) App._toast(`Synced ${count} items from cloud`, 'success');
        }).catch(() => {});
      }
      // Refresh profile screen if visible
      if (App.state.screen === 'profile') App.navigate('profile');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  _bindNav() {
    document.getElementById('bottom-nav').addEventListener('click', e => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const screen = btn.dataset.screen;
      if (screen) this.navigate(screen);
    });
  },

  _bindGlobal() {
    const app = document.getElementById('app');
    app.addEventListener('click',   e => this._handleClick(e));
    app.addEventListener('input',   e => this._handleInput(e));
    app.addEventListener('change',  e => this._handleChange(e));

    const modal = document.getElementById('modal-root');
    modal.addEventListener('click',  e => this._handleModalClick(e));
    modal.addEventListener('input',  e => this._handleModalInput(e));
    modal.addEventListener('change', e => this._handleModalChange(e));
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  navigate(screen, params = {}) {
    // Stop workout timer visual if leaving active workout
    if (this.state.screen === 'active-workout' && screen !== 'active-workout') {
      // Timer keeps running in background
    }
    this.state.screen = screen;
    this.state.params = params;
    this._destroyCharts();
    this._render();
    this._updateNav(screen);
  },

  _updateNav(screen) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screen ||
        (screen === 'active-workout' && btn.dataset.screen === 'workout'));
    });
  },

  _render() {
    const app = document.getElementById('app');
    const { screen, params } = this.state;
    switch (screen) {
      case 'dashboard':       app.innerHTML = this.screens.dashboard();       break;
      case 'workout':         app.innerHTML = this.screens.workoutPicker();   break;
      case 'active-workout':  app.innerHTML = this.screens.activeWorkout();   break;
      case 'workout-complete':app.innerHTML = this.screens.workoutComplete(params.workout); break;
      case 'routines':        app.innerHTML = this.screens.routines();        break;
      case 'routine-detail':  app.innerHTML = this.screens.routineDetail(params.routineId); break;
      case 'create-routine':  app.innerHTML = this.screens.createRoutine(params.routineId); break;
      case 'history':         app.innerHTML = this.screens.history();         break;
      case 'workout-detail':  app.innerHTML = this.screens.workoutDetail(params.workoutId); break;
      case 'profile':         app.innerHTML = this.screens.profile();         break;
      case 'log-metric':      app.innerHTML = this.screens.logMetric();       break;
      case 'log-past-workout': app.innerHTML = this.screens.logPastWorkout(); break;
      default:                app.innerHTML = this.screens.dashboard();
    }
    this._afterRender();
  },

  _afterRender() {
    const s = this.state.screen;
    if (s === 'dashboard')       { this._initCharts(['weekly-volume','body-weight-mini']); }
    if (s === 'active-workout')  { this._startWorkoutTimer(); }
    if (s === 'profile')         { this._initCharts(['body-weight-chart','body-fat-chart']); this._loadFriendsSection(); }
    if (s === 'history')         { this._renderCalendar(); }
  },

  _destroyCharts() {
    Object.values(this.state.charts).forEach(c => { try { c.destroy(); } catch {} });
    this.state.charts = {};
  },

  // ── Screens ────────────────────────────────────────────────────────────────
  screens: {

    // ── Dashboard ────────────────────────────────────────────────────────────
    dashboard() {
      const profile   = DB.getProfile() || {};
      const weekWkts  = DB.getWorkoutsThisWeek();
      const totalVol  = DB.calcTotalVolume(weekWkts);
      const streak    = DB.getCurrentStreak();
      const recent    = DB.getRecentWorkouts(3);
      const latest    = DB.getLatestBodyMetric();
      const hour      = new Date().getHours();
      const greet     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const name      = profile.name ? profile.name.split(' ')[0] : 'Athlete';
      const initial   = name[0].toUpperCase();

      return `
      <div class="screen">
        <div class="screen-header">
          <div class="greeting">
            <h2>${greet}, ${name}</h2>
            <p>${App._fmtDate(new Date())}</p>
          </div>
          <div class="avatar" data-action="open-profile">${initial}</div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="val">${weekWkts.length}</div>
            <div class="lbl">This week</div>
          </div>
          <div class="stat-card highlight">
            <div class="val">${App._fmtVol(totalVol)}</div>
            <div class="lbl">Volume (kg)</div>
          </div>
          <div class="stat-card">
            <div class="val">${streak}</div>
            <div class="lbl">Day streak</div>
          </div>
        </div>

        <div class="chart-wrap">
          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">Weekly Volume</span>
              <span class="chart-card-value">${App._fmtVol(totalVol)} kg</span>
            </div>
            <canvas id="weekly-volume" height="100"></canvas>
          </div>
        </div>

        ${latest ? `
        <div style="padding:.75rem 1rem 0">
          <div class="chart-card" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer"
               data-action="nav" data-screen="profile">
            <div>
              <div class="chart-card-title" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:var(--txt2)">Body Weight</div>
              <div style="font-size:1.4rem;font-weight:800;margin-top:.1rem">${latest.weight} kg</div>
              ${latest.bodyFat ? `<div style="font-size:.78rem;color:var(--txt2)">${latest.bodyFat}% body fat</div>` : ''}
            </div>
            <canvas id="body-weight-mini" width="120" height="60"></canvas>
          </div>
        </div>` : ''}

        <div class="section-header">
          <h2>Recent Workouts</h2>
          <button data-action="nav" data-screen="history">See all</button>
        </div>

        ${recent.length ? recent.map(w => App._workoutCard(w)).join('') : `
          <div class="empty-state" style="padding:1.5rem 2rem">
            <div class="empty-state-icon">🏋️</div>
            <div class="empty-state-title">No workouts yet</div>
            <div class="empty-state-text">Start your first workout below.</div>
          </div>`}

        <div style="padding:.75rem 1rem 0">
          <button class="btn btn-primary" data-action="nav" data-screen="workout">
            ${App._icon('play')} Start Workout
          </button>
        </div>
      </div>`;
    },

    // ── Workout Picker ────────────────────────────────────────────────────────
    workoutPicker() {
      const myRoutines = DB.getRoutines();
      const tab = App.state.activeTab['workout'] || 0;

      const templateCards = ROUTINE_TEMPLATES.map(t => App._routineCard(t, 'template')).join('');
      const myCards = myRoutines.length
        ? myRoutines.map(r => App._routineCard(r, 'mine')).join('')
        : `<div class="empty-state"><div class="empty-state-icon">📋</div>
             <div class="empty-state-title">No custom routines</div>
             <div class="empty-state-text">Create one in the Routines tab.</div></div>`;

      return `
      <div class="screen">
        <div class="screen-header">
          <h1>Start Workout</h1>
          <button class="btn btn-sm btn-ghost" data-action="start-empty">Empty</button>
        </div>

        <div class="tab-bar">
          <button class="tab-btn ${tab===0?'active':''}" data-action="set-tab" data-screen="workout" data-tab="0">Templates</button>
          <button class="tab-btn ${tab===1?'active':''}" data-action="set-tab" data-screen="workout" data-tab="1">My Routines</button>
        </div>

        <div style="padding:.75rem 1rem 0">
          ${tab === 0 ? templateCards : myCards}
        </div>
      </div>`;
    },

    // ── Active Workout ────────────────────────────────────────────────────────
    activeWorkout() {
      const w = App.state.activeWorkout;
      if (!w) return App.screens.workoutPicker();

      const setsTotal     = w.exercises.reduce((s, e) => s + e.sets.length, 0);
      const setsDone      = w.exercises.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);
      const pct           = setsTotal ? Math.round(setsDone / setsTotal * 100) : 0;

      return `
      <div class="screen">
        <div class="workout-header">
          <div>
            <div class="workout-timer" id="workout-timer">00:00</div>
            <div class="workout-name-small">${w.name}</div>
          </div>
          <div style="flex:1;padding:0 .75rem">
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <div style="font-size:.7rem;color:var(--txt3);margin-top:.2rem">${setsDone}/${setsTotal} sets</div>
          </div>
          <button class="btn btn-sm btn-ghost" data-action="finish-workout">Finish</button>
        </div>

        ${w.exercises.map((ex, ei) => App._exerciseBlock(ex, ei)).join('')}

        <div style="padding:1rem">
          <button class="btn btn-secondary" style="width:100%" data-action="add-exercise">
            ${App._icon('plus')} Add Exercise
          </button>
        </div>

        <div style="padding:0 1rem 1rem">
          <label class="form-label">Notes</label>
          <textarea class="notes-input" id="workout-notes" placeholder="How did it go?">${w.notes||''}</textarea>
        </div>
      </div>

      <div id="rest-timer-banner" class="hidden">
        <div>
          <div class="rest-timer-label">Rest timer</div>
          <div class="rest-timer-time" id="rest-timer-display">2:00</div>
        </div>
        <div style="flex:1"></div>
        <button class="rest-timer-skip btn btn-sm btn-ghost" data-action="skip-rest">Skip</button>
      </div>`;
    },

    // ── Workout Complete ──────────────────────────────────────────────────────
    workoutComplete(w) {
      if (!w) return App.screens.dashboard();
      const duration = App._fmtDuration(
        (new Date(w.completedAt) - new Date(w.startedAt)) / 1000
      );
      const totalVol  = DB.calcTotalVolume([w]);
      const setsDone  = w.exercises.reduce((s, e) => s + e.sets.filter(x => x.completed).length, 0);

      return `
      <div class="screen">
        <div class="complete-header">
          <div class="complete-icon">${App._icon('check', 36)}</div>
          <div class="complete-title">Workout Complete!</div>
          <div class="complete-subtitle">${w.name}</div>
        </div>

        <div class="stat-grid" style="padding:.5rem 1rem">
          <div class="stat-card">
            <div class="val">${duration}</div>
            <div class="lbl">Duration</div>
          </div>
          <div class="stat-card highlight">
            <div class="val">${App._fmtVol(totalVol)}</div>
            <div class="lbl">Volume kg</div>
          </div>
          <div class="stat-card">
            <div class="val">${setsDone}</div>
            <div class="lbl">Sets done</div>
          </div>
        </div>

        <div class="section-header"><h2>Exercise Summary</h2></div>
        ${w.exercises.map(ex => {
          const doneSets = ex.sets.filter(s => s.completed);
          const maxW = doneSets.reduce((m, s) => Math.max(m, s.weight || 0), 0);
          return `
          <div class="list-item" style="cursor:default">
            <div class="list-item-left">
              <div class="list-item-icon">${App._exIcon(ex.exerciseId)}</div>
              <div>
                <div class="list-item-name">${ex.exerciseName}</div>
                <div class="list-item-sub">${doneSets.length} sets${maxW ? ` · ${maxW}kg max` : ''}</div>
              </div>
            </div>
          </div>`;
        }).join('')}

        ${w.notes ? `<div style="padding:.75rem 1rem">
          <div class="form-label">Notes</div>
          <div style="font-size:.9rem;color:var(--txt2);line-height:1.5">${w.notes}</div>
        </div>` : ''}

        <div style="padding:1rem">
          <button class="btn btn-primary" data-action="nav" data-screen="dashboard">Back to Dashboard</button>
        </div>
      </div>`;
    },

    // ── Routines ──────────────────────────────────────────────────────────────
    routines() {
      const myRoutines = DB.getRoutines();
      const tab = App.state.activeTab['routines'] || 0;

      return `
      <div class="screen">
        <div class="screen-header">
          <h1>Routines</h1>
          <button class="btn btn-sm btn-ghost" data-action="create-routine">+ New</button>
        </div>

        <div class="tab-bar">
          <button class="tab-btn ${tab===0?'active':''}" data-action="set-tab" data-screen="routines" data-tab="0">Templates</button>
          <button class="tab-btn ${tab===1?'active':''}" data-action="set-tab" data-screen="routines" data-tab="1">My Routines</button>
        </div>

        <div style="padding:.75rem 1rem 0">
          ${tab === 0
            ? ROUTINE_TEMPLATES.map(t => App._routineCard(t, 'template')).join('')
            : myRoutines.length
              ? myRoutines.map(r => App._routineCard(r, 'mine')).join('')
              : `<div class="empty-state">
                  <div class="empty-state-icon">📋</div>
                  <div class="empty-state-title">No custom routines yet</div>
                  <div class="empty-state-text">Tap "+ New" to build your own routine.</div>
                  <button class="btn btn-primary" style="margin-top:.5rem;width:auto;padding:.7rem 2rem" data-action="create-routine">Create Routine</button>
                </div>`
          }
        </div>
      </div>`;
    },

    // ── Routine Detail ────────────────────────────────────────────────────────
    routineDetail(routineId) {
      const r = routineId.startsWith('tpl-')
        ? ROUTINE_TEMPLATES.find(t => t.id === routineId)
        : DB.getRoutine(routineId);
      if (!r) return App.screens.routines();

      const isTemplate = routineId.startsWith('tpl-');
      const tab = App.state.activeTab['routine-detail'] || 0;
      const day = r.days[tab] || r.days[0];

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${r.name}</span>
          <div style="display:flex;gap:.4rem">
            ${isTemplate
              ? `<button class="btn btn-sm btn-ghost" data-action="save-template" data-id="${r.id}">Save</button>`
              : `<button class="btn btn-sm btn-danger" data-action="delete-routine" data-id="${r.id}">Delete</button>`}
          </div>
        </div>

        <div style="padding:.5rem 1rem">
          <div class="badge badge-${r.type}" style="margin-bottom:.5rem">${r.type}</div>
          ${r.description ? `<p style="font-size:.85rem;color:var(--txt2);line-height:1.5">${r.description}</p>` : ''}
          <div style="display:flex;gap:.75rem;margin-top:.5rem;font-size:.8rem;color:var(--txt2)">
            <span>${r.days.length} day${r.days.length>1?'s':''}/week</span>
            <span>·</span>
            <span>Goal: ${App._fmtGoal(r.goal)}</span>
          </div>
        </div>

        <div class="tab-bar" style="padding:0 .5rem">
          ${r.days.map((d, i) => `
            <button class="tab-btn ${i===tab?'active':''}" data-action="set-tab" data-screen="routine-detail" data-tab="${i}">${d.name}</button>
          `).join('')}
        </div>

        ${day ? `
        <div style="padding:.75rem 1rem 0">
          ${day.exercises.map(ex => {
            const info = getExercise(ex.exerciseId);
            return `
            <div class="list-item" style="cursor:default;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:.4rem;background:var(--bg2)">
              <div class="list-item-left">
                <div class="list-item-icon">${App._exIcon(ex.exerciseId)}</div>
                <div>
                  <div class="list-item-name">${info ? info.name : ex.exerciseId}</div>
                  <div class="list-item-sub">${ex.sets} × ${ex.reps}${ex.rest ? ` · ${ex.rest}s rest` : ''}</div>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <div style="padding:1rem">
          <button class="btn btn-primary" data-action="start-routine" data-id="${r.id}" data-day="${tab}">
            ${App._icon('play')} Start Day ${tab + 1}
          </button>
        </div>
      </div>`;
    },

    // ── Create / Edit Routine ─────────────────────────────────────────────────
    createRoutine(editId) {
      const existing = editId ? DB.getRoutine(editId) : null;
      const r = existing || { name: '', type: 'strength', goal: 'muscle', days: [{ id: DB.uid(), name: 'Day 1', exercises: [] }] };

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${existing ? 'Edit Routine' : 'New Routine'}</span>
          <button class="btn btn-sm btn-ghost" data-action="save-routine" data-id="${editId||''}">Save</button>
        </div>

        <div class="form-group">
          <label class="form-label">Routine Name</label>
          <input class="form-input" id="routine-name" placeholder="e.g. My Push Day" value="${r.name}">
        </div>

        <div class="form-group">
          <label class="form-label">Type</label>
          <div class="chip-select" id="routine-type-chips">
            ${['strength','hyrox','crossfit','cardio','hiit','custom'].map(t => `
              <div class="chip ${r.type===t?'selected':''}" data-action="select-chip" data-group="routine-type" data-val="${t}">${App._capitalize(t)}</div>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Goal</label>
          <div class="chip-select" id="routine-goal-chips">
            ${[['muscle','Build Muscle'],['fat_loss','Lose Fat'],['bulking','Bulk'],['endurance','Endurance'],['strength','Get Stronger']].map(([v,l]) => `
              <div class="chip ${r.goal===v?'selected':''}" data-action="select-chip" data-group="routine-goal" data-val="${v}">${l}</div>
            `).join('')}
          </div>
        </div>

        <div class="section-header">
          <h2>Days</h2>
          <button data-action="add-routine-day" style="color:var(--accent);font-weight:700;font-size:.85rem">+ Day</button>
        </div>

        <div id="routine-days">
          ${r.days.map((d, i) => `
          <div class="card" style="margin:.4rem 1rem" data-day-index="${i}">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
              <input class="form-input" style="flex:1" placeholder="Day name" value="${d.name}" data-action="edit-day-name" data-day="${i}">
            </div>
            <div id="day-exercises-${i}">
              ${(d.exercises || []).map((ex, ei) => {
                const info = getExercise(ex.exerciseId);
                return `
                <div class="list-item" style="padding:.5rem 0;border-bottom:1px solid var(--border)">
                  <span style="font-size:.85rem">${info?info.name:ex.exerciseId}</span>
                  <span style="font-size:.8rem;color:var(--txt2)">${ex.sets}×${ex.reps}</span>
                </div>`;
              }).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:.5rem"
              data-action="add-exercise-to-day" data-day="${i}">+ Add Exercise</button>
          </div>`).join('')}
        </div>
        <div style="padding:.5rem 1rem 1rem">
          <button class="btn btn-primary" data-action="save-routine" data-id="${editId||''}">Save Routine</button>
        </div>
      </div>`;
    },

    // ── History ───────────────────────────────────────────────────────────────
    history() {
      const now = new Date();
      const workouts = DB.getRecentWorkouts(50);

      return `
      <div class="screen">
        <div class="screen-header">
          <h1>History</h1>
          <button class="btn btn-sm btn-ghost" data-action="new-past-workout">+ Log</button>
        </div>

        <div id="calendar-section">
          <div class="calendar-header">
            <button class="cal-nav" data-action="cal-prev">${App._icon('chevron-left')}</button>
            <h3 id="cal-month-label"></h3>
            <button class="cal-nav" data-action="cal-next">${App._icon('chevron-right')}</button>
          </div>
          <div class="calendar-grid" id="cal-grid"></div>
        </div>

        <div class="section-header"><h2>Workouts</h2></div>
        <div id="history-list">
          ${workouts.length
            ? workouts.map(w => App._workoutCard(w)).join('')
            : `<div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">No workouts recorded</div>
                <div class="empty-state-text">Complete your first workout and it'll appear here.</div>
               </div>`}
        </div>
      </div>`;
    },

    // ── Workout Detail ────────────────────────────────────────────────────────
    workoutDetail(workoutId) {
      const w = DB.getWorkout(workoutId);
      if (!w) return App.screens.history();

      // For past activity workouts duration may be 0; fall back to sum of set durations
      let durationSecs = (new Date(w.completedAt||w.startedAt) - new Date(w.startedAt)) / 1000;
      if (durationSecs < 60) {
        const activityMins = w.exercises.flatMap(e => e.sets)
          .filter(s => s.duration).reduce((sum, s) => sum + parseFloat(s.duration||0), 0);
        if (activityMins > 0) durationSecs = activityMins * 60;
      }
      const duration = App._fmtDuration(durationSecs);
      const totalVol = DB.calcTotalVolume([w]);

      const exBlocks = w.exercises.map(ex => {
        const isActivity = ex.sets.length > 0 && ex.sets[0].duration !== undefined;
        const tableHead = isActivity
          ? `<td style="padding:.4rem 1rem">#</td>
             <td style="padding:.4rem .5rem">Duration</td>
             <td style="padding:.4rem .5rem">Avg HR</td>
             <td style="padding:.4rem .5rem">Max HR</td>
             <td style="padding:.4rem 1rem .4rem .5rem">Kcal</td>`
          : `<td style="padding:.4rem 1rem">Set</td>
             <td style="padding:.4rem .5rem">Weight</td>
             <td style="padding:.4rem .5rem">Reps</td>
             <td style="padding:.4rem 1rem .4rem .5rem">Done</td>`;
        const rows = ex.sets.map(s => {
          const cells = isActivity
            ? `<td style="padding:.4rem 1rem;font-size:.8rem;color:var(--txt3)">${s.setNumber}</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.duration ? s.duration + ' min' : '—'}</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.avgHr ? s.avgHr + ' bpm' : '—'}</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.maxHr ? s.maxHr + ' bpm' : '—'}</td>
               <td style="padding:.4rem 1rem .4rem .5rem;font-weight:600">${s.calories ? s.calories + ' kcal' : '—'}</td>`
            : `<td style="padding:.4rem 1rem;font-size:.8rem;color:var(--txt3)">${s.setNumber}</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.weight||'—'} kg</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.reps||'—'}</td>
               <td style="padding:.4rem 1rem .4rem .5rem">${s.completed ? '✓' : '—'}</td>`;
          return `<tr style="border-top:1px solid var(--border);${s.completed?'':'opacity:.4'}">${cells}</tr>`;
        }).join('');
        return `
          <div style="margin:.5rem 1rem 0">
            <div class="exercise-block">
              <div class="exercise-block-header">
                <div><div class="exercise-block-name">${ex.exerciseName}</div></div>
              </div>
              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr style="font-size:.7rem;text-transform:uppercase;letter-spacing:.4px;color:var(--txt3)">${tableHead}</tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      }).join('');

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${w.name}</span>
          <div style="display:flex;gap:.4rem">
            <button class="btn btn-sm btn-ghost" data-action="edit-workout" data-id="${w.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-action="delete-workout" data-id="${w.id}">Delete</button>
          </div>
        </div>

        <div style="padding:.5rem 1rem">
          <div style="font-size:.8rem;color:var(--txt2)">${App._fmtDateFull(new Date(w.startedAt))}</div>
        </div>

        <div class="stat-grid">
          <div class="stat-card"><div class="val">${duration}</div><div class="lbl">Duration</div></div>
          <div class="stat-card highlight"><div class="val">${App._fmtVol(totalVol)}</div><div class="lbl">Volume kg</div></div>
          <div class="stat-card"><div class="val">${w.exercises.length}</div><div class="lbl">Exercises</div></div>
        </div>

        ${exBlocks}

        ${w.notes ? `<div style="padding:.75rem 1rem">
          <div class="form-label">Notes</div>
          <div style="font-size:.9rem;color:var(--txt2);line-height:1.5">${w.notes}</div>
        </div>` : ''}
      </div>`;
    },

    // ── Profile ───────────────────────────────────────────────────────────────
    profile() {
      const metrics  = DB.getBodyMetrics();
      const latest   = metrics[0] || null;
      const prev     = metrics[1] || null;
      const profile  = DB.getProfile() || {};
      const allWkts  = DB.getWorkouts();
      const streak   = DB.getCurrentStreak();
      const name     = profile.name || 'Athlete';
      const initial  = name[0].toUpperCase();

      const deltaW = (latest && prev && latest.weight && prev.weight)
        ? (latest.weight - prev.weight).toFixed(1) : null;
      const deltaBF = (latest && prev && latest.bodyFat && prev.bodyFat)
        ? (latest.bodyFat - prev.bodyFat).toFixed(1) : null;

      const fbName  = Firebase.ready ? Firebase.userName : null;
      const fbPhoto = Firebase.ready ? Firebase.userPhoto : null;
      const displayName = fbName || name;

      return `
      <div class="screen">

        <!-- ── Profile header ── -->
        <div class="profile-hero">
          ${fbPhoto
            ? `<img src="${fbPhoto}" class="profile-avatar-lg" style="object-fit:cover" referrerpolicy="no-referrer">`
            : `<div class="profile-avatar-lg">${displayName[0].toUpperCase()}</div>`}
          <div class="profile-info">
            <div class="profile-name">${displayName}</div>
            <div class="profile-goal">${profile.goal ? App._fmtGoal(profile.goal) : 'No goal set'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:.35rem;align-items:flex-end">
            <button class="btn btn-sm btn-ghost" data-action="open-profile">Edit</button>
            ${Firebase.ready
              ? `<button class="btn btn-sm btn-ghost" style="color:var(--txt3);font-size:.72rem" data-action="google-signout">Sign out</button>`
              : `<button class="btn btn-sm btn-primary" data-action="google-signin">Sign in</button>`}
          </div>
        </div>

        <div class="stat-grid" style="padding:.5rem 1rem 0">
          <div class="stat-card">
            <div class="val">${allWkts.length}</div>
            <div class="lbl">Workouts</div>
          </div>
          <div class="stat-card highlight">
            <div class="val">${streak}</div>
            <div class="lbl">Day streak</div>
          </div>
          <div class="stat-card">
            <div class="val">${latest?.weight ? latest.weight + ' kg' : '—'}</div>
            <div class="lbl">Weight</div>
          </div>
        </div>

        <!-- ── Body Metrics ── -->
        <div class="section-header" style="margin-top:.75rem">
          <h2>Body Metrics</h2>
          <button class="btn btn-sm btn-ghost" data-action="log-metric">+ Log</button>
        </div>

        <div class="chart-wrap">
          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">Weight (last 30 days)</span>
              ${deltaW !== null ? `<span style="font-size:.8rem;color:${parseFloat(deltaW)<0?'var(--green)':'var(--red)'}">
                ${parseFloat(deltaW) > 0 ? '+' : ''}${deltaW} kg</span>` : ''}
            </div>
            <canvas id="body-weight-chart" height="120"></canvas>
          </div>
        </div>

        ${latest?.bodyFat ? `
        <div class="chart-wrap" style="margin-top:.75rem">
          <div class="chart-card">
            <div class="chart-card-header">
              <span class="chart-card-title">Body Fat % (last 30 days)</span>
              ${deltaBF !== null ? `<span style="font-size:.8rem;color:${parseFloat(deltaBF)<0?'var(--green)':'var(--red)'}">
                ${parseFloat(deltaBF) > 0 ? '+' : ''}${deltaBF}%</span>` : ''}
            </div>
            <canvas id="body-fat-chart" height="100"></canvas>
          </div>
        </div>` : ''}

        ${latest ? `
        <div style="margin:.5rem 1rem 0">
          <div class="exercise-block">
            <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);margin-bottom:.5rem">${App._fmtDateFull(new Date(latest.date))}</div>
            ${App._metricRows(latest)}
          </div>
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-icon">⚖️</div>
          <div class="empty-state-title">No measurements yet</div>
          <div class="empty-state-text">Log your first body metrics to start tracking progress.</div>
          <button class="btn btn-primary" style="margin-top:.5rem;width:auto;padding:.7rem 2rem" data-action="log-metric">Log Now</button>
        </div>`}

        ${metrics.length > 1 ? `
        <div class="section-header"><h2>Metric History</h2></div>
        ${metrics.slice(0, 10).map(m => `
          <div class="list-item" style="padding:.65rem 1rem">
            <div>
              <div style="font-size:.85rem;font-weight:600">${App._fmtDateFull(new Date(m.date))}</div>
              <div style="font-size:.78rem;color:var(--txt2)">
                ${m.weight ? m.weight + ' kg' : ''}${m.bodyFat ? ' · ' + m.bodyFat + '% BF' : ''}
              </div>
            </div>
            <button style="color:var(--red);font-size:.8rem" data-action="delete-metric" data-id="${m.id}">Delete</button>
          </div>`).join('')}` : ''}

        <!-- ── Friends ── -->
        <div class="section-header" style="margin-top:.75rem">
          <h2>Friends</h2>
        </div>

        ${Firebase.notSignedIn ? `
        <div style="margin:.25rem 1rem 1rem">
          <div class="invite-card" style="text-align:center;padding:1.5rem 1rem">
            <div style="font-size:.9rem;font-weight:600;margin-bottom:.35rem">Sign in to connect with friends</div>
            <div style="font-size:.8rem;color:var(--txt2);margin-bottom:1rem">Your data syncs across devices and you can share workouts with friends.</div>
            <button class="btn btn-primary" style="width:auto;padding:.7rem 1.75rem" data-action="google-signin">
              Sign in with Google
            </button>
          </div>
        </div>` : `
        <div style="margin:.25rem 1rem .5rem">
          <div class="invite-card">
            <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.4px;color:var(--txt3);margin-bottom:.45rem">Your invite link</div>
            <div style="display:flex;align-items:center;gap:.5rem">
              <div id="invite-link-preview" style="flex:1;font-size:.72rem;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--bg3);padding:.5rem .7rem;border-radius:var(--radius-sm)">
                ${Firebase.ready ? Firebase.getInviteLink() : 'Connecting…'}
              </div>
              <button class="btn btn-sm btn-ghost" data-action="copy-invite-link">Copy</button>
            </div>
          </div>
        </div>

        <div id="friends-list-container">
          <div style="padding:1.25rem 1rem;text-align:center;color:var(--txt3);font-size:.82rem">Loading…</div>
        </div>`}

      </div>`;
    },

    // ── Log Metric ────────────────────────────────────────────────────────────
    logMetric() {
      const today = new Date().toISOString().slice(0, 10);
      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">Log Metrics</span>
          <button class="btn btn-sm btn-ghost" data-action="save-metric">Save</button>
        </div>

        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="metric-date" value="${today}">
        </div>

        <div class="form-group">
          <label class="form-label">Body Weight (kg)</label>
          <input type="number" step="0.1" class="form-input" id="metric-weight" placeholder="e.g. 80.5">
        </div>
        <div class="form-group">
          <label class="form-label">Body Fat %</label>
          <input type="number" step="0.1" class="form-input" id="metric-bodyfat" placeholder="e.g. 18.5">
        </div>

        <div class="section-header"><h2>Measurements (cm)</h2></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Chest</label><input type="number" class="form-input" id="metric-chest" placeholder="—"></div>
          <div class="form-group"><label class="form-label">Waist</label><input type="number" class="form-input" id="metric-waist" placeholder="—"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Hips</label><input type="number" class="form-input" id="metric-hips" placeholder="—"></div>
          <div class="form-group"><label class="form-label">Left Arm</label><input type="number" class="form-input" id="metric-l-arm" placeholder="—"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Right Arm</label><input type="number" class="form-input" id="metric-r-arm" placeholder="—"></div>
          <div class="form-group"><label class="form-label">Left Thigh</label><input type="number" class="form-input" id="metric-l-thigh" placeholder="—"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Right Thigh</label><input type="number" class="form-input" id="metric-r-thigh" placeholder="—"></div>
          <div class="form-group"></div>
        </div>

        <div style="padding:1rem">
          <button class="btn btn-primary" data-action="save-metric">Save Metrics</button>
        </div>
      </div>`;
    },

    // ── Log Past Workout ──────────────────────────────────────────────────────
    logPastWorkout() {
      const draft = App.state.pastWorkoutDraft;
      if (!draft) return App.screens.history();
      const maxDate = new Date().toISOString().slice(0, 16);
      const isEdit = !!draft.editId;

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${isEdit ? 'Edit Workout' : 'Log Past Workout'}</span>
          <button class="btn btn-sm btn-ghost" data-action="save-past-workout">Save</button>
        </div>

        <div class="form-group">
          <label class="form-label">Date & Time</label>
          <input type="datetime-local" class="form-input" id="past-date"
                 value="${draft.date}" max="${maxDate}">
        </div>

        <div class="form-group">
          <label class="form-label">Workout Name</label>
          <input type="text" class="form-input" id="past-name"
                 placeholder="e.g. Push Day" value="${draft.name}">
        </div>

        ${draft.exercises.length
          ? `<div style="padding:.25rem 0">
              ${draft.exercises.map((ex, ei) => App._pastExerciseBlock(ex, ei)).join('')}
             </div>`
          : `<div class="empty-state" style="padding:2rem 2rem 1rem">
               <div class="empty-state-icon">💪</div>
               <div class="empty-state-title">No exercises yet</div>
               <div class="empty-state-text">Add the exercises you did in this session.</div>
             </div>`}

        <div style="padding:.75rem 1rem .5rem">
          <button class="btn btn-secondary" style="width:100%" data-action="add-past-exercise">
            ${App._icon('plus')} Add Exercise
          </button>
        </div>

        <div style="padding:.5rem 1rem .75rem">
          <label class="form-label">Notes</label>
          <textarea class="notes-input" id="past-notes"
                    placeholder="How did it go?">${draft.notes}</textarea>
        </div>

        <div style="padding:0 1rem 1.5rem">
          <button class="btn btn-primary" data-action="save-past-workout">Save Workout</button>
        </div>
      </div>`;
    },
  },

  // ── Onboarding ─────────────────────────────────────────────────────────────
  showOnboarding() {
    document.getElementById('bottom-nav').classList.add('hidden');
    document.getElementById('app').innerHTML = this._onboardingStep(1, {});
  },

  _onboardingStep(step, data) {
    if (step === 1) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-logo">
            <div class="logo-icon">${App._icon('dumbbell', 28, '#fff')}</div>
            <span>GymTrack</span>
          </div>
          <div class="onboarding-title">Train <span>smarter.</span><br>Track <span>everything.</span></div>
          <div class="onboarding-subtitle">Your all-in-one gym tracker for Hyrox, CrossFit, Strength, Cardio and more.</div>
        </div>
        <div>
          <div class="step-indicator">
            <div class="step-dot active"></div><div class="step-dot"></div><div class="step-dot"></div>
          </div>
          <div class="form-group" style="padding:0 0 .75rem">
            <label class="form-label">Your name</label>
            <input class="form-input" id="ob-name" placeholder="e.g. Alex" autocomplete="given-name">
          </div>
          <button class="btn btn-primary" data-action="ob-next" data-step="2">Continue</button>
        </div>
      </div>`;

    if (step === 2) return `
      <div class="onboarding-screen" data-ob-name="${data.name}">
        <div>
          <div class="onboarding-title">What's your <span>main goal?</span></div>
          <div class="onboarding-subtitle">We'll personalise routines and progression for you.</div>
        </div>
        <div>
          <div class="step-indicator">
            <div class="step-dot"></div><div class="step-dot active"></div><div class="step-dot"></div>
          </div>
          <div class="chip-select" style="flex-direction:column;gap:.5rem" id="ob-goal-chips">
            ${[['muscle','Build Muscle','💪'],['fat_loss','Lose Body Fat','🔥'],['bulking','Bulk Up','📈'],['endurance','Improve Endurance','🏃'],['strength','Get Stronger','🏋️']].map(([v,l,e]) => `
              <div class="chip" style="padding:.85rem;font-size:.95rem;text-align:center"
                data-action="select-chip" data-group="ob-goal" data-val="${v}">${e} ${l}</div>
            `).join('')}
          </div>
          <button class="btn btn-primary" style="margin-top:1rem" data-action="ob-next" data-step="3">Continue</button>
        </div>
      </div>`;

    if (step === 3) return `
      <div class="onboarding-screen" data-ob-name="${data.name}" data-ob-goal="${data.goal}">
        <div>
          <div class="onboarding-title">Choose your <span>training style</span></div>
          <div class="onboarding-subtitle">You can always mix and match later.</div>
        </div>
        <div>
          <div class="step-indicator">
            <div class="step-dot"></div><div class="step-dot"></div><div class="step-dot active"></div>
          </div>
          <div class="chip-select" style="flex-direction:column;gap:.5rem" id="ob-type-chips">
            ${[['strength','Strength Training','🏋️'],['hyrox','Hyrox','🏅'],['crossfit','CrossFit','🔥'],['cardio','Cardio / Running','🏃'],['mixed','Mixed / Everything','⚡']].map(([v,l,e]) => `
              <div class="chip" style="padding:.85rem;font-size:.95rem;text-align:center"
                data-action="select-chip" data-group="ob-type" data-val="${v}">${e} ${l}</div>
            `).join('')}
          </div>
          <button class="btn btn-primary" style="margin-top:1rem" data-action="ob-finish">Let's Go!</button>
        </div>
      </div>`;
  },

  _finishOnboarding(name, goal, trainingType) {
    const profile = { id: DB.uid(), name, goal, trainingType, createdAt: new Date().toISOString() };
    DB.saveProfile(profile);
    Firebase.onReady(() => Firebase.syncProfile(profile).catch(() => {}));
    document.getElementById('bottom-nav').classList.remove('hidden');
    this.navigate('dashboard');
  },

  // ── Workout Engine ─────────────────────────────────────────────────────────
  workout: {
    start(routineId, dayIndex) {
      const isTemplate = routineId && routineId.startsWith('tpl-');
      const routine = routineId
        ? (isTemplate ? ROUTINE_TEMPLATES.find(t => t.id === routineId) : DB.getRoutine(routineId))
        : null;

      const day = routine ? routine.days[dayIndex || 0] : null;
      const exercises = day ? day.exercises.map(ex => {
        const info        = getExercise(ex.exerciseId);
        const isActivity  = info?.measureType === 'activity';
        const suggestion  = !isActivity ? DB.getProgressionSuggestion(ex.exerciseId, routineId, day.id) : null;
        const targetWeight = suggestion ? suggestion.weight : null;

        return {
          exerciseId:   ex.exerciseId,
          exerciseName: info ? info.name : ex.exerciseId,
          measureType:  info?.measureType || null,
          targetReps:   isActivity ? '1 session' : ex.reps,
          targetSets:   ex.sets,
          restSeconds:  isActivity ? 0 : (ex.rest || 90),
          suggestion:   suggestion ? suggestion.message : null,
          sets: Array.from({ length: ex.sets }, (_, i) => {
            const s = App._blankSet(i + 1, isActivity);
            if (!isActivity) { s.weight = targetWeight || null; s.reps = parseInt(ex.reps) || null; }
            return s;
          })
        };
      }) : [];

      App.state.activeWorkout = {
        id:           DB.uid(),
        name:         day ? `${routine.name} — ${day.name}` : 'Empty Workout',
        routineId:    routineId || null,
        routineDayId: day ? day.id : null,
        startedAt:    new Date().toISOString(),
        exercises,
        notes:        ''
      };
      DB.saveActiveWorkout(App.state.activeWorkout);
      App.navigate('active-workout');
    },

    addExercise(exerciseId) {
      const info = getExercise(exerciseId);
      if (!info || !App.state.activeWorkout) return;
      const isActivity = info.measureType === 'activity';
      App.state.activeWorkout.exercises.push({
        exerciseId,
        exerciseName: info.name,
        measureType:  info.measureType || null,
        targetReps:   isActivity ? '1 session' : '10',
        targetSets:   isActivity ? 1 : 3,
        restSeconds:  isActivity ? 0 : 90,
        suggestion:   null,
        sets: [App._blankSet(1, isActivity)]
      });
      DB.saveActiveWorkout(App.state.activeWorkout);
      App._render();
    },

    addSet(exerciseIndex) {
      const ex = App.state.activeWorkout.exercises[exerciseIndex];
      if (!ex) return;
      const isActivity = ex.measureType === 'activity';
      const last = ex.sets[ex.sets.length - 1];
      const next = App._blankSet(ex.sets.length + 1, isActivity);
      if (!isActivity && last) { next.weight = last.weight; next.reps = last.reps; }
      if (isActivity && last)  { next.duration = last.duration; }
      ex.sets.push(next);
      DB.saveActiveWorkout(App.state.activeWorkout);
      App._render();
    },

    removeSet(exerciseIndex, setIndex) {
      const ex = App.state.activeWorkout.exercises[exerciseIndex];
      if (!ex || ex.sets.length <= 1) return;
      ex.sets.splice(setIndex, 1);
      ex.sets.forEach((s, i) => { s.setNumber = i + 1; });
      DB.saveActiveWorkout(App.state.activeWorkout);
      App._render();
    },

    removeExercise(exerciseIndex) {
      App.state.activeWorkout.exercises.splice(exerciseIndex, 1);
      DB.saveActiveWorkout(App.state.activeWorkout);
      App._render();
    },

    updateSet(exerciseIndex, setIndex, field, value) {
      const s = App.state.activeWorkout.exercises[exerciseIndex]?.sets[setIndex];
      if (!s) return;
      s[field] = parseFloat(value) || null;
      DB.saveActiveWorkout(App.state.activeWorkout);
    },

    toggleComplete(exerciseIndex, setIndex) {
      const w  = App.state.activeWorkout;
      const ex = w.exercises[exerciseIndex];
      const s  = ex?.sets[setIndex];
      if (!s) return;

      s.completed = !s.completed;

      // Auto-fill weight/reps from last set if empty
      if (s.completed && !s.weight && ex.sets[setIndex - 1]?.weight) {
        s.weight = ex.sets[setIndex - 1].weight;
      }
      if (s.completed && !s.reps && ex.sets[setIndex - 1]?.reps) {
        s.reps = ex.sets[setIndex - 1].reps;
      }

      DB.saveActiveWorkout(w);

      // Update button state without full re-render
      const btn = document.querySelector(`[data-ei="${exerciseIndex}"][data-si="${setIndex}"].set-complete-btn`);
      if (btn) {
        btn.classList.toggle('done', s.completed);
        btn.innerHTML = s.completed ? App._icon('check', 16) : '';
        const row = btn.closest('.set-row');
        if (row) row.classList.toggle('completed', s.completed);
      }

      // Start rest timer
      if (s.completed) {
        App._startRestTimer(ex.restSeconds || 90);
      } else {
        App._stopRestTimer();
      }
    },

    finish() {
      const w = App.state.activeWorkout;
      if (!w) return;

      // Grab notes
      const notesEl = document.getElementById('workout-notes');
      if (notesEl) w.notes = notesEl.value;

      w.completedAt = new Date().toISOString();
      DB.saveWorkout(w);
      Firebase.onReady(() => Firebase.syncWorkout(w).catch(() => {}));
      DB.saveActiveWorkout(null);

      App._stopWorkoutTimer();
      App._stopRestTimer();
      App.state.activeWorkout = null;
      App.navigate('workout-complete', { workout: w });
    },

    discard() {
      DB.saveActiveWorkout(null);
      App._stopWorkoutTimer();
      App._stopRestTimer();
      App.state.activeWorkout = null;
      App.navigate('dashboard');
    }
  },

  // ── Timers ─────────────────────────────────────────────────────────────────
  _startWorkoutTimer() {
    this._stopWorkoutTimer();
    const w = this.state.activeWorkout;
    if (!w) return;
    const start = new Date(w.startedAt).getTime();
    this.state.workoutTimer = setInterval(() => {
      const el = document.getElementById('workout-timer');
      if (!el) { this._stopWorkoutTimer(); return; }
      const elapsed = Math.floor((Date.now() - start) / 1000);
      el.textContent = this._fmtDuration(elapsed);
    }, 1000);
    // Set immediately
    const el = document.getElementById('workout-timer');
    if (el) {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      el.textContent = this._fmtDuration(elapsed);
    }
  },

  _stopWorkoutTimer() {
    if (this.state.workoutTimer) {
      clearInterval(this.state.workoutTimer);
      this.state.workoutTimer = null;
    }
  },

  _startRestTimer(seconds) {
    this._stopRestTimer();
    const banner  = document.getElementById('rest-timer-banner');
    const display = document.getElementById('rest-timer-display');
    if (!banner || !display) return;

    banner.classList.remove('hidden');
    let remaining = seconds;
    display.textContent = this._fmtDuration(remaining);

    this.state.restTimer = setInterval(() => {
      remaining--;
      const d = document.getElementById('rest-timer-display');
      if (d) d.textContent = this._fmtDuration(remaining);
      if (remaining <= 0) {
        this._stopRestTimer();
        this._toast('Rest over — go!', 'success');
      }
    }, 1000);
  },

  _stopRestTimer() {
    if (this.state.restTimer) {
      clearInterval(this.state.restTimer);
      this.state.restTimer = null;
    }
    const banner = document.getElementById('rest-timer-banner');
    if (banner) banner.classList.add('hidden');
  },

  // ── Charts ─────────────────────────────────────────────────────────────────
  _initCharts(ids) {
    if (typeof Chart === 'undefined') return;

    const accent  = '#FC4C02';
    const green   = '#30d158';
    const gridCol = 'rgba(255,255,255,0.05)';
    const txtCol  = '#666666';

    const baseOpts = {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: gridCol }, ticks: { color: txtCol, font: { size: 10 } } },
        y: { grid: { color: gridCol }, ticks: { color: txtCol, font: { size: 10 } } }
      }
    };

    ids.forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;

      if (id === 'weekly-volume') {
        const data = DB.calcWeeklyVolumeByDay();
        this.state.charts[id] = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: data.map(d => d.label),
            datasets: [{
              data: data.map(d => d.volume),
              backgroundColor: data.map((_, i) => i === new Date().getDay() ? accent : 'rgba(252,76,2,.25)'),
              borderRadius: 5,
              borderSkipped: false,
            }]
          },
          options: { ...baseOpts }
        });
      }

      if (id === 'body-weight-mini') {
        const metrics = DB.getBodyMetricsLastNDays(30).reverse();
        if (!metrics.length) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'line',
          data: {
            labels: metrics.map(m => ''),
            datasets: [{
              data: metrics.map(m => m.weight),
              borderColor: accent,
              borderWidth: 2,
              pointRadius: 0,
              tension: .4,
              fill: true,
              backgroundColor: 'rgba(252,76,2,.1)',
            }]
          },
          options: {
            responsive: false,
            plugins: { legend: { display: false }, tooltip: { display: false } },
            scales: { x: { display: false }, y: { display: false } },
            animation: { duration: 0 }
          }
        });
      }

      if (id === 'body-weight-chart') {
        const metrics = DB.getBodyMetricsLastNDays(30).reverse();
        if (!metrics.length) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'line',
          data: {
            labels: metrics.map(m => m.date.slice(5)),
            datasets: [{
              label: 'Weight (kg)',
              data: metrics.map(m => m.weight),
              borderColor: accent,
              borderWidth: 2.5,
              pointRadius: 3,
              pointBackgroundColor: accent,
              tension: .4,
              fill: true,
              backgroundColor: 'rgba(252,76,2,.1)',
            }]
          },
          options: { ...baseOpts }
        });
      }

      if (id === 'body-fat-chart') {
        const metrics = DB.getBodyMetricsLastNDays(30).reverse().filter(m => m.bodyFat);
        if (!metrics.length) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'line',
          data: {
            labels: metrics.map(m => m.date.slice(5)),
            datasets: [{
              label: 'Body Fat %',
              data: metrics.map(m => m.bodyFat),
              borderColor: green,
              borderWidth: 2.5,
              pointRadius: 3,
              pointBackgroundColor: green,
              tension: .4,
              fill: true,
              backgroundColor: 'rgba(48,209,88,.08)',
            }]
          },
          options: { ...baseOpts }
        });
      }
    });
  },

  // ── Calendar ────────────────────────────────────────────────────────────────
  _calYear:  null,
  _calMonth: null,

  _renderCalendar() {
    const now = new Date();
    if (this._calYear === null)  this._calYear  = now.getFullYear();
    if (this._calMonth === null) this._calMonth = now.getMonth();

    const label = document.getElementById('cal-month-label');
    const grid  = document.getElementById('cal-grid');
    if (!label || !grid) return;

    const y = this._calYear, m = this._calMonth;
    label.textContent = new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const cal     = DB.getWorkoutCalendar(y, m);
    const first   = new Date(y, m, 1).getDay();
    const days    = new Date(y, m + 1, 0).getDate();
    const todayS  = now.toISOString().slice(0, 10);

    const dayLabels = ['S','M','T','W','T','F','S'];
    let html = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');
    for (let i = 0; i < first; i++) html += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = key === todayS;
      const hasW    = !!cal[key];
      html += `<div class="cal-day ${isToday?'today':''} ${hasW?'has-workout':''}" data-action="cal-day-select" data-date="${key}">${d}</div>`;
    }
    grid.innerHTML = html;
  },

  // ── Friends ────────────────────────────────────────────────────────────────
  async _loadFriendsSection() {
    if (!Firebase.ready) {
      Firebase.onReady(() => this._loadFriendsSection());
      return;
    }

    const container = document.getElementById('friends-list-container');
    if (!container) return;

    // Update invite link
    const linkEl = document.getElementById('invite-link-preview');
    if (linkEl) linkEl.textContent = Firebase.getInviteLink();

    const friends = await Firebase.getFriendsWithData();

    if (!friends.length) {
      container.innerHTML = `
        <div class="friends-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div class="friends-empty-title">No friends yet</div>
          <div class="friends-empty-sub">Copy your invite link above and send it to your partner or friends. When they open it on their phone the connection is made automatically.</div>
        </div>`;
      return;
    }

    container.innerHTML = friends.map(f => this._friendCard(f)).join('');
  },

  _friendCard(f) {
    const lastW   = f.recentWorkouts?.[0];
    const initial = (f.name || '?')[0].toUpperCase();
    return `
      <div class="friend-card">
        <div class="friend-avatar">${initial}</div>
        <div class="friend-info">
          <div class="friend-name">${f.name || 'Friend'}</div>
          <div class="friend-last">${lastW
            ? `${lastW.name} · ${App._fmtDateFull(new Date(lastW.startedAt))}`
            : 'No workouts yet'}</div>
        </div>
        <button class="btn btn-sm btn-ghost" style="color:var(--red);flex-shrink:0"
                data-action="remove-friend" data-uid="${f.uid}">Remove</button>
      </div>`;
  },

  async _handleFriendInvite(friendUid) {
    try {
      const profile = await Firebase.getUserProfile(friendUid);
      const name    = profile?.name || 'Someone';
      this._confirm(
        `Add ${name} as a friend? They'll be able to see your workouts.`,
        async () => {
          const ok = await Firebase.addFriend(friendUid);
          if (ok) {
            this._toast(`${name} added!`, 'success');
            if (this.state.screen === 'profile') this._loadFriendsSection();
          }
        },
        'Add Friend'
      );
    } catch (e) {
      console.warn('handleFriendInvite failed', e);
    }
  },

  // ── Event Handlers ─────────────────────────────────────────────────────────
  _handleClick(e) {
    const el     = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {

      // Navigation
      case 'nav':
        this.navigate(el.dataset.screen, el.dataset.id ? { workoutId: el.dataset.id, routineId: el.dataset.id } : {});
        break;
      case 'back':
        this.navigate(this._prevScreen());
        break;
      case 'set-tab':
        this.state.activeTab[el.dataset.screen] = parseInt(el.dataset.tab);
        this._render();
        break;

      // Onboarding
      case 'ob-next': {
        const step = parseInt(el.dataset.step);
        const screen = document.querySelector('.onboarding-screen');
        if (step === 2) {
          const name = document.getElementById('ob-name')?.value?.trim();
          if (!name) { this._toast('Enter your name', 'error'); return; }
          document.getElementById('app').innerHTML = this._onboardingStep(2, { name });
          this._obData = { name };
        }
        if (step === 3) {
          const goal = document.querySelector('.chip.selected[data-group="ob-goal"]')?.dataset?.val;
          if (!goal) { this._toast('Pick a goal', 'error'); return; }
          this._obData = { ...this._obData, goal };
          document.getElementById('app').innerHTML = this._onboardingStep(3, this._obData);
        }
        break;
      }
      case 'ob-finish': {
        const type = document.querySelector('.chip.selected[data-group="ob-type"]')?.dataset?.val;
        if (!type) { this._toast('Pick a training style', 'error'); return; }
        this._finishOnboarding(this._obData?.name || 'Athlete', this._obData?.goal || 'muscle', type);
        break;
      }

      // Select chip
      case 'select-chip': {
        const group = el.dataset.group;
        document.querySelectorAll(`.chip[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        break;
      }

      // Workout
      case 'start-empty':
        this.workout.start(null, 0);
        break;
      case 'start-routine':
        this.workout.start(el.dataset.id, parseInt(el.dataset.day) || 0);
        break;
      case 'open-routine': {
        this.state.activeTab['routine-detail'] = 0;
        this.navigate('routine-detail', { routineId: el.dataset.id });
        break;
      }
      case 'add-exercise':
        this._showExercisePicker(exerciseId => this.workout.addExercise(exerciseId));
        break;
      case 'add-exercise-to-day': {
        const dayIdx = parseInt(el.dataset.day);
        this._showExercisePicker(exerciseId => this._addExerciseToDay(dayIdx, exerciseId));
        break;
      }
      case 'add-set':
        this.workout.addSet(parseInt(el.dataset.ei));
        break;
      case 'remove-set':
        this.workout.removeSet(parseInt(el.dataset.ei), parseInt(el.dataset.si));
        break;
      case 'remove-exercise':
        this._confirm('Remove this exercise?', () => this.workout.removeExercise(parseInt(el.dataset.ei)));
        break;
      case 'complete-set':
        this.workout.toggleComplete(parseInt(el.dataset.ei), parseInt(el.dataset.si));
        break;
      case 'skip-rest':
        this._stopRestTimer();
        break;
      case 'finish-workout':
        this._confirm('Finish this workout?', () => this.workout.finish(), 'Finish');
        break;
      case 'discard-workout':
        this._confirm('Discard workout? All progress will be lost.', () => this.workout.discard(), 'Discard', true);
        break;

      // Routines
      case 'create-routine':
        this.navigate('create-routine', {});
        break;
      case 'save-routine':
        this._saveRoutine(el.dataset.id || null);
        break;
      case 'save-template': {
        const tpl = ROUTINE_TEMPLATES.find(t => t.id === el.dataset.id);
        if (tpl) {
          const copy = JSON.parse(JSON.stringify(tpl));
          copy.id = DB.uid();
          copy.savedFrom = tpl.id;
          DB.saveRoutine(copy);
          this._toast('Saved to My Routines!', 'success');
        }
        break;
      }
      case 'delete-routine':
        this._confirm('Delete this routine?', () => {
          DB.deleteRoutine(el.dataset.id);
          this.navigate('routines');
        }, 'Delete', true);
        break;
      case 'add-routine-day':
        this._addRoutineDay();
        break;
      case 'edit-day-name':
        break; // handled by input event

      // History / workout detail
      case 'open-workout':
        this.navigate('workout-detail', { workoutId: el.dataset.id });
        break;
      case 'edit-workout': {
        const wEdit = DB.getWorkout(el.dataset.id);
        if (!wEdit) break;
        App.state.pastWorkoutDraft = {
          editId:    wEdit.id,
          date:      wEdit.startedAt.slice(0, 16),
          name:      wEdit.name,
          exercises: JSON.parse(JSON.stringify(wEdit.exercises)),
          notes:     wEdit.notes || ''
        };
        this.navigate('log-past-workout');
        break;
      }
      case 'delete-workout':
        this._confirm('Delete this workout?', () => {
          const _wid = el.dataset.id;
          DB.deleteWorkout(_wid);
          Firebase.onReady(() => Firebase.deleteWorkout(_wid).catch(() => {}));
          this.navigate('history');
        }, 'Delete', true);
        break;

      // Past workout
      case 'new-past-workout': {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        App.state.pastWorkoutDraft = {
          date: now.toISOString().slice(0, 16),
          name: '',
          exercises: [],
          notes: ''
        };
        this.navigate('log-past-workout');
        break;
      }
      case 'add-past-exercise':
        this._showExercisePicker(exerciseId => {
          const info = getExercise(exerciseId);
          if (!info || !App.state.pastWorkoutDraft) return;
          const isActivity = info.measureType === 'activity';
          const s = App._blankSet(1, isActivity);
          s.completed = true;
          App.state.pastWorkoutDraft.exercises.push({
            exerciseId,
            exerciseName: info.name,
            measureType:  info.measureType || null,
            sets: [s]
          });
          App._render();
        });
        break;
      case 'add-past-set': {
        const draft = App.state.pastWorkoutDraft;
        const ex = draft?.exercises[parseInt(el.dataset.ei)];
        if (!ex) break;
        const isActivity = ex.measureType === 'activity';
        const last = ex.sets[ex.sets.length - 1];
        const next = App._blankSet(ex.sets.length + 1, isActivity);
        next.completed = true;
        if (!isActivity && last) { next.weight = last.weight; next.reps = last.reps; }
        ex.sets.push(next);
        App._render();
        break;
      }
      case 'remove-past-exercise':
        App.state.pastWorkoutDraft?.exercises.splice(parseInt(el.dataset.ei), 1);
        App._render();
        break;
      case 'save-past-workout':
        this._savePastWorkout();
        break;

      // Body
      case 'log-metric':
        this.navigate('log-metric');
        break;
      case 'save-metric':
        this._saveMetric();
        break;
      case 'delete-metric':
        this._confirm('Delete this entry?', () => {
          const _mid = el.dataset.id;
          DB.deleteBodyMetric(_mid);
          Firebase.onReady(() => Firebase.deleteMetric(_mid).catch(() => {}));
          this._render();
        }, 'Delete', true);
        break;

      // Calendar
      case 'cal-prev':
        this._calMonth--;
        if (this._calMonth < 0) { this._calMonth = 11; this._calYear--; }
        this._renderCalendar();
        break;
      case 'cal-next':
        this._calMonth++;
        if (this._calMonth > 11) { this._calMonth = 0; this._calYear++; }
        this._renderCalendar();
        break;
      case 'cal-day-select': {
        const date = el.dataset.date;
        const workoutsOnDay = DB.getWorkouts().filter(w => w.startedAt.startsWith(date));
        const list = document.getElementById('history-list');
        if (list) {
          list.innerHTML = workoutsOnDay.length
            ? workoutsOnDay.map(w => this._workoutCard(w)).join('')
            : `<div class="empty-state" style="padding:1.5rem"><div class="empty-state-text">No workouts on ${date}</div></div>`;
        }
        document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
        break;
      }

      // Profile
      case 'open-profile':
        this._showProfileSheet();
        break;

      // Friends
      case 'copy-invite-link': {
        const link = Firebase.ready ? Firebase.getInviteLink() : '';
        if (!link) { this._toast('Still connecting, try again', 'error'); return; }
        navigator.clipboard?.writeText(link).then(() => {
          this._toast('Invite link copied!', 'success');
        }).catch(() => {
          // iOS fallback
          const ta = document.createElement('textarea');
          ta.value = link;
          document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          document.body.removeChild(ta);
          this._toast('Invite link copied!', 'success');
        });
        break;
      }
      case 'remove-friend':
        this._confirm('Remove this friend?', async () => {
          await Firebase.removeFriend(el.dataset.uid).catch(() => {});
          this._loadFriendsSection();
        }, 'Remove', true);
        break;

      case 'google-signin':
        el.disabled = true;
        el.textContent = 'Signing in…';
        Firebase.signIn().catch(() => {
          el.disabled = false;
          el.textContent = 'Sign in with Google';
          App._toast('Sign-in failed. Please try again.', 'error');
        });
        break;

      case 'google-signout':
        this._confirm('Sign out of your Google account?', async () => {
          await Firebase.signOut().catch(() => {});
          this.navigate('profile');
        }, 'Sign out', true);
        break;
    }
  },

  _handleInput(e) {
    const el = e.target;

    // Set weight/reps (active or past workout)
    if (el.classList.contains('set-input')) {
      const row  = el.closest('.set-row');
      if (!row) return;
      const ei   = parseInt(row.dataset.ei);
      const si   = parseInt(row.dataset.si);
      const field = el.dataset.field;
      if (el.dataset.past) {
        const s = App.state.pastWorkoutDraft?.exercises[ei]?.sets[si];
        if (s) s[field] = parseFloat(el.value) || null;
      } else {
        this.workout.updateSet(ei, si, field, el.value);
      }
    }

    // Workout notes
    if (el.id === 'workout-notes' && this.state.activeWorkout) {
      this.state.activeWorkout.notes = el.value;
      DB.saveActiveWorkout(this.state.activeWorkout);
    }
  },

  _handleChange(e) { /* used for selects if needed */ },

  // ── Modal Handlers ─────────────────────────────────────────────────────────
  _handleModalClick(e) {
    const overlay = e.target.closest('.modal-overlay');
    const el      = e.target.closest('[data-action]');

    // Close on backdrop
    if (e.target === overlay) {
      this._closeModal();
      return;
    }
    if (!el) return;

    const action = el.dataset.action;
    if (action === 'close-modal') { this._closeModal(); return; }
    if (action === 'select-chip') {
      const group = el.dataset.group;
      document.querySelectorAll(`.chip[data-group="${group}"]`).forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      return;
    }
    if (action === 'pick-exercise') {
      const id = el.dataset.id;
      this._closeModal();
      if (this.state.exercisePickerCb) {
        this.state.exercisePickerCb(id);
        this.state.exercisePickerCb = null;
      }
      return;
    }
    if (action === 'confirm-yes') {
      this._closeModal();
      if (this.state.confirmCb) { this.state.confirmCb(); this.state.confirmCb = null; }
      return;
    }
    if (action === 'confirm-no') {
      this._closeModal();
      this.state.confirmCb = null;
      return;
    }
    if (action === 'filter-category') {
      document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      this._filterExercises(el.dataset.cat || '');
      return;
    }
  },

  _handleModalInput(e) {
    if (e.target.id === 'exercise-search') {
      this._filterExercises('', e.target.value);
    }
  },

  _handleModalChange(e) {},

  // ── Modals ─────────────────────────────────────────────────────────────────
  _showExercisePicker(cb) {
    this.state.exercisePickerCb = cb;
    const cats = Object.entries(EXERCISE_CATEGORIES);

    const catFilters = `
      <div class="day-pills" style="padding:.5rem 1rem;border-bottom:1px solid var(--border)">
        <button class="day-pill active cat-filter-btn" data-action="filter-category" data-cat="">All</button>
        ${cats.map(([k,v]) => `<button class="day-pill cat-filter-btn" data-action="filter-category" data-cat="${k}">${v.name}</button>`).join('')}
      </div>`;

    const grouped = cats.map(([cat, info]) => {
      const exs = EXERCISES.filter(e => e.category === cat);
      return `
        <div class="exercise-cat-group" data-cat="${cat}">
          <div class="cat-header">${info.name}</div>
          ${exs.map(ex => `
            <div class="exercise-list-item">
              <div data-action="pick-exercise" data-id="${ex.id}" style="flex:1;min-width:0">
                <div class="exercise-list-item-name">${ex.name}</div>
                <div class="exercise-list-item-sub">${ex.muscles.join(', ')}</div>
              </div>
              <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise tutorial')}"
                 target="_blank" rel="noopener"
                 style="color:var(--red);padding:.4rem .5rem;flex-shrink:0"
                 title="Watch video"
                 onclick="event.stopPropagation()">${this._icon('video', 16)}</a>
              <span class="exercise-list-item-add" data-action="pick-exercise" data-id="${ex.id}" style="padding-left:.25rem">+</span>
            </div>`).join('')}
        </div>`;
    }).join('');

    document.getElementById('modal-root').innerHTML = `
      <div class="modal-overlay">
        <div class="bottom-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <span class="sheet-title">Add Exercise</span>
            <button class="sheet-close" data-action="close-modal">✕</button>
          </div>
          <div class="sheet-search">
            <div class="search-input-wrap">
              ${this._icon('search', 16)}
              <input id="exercise-search" placeholder="Search exercises..." autocomplete="off">
            </div>
          </div>
          ${catFilters}
          <div class="sheet-body" id="exercise-picker-body">${grouped}</div>
        </div>
      </div>`;
  },

  _filterExercises(cat, query) {
    const body = document.getElementById('exercise-picker-body');
    if (!body) return;

    const q = (query || document.getElementById('exercise-search')?.value || '').toLowerCase();
    const groups = body.querySelectorAll('.exercise-cat-group');

    groups.forEach(group => {
      const groupCat = group.dataset.cat;
      const visible = (!cat || cat === groupCat);
      let hasVisible = false;
      group.querySelectorAll('.exercise-list-item').forEach(item => {
        const name = item.querySelector('.exercise-list-item-name').textContent.toLowerCase();
        const sub  = item.querySelector('.exercise-list-item-sub').textContent.toLowerCase();
        const show = visible && (!q || name.includes(q) || sub.includes(q));
        item.style.display = show ? '' : 'none';
        if (show) hasVisible = true;
      });
      group.style.display = hasVisible ? '' : 'none';
      group.querySelector('.cat-header').style.display = hasVisible ? '' : 'none';
    });
  },

  _confirm(message, cb, btnLabel = 'Confirm', danger = false) {
    this.state.confirmCb = cb;
    document.getElementById('modal-root').innerHTML = `
      <div class="modal-overlay">
        <div class="confirm-sheet">
          <div class="confirm-title">${message}</div>
          <div class="confirm-actions">
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" style="width:100%" data-action="confirm-yes">${btnLabel}</button>
            <button class="btn btn-secondary" style="width:100%" data-action="confirm-no">Cancel</button>
          </div>
        </div>
      </div>`;
  },

  _showProfileSheet() {
    const profile = DB.getProfile() || {};
    document.getElementById('modal-root').innerHTML = `
      <div class="modal-overlay">
        <div class="bottom-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <span class="sheet-title">Profile</span>
            <button class="sheet-close" data-action="close-modal">✕</button>
          </div>
          <div style="padding:1rem">
            <div class="form-group" style="padding:0 0 .75rem">
              <label class="form-label">Name</label>
              <input class="form-input" id="profile-name" value="${profile.name||''}">
            </div>
            <div class="form-group" style="padding:0 0 .75rem">
              <label class="form-label">Goal</label>
              <div class="chip-select" id="profile-goal-chips">
                ${[['muscle','Build Muscle'],['fat_loss','Lose Fat'],['bulking','Bulk'],['endurance','Endurance'],['strength','Strength']].map(([v,l]) => `
                  <div class="chip ${profile.goal===v?'selected':''}" data-action="select-chip" data-group="profile-goal" data-val="${v}">${l}</div>
                `).join('')}
              </div>
            </div>
            <div class="form-group" style="padding:0 0 .75rem">
              <label class="form-label">Weight Unit</label>
              <div class="chip-select">
                ${['kg','lbs'].map(u => {
                  const s = DB.getSettings();
                  return `<div class="chip ${s.weightUnit===u?'selected':''}" data-action="select-chip" data-group="weight-unit" data-val="${u}">${u}</div>`;
                }).join('')}
              </div>
            </div>
            <button class="btn btn-primary" style="margin-top:.5rem" data-action="save-profile-sheet">Save</button>
            <button class="btn btn-danger" style="width:100%;margin-top:.5rem" data-action="reset-app">Reset All Data</button>
          </div>
        </div>
      </div>`;

    // Attach save handler in modal
    const modal = document.getElementById('modal-root');
    modal.querySelector('[data-action="save-profile-sheet"]')?.addEventListener('click', () => {
      const name = modal.querySelector('#profile-name')?.value?.trim();
      const goal = modal.querySelector('.chip.selected[data-group="profile-goal"]')?.dataset?.val;
      const unit = modal.querySelector('.chip.selected[data-group="weight-unit"]')?.dataset?.val;
      if (name) {
        const p = DB.getProfile() || {};
        const updated = { ...p, name, goal: goal || p.goal };
        DB.saveProfile(updated);
        Firebase.onReady(() => Firebase.syncProfile(updated).catch(() => {}));
      }
      if (unit) DB.saveSettings({ ...DB.getSettings(), weightUnit: unit });
      this._closeModal();
      this._render();
      this._toast('Profile saved', 'success');
    });

    modal.querySelector('[data-action="reset-app"]')?.addEventListener('click', () => {
      this._confirm('Reset ALL data? This cannot be undone.', () => {
        DB.clearAll();
        location.reload();
      }, 'Reset', true);
    });
  },

  _closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  },

  // ── Routine CRUD ────────────────────────────────────────────────────────────
  _routineDraft: null,

  _addRoutineDay() {
    // Parse current form state and add a day
    const days = document.getElementById('routine-days');
    if (!days) return;
    const dayCount = days.querySelectorAll('[data-day-index]').length;
    const newDay = {
      id: DB.uid(),
      name: `Day ${dayCount + 1}`,
      exercises: []
    };
    if (!this._routineDraft) this._routineDraft = { days: Array.from(days.querySelectorAll('[data-day-index]')).map((_, i) => ({ id: DB.uid(), name: `Day ${i+1}`, exercises: [] })) };
    this._routineDraft.days = this._routineDraft.days || [];
    this._routineDraft.days.push(newDay);

    const div = document.createElement('div');
    div.className = 'card';
    div.style.cssText = 'margin:.4rem 1rem';
    div.dataset.dayIndex = dayCount;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
        <input class="form-input" style="flex:1" placeholder="Day name" value="${newDay.name}" data-action="edit-day-name" data-day="${dayCount}">
      </div>
      <div id="day-exercises-${dayCount}"></div>
      <button class="btn btn-sm btn-secondary" style="width:100%;margin-top:.5rem"
        data-action="add-exercise-to-day" data-day="${dayCount}">+ Add Exercise</button>`;
    days.appendChild(div);
  },

  _addExerciseToDay(dayIndex, exerciseId) {
    const container = document.getElementById(`day-exercises-${dayIndex}`);
    if (!container) return;
    const info = getExercise(exerciseId);
    if (!info) return;
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.cssText = 'padding:.5rem 0;border-bottom:1px solid var(--border)';
    item.dataset.exId = exerciseId;
    item.innerHTML = `
      <span style="font-size:.85rem">${info.name}</span>
      <span style="font-size:.8rem;color:var(--txt2)">3×10</span>`;
    container.appendChild(item);
  },

  _saveRoutine(editId) {
    const name = document.getElementById('routine-name')?.value?.trim();
    if (!name) { this._toast('Enter a routine name', 'error'); return; }

    const type = document.querySelector('.chip.selected[data-group="routine-type"]')?.dataset?.val || 'custom';
    const goal = document.querySelector('.chip.selected[data-group="routine-goal"]')?.dataset?.val || 'muscle';

    const days = [];
    document.querySelectorAll('[data-day-index]').forEach((dayEl, i) => {
      const dayName = dayEl.querySelector(`[data-day="${i}"]`)?.value || `Day ${i + 1}`;
      const exercises = [];
      dayEl.querySelectorAll('[data-ex-id]').forEach(exEl => {
        exercises.push({
          exerciseId: exEl.dataset.exId,
          sets: 3,
          reps: '10',
          rest: 90
        });
      });
      days.push({ id: DB.uid(), name: dayName, exercises });
    });

    const routine = {
      id:          editId || DB.uid(),
      name,
      type,
      goal,
      daysPerWeek: days.length,
      days,
      createdAt:   new Date().toISOString()
    };
    DB.saveRoutine(routine);
    this._toast('Routine saved!', 'success');
    this.navigate('routines');
  },

  // ── Past Workout CRUD ───────────────────────────────────────────────────────
  _savePastWorkout() {
    const draft = App.state.pastWorkoutDraft;
    if (!draft) return;

    // Sync form fields
    const dateEl  = document.getElementById('past-date');
    const nameEl  = document.getElementById('past-name');
    const notesEl = document.getElementById('past-notes');
    if (dateEl)  draft.date  = dateEl.value;
    if (nameEl)  draft.name  = nameEl.value.trim();
    if (notesEl) draft.notes = notesEl.value;

    if (!draft.exercises.length) {
      this._toast('Add at least one exercise', 'error');
      return;
    }

    const startedAt   = new Date(draft.date).toISOString();
    const completedAt = startedAt; // duration unknown for past workouts

    const isEdit = !!draft.editId;
    const existing = isEdit ? DB.getWorkout(draft.editId) : null;

    const workout = {
      id:          isEdit ? draft.editId : DB.uid(),
      name:        draft.name || 'Workout',
      routineId:   existing?.routineId   || null,
      routineDayId:existing?.routineDayId|| null,
      startedAt,
      completedAt: isEdit ? (existing?.completedAt || completedAt) : completedAt,
      exercises:   draft.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, completed: true }))
      })),
      notes:       draft.notes
    };

    DB.saveWorkout(workout);
    Firebase.onReady(() => Firebase.syncWorkout(workout).catch(() => {}));
    App.state.pastWorkoutDraft = null;
    this._toast(isEdit ? 'Workout updated!' : 'Workout saved!', 'success');
    if (isEdit) {
      this.navigate('workout-detail', { workoutId: workout.id });
    } else {
      this.navigate('history');
    }
  },

  // ── Metric CRUD ─────────────────────────────────────────────────────────────
  _saveMetric() {
    const get = id => document.getElementById(id)?.value;
    const num = v => v ? parseFloat(v) : null;

    const metric = {
      id:     DB.uid(),
      date:   get('metric-date') || new Date().toISOString().slice(0, 10),
      weight: num(get('metric-weight')),
      bodyFat:num(get('metric-bodyfat')),
      measurements: {
        chest:   num(get('metric-chest')),
        waist:   num(get('metric-waist')),
        hips:    num(get('metric-hips')),
        lArm:    num(get('metric-l-arm')),
        rArm:    num(get('metric-r-arm')),
        lThigh:  num(get('metric-l-thigh')),
        rThigh:  num(get('metric-r-thigh')),
      }
    };

    if (!metric.weight && !metric.bodyFat) {
      this._toast('Enter at least weight or body fat', 'error');
      return;
    }
    DB.saveBodyMetric(metric);
    Firebase.onReady(() => Firebase.syncMetric(metric).catch(() => {}));
    this._toast('Metrics saved!', 'success');
    this.navigate('profile');
  },

  // ── Helpers ─────────────────────────────────────────────────────────────────
  _prevScreen() {
    const map = {
      'routine-detail':  'routines',
      'create-routine':  'routines',
      'workout-detail':  'history',
      'log-metric':      'profile',
      'log-past-workout':'history',
      'active-workout':  'workout',
    };
    return map[this.state.screen] || 'dashboard';
  },

  _workoutCard(w) {
    const duration = App._fmtDuration(
      (new Date(w.completedAt || w.startedAt) - new Date(w.startedAt)) / 1000
    );
    const vol      = DB.calcTotalVolume([w]);
    const exNames  = (w.exercises || []).slice(0, 4).map(e => e.exerciseName).join(' · ');
    const type     = w.exercises?.[0] ? (getExercise(w.exercises[0].exerciseId)?.category || 'custom') : 'custom';
    const badgeType = ['hyrox','crossfit','cardio','strength'].includes(type) ? type : 'custom';

    return `
    <div class="workout-card" data-action="open-workout" data-id="${w.id}">
      <div class="workout-card-top">
        <div>
          <div class="workout-card-name">${w.name}</div>
          <div class="workout-card-date">${App._fmtDateFull(new Date(w.startedAt))}</div>
        </div>
        <span class="badge badge-${badgeType}">${badgeType}</span>
      </div>
      <div class="workout-card-meta">
        <span>${App._icon('clock', 13)} ${duration}</span>
        <span>${App._icon('weight', 13)} ${App._fmtVol(vol)} kg</span>
        <span>${App._icon('list', 13)} ${w.exercises?.length || 0} exercises</span>
      </div>
      ${exNames ? `<div class="workout-card-exercises">${exNames}</div>` : ''}
    </div>`;
  },

  _routineCard(r, kind) {
    const typeColors = { hyrox: 'hyrox', crossfit: 'crossfit', strength: 'strength', cardio: 'cardio' };
    const typeIcons  = { hyrox: '🏅', crossfit: '🔥', strength: '🏋️', cardio: '🏃', hiit: '⚡', custom: '📋', mixed: '⚡' };
    const badge      = typeColors[r.type] || 'custom';

    return `
    <div class="routine-card" data-action="open-routine" data-id="${r.id}">
      <div class="routine-card-top">
        <div class="routine-type-icon badge-${badge}" style="background:var(--bg3)">${typeIcons[r.type]||'📋'}</div>
        <div>
          <div class="routine-card-name">${r.name}</div>
          <div class="routine-card-sub">
            <span class="badge badge-${badge}" style="margin-right:.3rem">${r.type}</span>
            ${r.daysPerWeek ? r.daysPerWeek + ' days/week' : r.days.length + ' days'} · ${this._fmtGoal(r.goal)}
          </div>
        </div>
      </div>
      ${r.description ? `<div class="routine-card-desc">${r.description}</div>` : ''}
    </div>`;
  },

  _exerciseBlock(ex, ei) {
    const isActivity = ex.measureType === 'activity';
    const setsHtml = isActivity
      ? ex.sets.map((s, si) => App._activitySetRow(s, ei, si, false)).join('')
      : ex.sets.map((s, si) => `
      <div class="set-row ${s.completed ? 'completed' : ''}" data-ei="${ei}" data-si="${si}">
        <span class="set-num">${s.type === 'warmup' ? 'W' : s.setNumber}</span>
        <input type="number" class="set-input" inputmode="decimal"
          placeholder="kg" value="${s.weight || ''}"
          data-field="weight" data-ei="${ei}" data-si="${si}">
        <input type="number" class="set-input" inputmode="numeric"
          placeholder="reps" value="${s.reps || ''}"
          data-field="reps" data-ei="${ei}" data-si="${si}">
        <button class="set-complete-btn ${s.completed ? 'done' : ''}"
          data-action="complete-set" data-ei="${ei}" data-si="${si}">
          ${s.completed ? this._icon('check', 16) : ''}
        </button>
      </div>`).join('');

    const setsHeader = isActivity
      ? ''
      : `<div class="sets-header">
           <span style="text-align:center">Set</span>
           <span style="text-align:center">Weight</span>
           <span style="text-align:center">Reps</span>
           <span style="text-align:center">Done</span>
         </div>`;

    const addLabel = isActivity ? '+ Session' : '+ Set';

    return `
    <div class="exercise-block">
      <div class="exercise-block-header">
        <div style="flex:1;min-width:0">
          <div class="exercise-block-name">${ex.exerciseName}</div>
          <div class="exercise-block-sub">
            ${isActivity ? `${ex.sets.length} session${ex.sets.length !== 1 ? 's' : ''}` : `${ex.targetSets}×${ex.targetReps}${ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}`}
          </div>
          ${ex.suggestion ? `<div class="suggestion-chip">${ex.suggestion}</div>` : ''}
        </div>
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.exerciseName + ' exercise tutorial')}"
           target="_blank" rel="noopener"
           style="color:var(--red);padding:.4rem .5rem;display:flex;align-items:center;flex-shrink:0"
           title="Watch video">${App._icon('video', 18)}</a>
        <button class="btn btn-sm btn-danger" data-action="remove-exercise" data-ei="${ei}">✕</button>
      </div>
      ${setsHeader}
      <div class="sets-table">${setsHtml}</div>
      <div class="set-add-row">
        <button class="btn btn-sm btn-secondary" style="flex:1" data-action="add-set" data-ei="${ei}">${addLabel}</button>
      </div>
    </div>`;
  },

  _blankSet(num, isActivity = false) {
    return isActivity
      ? { setNumber: num, duration: null, avgHr: null, maxHr: null, calories: null, completed: false, type: 'normal' }
      : { setNumber: num, weight: null, reps: null, completed: false, type: 'normal' };
  },

  _activitySetRow(s, ei, si, isPast = false) {
    const dp = isPast ? 'data-past="1"' : '';
    const noInteract = isPast ? 'style="pointer-events:none"' : '';
    return `
    <div class="activity-set-row ${s.completed ? 'completed' : ''}" data-ei="${ei}" data-si="${si}">
      <div class="activity-set-head">
        <span class="set-num">${s.setNumber}</span>
        <span class="activity-sess-lbl">Session ${s.setNumber}</span>
        <button class="set-complete-btn ${s.completed ? 'done' : ''}" ${noInteract}
          ${!isPast ? `data-action="complete-set" data-ei="${ei}" data-si="${si}"` : ''}>
          ${s.completed ? App._icon('check', 16) : ''}
        </button>
      </div>
      <div class="activity-fields">
        <div class="activity-field">
          <span class="activity-lbl">Duration</span>
          <div class="activity-input-wrap">
            <input type="number" class="set-input activity-input" inputmode="decimal"
              placeholder="—" value="${s.duration || ''}"
              data-field="duration" data-ei="${ei}" data-si="${si}" ${dp}>
            <span class="activity-unit">min</span>
          </div>
        </div>
        <div class="activity-field">
          <span class="activity-lbl">Avg HR</span>
          <div class="activity-input-wrap">
            <input type="number" class="set-input activity-input" inputmode="numeric"
              placeholder="—" value="${s.avgHr || ''}"
              data-field="avgHr" data-ei="${ei}" data-si="${si}" ${dp}>
            <span class="activity-unit">bpm</span>
          </div>
        </div>
        <div class="activity-field">
          <span class="activity-lbl">Max HR</span>
          <div class="activity-input-wrap">
            <input type="number" class="set-input activity-input" inputmode="numeric"
              placeholder="—" value="${s.maxHr || ''}"
              data-field="maxHr" data-ei="${ei}" data-si="${si}" ${dp}>
            <span class="activity-unit">bpm</span>
          </div>
        </div>
        <div class="activity-field">
          <span class="activity-lbl">Calories</span>
          <div class="activity-input-wrap">
            <input type="number" class="set-input activity-input" inputmode="numeric"
              placeholder="—" value="${s.calories || ''}"
              data-field="calories" data-ei="${ei}" data-si="${si}" ${dp}>
            <span class="activity-unit">kcal</span>
          </div>
        </div>
      </div>
    </div>`;
  },

  _pastExerciseBlock(ex, ei) {
    const isActivity = ex.measureType === 'activity';
    const setsHtml = isActivity
      ? ex.sets.map((s, si) => App._activitySetRow(s, ei, si, true)).join('')
      : ex.sets.map((s, si) => `
      <div class="set-row completed" data-ei="${ei}" data-si="${si}">
        <span class="set-num">${s.setNumber}</span>
        <input type="number" class="set-input" inputmode="decimal"
          placeholder="kg" value="${s.weight || ''}"
          data-field="weight" data-ei="${ei}" data-si="${si}" data-past="1">
        <input type="number" class="set-input" inputmode="numeric"
          placeholder="reps" value="${s.reps || ''}"
          data-field="reps" data-ei="${ei}" data-si="${si}" data-past="1">
        <button class="set-complete-btn done" style="pointer-events:none">
          ${App._icon('check', 16)}
        </button>
      </div>`).join('');

    const setsHeader = isActivity
      ? ''
      : `<div class="sets-header">
           <span style="text-align:center">Set</span>
           <span style="text-align:center">Weight</span>
           <span style="text-align:center">Reps</span>
           <span style="text-align:center">Done</span>
         </div>`;

    return `
    <div class="exercise-block" style="margin:.5rem 1rem 0">
      <div class="exercise-block-header">
        <div style="flex:1;min-width:0">
          <div class="exercise-block-name">${ex.exerciseName}</div>
        </div>
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.exerciseName + ' exercise tutorial')}"
           target="_blank" rel="noopener"
           style="color:var(--red);padding:.4rem .5rem;display:flex;align-items:center;flex-shrink:0"
           title="Watch video">${App._icon('video', 18)}</a>
        <button class="btn btn-sm btn-danger" data-action="remove-past-exercise" data-ei="${ei}">✕</button>
      </div>
      ${setsHeader}
      <div class="sets-table">${setsHtml}</div>
      <div class="set-add-row">
        <button class="btn btn-sm btn-secondary" style="flex:1"
          data-action="add-past-set" data-ei="${ei}">${isActivity ? '+ Session' : '+ Set'}</button>
      </div>
    </div>`;
  },

  _metricRows(m) {
    const rows = [
      ['Weight', m.weight ? m.weight + ' kg' : null],
      ['Body Fat', m.bodyFat ? m.bodyFat + '%' : null],
      ['Chest', m.measurements?.chest ? m.measurements.chest + ' cm' : null],
      ['Waist', m.measurements?.waist ? m.measurements.waist + ' cm' : null],
      ['Hips', m.measurements?.hips ? m.measurements.hips + ' cm' : null],
      ['Left Arm', m.measurements?.lArm ? m.measurements.lArm + ' cm' : null],
      ['Right Arm', m.measurements?.rArm ? m.measurements.rArm + ' cm' : null],
      ['Left Thigh', m.measurements?.lThigh ? m.measurements.lThigh + ' cm' : null],
      ['Right Thigh', m.measurements?.rThigh ? m.measurements.rThigh + ' cm' : null],
    ].filter(r => r[1]);

    return rows.map(([label, value]) => `
      <div class="metric-row">
        <span class="metric-label">${label}</span>
        <span class="metric-value">${value}</span>
      </div>`).join('');
  },

  // ── Formatting ──────────────────────────────────────────────────────────────
  _fmtDuration(secs) {
    if (!secs || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  },

  _fmtVol(v) {
    if (!v) return '0';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return Math.round(v).toString();
  },

  _fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  },

  _fmtDateFull(d) {
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  },

  _fmtGoal(g) {
    const map = { muscle: 'Build Muscle', fat_loss: 'Lose Fat', bulking: 'Bulk', endurance: 'Endurance', strength: 'Strength' };
    return map[g] || g || '—';
  },

  _goalShort(g) {
    const map = { muscle: 'Muscle', fat_loss: 'Fat Loss', bulking: 'Bulk', endurance: 'Endurance', strength: 'Strength' };
    return map[g] || g || '—';
  },

  _capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); },

  _exIcon(exerciseId) {
    const cat = getExercise(exerciseId)?.category || '';
    const map = { chest:'🏋️', back:'💪', shoulders:'🔼', arms:'💪', legs:'🦵', core:'⚡', hyrox:'🏅', crossfit:'🔥', cardio:'🏃', boxing:'🥊', fitness_class:'🧘' };
    return map[cat] || '💪';
  },

  _toast(msg, type = '') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  },

  // ── SVG Icons ───────────────────────────────────────────────────────────────
  _icon(name, size = 20, color = 'currentColor') {
    const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    const paths = {
      play:         `<polygon points="5,3 19,12 5,21"/>`,
      check:        `<polyline points="20,6 9,17 4,12"/>`,
      plus:         `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
      'chevron-left': `<polyline points="15,18 9,12 15,6"/>`,
      'chevron-right': `<polyline points="9,18 15,12 9,6"/>`,
      home:         `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>`,
      dumbbell:     `<path d="M6.5 6.5h11M6.5 17.5h11M3 9.5h18M3 14.5h18"/><rect x="5" y="5" width="3" height="14" rx="1"/><rect x="16" y="5" width="3" height="14" rx="1"/>`,
      list:         `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`,
      calendar:     `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
      person:       `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
      clock:        `<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>`,
      weight:       `<circle cx="12" cy="12" r="3"/><path d="M6.5 6.5h11m-11 11h11M3 9.5h18M3 14.5h18"/>`,
      search:       `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
      chart:        `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
      video:        `<polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/>`,
    };
    return `<svg ${s}>${paths[name] || ''}</svg>`;
  },
};

// ── Boot ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
