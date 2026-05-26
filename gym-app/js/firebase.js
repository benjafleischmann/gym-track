// ─── Firebase module ───────────────────────────────────────────────────────────
(function () {
  const CONFIG = {
    apiKey:            'AIzaSyC2MM7UFaCB5gx0UML82WtIFzOFOs-cfPw',
    authDomain:        'gym-app-f6e7d.firebaseapp.com',
    projectId:         'gym-app-f6e7d',
    storageBucket:     'gym-app-f6e7d.firebasestorage.app',
    messagingSenderId: '1096284012899',
    appId:             '1:1096284012899:web:99f7274555dcceabd69356',
  };

  let db, auth;
  let _doc, _setDoc, _getDoc, _deleteDoc,
      _collection, _getDocs, _query, _orderBy, _limit, _serverTimestamp,
      _GoogleAuthProvider, _signInWithPopup, _signInWithRedirect,
      _getRedirectResult, _signOutFn;

  window.Firebase = {
    uid:          null,
    ready:        false,
    notSignedIn:  false,
    userName:     null,
    userPhoto:    null,
    _cbs:         [],
    _authListeners: [],

    onAuthChange(cb) { this._authListeners.push(cb); },

    // ── Boot ─────────────────────────────────────────────────────────────────
    async init() {
      try {
        const BASE = 'https://www.gstatic.com/firebasejs/12.13.0';
        const [
          { initializeApp },
          { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
            getRedirectResult, signOut, onAuthStateChanged },
          { getFirestore, doc, getDoc, setDoc, deleteDoc,
            collection, getDocs, query, orderBy, limit, serverTimestamp },
        ] = await Promise.all([
          import(`${BASE}/firebase-app.js`),
          import(`${BASE}/firebase-auth.js`),
          import(`${BASE}/firebase-firestore.js`),
        ]);

        _doc = doc; _setDoc = setDoc; _getDoc = getDoc; _deleteDoc = deleteDoc;
        _collection = collection; _getDocs = getDocs;
        _query = query; _orderBy = orderBy; _limit = limit;
        _serverTimestamp = serverTimestamp;
        _GoogleAuthProvider = GoogleAuthProvider;
        _signInWithPopup = signInWithPopup;
        _signInWithRedirect = signInWithRedirect;
        _getRedirectResult = getRedirectResult;
        _signOutFn = signOut;

        const app = initializeApp(CONFIG);
        auth = getAuth(app);
        db   = getFirestore(app);

        // Handle redirect result (after Google sign-in redirect)
        await getRedirectResult(auth).catch(() => {});

        return new Promise(resolve => {
          onAuthStateChanged(auth, async user => {
            if (user) {
              this.uid         = user.uid;
              this.userName    = user.displayName || user.email || 'Athlete';
              this.userPhoto   = user.photoURL    || null;
              this.ready       = true;
              this.notSignedIn = false;

              // Sync profile to Firestore
              const p = typeof DB !== 'undefined' ? DB.getProfile() : null;
              if (p) {
                const merged = { ...p, name: p.name || this.userName };
                this.syncProfile(merged).catch(() => {});
              }

              // Check URL invite param
              const params = new URLSearchParams(window.location.search);
              const inv    = params.get('addFriend');
              if (inv && inv !== this.uid) {
                window._pendingFriendInvite = inv;
                history.replaceState({}, '', window.location.pathname);
              }

              resolve(this.uid);
              this._cbs.forEach(cb => cb(this.uid));
              this._cbs = [];
              this._authListeners.forEach(cb => cb(this.uid));
            } else {
              this.uid         = null;
              this.ready       = false;
              this.notSignedIn = true;
              resolve(null);
              this._cbs.forEach(cb => cb(null));
              this._cbs = [];
              this._authListeners.forEach(cb => cb(null));
            }
          });
        });
      } catch (e) {
        console.warn('[Firebase] init failed:', e);
      }
    },

    onReady(cb) {
      if (this.ready) cb(this.uid);
      else this._cbs.push(cb);
    },

    // ── Auth ─────────────────────────────────────────────────────────────────
    async signIn() {
      if (!auth || !_GoogleAuthProvider) return;
      const provider = new _GoogleAuthProvider();
      try {
        await _signInWithPopup(auth, provider);
      } catch {
        // Popup blocked (standalone PWA) — fall back to redirect
        await _signInWithRedirect(auth, provider).catch(console.warn);
      }
    },

    async signOut() {
      if (!auth || !_signOutFn) return;
      await _signOutFn(auth).catch(console.warn);
      this.uid = null; this.ready = false; this.notSignedIn = true;
    },

    // ── Restore from cloud ────────────────────────────────────────────────────
    async restoreFromCloud() {
      if (!this.uid || !db || typeof DB === 'undefined') return 0;
      let count = 0;
      try {
        // Workouts
        const wSnap = await _getDocs(_collection(db, 'workouts', this.uid, 'items'));
        wSnap.docs.forEach(d => {
          const w = { ...d.data() };
          delete w.uid; delete w.syncedAt;
          DB.saveWorkout(w);
          count++;
        });
        // Metrics
        const mSnap = await _getDocs(_collection(db, 'metrics', this.uid, 'items'));
        mSnap.docs.forEach(d => {
          const m = { ...d.data() };
          delete m.uid;
          DB.saveBodyMetric(m);
          count++;
        });
      } catch (e) { console.warn('[Firebase] restoreFromCloud:', e); }
      return count;
    },

    // ── Profile ───────────────────────────────────────────────────────────────
    async syncProfile(profile) {
      if (!this.uid || !db) return;
      await _setDoc(_doc(db, 'users', this.uid), {
        name:         profile.name         || this.userName || 'Athlete',
        goal:         profile.goal         || null,
        trainingType: profile.trainingType || null,
        lastActive:   _serverTimestamp(),
      }, { merge: true });
    },

    async getUserProfile(uid) {
      if (!db) return null;
      const snap = await _getDoc(_doc(db, 'users', uid));
      return snap.exists() ? { uid, ...snap.data() } : null;
    },

    // ── Workouts ──────────────────────────────────────────────────────────────
    async syncWorkout(workout) {
      if (!this.uid || !db) return;
      await _setDoc(_doc(db, 'workouts', this.uid, 'items', workout.id), {
        ...workout, uid: this.uid, syncedAt: _serverTimestamp(),
      });
    },

    async deleteWorkout(workoutId) {
      if (!this.uid || !db) return;
      await _deleteDoc(_doc(db, 'workouts', this.uid, 'items', workoutId)).catch(() => {});
    },

    async getFriendWorkouts(friendUid, n = 3) {
      if (!db) return [];
      try {
        const q = _query(_collection(db, 'workouts', friendUid, 'items'),
                         _orderBy('startedAt', 'desc'), _limit(n));
        const snap = await _getDocs(q);
        return snap.docs.map(d => d.data());
      } catch { return []; }
    },

    // ── Metrics ───────────────────────────────────────────────────────────────
    async syncMetric(metric) {
      if (!this.uid || !db) return;
      await _setDoc(_doc(db, 'metrics', this.uid, 'items', metric.id), {
        ...metric, uid: this.uid,
      });
    },

    async deleteMetric(metricId) {
      if (!this.uid || !db) return;
      await _deleteDoc(_doc(db, 'metrics', this.uid, 'items', metricId)).catch(() => {});
    },

    // ── Friends ───────────────────────────────────────────────────────────────
    getInviteLink() {
      const base = (window.location.origin + window.location.pathname).replace(/\/$/, '');
      return `${base}?addFriend=${this.uid}`;
    },

    async addFriend(friendUid) {
      if (!this.uid || !db || !friendUid || friendUid === this.uid) return false;
      const ts = new Date().toISOString();
      await Promise.all([
        _setDoc(_doc(db, 'friends', this.uid,   'list', friendUid),    { friendUid,          addedAt: ts }),
        _setDoc(_doc(db, 'friends', friendUid,  'list', this.uid),     { friendUid: this.uid, addedAt: ts }),
      ]);
      return true;
    },

    async removeFriend(friendUid) {
      if (!this.uid || !db) return;
      await Promise.all([
        _deleteDoc(_doc(db, 'friends', this.uid,    'list', friendUid)),
        _deleteDoc(_doc(db, 'friends', friendUid,   'list', this.uid)),
      ]).catch(() => {});
    },

    async getFriendsWithData() {
      if (!this.uid || !db) return [];
      try {
        const snap  = await _getDocs(_collection(db, 'friends', this.uid, 'list'));
        const uids  = snap.docs.map(d => d.data().friendUid).filter(Boolean);
        const data  = await Promise.all(uids.map(async uid => {
          const [profile, workouts] = await Promise.all([
            this.getUserProfile(uid),
            this.getFriendWorkouts(uid, 3),
          ]);
          return profile ? { ...profile, recentWorkouts: workouts } : null;
        }));
        return data.filter(Boolean);
      } catch (e) {
        console.warn('[Firebase] getFriendsWithData:', e);
        return [];
      }
    },
  };
})();
