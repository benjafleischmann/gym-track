/**
 * GymTrack ↔ Garmin relay — Cloudflare Worker
 * ------------------------------------------------------------------
 * Garmin's Personal API sends no CORS headers (verified: an OPTIONS
 * preflight from the app origin returns 403 with no Access-Control-Allow-
 * Origin), so the PWA cannot call it directly. This Worker is the relay.
 *
 * It holds the Garmin key so the key never reaches the phone, and exposes
 * exactly three read-only routes:
 *
 *   GET /activities?since=YYYY-MM-DD[&limit=N]   → activity summaries (JSON)
 *   GET /fit?id=<activityId>                     → decompressed FIT bytes
 *   GET /sets?id=<activityId>                    → server-side set breakdown
 *
 * Cardio needs only /activities — the summary JSON already carries duration,
 * distance, calories and heart rate.
 *
 * Strength is harder. The watch writes a single auto-counted rep blob with no
 * exercise identity, so /fit yields nothing useful for it. Any real per-exercise
 * breakdown exists only where it was entered or corrected in Garmin Connect
 * itself, and that lives server-side — which is what /sets reaches.
 *
 * Deploy by pasting into the Cloudflare dashboard editor. Set two secrets
 * (Settings → Variables and Secrets → Encrypt):
 *   GARMIN_API_KEY  your Garmin Personal API key
 *   SYNC_TOKEN      a long random string, also entered into GymTrack
 */

const GARMIN = 'https://personal.connectapi.garmin.com';
const TOKEN_URL = `${GARMIN}/personalapitoken-service/personal-api/personal-api-key/token`;

// Only these origins may call the Worker. Anything else gets no CORS headers,
// so a browser on a hostile page cannot read the response.
const ALLOWED_ORIGINS = [
  'https://gym-app-f6e7d.firebaseapp.com',
  'https://gym-app-f6e7d.web.app',
  'http://localhost:3334',
  'http://127.0.0.1:3334',
];

// Bearer tokens last 24h and there is no refresh token, so the key is
// re-exchanged when the cached one is close to expiry. Module scope persists
// for the life of the isolate — a best-effort cache, not a guarantee.
let tokenCache = { token: null, expiresAt: 0 };

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    // Shared-secret gate. Without this, anyone who learned the Worker URL
    // could read the whole Garmin account.
    const supplied = request.headers.get('X-Sync-Token') || '';
    if (!env.SYNC_TOKEN || !timingSafeEqual(supplied, env.SYNC_TOKEN)) {
      return json({ error: 'unauthorized' }, 401, cors);
    }
    if (!env.GARMIN_API_KEY) {
      return json({ error: 'GARMIN_API_KEY is not configured' }, 500, cors);
    }

    const url = new URL(request.url);

    try {
      const token = await getToken(env.GARMIN_API_KEY);

      if (url.pathname === '/activities') {
        return await listActivities(url, token, cors);
      }
      if (url.pathname === '/fit') {
        return await fetchFit(url, token, cors);
      }
      if (url.pathname === '/sets') {
        return await fetchSets(url, token, cors);
      }
      return json({ error: 'not found', routes: ['/activities', '/fit', '/sets'] }, 404, cors);
    } catch (err) {
      // Surface the message but never the key itself.
      return json({ error: String(err && err.message || err) }, 502, cors);
    }
  },
};

/* ── routes ─────────────────────────────────────────────────────────── */

async function listActivities(url, token, cors) {
  const since = url.searchParams.get('since');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100);

  const qs = new URLSearchParams({ start: '0', limit: String(limit) });
  if (since) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
      return json({ error: 'since must be YYYY-MM-DD' }, 400, cors);
    }
    qs.set('startDate', since);
  }

  const res = await garminGet(
    `/activitylist-service/activities/search/activities?${qs}`, token);
  const raw = await res.json();

  // Garmin's summary objects carry ~100 fields each. Returning only what
  // GymTrack uses keeps the phone's payload small and avoids shipping GPS.
  const activities = (Array.isArray(raw) ? raw : []).map(a => ({
    id:          a.activityId,
    name:        a.activityName,
    type:        a.activityType && a.activityType.typeKey,
    parentType:  a.activityType && a.activityType.parentTypeId,
    startLocal:  a.startTimeLocal,
    startGMT:    a.startTimeGMT,
    durationSec: a.duration,
    movingSec:   a.movingDuration,
    distanceM:   a.distance,
    calories:    a.calories,
    avgHr:       a.averageHR,
    maxHr:       a.maxHR,
    avgSpeed:    a.averageSpeed,
    steps:       a.steps,
    // Present on strength activities; tells the client a FIT fetch is worthwhile.
    totalSets:   a.totalSets,
    totalReps:   a.totalReps,
  }));

  return json({ count: activities.length, activities }, 200, cors);
}

