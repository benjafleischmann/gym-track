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
    progressRange: 90,    // days shown on the Progress charts; null = all time
    progressExerciseId: null,
    progressRoutineId: null,
    // Workout library browsing. `workoutCategory` is held in state rather than
    // in params so going back from a workout returns to the category it was
    // opened from. `workoutLevel` is cleared whenever a workout is opened, so
    // each one starts at its own difficulty.
    workoutCategory: null,
    workoutLevel: null,
    workoutDiffFilter: null,
    // Garmin lookup results, held in memory only — nothing is written to the
    // workout log until the user confirms the import.
    garmin: { loading: false, error: null, preview: null, selected: new Set(), range: 30 },
  },

  // ── Boot ───────────────────────────────────────────────────────────────────
  init() {
    // Fold the generated photo library in behind the hand-written exercises.
    // Hand-written ones come first so they win in search and keep their ids,
    // which routines and already-logged workouts reference.
    if (typeof EXERCISE_LIBRARY !== 'undefined' && !EXERCISES.some(e => e.id.startsWith('x-'))) {
      // Give the hand-written entries a reference photo where the dataset has
      // one, using the same loose name key the generator matched on.
      const key = n => n.toLowerCase().replace(/[-/]/g, ' ').replace(/\b(db|bb|kb)\b/g, '')
                        .replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean).join(' ');
      EXERCISES.forEach(e => { if (!e.image) e.image = EXERCISE_PHOTOS[key(e.name)]; });

      EXERCISES.push(...EXERCISE_LIBRARY);
    }

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
        // Signed in from onboarding with nothing stored locally. Pull the cloud
        // copy first — a returning user should not be asked to redo the
        // assessment — and only run the questions when there is genuinely no
        // profile to restore.
        if (!DB.getProfile()) {
          const name = Firebase.userName || 'Athlete';
          Firebase.restoreFromCloud().then(count => {
            if (count > 0) App._toast(`Welcome back! Synced ${count} items.`, 'success');
            if (DB.getProfile()) {
              document.getElementById('bottom-nav').classList.remove('hidden');
              App.navigate('dashboard');
            } else {
              App.showOnboarding({ name });
            }
          }).catch(() => App.showOnboarding({ name }));
          return;
        }
        // Push any local data to Firestore, then pull from cloud
        App._syncLocalDataToCloud().catch(() => {});
        Firebase.restoreFromCloud().then(count => {
          if (count > 0) App._toast(`Synced ${count} items from cloud`, 'success');
        }).catch(() => {});
      }
      // Refresh profile screen if visible
      if (App.state.screen === 'profile') App.navigate('profile');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        // An installed PWA can sit on one process for days, so ask for a fresh
        // sw.js on launch and whenever it comes back to the foreground.
        reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) reg.update().catch(() => {});
        });
      }).catch(() => {});
    }

    // Watch sessions should just be there, the same way the watch itself needs
    // no prompting. Garmin throttles this internally, so firing it on every
    // return to the foreground is cheap.
    this._autoSync();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this._autoSync();
    });
    this._bindPullToRefresh();
  },

  /**
   * Background Garmin pull. Only announces itself when it actually found
   * something, and re-renders so new sessions appear without a navigation.
   */
  async _autoSync({ force = false } = {}) {
    const res = await Garmin.autoSync({ force });
    if (!res) return res;

    // A session pulled in the background has to reach the cloud the same way a
    // hand-picked import does, or it only ever exists on the device that
    // happened to be open when the watch finished uploading.
    const written = res.saved.concat(res.updated);
    if (!written.length) return res;
    Firebase.onReady(() => written.forEach(w => Firebase.syncWorkout(w).catch(() => {})));

    const bits = [];
    if (res.saved.length)   bits.push(`${res.saved.length} new`);
    if (res.updated.length) bits.push(`${res.updated.length} updated`);
    this._toast(
      `Synced ${bits.join(' · ')} ${written.length === 1 ? 'session' : 'sessions'}`, 'success');
    this._render();
    return res;
  },

  /**
   * Pull-to-refresh, on every screen.
   *
   * The document itself scrolls and `overscroll-behavior: none` already
   * suppresses WebKit's rubber-band, so an overscroll drag at the top of the
   * page is unclaimed and ours to use.
   */
  _bindPullToRefresh() {
    const THRESHOLD = 70;   // pull distance that commits to a refresh
    const MAX       = 110;  // where the indicator stops following the finger

    const el = document.createElement('div');
    el.id = 'ptr';
    el.innerHTML = '<div class="ptr-ring"></div>';
    document.body.appendChild(el);

    let startY = null, startX = 0, dist = 0, pulling = false, busy = false;

    const reset = () => {
      el.classList.remove('ptr-visible', 'ptr-ready');
      el.style.transform = '';
      startY = null; dist = 0; pulling = false;
    };

    document.addEventListener('touchstart', e => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0) return;
      // A downward drag inside a sheet, a modal or a sideways-scrolling strip
      // belongs to that element, not to the page.
      if (e.target.closest('.bottom-sheet, .modal, .day-pills, .tab-bar')) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (startY === null || busy) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // Let a mostly-sideways gesture through untouched, or swiping across a
      // carousel near the top of the page would trigger a refresh.
      if (!pulling && Math.abs(dx) > Math.abs(dy)) { startY = null; return; }
      if (dy <= 0 || window.scrollY > 0) { if (pulling) reset(); return; }

      pulling = true;
      dist = Math.min(MAX, dy * 0.5);   // resistance, so it eases rather than tracking 1:1
      el.classList.add('ptr-visible');
      el.classList.toggle('ptr-ready', dist >= THRESHOLD);
      el.style.transform = `translate(-50%, ${dist}px)`;
      e.preventDefault();               // keep the pull from becoming a scroll
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (startY === null) return;
      if (!pulling || dist < THRESHOLD) return reset();

      busy = true;
      el.classList.add('ptr-busy');
      el.style.transform = `translate(-50%, ${THRESHOLD}px)`;
      // Hold the spinner briefly even on an instant result, so a refresh that
      // finds nothing still reads as having happened.
      Promise.all([
        this._autoSync({ force: true }).catch(() => null),
        new Promise(r => setTimeout(r, 600)),
      ]).finally(() => {
        busy = false;
        el.classList.remove('ptr-busy');
        reset();
      });
    }, { passive: true });
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
      case 'workout-complete':app.innerHTML = this.screens.workoutComplete(params.workout, params.prs); break;
      case 'routines':        app.innerHTML = this.screens.routines();        break;
      case 'routine-detail':  app.innerHTML = this.screens.routineDetail(params.routineId); break;
      case 'workout-category':app.innerHTML = this.screens.workoutCategory();  break;
      case 'create-routine':  app.innerHTML = this.screens.createRoutine(params.routineId); break;
      case 'progress':        app.innerHTML = this.screens.progress();        break;
      case 'workout-detail':  app.innerHTML = this.screens.workoutDetail(params.workoutId); break;
      case 'profile':         app.innerHTML = this.screens.profile();         break;
      case 'log-metric':      app.innerHTML = this.screens.logMetric();       break;
      case 'log-past-workout': app.innerHTML = this.screens.logPastWorkout(); break;
      case 'garmin-sync':     app.innerHTML = this.screens.garminSync();     break;
      default:                app.innerHTML = this.screens.dashboard();
    }
    this._afterRender();
  },

  _afterRender() {
    const s = this.state.screen;
    if (s === 'dashboard')       { this._initCharts(['weekly-volume','body-weight-mini']); }
    if (s === 'active-workout')  { this._startWorkoutTimer(); }
    if (s === 'profile')         { this._loadFriendsSection(); this._showBuildId(); }
    // Look up Garmin on arrival so the screen is never an empty shell, but only
    // when there is nothing on screen yet — re-rendering after a toggle must not
    // refetch and wipe the selection.
    if (s === 'garmin-sync' && Garmin.isConfigured() &&
        !this.state.garmin.preview && !this.state.garmin.loading && !this.state.garmin.error) {
      this._garminLoad();
    }
    if (s === 'progress') {
      const tab = this.state.activeTab['progress'] || 0;
      if (tab === 0) this._renderCalendar();
      if (tab === 1) this._initCharts(['exercise-progress','muscle-volume']);
      if (tab === 2) this._initCharts(['body-weight-chart','body-fat-chart','goal-trajectory']);
    }
  },

  // Reads the build straight off the service worker's cache name, so the label
  // reflects the code actually running on the device rather than a constant
  // that a stale cache would happily keep showing.
  async _showBuildId() {
    const el = document.getElementById('build-id');
    if (!el) return;
    try {
      const name = (await caches.keys()).find(k => /^gymtrack-v\d+(\.\d+)?$/.test(k));
      el.textContent = name ? name.replace('gymtrack-', '') : 'not cached';
    } catch {
      el.textContent = 'unknown';
    }
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
          <button data-action="nav" data-screen="progress">See all</button>
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
          <button class="tab-btn ${tab===0?'active':''}" data-action="set-tab" data-screen="workout" data-tab="0">Workouts</button>
          <button class="tab-btn ${tab===1?'active':''}" data-action="set-tab" data-screen="workout" data-tab="1">My Routines</button>
        </div>

        <div style="padding:.75rem 1rem 0">
          ${tab === 0 ? App._workoutCategoryGrid() : myCards}
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
    workoutComplete(w, prs = []) {
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

        ${prs.length ? `
        <div class="section-header"><h2>New Records</h2></div>
        <div style="padding:0 1rem">
          ${prs.map(p => `
            <div class="pr-banner">
              <span class="pr-banner-icon">🏆</span>
              <div>
                <div class="pr-banner-name">${p.name}</div>
                <div class="pr-banner-sub">${p.kind === 'weight' ? 'Heaviest set' : 'Best est. 1RM'}
                  ${p.value} kg <span style="color:var(--txt3)">· was ${Math.round(p.previous * 10) / 10} kg</span></div>
              </div>
            </div>`).join('')}
        </div>` : ''}

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
          <button class="tab-btn ${tab===0?'active':''}" data-action="set-tab" data-screen="routines" data-tab="0">Recommended</button>
          <button class="tab-btn ${tab===1?'active':''}" data-action="set-tab" data-screen="routines" data-tab="1">Workouts</button>
          <button class="tab-btn ${tab===2?'active':''}" data-action="set-tab" data-screen="routines" data-tab="2">My Routines</button>
        </div>

        <div style="padding:.75rem 1rem 0">
          ${tab === 0
            ? App._recommendedTab()
            : tab === 1
              ? App._workoutCategoryGrid()
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

    // ── Workouts in one category ──────────────────────────────────────────────
    workoutCategory() {
      const key  = App.state.workoutCategory;
      const meta = WORKOUT_CATEGORIES[key];
      if (!meta) return App.screens.routines();

      const all    = ROUTINE_TEMPLATES.filter(t => t.type === key);
      const filter = App.state.workoutDiffFilter;
      const shown  = filter ? all.filter(t => App._workoutHasLevel(t, filter)) : all;

      // Sorted easiest first so the list reads as a progression rather than in
      // whatever order the library happens to declare them.
      shown.sort((a, b) => DIFFICULTIES[a.difficulty].order - DIFFICULTIES[b.difficulty].order);

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${meta.name}</span>
          <div style="width:2rem"></div>
        </div>

        <div style="padding:0 1rem .5rem">
          <p style="font-size:.82rem;color:var(--txt2);line-height:1.5;margin:0">${meta.blurb}</p>
        </div>

        <div class="filter-chips">
          <button class="chip ${!filter ? 'selected' : ''}" data-action="set-diff-filter" data-diff="">All</button>
          ${WORKOUT_LEVELS.map(l => `
            <button class="chip ${filter === l ? 'selected' : ''}" data-action="set-diff-filter" data-diff="${l}">${DIFFICULTIES[l].name}</button>
          `).join('')}
        </div>

        <div style="padding:.25rem 1rem 0">
          ${shown.length
            ? shown.map(t => App._routineCard(t, 'template', true)).join('')
            : `<div class="empty-state">
                <div class="empty-state-icon">${meta.icon}</div>
                <div class="empty-state-title">Nothing at this level</div>
                <div class="empty-state-text">No ${meta.name} workout runs at ${DIFFICULTIES[filter].name.toLowerCase()} level yet.</div>
              </div>`}
        </div>
      </div>`;
    },

    // ── Routine Detail ────────────────────────────────────────────────────────
    routineDetail(routineId) {
      const base = routineId === 'rec-plan'
        ? App._recPlan()
        : routineId.startsWith('tpl-')
          ? ROUTINE_TEMPLATES.find(t => t.id === routineId)
          : DB.getRoutine(routineId);
      if (!base) return App.screens.routines();

      // Everything below reads from the levelled copy, so the sets, reps and
      // rest on screen are exactly what pressing Start will log.
      const level  = App._workoutLevel(base);
      const r      = scaleWorkout(base, level);
      const levels = App._workoutLevels(base);

      const isTemplate = routineId.startsWith('tpl-');
      const isRec      = routineId === 'rec-plan';
      const profile    = DB.getProfile() || {};
      const tab = App.state.activeTab['routine-detail'] || 0;
      const day = r.days[tab] || r.days[0];

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${r.name}</span>
          <div style="display:flex;gap:.4rem">
            ${isRec
              ? `<button class="btn btn-sm btn-ghost" data-action="save-rec-plan">Save</button>`
              : isTemplate
                ? `<button class="btn btn-sm btn-ghost" data-action="save-template" data-id="${r.id}" data-level="${level}">Save</button>`
                : `<button class="btn btn-sm btn-danger" data-action="delete-routine" data-id="${r.id}">Delete</button>`}
          </div>
        </div>

        <div style="padding:.5rem 1rem">
          <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem">
            <div class="badge badge-${r.type}">${(WORKOUT_CATEGORIES[r.type] || {}).name || r.type}</div>
            ${r.difficulty ? `<div class="diff-pill diff-${r.difficulty}">${DIFFICULTIES[r.difficulty].name}</div>` : ''}
          </div>
          ${r.description ? `<p style="font-size:.85rem;color:var(--txt2);line-height:1.5">${r.description}</p>` : ''}
          <div style="display:flex;gap:.75rem;margin-top:.5rem;font-size:.8rem;color:var(--txt2);flex-wrap:wrap">
            <span>${r.days.length} day${r.days.length>1?'s':''}/week</span>
            <span>·</span>
            <span>Goal: ${App._fmtGoal(r.goal)}</span>
            ${r.durationMin ? `<span>·</span><span>~${r.durationMin} min</span>` : ''}
          </div>
        </div>

        ${levels.length > 1 ? `
        <div style="padding:0 1rem .25rem">
          <div class="level-label">Level</div>
          <div class="level-switch">
            ${levels.map(l => `
              <button class="level-btn ${l === level ? 'active' : ''}" data-action="set-workout-level" data-level="${l}">${DIFFICULTIES[l].name}</button>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="tab-bar" style="padding:0 .5rem">
          ${r.days.map((d, i) => `
            <button class="tab-btn ${i===tab?'active':''}" data-action="set-tab" data-screen="routine-detail" data-tab="${i}">${d.name}</button>
          `).join('')}
        </div>

        ${day ? `
        <div style="padding:.75rem 1rem 0">
          ${day.exercises.map(ex => {
            const info  = getExercise(ex.exerciseId);
            const notes = isRec ? Recommend.injuryNotes(ex.exerciseId, profile) : [];
            return `
            <div class="list-item routine-ex ${ex.prep ? 'is-prep' : ''}" style="cursor:default;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:.4rem;background:var(--bg2)">
              <div class="list-item-left">
                <div class="list-item-icon">${App._exIcon(ex.exerciseId)}</div>
                <div>
                  <div class="list-item-name">
                    ${info ? info.name : ex.exerciseId}
                    ${ex.prep ? `<span class="prep-tag">prep · ${ex.forArea}</span>` : ''}
                    ${ex.finisher ? `<span class="prep-tag">finisher</span>` : ''}
                  </div>
                  <div class="list-item-sub">
                    ${ex.sets} × ${ex.reps}${ex.rest ? ` · ${ex.rest}s rest` : ''}
                    ${ex.suggestedKg ? ` · <span class="sugg-kg">${ex.suggestedKg} kg</span>` : ''}
                    ${isRec && !ex.suggestedKg && ex.loadSource === 'rir' ? ` · <span class="sugg-rir">pick a weight leaving 2 reps in reserve</span>` : ''}
                  </div>
                  ${notes.map(n => `<div class="ex-caution">${n.label}: ${n.note}</div>`).join('')}
                </div>
              </div>
              ${info ? `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(info.name + ' how to tutorial')}" target="_blank" class="yt-demo-btn" title="Watch demo on YouTube">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              </a>` : ''}
            </div>`;
          }).join('')}
        </div>` : ''}

        <div style="padding:1rem">
          <button class="btn btn-primary" data-action="start-routine" data-id="${r.id}" data-day="${tab}" data-level="${level}">
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

    // ── Progress ──────────────────────────────────────────────────────────────
    progress() {
      const tab = App.state.activeTab['progress'] || 0;
      return `
      <div class="screen">
        <div class="screen-header">
          <h1>Progress</h1>
          ${tab === 0 ? `<button class="btn btn-sm btn-ghost" data-action="new-past-workout">+ Log</button>` : ''}
          ${tab === 2 ? `<button class="btn btn-sm btn-ghost" data-action="nav" data-screen="log-metric">+ Log</button>` : ''}
        </div>

        <div class="tab-bar">
          <button class="tab-btn ${tab===0?'active':''}" data-action="set-tab" data-screen="progress" data-tab="0">Calendar</button>
          <button class="tab-btn ${tab===1?'active':''}" data-action="set-tab" data-screen="progress" data-tab="1">Strength</button>
          <button class="tab-btn ${tab===2?'active':''}" data-action="set-tab" data-screen="progress" data-tab="2">Body</button>
        </div>

        ${tab === 0 ? App._progressCalendarTab()
          : tab === 1 ? App._progressStrengthTab()
          : App._progressBodyTab()}
      </div>`;
    },

    // ── Workout Detail ────────────────────────────────────────────────────────
    workoutDetail(workoutId) {
      const w = DB.getWorkout(workoutId);
      if (!w) return App.screens.progress();

      const durationSecs = App._workoutDuration(w);
      const duration = durationSecs ? App._fmtDuration(durationSecs) : '—';
      const totalVol = DB.calcTotalVolume([w]);

      const exBlocks = w.exercises.map(ex => {
        // Older workouts predate `measureType` being stored on the exercise, so
        // fall back to the shape of the logged sets.
        const first = ex.sets[0];
        const mt = ex.measureType
          || (first?.distance !== undefined ? 'distance'
              : first?.duration !== undefined ? 'activity' : null);
        const isCardio = App._isCardio(mt);
        const cols = isCardio ? App._setFields(mt) : null;
        const tableHead = isCardio
          ? `<td style="padding:.4rem 1rem">#</td>
             ${cols.map(f => `<td style="padding:.4rem .5rem">${f.label}</td>`).join('')}`
          : `<td style="padding:.4rem 1rem">Set</td>
             <td style="padding:.4rem .5rem">Weight</td>
             <td style="padding:.4rem .5rem">Reps</td>
             <td style="padding:.4rem 1rem .4rem .5rem">Done</td>`;
        const rows = ex.sets.map(s => {
          const cells = isCardio
            ? `<td style="padding:.4rem 1rem;font-size:.8rem;color:var(--txt3)">${s.setNumber}</td>
               ${cols.map(f => `<td style="padding:.4rem .5rem;font-weight:600">${s[f.key] ? s[f.key] + ' ' + f.unit : '—'}</td>`).join('')}`
            : `<td style="padding:.4rem 1rem;font-size:.8rem;color:var(--txt3)">${s.setNumber}</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.weight||'—'} kg</td>
               <td style="padding:.4rem .5rem;font-weight:600">${s.reps||'—'}</td>
               <td style="padding:.4rem 1rem .4rem .5rem">${s.completed ? '✓' : '—'}</td>`;
          return `<tr style="border-top:1px solid var(--border);${s.completed?'':'opacity:.4'}">${cells}</tr>`;
        }).join('');

        const totalKm = mt === 'distance'
          ? ex.sets.reduce((sum, s) => sum + (parseFloat(s.distance) || 0), 0)
          : 0;
        const totalMin = mt === 'distance'
          ? ex.sets.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0)
          : 0;
        const summary = totalKm
          ? `<div class="exercise-block-sub" style="padding:0 1rem .5rem">
               ${totalKm.toFixed(2)} km${App._pace({ distance: totalKm, duration: totalMin })
                 ? ` · ${App._pace({ distance: totalKm, duration: totalMin })}` : ''}
             </div>`
          : '';
        // Garmin guessed this exercise from wrist motion, so make the name a
        // tappable correction rather than presenting it as fact.
        const ei = w.exercises.indexOf(ex);
        const nameCell = ex.guessed
          ? `<button class="btn-ghost" data-action="fix-garmin-exercise"
                     data-id="${w.id}" data-ei="${ei}"
                     style="display:flex;align-items:center;gap:.35rem;padding:0;border:0;background:none;text-align:left">
               <span class="exercise-block-name">${ex.exerciseName}</span>
               <span style="font-size:.62rem;text-transform:uppercase;letter-spacing:.4px;
                            color:var(--orange,#c87f2a);border:1px solid currentColor;
                            border-radius:3px;padding:0 .25rem">guess</span>
               ${App._icon('chevron-right', 13)}
             </button>`
          : `<div class="exercise-block-name">${ex.exerciseName}</div>`;

        return `
          <div style="margin:.5rem 1rem 0">
            <div class="exercise-block">
              <div class="exercise-block-header">
                <div>${nameCell}</div>
              </div>
              ${summary}
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

        ${w.needsReview ? `
        <div style="margin:.25rem 1rem;padding:.6rem .75rem;border-radius:var(--radius);
                    background:var(--bg2);border:1px solid var(--orange,#c87f2a);
                    font-size:.78rem;line-height:1.45;color:var(--txt2)">
          <strong style="color:var(--txt)">Imported from Garmin</strong> — reps and weights
          are exact, but your watch guessed the exercise names. Tap any name marked
          <em>guess</em> to correct it.
          <button class="btn btn-sm btn-secondary" style="margin-top:.5rem;width:100%"
                  data-action="confirm-garmin-review" data-id="${w.id}">Names look right</button>
        </div>` : ''}

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
      const metrics    = DB.getBodyMetrics();
      const latest     = metrics[0] || null;
      const profile    = DB.getProfile() || {};
      const allWkts    = DB.getWorkouts();
      const streak     = DB.getCurrentStreak();
      const name       = profile.name || 'Athlete';
      const initial    = name[0].toUpperCase();

      const fbName  = Firebase.ready ? Firebase.userName : null;
      const fbPhoto = Firebase.ready ? Firebase.userPhoto : null;
      const displayName = fbName || name;
      const cfg     = Garmin.config();

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

        <!-- ── Training assessment ── -->
        <div class="section-header" style="margin-top:.75rem">
          <h2>Training Assessment</h2>
          <button class="btn btn-sm btn-ghost" data-action="retake-assessment">
            ${Recommend.isAssessed(profile) ? 'Update' : 'Start'}
          </button>
        </div>
        <div style="padding:0 1rem">
          ${Recommend.isAssessed(profile) ? `
            <div class="assess-card">
              <div class="assess-grid">
                <div><span>Experience</span><strong>${App._fmtExperience(profile.experience)}</strong></div>
                <div><span>Days / week</span><strong>${profile.daysPerWeek || '—'}</strong></div>
                <div><span>Weight</span><strong>${profile.weightKg ? profile.weightKg + ' kg' : '—'}</strong></div>
                <div><span>Height</span><strong>${profile.heightCm ? profile.heightCm + ' cm' : '—'}</strong></div>
                <div><span>Equipment</span><strong>${Recommend.EQUIPMENT[profile.equipment]?.label || '—'}</strong></div>
                <div><span>Goal</span><strong>${App._fmtGoal(profile.goal)}</strong></div>
              </div>
              ${profile.injuries?.length ? `
                <div class="assess-injuries">
                  ${profile.injuries.map(i => `<span class="injury-pill">${Recommend.INJURY[i.area]?.label || i.area}${i.type ? ` · ${i.type}` : ''}</span>`).join('')}
                </div>` : ''}
              ${profile.assessedAt ? `<div class="assess-when">Last updated ${App._fmtDateShort(new Date(profile.assessedAt))}</div>` : ''}
            </div>` : `
            <div class="assess-card empty">
              Answer a few questions about your body, experience and goals to get a plan with sets, reps and starting weights.
            </div>`}
        </div>

        <!-- ── Body Metrics ── -->
        <!-- Charts and history live on Progress → Body; this is just the entry
             point so the same data isn't rendered twice. -->
        <div class="section-header" style="margin-top:.75rem">
          <h2>Body Metrics</h2>
          <button class="btn btn-sm btn-ghost" data-action="log-metric">+ Log</button>
        </div>

        <div style="padding:0 1rem">
          <div class="list-item" style="border-radius:var(--radius);border:1px solid var(--border)"
               data-action="open-body-progress">
            <div class="list-item-left">
              <div class="list-item-icon">⚖️</div>
              <div>
                <div class="list-item-name">${latest ? `${latest.weight ? latest.weight + ' kg' : '—'}${latest.bodyFat ? ` · ${latest.bodyFat}% BF` : ''}` : 'No measurements yet'}</div>
                <div class="list-item-sub">${latest ? `Last logged ${App._fmtDateFull(new Date(latest.date))}` : 'Log your weight to start tracking'}</div>
              </div>
            </div>
            ${App._icon('chevron-right', 18)}
          </div>
        </div>

        <!-- ── Garmin ── -->
        <div class="section-header" style="margin-top:.75rem">
          <h2>Garmin</h2>
        </div>

        <div style="padding:0 1rem">
          <div class="list-item" style="border-radius:var(--radius);border:1px solid var(--border)"
               data-action="open-garmin-sync">
            <div class="list-item-left">
              <div class="list-item-icon">⌚</div>
              <div style="min-width:0">
                <div class="list-item-name">${Garmin.isConfigured() ? 'Import from Garmin' : 'Connect Garmin'}</div>
                <div class="list-item-sub">${
                  Garmin.isConfigured()
                    ? (cfg.lastSync ? `Last imported ${App._fmtDateFull(new Date(cfg.lastSync))}` : 'Connected — nothing imported yet')
                    : 'Pull your runs and rides in automatically'
                }</div>
              </div>
            </div>
            ${App._icon('chevron-right', 18)}
          </div>
        </div>

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

        <div style="padding:1.5rem 1rem 1rem;text-align:center;color:var(--txt3);font-size:.72rem">
          GymTrack · build <span id="build-id">…</span>
        </div>

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

    // ── Garmin Sync ───────────────────────────────────────────────────────────
    garminSync() {
      const cfg = Garmin.config();
      const st  = App.state.garmin;

      if (!Garmin.isConfigured()) {
        return `
        <div class="screen">
          <div class="screen-header">
            <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
            <span class="screen-title" style="flex:1;text-align:center">Garmin Sync</span>
            <span style="width:2rem"></span>
          </div>
          <div style="padding:0 1rem 1rem;color:var(--txt2);font-size:.82rem;line-height:1.5">
            Connect your Garmin account to pull completed cardio sessions straight
            into GymTrack. Your Garmin credentials stay on your own relay — GymTrack
            only ever sees the sync token below.
          </div>
          <div class="form-group">
            <label class="form-label">Relay URL</label>
            <input type="url" class="form-input" id="garmin-url" inputmode="url"
                   placeholder="https://….workers.dev" value="${cfg.url}">
          </div>
          <div class="form-group">
            <label class="form-label">Sync token</label>
            <input type="password" class="form-input" id="garmin-token"
                   placeholder="Paste your sync token" value="${cfg.token}">
          </div>
          <div style="padding:1rem">
            <button class="btn btn-primary" data-action="save-garmin-config">Connect</button>
          </div>
        </div>`;
      }

      const body = st.loading
        ? `<div style="padding:2rem 1rem;text-align:center;color:var(--txt3);font-size:.85rem">Checking Garmin…</div>`
        : st.error
          ? `<div style="padding:1.5rem 1rem;text-align:center;color:var(--red);font-size:.85rem">${st.error}</div>`
          : st.preview
            ? App._garminResults(st)
            : '';

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">Garmin Sync</span>
          <button class="btn btn-sm btn-ghost" data-action="garmin-refresh"
                  ${st.loading ? 'disabled' : ''}>Refresh</button>
        </div>

        <div style="padding:0 1rem .75rem;display:flex;align-items:center;gap:.5rem">
          <select class="form-select" id="garmin-range" data-action="garmin-range" style="flex:1;min-width:0">
            <option value="7"  ${st.range === 7  ? 'selected' : ''}>Last 7 days</option>
            <option value="30" ${st.range === 30 ? 'selected' : ''}>Last 30 days</option>
            <option value="90" ${st.range === 90 ? 'selected' : ''}>Last 90 days</option>
          </select>
        </div>

        ${cfg.lastSync ? `
          <div style="padding:0 1rem .5rem;color:var(--txt3);font-size:.72rem">
            Last imported ${App._fmtDateFull(new Date(cfg.lastSync))}
          </div>` : ''}

        ${body}

        <div style="padding:1rem">
          <button class="btn btn-secondary" data-action="garmin-recheck"
                  style="width:100%;padding:.85rem;border-radius:var(--radius)"
                  ${st.loading ? 'disabled' : ''}>Re-check imported sessions</button>
          <div style="margin-top:.5rem;color:var(--txt3);font-size:.72rem;line-height:1.45">
            Reads every session in this range again and re-decodes it. Renaming
            an exercise in Garmin Connect does not reach GymTrack — Connect keeps
            those edits to itself — so this only helps when GymTrack has learnt
            to read a session better. Downloads a file per strength session, so
            it is slower than a normal check.
          </div>
        </div>

        <div style="padding:1.5rem 1rem;text-align:center;color:var(--txt3);font-size:.72rem">
          <button class="btn btn-sm btn-ghost" data-action="garmin-disconnect"
                  style="color:var(--txt3)">Disconnect Garmin</button>
        </div>
      </div>`;
    },

    // ── Log Past Workout ──────────────────────────────────────────────────────
    logPastWorkout() {
      const draft = App.state.pastWorkoutDraft;
      if (!draft) return App.screens.progress();
      const maxDate = new Date().toISOString().slice(0, 10);
      const isEdit = !!draft.editId;

      return `
      <div class="screen">
        <div class="screen-header">
          <button class="back-btn" data-action="back">${App._icon('chevron-left')}</button>
          <span class="screen-title" style="flex:1;text-align:center">${isEdit ? 'Edit Workout' : 'Log Past Workout'}</span>
          <button class="btn btn-sm btn-ghost" data-action="save-past-workout">Save</button>
        </div>

        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="past-date"
                 value="${draft.date}" max="${maxDate}">
        </div>

        <div class="form-group">
          <label class="form-label">Time spent (optional)</label>
          <input type="number" class="form-input" id="past-duration" inputmode="numeric"
                 min="0" placeholder="minutes" value="${draft.durationMin || ''}">
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
  // Doubles as the "retake assessment" flow: pass an existing profile and every
  // step comes back pre-filled, so updating one answer does not mean retyping
  // all of them.
  showOnboarding(existing) {
    document.getElementById('bottom-nav').classList.add('hidden');
    this._obData = existing ? { ...existing, retake: true } : {};
    document.getElementById('app').innerHTML = this._onboardingStep(existing ? 2 : 1, this._obData);
  },

  // The assessment asks for a weight target only when the stated goal is about
  // changing bodyweight; asking someone chasing a 1RM how much they want to
  // weigh in 12 weeks is noise.
  _obNeedsTarget(data) {
    return data.goal === 'fat_loss' || data.goal === 'bulking';
  },

  _obLastStep(data) { return this._obNeedsTarget(data) ? 7 : 6; },

  _obDots(step, data) {
    const last = this._obLastStep(data);
    return `<div class="step-indicator">${
      Array.from({ length: last }, (_, i) =>
        `<div class="step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}"></div>`
      ).join('')
    }</div>`;
  },

  _obNav(step, data, label = 'Continue') {
    // A retake starts at step 2, so there is no earlier step to go back to.
    // Offer a way out instead — the bottom nav is hidden during the wizard.
    const back = step > (data.retake ? 2 : 1)
      ? `<button class="btn btn-ghost ob-back" data-action="ob-back" data-step="${step}">Back</button>`
      : data.retake
        ? `<button class="btn btn-ghost ob-back" data-action="ob-cancel">Cancel</button>` : '';
    return `<div class="ob-nav">${back}
      <button class="btn btn-primary" data-action="ob-next" data-step="${step}">${label}</button></div>`;
  },

  _obChips(group, options, selectedVal) {
    return `<div class="chip-select ob-chips">${options.map(([v, l, e]) => `
      <div class="chip ${selectedVal === v ? 'selected' : ''}"
        data-action="select-chip" data-group="${group}" data-val="${v}">${e ? e + ' ' : ''}${l}</div>
    `).join('')}</div>`;
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
          <div class="onboarding-subtitle">Answer a few questions and we'll build you a plan — sets, reps and starting weights included.</div>
        </div>
        <div>
          ${this._obDots(1, data)}
          <button class="btn btn-primary" style="margin-bottom:.75rem" data-action="google-signin">
            Continue with Google
          </button>
          <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span style="font-size:.75rem;color:var(--txt3)">or continue as guest</span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>
          <div class="form-group" style="padding:0 0 .75rem">
            <label class="form-label">Your name</label>
            <input class="form-input" id="ob-name" placeholder="e.g. Alex" autocomplete="given-name"
                   value="${data.name || ''}">
          </div>
          <button class="btn btn-ghost" style="border:1px solid var(--border)" data-action="ob-next" data-step="1">Continue as guest</button>
        </div>
      </div>`;

    if (step === 2) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">What's your <span>main goal?</span></div>
          <div class="onboarding-subtitle">This sets your rep ranges and rest periods.</div>
        </div>
        <div>
          ${this._obDots(2, data)}
          ${this._obChips('ob-goal', [
            ['muscle','Build Muscle','💪'],['fat_loss','Lose Body Fat','🔥'],
            ['bulking','Bulk Up','📈'],['endurance','Improve Endurance','🏃'],
            ['strength','Get Stronger','🏋️']], data.goal)}
          ${this._obNav(2, data)}
        </div>
      </div>`;

    if (step === 3) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">Choose your <span>training style</span></div>
          <div class="onboarding-subtitle">You can always mix and match later.</div>
        </div>
        <div>
          ${this._obDots(3, data)}
          ${this._obChips('ob-type', [
            ['strength','Strength Training','🏋️'],['hyrox','Hyrox','🏅'],
            ['crossfit','CrossFit','🔥'],['cardio','Cardio / Running','🏃'],
            ['mixed','Mixed / Everything','⚡']], data.trainingType)}
          ${this._obNav(3, data)}
        </div>
      </div>`;

    // Height and weight drive the starting-load estimate; age and sex are what
    // the strength standards are indexed on. "Prefer not to say" is honoured by
    // falling back to the more conservative set of numbers.
    if (step === 4) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">About <span>your body</span></div>
          <div class="onboarding-subtitle">Used to estimate your starting weights. Stored only on your device unless you sign in.</div>
        </div>
        <div>
          ${this._obDots(4, data)}
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Weight (kg)</label>
              <input type="number" class="form-input" id="ob-weight" inputmode="decimal"
                     min="30" max="300" step="0.1" placeholder="75" value="${data.weightKg || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Height (cm)</label>
              <input type="number" class="form-input" id="ob-height" inputmode="numeric"
                     min="120" max="230" placeholder="178" value="${data.heightCm || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Age</label>
            <input type="number" class="form-input" id="ob-age" inputmode="numeric"
                   min="14" max="100" placeholder="30" value="${data.age || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Biological sex</label>
            ${this._obChips('ob-sex', [['male','Male',''],['female','Female',''],['unspecified','Prefer not to say','']], data.sex)}
          </div>
          ${this._obNav(4, data)}
        </div>
      </div>`;

    if (step === 5) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">Your <span>training setup</span></div>
          <div class="onboarding-subtitle">How much you've trained, how often you can, and what you have access to.</div>
        </div>
        <div>
          ${this._obDots(5, data)}
          <div class="form-group">
            <label class="form-label">Training experience</label>
            ${this._obChips('ob-exp', [
              ['novice','Under 6 months',''],['intermediate','6 months – 2 years',''],
              ['advanced','2 years or more','']], data.experience)}
          </div>
          <div class="form-group">
            <label class="form-label">Days per week you can train</label>
            ${this._obChips('ob-days', [['2','2',''],['3','3',''],['4','4',''],['5','5',''],['6','6','']],
              data.daysPerWeek ? String(data.daysPerWeek) : '')}
          </div>
          <div class="form-group">
            <label class="form-label">Equipment</label>
            ${this._obChips('ob-equip', [
              ['full_gym','Full gym','🏋️'],['dumbbells','Dumbbells / home','🏠'],
              ['bodyweight','Bodyweight only','🤸']], data.equipment)}
          </div>
          ${this._obNav(5, data)}
        </div>
      </div>`;

    // Injuries add supportive work rather than removing exercises. Only a short
    // list of genuinely high-impact movements is held back, and the plan says so.
    if (step === 6) {
      const chosen = {};
      (data.injuries || []).forEach(i => { chosen[i.area] = i; });
      return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">Any <span>injuries?</span></div>
          <div class="onboarding-subtitle">We'll add supportive work for these areas rather than cutting exercises out.</div>
        </div>
        <div>
          ${this._obDots(6, data)}
          <div class="chip-select ob-chips">
            ${Object.entries(Recommend.INJURY).map(([area, cfg]) => `
              <div class="chip ${chosen[area] ? 'selected' : ''}"
                data-action="toggle-injury" data-area="${area}">${cfg.label}</div>
            `).join('')}
          </div>
          <div id="ob-injury-details">
            ${Object.entries(Recommend.INJURY).map(([area, cfg]) => `
              <div class="injury-detail ${chosen[area] ? '' : 'hidden'}" data-area="${area}">
                <div class="injury-detail-head">${cfg.label}</div>
                <input class="form-input" id="inj-type-${area}" placeholder="What is it? e.g. meniscus tear, tendinitis"
                       value="${chosen[area]?.type ? String(chosen[area].type).replace(/"/g, '&quot;') : ''}">
                <div class="injury-tx">
                  ${this._obChips(`inj-tx-${area}`, [
                    ['ongoing','In treatment',''],['past','Treated / recovered',''],['none','No treatment','']
                  ], chosen[area]?.treatment)}
                </div>
              </div>
            `).join('')}
          </div>
          ${this._obNav(6, data, this._obNeedsTarget(data) ? 'Continue' : 'Build my plan')}
        </div>
      </div>`;
    }

    if (step === 7) return `
      <div class="onboarding-screen">
        <div>
          <div class="onboarding-title">Your <span>target</span></div>
          <div class="onboarding-subtitle">We'll tell you honestly whether the timeframe is realistic.</div>
        </div>
        <div>
          ${this._obDots(7, data)}
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Target weight (kg)</label>
              <input type="number" class="form-input" id="ob-target-weight" inputmode="decimal"
                     min="30" max="300" step="0.1" placeholder="${data.weightKg || 70}"
                     value="${data.targetWeightKg || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">In how many weeks</label>
              <input type="number" class="form-input" id="ob-target-weeks" inputmode="numeric"
                     min="1" max="104" placeholder="12" value="${data.targetWeeks || ''}">
            </div>
          </div>
          <div id="ob-feasibility">${App._feasibilityHtml(data)}</div>
          ${this._obNav(7, data, 'Build my plan')}
        </div>
      </div>`;
  },

  // Live verdict under the target fields. Re-rendered on every keystroke so the
  // user finds out the timeframe is unrealistic while they are still typing it,
  // not weeks later.
  _feasibilityHtml(data) {
    const a = Recommend.assessObjective(data);
    if (!a) return `<div class="feasibility muted">Enter a target to see whether the pace is realistic.</div>`;
    const cls = a.verdict === 'safe' ? 'ok' : a.verdict === 'aggressive' ? 'warn' : 'bad';
    const head = a.verdict === 'safe' ? 'Realistic'
               : a.verdict === 'aggressive' ? 'Aggressive but possible'
               : 'Not realistic in that time';
    return `<div class="feasibility ${cls}">
      <div class="feasibility-head">${head}</div>
      <div class="feasibility-body">${a.message}</div>
      ${a.verdict === 'unrealistic'
        ? `<button class="btn btn-sm btn-ghost feasibility-fix" data-action="ob-use-safe-weeks"
             data-weeks="${a.safeWeeks}">Use ${a.safeWeeks} weeks instead</button>` : ''}
    </div>`;
  },

  _finishOnboarding(data) {
    const prev = DB.getProfile();
    const profile = {
      id:        prev?.id || DB.uid(),
      createdAt: prev?.createdAt || new Date().toISOString(),
      name:          data.name || 'Athlete',
      goal:          data.goal || 'muscle',
      trainingType:  data.trainingType || 'mixed',
      sex:           data.sex || 'unspecified',
      age:           data.age || null,
      heightCm:      data.heightCm || null,
      weightKg:      data.weightKg || null,
      experience:    data.experience || 'novice',
      daysPerWeek:   data.daysPerWeek || 3,
      equipment:     data.equipment || 'full_gym',
      injuries:      data.injuries || [],
      targetWeightKg: this._obNeedsTarget(data) ? (data.targetWeightKg || null) : null,
      targetWeeks:    this._obNeedsTarget(data) ? (data.targetWeeks || null) : null,
      assessedAt:    new Date().toISOString(),
    };
    DB.saveProfile(profile);

    // Seed the body-metrics log so the weight chart starts from the assessment
    // rather than waiting for the first manual entry.
    if (profile.weightKg && !DB.getLatestBodyMetric()) {
      DB.saveBodyMetric({ id: DB.uid(), date: new Date().toISOString(), weight: profile.weightKg });
    }

    Firebase.onReady(() => Firebase.syncProfile(profile).catch(() => {}));
    this._obData = null;
    document.getElementById('bottom-nav').classList.remove('hidden');
    this.state.activeTab['routines'] = 0;
    this.navigate('routines');
    this._toast('Your plan is ready', 'success');
  },

  // Reads whatever the current step is showing into the running answer set.
  // Returns an error string when the step is incomplete.
  _obCollect(step, data) {
    const val = g => document.querySelector(`.chip.selected[data-group="${g}"]`)?.dataset?.val;
    const num = id => {
      const v = parseFloat(document.getElementById(id)?.value);
      return Number.isFinite(v) ? v : null;
    };

    if (step === 1) {
      const name = document.getElementById('ob-name')?.value?.trim();
      if (!name) return 'Enter your name';
      data.name = name;
    }
    if (step === 2) {
      if (!val('ob-goal')) return 'Pick a goal';
      data.goal = val('ob-goal');
    }
    if (step === 3) {
      if (!val('ob-type')) return 'Pick a training style';
      data.trainingType = val('ob-type');
    }
    if (step === 4) {
      data.weightKg = num('ob-weight');
      data.heightCm = num('ob-height');
      data.age      = num('ob-age');
      data.sex      = val('ob-sex') || 'unspecified';
      if (!data.weightKg) return 'Enter your weight';
      if (!data.heightCm) return 'Enter your height';
    }
    if (step === 5) {
      if (!val('ob-exp'))   return 'Pick your experience level';
      if (!val('ob-days'))  return 'Pick how many days you can train';
      if (!val('ob-equip')) return 'Pick your equipment';
      data.experience  = val('ob-exp');
      data.daysPerWeek = parseInt(val('ob-days'));
      data.equipment   = val('ob-equip');
    }
    if (step === 6) {
      data.injuries = [...document.querySelectorAll('.chip.selected[data-action="toggle-injury"]')]
        .map(c => c.dataset.area)
        .map(area => ({
          area,
          type:      document.getElementById(`inj-type-${area}`)?.value?.trim() || '',
          treatment: val(`inj-tx-${area}`) || 'none',
        }));
    }
    if (step === 7) {
      data.targetWeightKg = num('ob-target-weight');
      data.targetWeeks    = num('ob-target-weeks');
      if (!data.targetWeightKg) return 'Enter a target weight';
      if (!data.targetWeeks)    return 'Enter a timeframe';
    }
    return null;
  },

  // ── Workout Engine ─────────────────────────────────────────────────────────
  workout: {
    start(routineId, dayIndex, level) {
      const isTemplate = routineId && routineId.startsWith('tpl-');
      const base = routineId
        ? (routineId === 'rec-plan' ? App._recPlan()
           : isTemplate ? ROUTINE_TEMPLATES.find(t => t.id === routineId)
           : DB.getRoutine(routineId))
        : null;

      // The session logs the levelled targets, so what was on the detail screen
      // is what gets pre-filled here.
      const routine = level ? scaleWorkout(base, level) : base;

      const day = routine ? routine.days[dayIndex || 0] : null;
      const exercises = day ? day.exercises.map(ex => {
        const info        = getExercise(ex.exerciseId);
        const mt          = info?.measureType || null;
        const isCardio    = App._isCardio(mt);
        const suggestion  = !isCardio ? DB.getProgressionSuggestion(ex.exerciseId, routineId, day.id) : null;
        // History wins; the assessment's estimate is only there to fill the
        // very first session, when there is nothing to progress from.
        const targetWeight = suggestion ? suggestion.weight : (ex.suggestedKg || null);

        return {
          exerciseId:   ex.exerciseId,
          exerciseName: info ? info.name : ex.exerciseId,
          measureType:  mt,
          targetReps:   mt === 'activity' ? '1 session' : ex.reps,
          targetSets:   ex.sets,
          restSeconds:  isCardio ? 0 : (ex.rest || 90),
          suggestion:   suggestion ? suggestion.message : null,
          sets: Array.from({ length: ex.sets }, (_, i) => {
            const s = App._blankSet(i + 1, mt);
            if (!isCardio) { s.weight = targetWeight || null; s.reps = parseInt(ex.reps) || null; }
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
      const mt = info.measureType || null;
      const isCardio = App._isCardio(mt);
      App.state.activeWorkout.exercises.push({
        exerciseId,
        exerciseName: info.name,
        measureType:  mt,
        targetReps:   isCardio ? '1 session' : '10',
        targetSets:   isCardio ? 1 : 3,
        restSeconds:  isCardio ? 0 : 90,
        suggestion:   null,
        sets: [App._blankSet(1, mt)]
      });
      DB.saveActiveWorkout(App.state.activeWorkout);
      App._render();
    },

    addSet(exerciseIndex) {
      const ex = App.state.activeWorkout.exercises[exerciseIndex];
      if (!ex) return;
      const isCardio = App._isCardio(ex.measureType);
      const last = ex.sets[ex.sets.length - 1];
      const next = App._blankSet(ex.sets.length + 1, ex.measureType);
      if (!isCardio && last) { next.weight = last.weight; next.reps = last.reps; }
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
      // Must run before the workout is saved, otherwise it compares against
      // itself and nothing ever counts as a record.
      const prs = DB.detectPRs(w);
      DB.saveWorkout(w);
      Firebase.onReady(() => Firebase.syncWorkout(w).catch(() => {}));
      DB.saveActiveWorkout(null);

      App._stopWorkoutTimer();
      App._stopRestTimer();
      App.state.activeWorkout = null;
      App.navigate('workout-complete', { workout: w, prs });
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

      if (id === 'exercise-progress') {
        const exId = App._progressExerciseId();
        const hist = exId ? DB.getExerciseHistory(exId, App.state.progressRange) : [];
        if (hist.length < 2) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'line',
          data: {
            labels: hist.map(h => App._fmtDateShort(new Date(h.date))),
            datasets: [
              { label: 'Top set (kg)', data: hist.map(h => h.topWeight),
                borderColor: accent, borderWidth: 2.5, pointRadius: 3,
                pointBackgroundColor: accent, tension: .3 },
              // Estimated 1RM reads through a lighter day at higher reps, which
              // a top-set line alone would show as going backwards.
              { label: 'Est. 1RM (kg)', data: hist.map(h => h.est1RM),
                borderColor: green, borderWidth: 2, borderDash: [4, 3],
                pointRadius: 0, tension: .3 }
            ]
          },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, labels: { color: txtCol, boxWidth: 10, font: { size: 10 } } } } }
        });
      }

      if (id === 'muscle-volume') {
        const data = DB.getWeeklySetsByMuscle(4).slice(0, 10);
        if (!data.length) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: data.map(d => d.muscle),
            datasets: [{
              data: data.map(d => Math.round(d.sets * 10) / 10),
              // 10 sets a week is the benchmark the plan builder uses, so the
              // bar colour says at a glance which muscles clear it.
              backgroundColor: data.map(d => d.sets >= 10 ? 'rgba(48,209,88,.55)' : 'rgba(252,76,2,.45)'),
              borderRadius: 4,
              borderSkipped: false,
            }]
          },
          options: {
            ...baseOpts,
            indexAxis: 'y',
            scales: {
              x: { grid: { color: gridCol }, ticks: { color: txtCol, font: { size: 10 } }, beginAtZero: true },
              y: { grid: { display: false }, ticks: { color: txtCol, font: { size: 10 } } }
            }
          }
        });
      }

      if (id === 'goal-trajectory') {
        const t = App._goalTrajectory();
        if (!t) return;
        this.state.charts[id] = new Chart(canvas, {
          type: 'line',
          data: {
            labels: t.labels,
            datasets: [
              { label: 'Planned', data: t.planned, borderColor: txtCol, borderWidth: 1.5,
                borderDash: [5, 4], pointRadius: 0, tension: 0 },
              { label: 'Actual', data: t.actual, borderColor: accent, borderWidth: 2.5,
                pointRadius: 3, pointBackgroundColor: accent, spanGaps: true, tension: .3 }
            ]
          },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, labels: { color: txtCol, boxWidth: 10, font: { size: 10 } } } } }
        });
      }

      if (id === 'body-weight-chart') {
        const metrics = DB.getBodyMetricsLastNDays(App.state.progressRange || 36500).reverse();
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
        const metrics = DB.getBodyMetricsLastNDays(App.state.progressRange || 36500).reverse().filter(m => m.bodyFat);
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

  // ── Cloud sync ─────────────────────────────────────────────────────────────
  async _syncLocalDataToCloud() {
    if (!Firebase.ready) return;
    const workouts = DB.getWorkouts();
    const metrics  = DB.getBodyMetrics();
    const profile  = DB.getProfile();
    await Promise.all([
      ...workouts.map(w => Firebase.syncWorkout(w).catch(() => {})),
      ...metrics.map(m => Firebase.syncMetric(m).catch(() => {})),
    ]);
    if (profile) Firebase.syncProfile(profile).catch(() => {});
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
        // Switching tabs swaps the canvases out, so the old Chart instances
        // have to be torn down or they leak and re-attach to dead nodes.
        this._destroyCharts();
        this._render();
        break;

      // Progress
      case 'open-body-progress':
        this.state.activeTab['progress'] = 2;
        this.navigate('progress');
        break;
      case 'progress-range':
        this.state.progressRange = el.dataset.days ? parseInt(el.dataset.days) : null;
        this._destroyCharts();
        this._render();
        break;

      // Onboarding
      case 'ob-next': {
        const step = parseInt(el.dataset.step);
        this._obData = this._obData || {};
        const err = this._obCollect(step, this._obData);
        if (err) { this._toast(err, 'error'); return; }

        if (step >= this._obLastStep(this._obData)) { this._finishOnboarding(this._obData); return; }
        document.getElementById('app').innerHTML = this._onboardingStep(step + 1, this._obData);
        document.getElementById('app').scrollTop = 0;
        break;
      }
      case 'ob-back': {
        const step = parseInt(el.dataset.step);
        // Keep whatever is on screen, but never block going back over it.
        this._obCollect(step, this._obData || {});
        document.getElementById('app').innerHTML = this._onboardingStep(step - 1, this._obData);
        break;
      }
      case 'toggle-injury': {
        el.classList.toggle('selected');
        const panel = document.querySelector(`.injury-detail[data-area="${el.dataset.area}"]`);
        if (panel) panel.classList.toggle('hidden', !el.classList.contains('selected'));
        break;
      }
      case 'ob-use-safe-weeks': {
        const input = document.getElementById('ob-target-weeks');
        if (input) { input.value = el.dataset.weeks; input.dispatchEvent(new Event('input', { bubbles: true })); }
        break;
      }
      case 'retake-assessment':
        this.showOnboarding(DB.getProfile() || {});
        break;

      case 'ob-cancel':
        this._obData = null;
        document.getElementById('bottom-nav').classList.remove('hidden');
        this.navigate('profile');
        break;

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
        this.workout.start(el.dataset.id, parseInt(el.dataset.day) || 0, el.dataset.level || null);
        break;
      case 'open-routine': {
        this.state.activeTab['routine-detail'] = 0;
        // Each workout starts at its own written difficulty; a level picked on
        // the previous one must not carry over.
        this.state.workoutLevel = null;
        this.navigate('routine-detail', { routineId: el.dataset.id });
        break;
      }
      case 'open-workout-category':
        this.state.workoutCategory   = el.dataset.cat;
        this.state.workoutDiffFilter = null;
        // The grid appears on both Routines and the workout picker, so back has
        // to return to whichever one was used to get here.
        this.state.workoutCategoryFrom = this.state.screen;
        this.navigate('workout-category');
        break;
      case 'set-diff-filter':
        this.state.workoutDiffFilter = el.dataset.diff || null;
        this._render();
        break;
      case 'set-workout-level':
        this.state.workoutLevel = el.dataset.level;
        this._render();
        break;
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
          // Saves the level currently on screen, so a scaled copy keeps the
          // sets and reps the user was looking at rather than the written ones.
          const copy = JSON.parse(JSON.stringify(scaleWorkout(tpl, el.dataset.level)));
          copy.id = DB.uid();
          copy.savedFrom = tpl.id;
          DB.saveRoutine(copy);
          this._toast('Saved to My Routines!', 'success');
        }
        break;
      }
      // Freezes the generated plan as an editable copy. The live version keeps
      // tracking the assessment; this one is yours to change.
      case 'save-rec-plan': {
        const plan = this._recPlan();
        if (plan) {
          const copy = JSON.parse(JSON.stringify(plan));
          copy.id = DB.uid();
          copy.savedFrom = 'rec-plan';
          delete copy.meta;
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
        const loggedMin = Math.round(
          (new Date(wEdit.completedAt || wEdit.startedAt) - new Date(wEdit.startedAt)) / 60000
        );
        App.state.pastWorkoutDraft = {
          editId:      wEdit.id,
          date:        wEdit.startedAt.slice(0, 10),
          durationMin: loggedMin > 0 ? String(loggedMin) : '',
          name:        wEdit.name,
          exercises:   JSON.parse(JSON.stringify(wEdit.exercises)),
          notes:       wEdit.notes || ''
        };
        this.navigate('log-past-workout');
        break;
      }
      case 'delete-workout':
        this._confirm('Delete this workout?', () => {
          const _wid = el.dataset.id;
          DB.deleteWorkout(_wid);
          Firebase.onReady(() => Firebase.deleteWorkout(_wid).catch(() => {}));
          this.navigate('progress');
        }, 'Delete', true);
        break;

      // Past workout
      case 'new-past-workout': {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        App.state.pastWorkoutDraft = {
          date: now.toISOString().slice(0, 10),
          durationMin: '',
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
          const s = App._blankSet(1, info.measureType);
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
        const isCardio = App._isCardio(ex.measureType);
        const last = ex.sets[ex.sets.length - 1];
        const next = App._blankSet(ex.sets.length + 1, ex.measureType);
        next.completed = true;
        if (!isCardio && last) { next.weight = last.weight; next.reps = last.reps; }
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

      // Garmin
      case 'open-garmin-sync':
        this.state.garmin = { loading: false, error: null, preview: null, selected: new Set(), range: 30 };
        this.navigate('garmin-sync');
        break;

      case 'save-garmin-config': {
        const url   = document.getElementById('garmin-url')?.value.trim()   || '';
        const token = document.getElementById('garmin-token')?.value.trim() || '';
        if (!/^https:\/\/\S+$/.test(url)) { this._toast('Enter the relay URL (https://…)', 'error'); return; }
        if (!token)                       { this._toast('Enter your sync token', 'error'); return; }
        Garmin.saveConfig({ url, token });
        this.state.garmin = { loading: false, error: null, preview: null, selected: new Set(), range: 30 };
        this._render();
        break;
      }

      case 'garmin-refresh':
        this._garminLoad();
        break;

      case 'garmin-recheck':
        this._garminLoad({ recheck: true });
        break;

      // Patched in place rather than re-rendered: a full render would rebuild
      // the whole list and throw away the scroll position on every tap.
      case 'garmin-toggle': {
        const gid = el.dataset.gid;
        const sel = this.state.garmin.selected;
        const on  = !sel.has(gid);
        if (on) sel.add(gid); else sel.delete(gid);

        const box = el.querySelector('.garmin-check');
        if (box) {
          box.classList.toggle('on', on);
          box.innerHTML = on ? this._icon('check', 14) : '';
        }

        const btn = document.querySelector('[data-action="garmin-import"]');
        if (btn) {
          const n = sel.size;
          btn.disabled    = !n;
          btn.textContent = n ? `Import ${n} session${n === 1 ? '' : 's'}` : 'Select a session';
        }
        break;
      }

      case 'garmin-import': {
        const st   = this.state.garmin;
        const rows = st.preview.importable.filter(r => st.selected.has(r.garminId));
        if (!rows.length) return;

        // Strength rows download a FIT each, so this is slow enough to need
        // a busy state — and must not be fired twice.
        el.disabled = true;
        el.textContent = 'Importing…';

        Garmin.importWorkouts(rows).then(({ saved, updated, failed }) => {
          const written = saved.concat(updated);
          Firebase.onReady(() => written.forEach(w => Firebase.syncWorkout(w).catch(() => {})));
          if (written.length) {
            const bits = [];
            if (saved.length)   bits.push(`${saved.length} imported`);
            if (updated.length) bits.push(`${updated.length} updated`);
            this._toast(
              bits.join(' · ') +
              (failed.length ? ` · ${failed.length} failed` : ''),
              failed.length ? 'error' : 'success');
            this.navigate('progress');
          } else if (failed.length) {
            this._toast(failed[0].error, 'error');
            el.disabled = false;
            el.textContent = `Import ${rows.length} session${rows.length === 1 ? '' : 's'}`;
          } else {
            // Every row was a re-check that turned out to be unchanged, which
            // is the normal outcome of re-checking and not a failure.
            this._toast('Already up to date', 'success');
            this.navigate('progress');
          }
        });
        break;
      }

      // Reassign one Garmin-guessed exercise, keeping its logged sets. Clearing
      // `guessed` here means a session the user has fully corrected stops
      // nagging on its own, without needing the banner button.
      case 'fix-garmin-exercise': {
        const w  = DB.getWorkout(el.dataset.id);
        const ex = w && w.exercises[parseInt(el.dataset.ei)];
        if (!ex) return;
        this._showExercisePicker(newId => {
          const info = getExercise(newId);
          if (!info) return;
          const wasCardio = App._isCardio(ex.measureType);
          ex.exerciseId   = newId;
          ex.exerciseName = info.name;
          ex.measureType  = info.measureType || null;
          // A machine block and a weights block hold different fields, so
          // crossing between them would leave the sets unreadable. Keep the
          // count and start the new fields empty for the user to fill in.
          if (App._isCardio(ex.measureType) !== wasCardio) {
            ex.sets = ex.sets.map((s, i) => {
              const next = App._blankSet(i + 1, ex.measureType);
              next.completed = s.completed;
              return next;
            });
            ex.targetReps = App._isCardio(ex.measureType) ? '1 session' : '—';
          }
          delete ex.guessed;
          delete ex.garminGuesses;
          if (!w.exercises.some(e => e.guessed)) delete w.needsReview;
          DB.saveWorkout(w);
          Firebase.onReady(() => Firebase.syncWorkout(w).catch(() => {}));
          this._render();
        });
        break;
      }

      case 'confirm-garmin-review': {
        const w = DB.getWorkout(el.dataset.id);
        if (!w) return;
        delete w.needsReview;
        w.exercises.forEach(ex => { delete ex.guessed; delete ex.garminGuesses; });
        DB.saveWorkout(w);
        Firebase.onReady(() => Firebase.syncWorkout(w).catch(() => {}));
        this._render();
        break;
      }

      case 'garmin-disconnect':
        this._confirm('Disconnect Garmin? Imported workouts stay in GymTrack.', () => {
          Garmin.saveConfig({ url: '', token: '' });
          this.state.garmin = { loading: false, error: null, preview: null, selected: new Set(), range: 30 };
          this.navigate('profile');
        }, 'Disconnect', true);
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

      case 'google-signin': {
        const origText = el.textContent.trim();
        el.disabled = true;
        el.textContent = 'Signing in…';
        Firebase.signIn().catch(err => {
          el.disabled = false;
          el.textContent = origText;
          App._toast(`Sign-in failed: ${err?.code || err?.message || 'unknown error'}`, 'error');
        });
        break;
      }

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

    // Live feasibility verdict while the target is being typed.
    if (el.id === 'ob-target-weight' || el.id === 'ob-target-weeks') {
      const box = document.getElementById('ob-feasibility');
      if (box) {
        const draft = {
          ...this._obData,
          targetWeightKg: parseFloat(document.getElementById('ob-target-weight')?.value) || null,
          targetWeeks:    parseFloat(document.getElementById('ob-target-weeks')?.value)  || null,
        };
        box.innerHTML = App._feasibilityHtml(draft);
      }
      return;
    }

    // Set fields (active or past workout). The indices live on the input itself
    // so this works for both the weight/reps rows and the cardio field grid.
    if (el.classList.contains('set-input')) {
      const ei    = parseInt(el.dataset.ei);
      const si    = parseInt(el.dataset.si);
      const field = el.dataset.field;
      if (Number.isNaN(ei) || Number.isNaN(si) || !field) return;
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

  _handleChange(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'pick-progress-exercise') {
      this.state.progressExerciseId = el.value;
      this._destroyCharts();
      this._render();
    }
    if (el.dataset.action === 'pick-progress-routine') {
      this.state.progressRoutineId = el.value;
      this._destroyCharts();
      this._render();
    }
    if (el.dataset.action === 'garmin-range') {
      this.state.garmin.range = parseInt(el.value);
      this._garminLoad();
    }
  },

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
              <div class="exercise-thumb${ex.image ? '' : ' exercise-thumb-fallback'}" data-action="pick-exercise" data-id="${ex.id}">
                ${ex.image
                  ? `<img src="${EXERCISE_IMAGE_BASE}${ex.image}" alt="" loading="lazy" decoding="async"
                         onerror="this.parentNode.classList.add('exercise-thumb-fallback');this.remove()">`
                  : ''}
              </div>
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
    const durEl   = document.getElementById('past-duration');
    const nameEl  = document.getElementById('past-name');
    const notesEl = document.getElementById('past-notes');
    if (dateEl)  draft.date        = dateEl.value;
    if (durEl)   draft.durationMin = durEl.value;
    if (nameEl)  draft.name        = nameEl.value.trim();
    if (notesEl) draft.notes       = notesEl.value;

    if (!draft.exercises.length) {
      this._toast('Add at least one exercise', 'error');
      return;
    }

    // The form only asks for a date, so anchor it at local midday — parsing a
    // bare 'YYYY-MM-DD' as UTC would shift the workout a day in some timezones.
    const start = new Date(`${draft.date}T12:00`);
    const startedAt = start.toISOString();
    // Duration comes from what the user typed; never inferred from the clock.
    const mins = parseFloat(draft.durationMin) || 0;
    const completedAt = new Date(start.getTime() + mins * 60000).toISOString();

    const isEdit = !!draft.editId;
    const existing = isEdit ? DB.getWorkout(draft.editId) : null;

    const workout = {
      id:          isEdit ? draft.editId : DB.uid(),
      name:        draft.name || 'Workout',
      routineId:   existing?.routineId   || null,
      routineDayId:existing?.routineDayId|| null,
      startedAt,
      completedAt,
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
      this.navigate('progress');
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
      'routine-detail':  this.state.workoutCategory ? 'workout-category' : 'routines',
      'workout-category':this.state.workoutCategoryFrom || 'routines',
      'create-routine':  'routines',
      'workout-detail':  'progress',
      'log-metric':      'profile',
      'log-past-workout':'progress',
      'active-workout':  'workout',
      'garmin-sync':     'profile',
    };
    return map[this.state.screen] || 'dashboard';
  },

  async _garminLoad({ recheck = false } = {}) {
    const st = this.state.garmin;
    st.loading = true; st.error = null; st.preview = null; st.recheck = recheck;
    this._render();
    try {
      // Re-checking re-opens everything in the selected range; a plain lookup
      // only reports sessions GymTrack has never seen.
      st.preview  = await Garmin.preview({
        sinceDays:   st.range,
        refreshDays: recheck ? st.range : 0,
      });
      // Everything new is selected by default — the common case is importing
      // all of it, and unticking is cheaper than ticking.
      st.selected = new Set(st.preview.importable.map(r => r.garminId));
    } catch (err) {
      st.error = err.message || 'Could not reach Garmin.';
    } finally {
      st.loading = false;
      this._render();
    }
  },

  // Results of a Garmin lookup. Nothing is written until Import is pressed, so
  // the list doubles as a confirmation step.
  _garminResults(st) {
    const { importable, duplicates, unsupported } = st.preview;

    if (!importable.length) {
      return `
      <div style="padding:2rem 1rem;text-align:center">
        <div style="font-size:.9rem;font-weight:600;margin-bottom:.35rem">Nothing new to import</div>
        <div style="font-size:.8rem;color:var(--txt2)">
          ${duplicates.length ? `${duplicates.length} session${duplicates.length === 1 ? '' : 's'} already in GymTrack.` : 'No cardio sessions found in this range.'}
        </div>
        ${App._garminSkipped(unsupported)}
      </div>`;
    }

    const rows = importable.map(r => {
      const on = st.selected.has(r.garminId);

      // Cardio rows arrive with their workout already built; strength rows only
      // get one once their FIT is downloaded at import time, so summarise them
      // from the activity instead of reaching into a workout that isn't there.
      const ex  = r.workout ? r.workout.exercises[0] : null;
      const set = ex ? ex.sets[0] : null;
      const bits = (set
        ? [ set.distance ? `${set.distance} km` : null,
            set.duration ? App._fmtDuration(set.duration * 60) : null,
            set.avgHr    ? `${set.avgHr} bpm` : null,
            set.calories ? `${set.calories} kcal` : null ]
        : [ r.exerciseName,
            r.durationSec ? App._fmtDuration(r.durationSec) : null ]
      ).filter(Boolean).join(' · ');

      return `
      <div class="list-item" data-action="garmin-toggle" data-gid="${r.garminId}">
        <div class="list-item-left">
          <div class="list-item-icon">${ex ? App._exIcon(ex.exerciseId) : '🏋️'}</div>
          <div style="min-width:0">
            <div class="list-item-name">${r.name}</div>
            <div class="list-item-sub">${App._fmtDateFull(new Date(r.startedAt))} · ${bits}</div>
          </div>
        </div>
        <div class="garmin-check ${on ? 'on' : ''}">${on ? App._icon('check', 14) : ''}</div>
      </div>`;
    }).join('');

    const n = st.selected.size;
    return `
      <div class="section-header"><h2>${st.recheck ? 'Sessions in range' : 'New sessions'}</h2></div>
      ${st.recheck ? `
        <div style="padding:0 1rem .5rem;color:var(--txt3);font-size:.72rem;line-height:1.45">
          Sessions already in GymTrack are included. Importing one replaces the
          stored copy with Garmin's current version.
        </div>` : ''}
      ${rows}
      <div style="padding:1rem">
        <button class="btn btn-primary" data-action="garmin-import" ${n ? '' : 'disabled'}>
          ${n ? `Import ${n} session${n === 1 ? '' : 's'}` : 'Select a session'}
        </button>
      </div>
      ${duplicates.length ? `
        <div style="padding:0 1rem .5rem;color:var(--txt3);font-size:.75rem">
          ${duplicates.length} already imported, skipped.
        </div>` : ''}
      ${App._garminSkipped(unsupported)}`;
  },

  // Strength sessions are listed rather than silently dropped: the watch records
  // them as one auto-counted rep total with no exercise identity, so there is
  // nothing to map onto the exercise library.
  _garminSkipped(unsupported) {
    if (!unsupported.length) return '';
    const types = [...new Set(unsupported.map(r => r.type))].join(', ');
    return `
      <div style="padding:.5rem 1rem 1rem;color:var(--txt3);font-size:.75rem;line-height:1.5">
        ${unsupported.length} session${unsupported.length === 1 ? '' : 's'} skipped (${types}) —
        the watch only guessed at these from wrist motion, so there are no
        exercises to import. Train from a workout sent to your watch and Garmin
        records the real exercise names; otherwise log them in GymTrack directly.
      </div>`;
  },

  _workoutCard(w) {
    const durationSecs = App._workoutDuration(w);
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
        ${durationSecs ? `<span>${App._icon('clock', 13)} ${App._fmtDuration(durationSecs)}</span>` : ''}
        <span>${App._icon('weight', 13)} ${App._fmtVol(vol)} kg</span>
        <span>${App._icon('list', 13)} ${w.exercises?.length || 0} exercises</span>
      </div>
      ${exNames ? `<div class="workout-card-exercises">${exNames}</div>` : ''}
    </div>`;
  },

  // `inCategory` suppresses the category badge on cards that are already inside
  // a category screen, where repeating it on every row says nothing.
  _routineCard(r, kind, inCategory = false) {
    const meta  = WORKOUT_CATEGORIES[r.type];
    const badge = meta ? r.type : 'custom';
    const icon  = meta ? meta.icon : '📋';

    return `
    <div class="routine-card" data-action="open-routine" data-id="${r.id}">
      <div class="routine-card-top">
        <div class="routine-type-icon badge-${badge}" style="background:var(--bg3)">${icon}</div>
        <div class="routine-card-main">
          <div class="routine-card-name">${r.name}</div>
          <div class="routine-card-sub">
            ${inCategory ? '' : `<span class="badge badge-${badge}" style="margin-right:.3rem">${meta ? meta.name : r.type}</span>`}
            ${r.daysPerWeek ? r.daysPerWeek + ' days/week' : r.days.length + ' days'} · ${this._fmtGoal(r.goal)}
          </div>
        </div>
      </div>
      ${r.description ? `<div class="routine-card-desc">${r.description}</div>` : ''}
      ${r.difficulty ? `
      <div class="routine-card-meta">
        <span class="diff-pill diff-${r.difficulty}">${DIFFICULTIES[r.difficulty].name}</span>
        ${r.durationMin ? `<span class="routine-card-dur">~${r.durationMin} min</span>` : ''}
        ${r.levels ? `<span class="routine-card-dur">${this._workoutLevels(r).length} levels</span>` : ''}
      </div>` : ''}
    </div>`;
  },

  // Which levels a workout can actually be run at: whatever it declares, plus
  // the level it is written at, which always exists even with no `levels` block.
  _workoutLevels(r) {
    if (!r.levels) return r.difficulty ? [r.difficulty] : [];
    return WORKOUT_LEVELS.filter(l => l === r.difficulty || r.levels[l]);
  },

  _workoutHasLevel(r, level) {
    return this._workoutLevels(r).includes(level);
  },

  // Falls back to the level the workout is written at, so opening one never
  // lands on a level it does not offer.
  _workoutLevel(r) {
    const picked = this.state.workoutLevel;
    if (picked && this._workoutHasLevel(r, picked)) return picked;
    return r.difficulty || 'intermediate';
  },

  _workoutCategoryGrid() {
    // Only categories that actually hold a workout get a tile, so the grid can
    // never offer a dead end.
    const counts = {};
    ROUTINE_TEMPLATES.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });

    return `
    <div class="cat-grid">
      ${Object.keys(WORKOUT_CATEGORIES).filter(k => counts[k]).map(k => {
        const meta = WORKOUT_CATEGORIES[k];
        return `
        <div class="cat-tile" data-action="open-workout-category" data-cat="${k}">
          <div class="cat-tile-icon badge-${k}">${meta.icon}</div>
          <div class="cat-tile-name">${meta.name}</div>
          <div class="cat-tile-count">${counts[k]} workout${counts[k] === 1 ? '' : 's'}</div>
        </div>`;
      }).join('')}
    </div>`;
  },

  // The generated plan is derived from the profile on demand rather than
  // stored, so retaking the assessment can never leave a stale copy behind.
  // Cached per render pass because building it walks the whole exercise list.
  _recPlan() {
    const profile = DB.getProfile();
    if (!Recommend.isAssessed(profile)) return null;
    if (this._recCache && this._recCache.at === profile.assessedAt) return this._recCache.plan;
    const plan = Recommend.buildPlan(profile);
    this._recCache = { at: profile.assessedAt, plan };
    return plan;
  },

  _recommendedTab() {
    const profile = DB.getProfile();

    if (!Recommend.isAssessed(profile)) {
      return `<div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">Answer a few questions</div>
        <div class="empty-state-text">Tell us your body stats, experience, injuries and goal, and we'll build a plan with sets, reps and starting weights.</div>
        <button class="btn btn-primary" style="margin-top:.5rem;width:auto;padding:.7rem 2rem" data-action="retake-assessment">Start assessment</button>
      </div>`;
    }

    const plan = this._recPlan();
    if (!plan) return `<div class="empty-state"><div class="empty-state-title">Couldn't build a plan</div></div>`;

    const m    = plan.meta;
    const obj  = m.objective;
    const alts = Recommend.scoreTemplates(profile).slice(0, 4);

    return `
      ${obj ? `<div class="feasibility ${obj.verdict === 'safe' ? 'ok' : obj.verdict === 'aggressive' ? 'warn' : 'bad'} rec-objective">
        <div class="feasibility-head">${
          obj.kind === 'maintain' ? 'Maintaining'
          : obj.verdict === 'safe' ? 'On a realistic pace'
          : obj.verdict === 'aggressive' ? 'Aggressive pace' : 'Target not realistic in that time'}</div>
        <div class="feasibility-body">${obj.message}</div>
      </div>` : ''}

      <div class="rec-plan-card" data-action="open-routine" data-id="rec-plan">
        <div class="rec-plan-head">
          <div>
            <div class="rec-eyebrow">Your plan</div>
            <div class="rec-plan-name">${plan.name}</div>
          </div>
          <div class="rec-plan-go">${App._icon('chevron-right', 20)}</div>
        </div>
        <div class="rec-plan-desc">${plan.description}</div>
        <div class="rec-plan-days">
          ${plan.days.map(d => `<span class="rec-day-pill">${d.name}</span>`).join('')}
        </div>
      </div>

      ${m.notes.map(n => `<div class="rec-note ${n.kind}">${n.text}</div>`).join('')}

      ${m.volume.low.length ? `<div class="rec-note info">
        Weekly volume is below the ~${m.volume.target} sets per muscle that the research associates with the biggest gains for: ${m.volume.low.join(', ')}. Add a day or extra accessory work if you want to push those.
      </div>` : ''}

      <div class="rec-alts-head">Also a good fit for you</div>
      ${alts.map(a => `
        <div class="routine-card rec-alt" data-action="open-routine" data-id="${a.template.id}">
          <div class="routine-card-top">
            <div class="rec-score">${a.score}</div>
            <div>
              <div class="routine-card-name">${a.template.name}</div>
              <div class="routine-card-sub">${a.reasons.length ? a.reasons.join(' · ') : `${a.template.daysPerWeek} days/week`}</div>
            </div>
          </div>
        </div>`).join('')}

      <div class="rec-footer">
        <button class="btn btn-ghost" style="border:1px solid var(--border)" data-action="retake-assessment">Update my answers</button>
        <div class="rec-disclaimer">Starting weights are estimates from published strength standards, deliberately on the light side. They adjust as you log sets. Not medical advice — if an injury is being treated, check with your clinician first.</div>
      </div>`;
  },

  // ── Progress tabs ──────────────────────────────────────────────────────────
  PROGRESS_RANGES: [
    { days: 30,   label: '1M' },
    { days: 90,   label: '3M' },
    { days: 365,  label: '1Y' },
    { days: null, label: 'All' },
  ],

  _rangeSelector() {
    const cur = App.state.progressRange;
    return `<div class="range-bar">
      ${App.PROGRESS_RANGES.map(r => `
        <button class="range-btn ${r.days === cur ? 'active' : ''}"
                data-action="progress-range" data-days="${r.days === null ? '' : r.days}">${r.label}</button>`).join('')}
    </div>`;
  },

  // Falls back to the most-trained exercise so the chart has something to show
  // before the user has picked anything.
  _progressExerciseId() {
    const tracked = DB.getTrackedExercises();
    if (!tracked.length) return null;
    const picked = App.state.progressExerciseId;
    if (picked && tracked.some(t => t.id === picked)) return picked;
    return tracked[0].id;
  },

  _progressCalendarTab() {
    const workouts = DB.getRecentWorkouts(50);
    return `
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
      </div>`;
  },

  _progressStrengthTab() {
    const tracked = DB.getTrackedExercises();
    if (!tracked.length) {
      return `<div class="empty-state">
        <div class="empty-state-icon">📈</div>
        <div class="empty-state-title">Not enough data yet</div>
        <div class="empty-state-text">Log the same exercise on two different days and its strength curve shows up here.</div>
      </div>`;
    }

    const exId = App._progressExerciseId();
    const hist = DB.getExerciseHistory(exId, App.state.progressRange);
    const pr   = DB.getPR(exId);
    const name = tracked.find(t => t.id === exId)?.name || '';

    return `
      ${App._rangeSelector()}

      <div class="chart-wrap">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Strength over time</span>
          </div>
          <select class="form-select progress-select" data-action="pick-progress-exercise">
            ${tracked.map(t => `<option value="${t.id}" ${t.id === exId ? 'selected' : ''}>${t.name} (${t.sessions})</option>`).join('')}
          </select>
          ${hist.length >= 2
            ? `<canvas id="exercise-progress" height="150"></canvas>`
            : `<div class="chart-empty">Only ${hist.length} session${hist.length === 1 ? '' : 's'} of ${name} in this range. Widen the range or log it again.</div>`}
        </div>
      </div>

      ${pr ? `
      <div class="section-header"><h2>Personal Records</h2></div>
      <div class="pr-grid">
        <div class="pr-card">
          <div class="pr-val">${pr.topWeight.topWeight} kg</div>
          <div class="pr-lbl">Heaviest set</div>
          <div class="pr-when">${pr.topWeight.topReps} reps · ${App._fmtDateShort(new Date(pr.topWeight.date))}</div>
        </div>
        <div class="pr-card">
          <div class="pr-val">${pr.est1RM.est1RM} kg</div>
          <div class="pr-lbl">Best est. 1RM</div>
          <div class="pr-when">${App._fmtDateShort(new Date(pr.est1RM.date))}</div>
        </div>
        <div class="pr-card">
          <div class="pr-val">${App._fmtVol(pr.volume.volume)}</div>
          <div class="pr-lbl">Best session volume</div>
          <div class="pr-when">${App._fmtDateShort(new Date(pr.volume.date))}</div>
        </div>
      </div>` : ''}

      ${App._routineProgressCard()}

      <div class="section-header"><h2>Weekly Sets by Muscle</h2></div>
      <div class="chart-wrap">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Average, last 4 weeks</span>
          </div>
          <canvas id="muscle-volume" height="200"></canvas>
          <div class="chart-foot">Green clears the ~10 sets a week the plan builder aims for.</div>
        </div>
      </div>`;
  },

  // Load added to each exercise in a routine since the first time it was run.
  _routineProgressCard() {
    const routines = DB.getRoutines().filter(r => DB.getRoutineProgress(r.id));
    if (!routines.length) return '';

    const picked = routines.find(r => r.id === App.state.progressRoutineId) || routines[0];
    const prog   = DB.getRoutineProgress(picked.id);
    if (!prog || !prog.rows.length) return '';

    return `
      <div class="section-header"><h2>Routine Progression</h2></div>
      <div class="chart-wrap">
        <div class="chart-card">
          ${routines.length > 1 ? `
            <select class="form-select progress-select" data-action="pick-progress-routine">
              ${routines.map(r => `<option value="${r.id}" ${r.id === picked.id ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>` : `<div class="chart-card-header"><span class="chart-card-title">${picked.name}</span></div>`}

          <div class="routine-prog-total">
            <strong>${prog.totalDelta > 0 ? '+' : ''}${prog.totalDelta} kg</strong>
            added across ${prog.rows.length} exercise${prog.rows.length === 1 ? '' : 's'} over ${prog.sessions} session${prog.sessions === 1 ? '' : 's'}
          </div>

          ${prog.rows.map(r => `
            <div class="routine-prog-row">
              <div class="routine-prog-name">${r.name}</div>
              <div class="routine-prog-nums">
                <span class="routine-prog-from">${r.first} → ${r.last} kg</span>
                <span class="routine-prog-delta ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}">${r.delta > 0 ? '+' : ''}${r.delta} kg${r.pct ? ` (${r.pct > 0 ? '+' : ''}${r.pct}%)` : ''}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  _progressBodyTab() {
    const metrics = DB.getBodyMetrics();
    const latest  = metrics[0] || null;

    if (!latest) {
      return `<div class="empty-state">
        <div class="empty-state-icon">⚖️</div>
        <div class="empty-state-title">No measurements yet</div>
        <div class="empty-state-text">Log your weight to start tracking it against your goal.</div>
        <button class="btn btn-primary" style="margin-top:.5rem;width:auto;padding:.7rem 2rem" data-action="log-metric">Log Now</button>
      </div>`;
    }

    // Delta over the selected range rather than a fixed 30 days.
    const win   = DB.getBodyMetricsLastNDays(App.state.progressRange || 36500);
    const first = win[win.length - 1] || null;
    const last  = win[0] || null;
    const prev  = first !== last ? first : null;
    const deltaW  = (last && prev && last.weight && prev.weight)
      ? (last.weight - prev.weight).toFixed(1) : null;
    const deltaBF = (last && prev && last.bodyFat && prev.bodyFat)
      ? (last.bodyFat - prev.bodyFat).toFixed(1) : null;

    const traj = App._goalTrajectory();

    return `
      ${App._rangeSelector()}

      <div class="chart-wrap">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Weight</span>
            ${deltaW !== null ? `<span style="font-size:.8rem;color:${parseFloat(deltaW)<0?'var(--green)':'var(--red)'};text-align:right">
              ${parseFloat(deltaW) > 0 ? '+' : ''}${deltaW} kg<br>
              <span style="font-size:.68rem;color:var(--txt3)">vs ${App._fmtDateShort(new Date(first.date))}</span>
            </span>` : ''}
          </div>
          <canvas id="body-weight-chart" height="140"></canvas>
        </div>
      </div>

      ${traj ? `
      <div class="chart-wrap" style="margin-top:.75rem">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Goal trajectory</span>
            <span class="chart-card-value">${traj.target} kg</span>
          </div>
          <canvas id="goal-trajectory" height="140"></canvas>
          <div class="chart-foot">${traj.note}</div>
        </div>
      </div>` : ''}

      ${latest.bodyFat ? `
      <div class="chart-wrap" style="margin-top:.75rem">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Body Fat %</span>
            ${deltaBF !== null ? `<span style="font-size:.8rem;color:${parseFloat(deltaBF)<0?'var(--green)':'var(--red)'}">
              ${parseFloat(deltaBF) > 0 ? '+' : ''}${deltaBF}%</span>` : ''}
          </div>
          <canvas id="body-fat-chart" height="120"></canvas>
        </div>
      </div>` : ''}

      <div style="margin:.75rem 1rem 0">
        <div class="exercise-block">
          <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);margin-bottom:.5rem">${App._fmtDateFull(new Date(latest.date))}</div>
          ${App._metricRows(latest)}
        </div>
      </div>

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
        </div>`).join('')}` : ''}`;
  },

  // Planned weight is a straight line from the weight recorded at assessment to
  // the target, over the weeks asked for. Actual is the logged weights placed on
  // the same weekly buckets, so the two lines are directly comparable.
  _goalTrajectory() {
    const p = DB.getProfile() || {};
    const startW  = parseFloat(p.weightKg);
    const targetW = parseFloat(p.targetWeightKg);
    const weeks   = parseInt(p.targetWeeks);
    if (!startW || !targetW || !weeks || !p.assessedAt) return null;
    if (Math.abs(targetW - startW) < 0.1) return null;   // maintaining — no line to draw

    const start = new Date(p.assessedAt).getTime();
    const week  = 7 * 86400000;
    const metrics = DB.getBodyMetrics().filter(m => new Date(m.date + 'T12:00').getTime() >= start - week);

    const labels = [], planned = [], actual = [];
    for (let i = 0; i <= weeks; i++) {
      const from = start + (i - 0.5) * week;
      const to   = start + (i + 0.5) * week;
      labels.push(i === 0 ? 'Start' : `W${i}`);
      planned.push(Math.round((startW + (targetW - startW) * (i / weeks)) * 10) / 10);

      // Most recent logged weight inside the week bucket, null if nothing logged.
      const inBucket = metrics.filter(m => {
        const t = new Date(m.date + 'T12:00').getTime();
        return m.weight && t >= from && t < to;
      });
      actual.push(inBucket.length ? inBucket[0].weight : null);
    }

    const elapsed = Math.min(weeks, Math.max(0, Math.round((Date.now() - start) / week)));
    const onPlan  = planned[elapsed];
    const latest  = [...actual].reverse().find(v => v !== null);
    let note = `Target ${targetW} kg in ${weeks} weeks.`;
    if (latest != null) {
      const diff = Math.round((latest - onPlan) * 10) / 10;
      const ahead = (targetW < startW) ? diff < 0 : diff > 0;
      note += Math.abs(diff) < 0.3
        ? ' Right on the planned line.'
        : ` You're ${Math.abs(diff)} kg ${ahead ? 'ahead of' : 'behind'} plan at week ${elapsed}.`;
    }

    return { labels, planned, actual, target: targetW, note };
  },

  _exerciseBlock(ex, ei) {
    const isCardio = App._isCardio(ex.measureType);
    const setsHtml = isCardio
      ? ex.sets.map((s, si) => App._activitySetRow(s, ei, si, false, ex.measureType)).join('')
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

    const setsHeader = isCardio
      ? ''
      : `<div class="sets-header">
           <span style="text-align:center">Set</span>
           <span style="text-align:center">Weight</span>
           <span style="text-align:center">Reps</span>
           <span style="text-align:center">Done</span>
         </div>`;

    const addLabel = ex.measureType === 'distance' ? '+ Leg' : (isCardio ? '+ Session' : '+ Set');

    return `
    <div class="exercise-block">
      <div class="exercise-block-header">
        <div style="flex:1;min-width:0">
          <div class="exercise-block-name">${ex.exerciseName}</div>
          <div class="exercise-block-sub">
            ${isCardio ? `${ex.sets.length} session${ex.sets.length !== 1 ? 's' : ''}` : `${ex.targetSets}×${ex.targetReps}${ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}`}
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

  // Cardio-style exercises are logged as sessions with their own field set
  // instead of weight × reps. 'activity' covers classes and martial arts;
  // 'distance' covers runs, rides, rows and the Hyrox stations.
  _isCardio(measureType) {
    return measureType === 'activity' || measureType === 'distance';
  },

  _setFields(measureType) {
    return measureType === 'distance'
      ? [{ key: 'distance', label: 'Distance', unit: 'km',   mode: 'decimal' },
         { key: 'duration', label: 'Duration', unit: 'min',  mode: 'decimal' },
         { key: 'avgHr',    label: 'Avg HR',   unit: 'bpm',  mode: 'numeric' },
         { key: 'calories', label: 'Calories', unit: 'kcal', mode: 'numeric' }]
      : [{ key: 'duration', label: 'Duration', unit: 'min',  mode: 'decimal' },
         { key: 'avgHr',    label: 'Avg HR',   unit: 'bpm',  mode: 'numeric' },
         { key: 'maxHr',    label: 'Max HR',   unit: 'bpm',  mode: 'numeric' },
         { key: 'calories', label: 'Calories', unit: 'kcal', mode: 'numeric' }];
  },

  _blankSet(num, measureType) {
    if (!App._isCardio(measureType)) {
      return { setNumber: num, weight: null, reps: null, completed: false, type: 'normal' };
    }
    const s = { setNumber: num, completed: false, type: 'normal' };
    App._setFields(measureType).forEach(f => { s[f.key] = null; });
    return s;
  },

  // min/km from the distance and duration already logged on the set.
  _pace(s) {
    const km = parseFloat(s.distance), min = parseFloat(s.duration);
    if (!km || !min) return null;
    const perKm = min / km;
    return `${Math.floor(perKm)}:${String(Math.round((perKm % 1) * 60)).padStart(2, '0')} /km`;
  },

  _activitySetRow(s, ei, si, isPast = false, measureType = 'activity') {
    const dp = isPast ? 'data-past="1"' : '';
    const noInteract = isPast ? 'style="pointer-events:none"' : '';
    const pace = measureType === 'distance' ? App._pace(s) : null;
    const fields = App._setFields(measureType).map(f => `
        <div class="activity-field">
          <span class="activity-lbl">${f.label}</span>
          <div class="activity-input-wrap">
            <input type="number" class="set-input activity-input" inputmode="${f.mode}"
              placeholder="—" value="${s[f.key] || ''}"
              data-field="${f.key}" data-ei="${ei}" data-si="${si}" ${dp}>
            <span class="activity-unit">${f.unit}</span>
          </div>
        </div>`).join('');

    return `
    <div class="activity-set-row ${s.completed ? 'completed' : ''}" data-ei="${ei}" data-si="${si}">
      <div class="activity-set-head">
        <span class="set-num">${s.setNumber}</span>
        <span class="activity-sess-lbl">${measureType === 'distance' ? 'Leg' : 'Session'} ${s.setNumber}</span>
        ${pace ? `<span class="activity-pace">${pace}</span>` : ''}
        <button class="set-complete-btn ${s.completed ? 'done' : ''}" ${noInteract}
          ${!isPast ? `data-action="complete-set" data-ei="${ei}" data-si="${si}"` : ''}>
          ${s.completed ? App._icon('check', 16) : ''}
        </button>
      </div>
      <div class="activity-fields">${fields}</div>
    </div>`;
  },

  _pastExerciseBlock(ex, ei) {
    const isCardio = App._isCardio(ex.measureType);
    const setsHtml = isCardio
      ? ex.sets.map((s, si) => App._activitySetRow(s, ei, si, true, ex.measureType)).join('')
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

    const setsHeader = isCardio
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
          data-action="add-past-set" data-ei="${ei}">${ex.measureType === 'distance' ? '+ Leg' : (isCardio ? '+ Session' : '+ Set')}</button>
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
  // Seconds of training for a workout. Live sessions get it from the clock;
  // past ones only have it if the user typed a time spent, in which case fall
  // back to adding up the per-session durations of any cardio entries.
  _workoutDuration(w) {
    const secs = (new Date(w.completedAt || w.startedAt) - new Date(w.startedAt)) / 1000;
    if (secs >= 60) return secs;
    const mins = (w.exercises || []).flatMap(e => e.sets || [])
      .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
    return mins * 60;
  },

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

  _fmtDateShort(d) {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  _fmtGoal(g) {
    const map = { muscle: 'Build Muscle', fat_loss: 'Lose Fat', bulking: 'Bulk', endurance: 'Endurance', strength: 'Strength', health: 'General Health' };
    return map[g] || g || '—';
  },

  _goalShort(g) {
    const map = { muscle: 'Muscle', fat_loss: 'Fat Loss', bulking: 'Bulk', endurance: 'Endurance', strength: 'Strength', health: 'Health' };
    return map[g] || g || '—';
  },

  _fmtExperience(e) {
    const map = { novice: 'Under 6 months', intermediate: '6 months – 2 years', advanced: '2 years or more' };
    return map[e] || '—';
  },

  _capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); },

  // Reference photo where the dataset has one, emoji by category otherwise.
  // The <img> fills the .list-item-icon box and removes itself if the CDN
  // fails, leaving the emoji underneath visible.
  _exIcon(exerciseId) {
    const ex  = getExercise(exerciseId);
    const map = { chest:'🏋️', back:'💪', shoulders:'🔼', arms:'💪', legs:'🦵', core:'⚡', hyrox:'🏅', crossfit:'🔥', cardio:'🏃', boxing:'🥊', fitness_class:'🧘' };
    const emoji = map[ex?.category] || '💪';
    if (!ex || !ex.image) return emoji;
    return `${emoji}<img src="${EXERCISE_IMAGE_BASE}${ex.image}" alt="" loading="lazy" decoding="async"
                        onerror="this.remove()">`;
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