async function fetchFit(url, token, cors) {
  const id = url.searchParams.get('id');
  // Path-injection guard: the id is interpolated into a Garmin URL.
  if (!/^\d+$/.test(id || '')) {
    return json({ error: 'id must be a positive integer' }, 400, cors);
  }

  const res = await garminGet(`/download-service/files/activity/${id}`, token);
  const zip = new Uint8Array(await res.arrayBuffer());
  if (!zip.length) return json({ error: 'empty download' }, 502, cors);

  const fit = await unzipFirstEntry(zip);

  return new Response(fit, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'application/vnd.ant.fit',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * The downloaded FIT only ever contains one rep-counted blob per strength
 * session, yet the activity summary can report many more sets — so Garmin
 * holds a set breakdown server-side that the watch file does not carry.
 *
 * Which path serves it is not documented, and the documented one
 * (/workouts) comes back empty for watch-recorded sessions, so try each
 * candidate and return the first that actually has content. Responses are
 * passed through unmodified: the shape is undocumented, so trimming here
 * would risk discarding the exercise names.
 */
const SET_PATHS = ['exerciseSets', 'workouts', 'splits', ''];

async function fetchSets(url, token, cors) {
  const id = url.searchParams.get('id');
  if (!/^\d+$/.test(id || '')) {
    return json({ error: 'id must be a positive integer' }, 400, cors);
  }

  const tried = [];
  for (const suffix of SET_PATHS) {
    const path = `/activity-service/activity/${id}${suffix ? '/' + suffix : ''}`;
    let res;
    try {
      res = await garminGet(path, token);
    } catch (err) {
      tried.push({ path, error: String(err.message || err) });
      continue;
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (data && !isEmpty(data)) {
      return json({ source: path, data }, 200, cors);
    }
    tried.push({ path, status: res.status, empty: true });
  }

  return json({ source: null, data: null, tried }, 200, cors);
}

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

/* ── Garmin plumbing ────────────────────────────────────────────────── */

async function getToken(apiKey) {
  // Refresh a minute early so a token can't expire mid-request.
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`token exchange failed (${res.status}) — key may be expired or revoked`);
  }

  // Garmin returns the JWT as a bare string, not a JSON envelope — but accept
  // both, since the published examples show an {access_token} object.
  const raw = (await res.text()).trim();
  let token = raw;
  if (raw.startsWith('{')) {
    const body = JSON.parse(raw);
    token = body.access_token || body.accessToken;
  }
  if (!token || !token.startsWith('ey')) {
    throw new Error('token endpoint did not return a JWT');
  }

  tokenCache = { token, expiresAt: jwtExpiry(token) || Date.now() + 23 * 3600_000 };
  return token;
}

async function garminGet(path, token) {
  const res = await fetch(`${GARMIN}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  });
  if (res.status === 401 || res.status === 403) {
    tokenCache = { token: null, expiresAt: 0 };   // force re-exchange next call
    throw new Error(`Garmin rejected the request (${res.status})`);
  }
  if (res.status === 429) throw new Error('Garmin rate limit hit — try again later');
  if (!res.ok) throw new Error(`Garmin returned ${res.status} for ${path}`);
  return res;
}

function jwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;   // not a JWT we can read; caller falls back to 23h
  }
}

/* ── ZIP ────────────────────────────────────────────────────────────── */

/**
 * Garmin's download endpoint returns a ZIP, not a bare FIT, so the single
 * entry has to be extracted. Only the two methods ZIP actually uses here are
 * handled: stored (0) and deflate (8), the latter via the platform's own
 * DecompressionStream.
 */
async function unzipFirstEntry(zip) {
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  if (dv.getUint32(0, true) !== 0x04034b50) {
    throw new Error('download was not a ZIP archive');
  }

  const method = dv.getUint16(8, true);
  const flags = dv.getUint16(6, true);
  let compressedSize = dv.getUint32(18, true);
  const nameLen = dv.getUint16(26, true);
  const extraLen = dv.getUint16(28, true);
  const start = 30 + nameLen + extraLen;

  // Bit 3 means the sizes were streamed in a trailing data descriptor and the
  // local header holds zeros; the central directory has the real values.
  if ((flags & 0x08) || compressedSize === 0) {
    compressedSize = sizeFromCentralDirectory(dv, zip.length) ?? (zip.length - start);
  }

  const body = zip.subarray(start, start + compressedSize);
  if (method === 0) return body;
  if (method !== 8) throw new Error(`unsupported ZIP compression method ${method}`);

  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function sizeFromCentralDirectory(dv, len) {
  // Scan back for the end-of-central-directory signature, then read the first
  // central header's compressed size.
  for (let i = len - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      const cdOffset = dv.getUint32(i + 16, true);
      if (dv.getUint32(cdOffset, true) === 0x02014b50) {
        return dv.getUint32(cdOffset + 20, true);
      }
      return null;
    }
  }
  return null;
}

/* ── helpers ────────────────────────────────────────────────────────── */

function corsHeaders(origin) {
  const h = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Sync-Token, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Compares in time proportional to the supplied string only, so a wrong token
// leaks nothing about the real one through response timing.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
