const $ = (id) => document.getElementById(id);
const avatarFrame = $('avatarFrame');
const glow = $('glow');
const eyesGroup = $('eyes');
const eyeL = $('eyeL');
const eyeR = $('eyeR');
const mouth = $('mouth');
const plateEl = $('plate');
const cupEl = $('cup');
const vomitEl = $('vomit');
const ballEl = $('ball');
const stageEl = $('stage');
const parkEl = $('park');
const reviveHint = $('reviveHint');
const sceneEl = $('scene');
const petNameEl = $('petName');
const editNameBtn = $('editNameBtn');
const friendsBtn = $('friendsBtn');
const friendsMapEl = $('friendsMap');
const friendsMapClose = $('friendsMapClose');
const friendsRadarEl = $('friendsRadar');
const friendsEmptyEl = $('friendsEmpty');
const parkFriendsEl = $('parkFriends');

function denied() {
  sceneEl.classList.remove('deny-shake');
  void sceneEl.offsetWidth;
  sceneEl.classList.add('deny-shake');
}

const HOUR = 3_600_000;
const DAY_MS = 24 * HOUR;
const PLATOS_CAP = 3;
const BITES_PER_PLATE = 10;
const WATER_CAP = 8;
const DEATH_DAYS = 3;
const MOURNING_MS = 3 * HOUR;
const PET_HOLD_THRESHOLD = 250;
const PARK_SOLO_MS = 15 * 60 * 1000;
const PARK_FRIENDS_MS = 2 * HOUR;
const STORAGE_KEY = 'avatarPetState_v1';

const EYES = {
  neutral:     { rx: 11, ry: 15, cy: 88 },
  feliz:       { rx: 11, ry: 6,  cy: 88 },
  triste:      { rx: 10, ry: 10, cy: 92 },
  enfermo:     { rx: 9,  ry: 9,  cy: 88 },
  desnutrido:  { rx: 9,  ry: 8,  cy: 91 },
  muerto:      { rx: 11, ry: 1,  cy: 88 }
};
const MOUTH = {
  neutral:     'M 72 132 Q 100 132 128 132',
  feliz:       'M 66 122 Q 100 154 134 122',
  triste:      'M 70 138 Q 100 118 130 138',
  enfermo:     'M 68 130 Q 80 140 92 130 Q 104 120 116 130 Q 128 140 132 130',
  desnutrido:  'M 74 134 Q 100 128 126 134',
  muerto:      'M 75 133 L 125 133',
  petting:     'M 70 128 Q 100 148 130 128'
};
const MOUTH_CHEW = 'M 80 126 Q 100 140 120 126';
const MOUTH_IDLE_OPEN = 'M 78 126 Q 100 142 122 126';
const MOUTH_O = 'M 82 120 Q 100 104 118 120 Q 100 150 82 120';
const MAX_RAPID_FEED = 3;

const rand = (min, max) => min + Math.random() * (max - min);

// --- Estado persistente (localStorage) ---
function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((b - a) / DAY_MS);
}
function defaultState() {
  return {
    platosToday: 0,
    bitesInCurrentPlato: 0,
    bitesEatenTotalToday: 0,
    platosCompletedToday: 0,
    waterToday: 0,
    overflowUnits: 0,
    affectionToday: 0,
    ballPlaysToday: 0,
    lastDayKey: todayKey(),
    daysWithoutFood: 0,
    daysWithoutWater: 0,
    malnourishedStreak: 0,
    moodScore: 0,
    sickUntil: null,
    parkUntil: null,
    dead: false,
    diedAt: null,
    deathCount: 0,
    petName: 'El BriAn'
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch {
    return defaultState();
  }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

let state = load();

function evaluateDay(bitesTotal, water, affection, ballPlays, platosCompleted) {
  if (bitesTotal === 0) state.daysWithoutFood++; else state.daysWithoutFood = 0;
  if (water === 0) state.daysWithoutWater++; else state.daysWithoutWater = 0;

  const played = (affection || 0) >= 1 || (ballPlays || 0) >= 1;
  const fedAndHydrated = bitesTotal >= 1 && water >= 1;
  // Comida + agua alcanza para no empeorar; jugar/acariciar además suma para
  // estar más alegre. Faltar comida o agua sí la va entristeciendo.
  let moodDelta = 0;
  if (!fedAndHydrated) moodDelta = -1;
  else if (played) moodDelta = 1;
  state.moodScore = Math.max(-3, Math.min(3, state.moodScore + moodDelta));

  state.malnourishedStreak = platosCompleted >= PLATOS_CAP ? 0 : (state.malnourishedStreak || 0) + 1;

  if (state.daysWithoutFood >= DEATH_DAYS && state.daysWithoutWater >= DEATH_DAYS) {
    die();
  }
}

function die() {
  state.dead = true;
  state.diedAt = Date.now();
  state.deathCount = (state.deathCount || 0) + 1;
}

function rolloverIfNeeded() {
  const key = todayKey();
  if (state.lastDayKey === key) return;
  const gap = Math.max(1, daysBetween(state.lastDayKey, key));

  evaluateDay(state.bitesEatenTotalToday, state.waterToday, state.affectionToday, state.ballPlaysToday, state.platosCompletedToday);
  for (let i = 1; i < gap; i++) evaluateDay(0, 0, 0, 0, 0);

  state.platosToday = 0;
  state.bitesInCurrentPlato = 0;
  state.bitesEatenTotalToday = 0;
  state.platosCompletedToday = 0;
  state.waterToday = 0;
  state.overflowUnits = 0;
  state.affectionToday = 0;
  state.ballPlaysToday = 0;
  state.lastDayKey = key;
  save();
  plateEl.classList.remove('show');
  resetKibbles();
}

function isSick() {
  return !!state.sickUntil && Date.now() < state.sickUntil;
}
function isAtPark() {
  return !!state.parkUntil && Date.now() < state.parkUntil;
}
function returnFromPark() {
  state.parkUntil = null;
  save();
  stageEl.classList.remove('away');
  parkEl.classList.remove('active');
  ballEl.classList.remove('visible');
  ballEl.style.transform = '';
  ballEl.style.transition = '';
  ballBusy = false;
  busy = false;
  parkFriendsEl.innerHTML = '';
  metFriendsThisVisit.clear();
}

function currentTier() {
  if (state.dead) return 'muerto';
  if (isSick()) return 'enfermo';
  if ((state.malnourishedStreak || 0) >= 1) return 'desnutrido';
  if (state.moodScore >= 2) return 'feliz';
  if (state.moodScore <= -2) return 'triste';
  return 'neutral';
}

function moodTimingMultiplier() {
  const tier = currentTier();
  if (tier === 'triste') return 1.8;
  if (tier === 'feliz') return 0.7;
  return 1;
}

function applyBaseExpression() {
  const tier = currentTier();
  const eyeShape = EYES[tier] || EYES.neutral;
  eyeL.setAttribute('rx', eyeShape.rx); eyeL.setAttribute('ry', eyeShape.ry); eyeL.setAttribute('cy', eyeShape.cy);
  eyeR.setAttribute('rx', eyeShape.rx); eyeR.setAttribute('ry', eyeShape.ry); eyeR.setAttribute('cy', eyeShape.cy);
  mouth.setAttribute('d', MOUTH[tier] || MOUTH.neutral);
  avatarFrame.classList.toggle('sick', tier === 'enfermo');
  avatarFrame.classList.toggle('malnourished', tier === 'desnutrido');
  avatarFrame.classList.toggle('dead', tier === 'muerto');
}

function mourningRemaining() {
  if (!state.diedAt) return 0;
  return MOURNING_MS - (Date.now() - state.diedAt);
}
function updateReviveHint() {
  reviveHint.hidden = !state.dead;
  if (!state.dead) return;
  reviveHint.innerHTML = mourningRemaining() > 0
    ? 'Se murió — todavía está de duelo.'
    : 'Se murió — presioná <strong>R</strong> para revivirla.';
}

function renderName() {
  petNameEl.textContent = state.petName || 'Nombre';
}
editNameBtn.addEventListener('click', () => {
  const input = prompt('¿Cómo se llama?', state.petName || '');
  if (input === null) return;
  state.petName = input.trim().slice(0, 24);
  save();
  renderName();
});

// --- Amigos: ubicación real, se encuentran en el parque, mapa radar ---
// Necesita Firebase (Realtime Database) para que los dispositivos se vean
// entre sí. Si el SDK no cargó o falla, el resto del juego sigue andando
// normal, solo sin esta parte.
const firebaseConfig = {
  apiKey: "AIzaSyCz7jQwDxXqPeOqb8zwt4cgij1AK9bRL8Y",
  authDomain: "mi-ai-924fa.firebaseapp.com",
  databaseURL: "https://mi-ai-924fa-default-rtdb.firebaseio.com",
  projectId: "mi-ai-924fa",
  storageBucket: "mi-ai-924fa.firebasestorage.app",
  messagingSenderId: "162959332908",
  appId: "1:162959332908:web:74c50b4be7ff620b826389"
};

const MEET_DISTANCE_M = 100;
const PRESENCE_STALE_MS = 60000;
const DEVICE_ID_KEY = 'avatarPetDeviceId';

let fdb = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    fdb = firebase.database();
  }
} catch (err) {
  fdb = null;
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
const deviceId = getDeviceId();

let myLat = null;
let myLng = null;
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => { myLat = pos.coords.latitude; myLng = pos.coords.longitude; },
    () => {},
    { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 }
  );
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function bearingDeg(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function broadcastPresence() {
  if (!fdb || myLat == null || myLng == null) return;
  fdb.ref('presence/' + deviceId).set({
    name: state.petName || 'Lu',
    lat: myLat,
    lng: myLng,
    updatedAt: Date.now(),
    mood: currentTier(),
    deathCount: state.deathCount || 0,
    parkUntil: state.parkUntil || null
  });
}

const metFriendsThisVisit = new Set();

function checkForFriendsNearby() {
  if (!fdb || !isAtPark() || myLat == null) return;
  fdb.ref('presence').once('value').then((snap) => {
    const now = Date.now();
    snap.forEach((child) => {
      const id = child.key;
      if (id === deviceId) return;
      const p = child.val();
      if (!p || !p.updatedAt || now - p.updatedAt > PRESENCE_STALE_MS) return;
      if (!p.parkUntil || p.parkUntil < now) return;
      if (p.lat == null || p.lng == null) return;
      if (haversineMeters(myLat, myLng, p.lat, p.lng) <= MEET_DISTANCE_M) {
        onMetFriend(id, p);
      }
    });
  });
}

function onMetFriend(friendId, friendData) {
  fdb.ref('friends/' + deviceId + '/' + friendId).set(true);
  fdb.ref('friends/' + friendId + '/' + deviceId).set(true);
  state.parkUntil = Math.max(state.parkUntil || 0, Date.now() + PARK_FRIENDS_MS);
  save();
  if (!metFriendsThisVisit.has(friendId)) {
    metFriendsThisVisit.add(friendId);
    showMeetupAvatar(friendId, friendData);
  }
}

function miniFaceSvg(mood) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  const eyeShape = EYES[mood] || EYES.neutral;
  [68, 132].forEach((cx) => {
    const e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', cx);
    e.setAttribute('cy', eyeShape.cy);
    e.setAttribute('rx', eyeShape.rx);
    e.setAttribute('ry', eyeShape.ry);
    e.setAttribute('fill', '#ECEEF3');
    svg.appendChild(e);
  });
  const mouthPath = document.createElementNS(NS, 'path');
  mouthPath.setAttribute('d', MOUTH[mood] || MOUTH.neutral);
  mouthPath.setAttribute('stroke', '#ECEEF3');
  mouthPath.setAttribute('fill', 'none');
  mouthPath.setAttribute('stroke-width', '9');
  mouthPath.setAttribute('stroke-linecap', 'round');
  svg.appendChild(mouthPath);
  return svg;
}

function showMeetupAvatar(friendId, friendData) {
  if ($('friend-' + friendId)) return;
  const wrap = document.createElement('div');
  wrap.className = 'mini-avatar';
  wrap.id = 'friend-' + friendId;
  wrap.appendChild(miniFaceSvg(friendData.mood));
  parkFriendsEl.appendChild(wrap);
}

// --- Mapa de amigos (botón arriba a la izquierda) ---
function openFriendsMap() {
  friendsMapEl.hidden = false;
  renderFriendsMap();
}
function closeFriendsMap() {
  friendsMapEl.hidden = true;
}
friendsBtn.addEventListener('click', openFriendsMap);
friendsMapClose.addEventListener('click', closeFriendsMap);

function renderFriendsMap() {
  friendsRadarEl.querySelectorAll('.friend-dot').forEach((d) => d.remove());
  friendsEmptyEl.hidden = true;
  if (!fdb) { friendsEmptyEl.hidden = false; friendsEmptyEl.textContent = 'No se pudo conectar.'; return; }

  fdb.ref('friends/' + deviceId).once('value').then((snap) => {
    const ids = [];
    snap.forEach((c) => { if (c.val()) ids.push(c.key); });
    if (!ids.length) {
      friendsEmptyEl.hidden = false;
      friendsEmptyEl.textContent = 'Todavía no te encontraste con nadie en el parque.';
      return;
    }
    Promise.all(ids.map((id) => fdb.ref('presence/' + id).once('value'))).then((snaps) => {
      let shown = 0;
      snaps.forEach((s, i) => {
        const p = s.val();
        if (p) { renderFriendDot(ids[i], p); shown++; }
      });
      if (!shown) {
        friendsEmptyEl.hidden = false;
        friendsEmptyEl.textContent = 'Todavía no te encontraste con nadie en el parque.';
      }
    });
  });
}

function renderFriendDot(id, p) {
  if (myLat == null || p.lat == null) return;
  const dist = haversineMeters(myLat, myLng, p.lat, p.lng);
  const brg = bearingDeg(myLat, myLng, p.lat, p.lng);
  const maxDist = 5000;
  const radius = Math.min(dist / maxDist, 1) * 46;
  const angleRad = ((brg - 90) * Math.PI) / 180;
  const x = 50 + radius * Math.cos(angleRad);
  const y = 50 + radius * Math.sin(angleRad);

  const dot = document.createElement('div');
  dot.className = 'friend-dot mood-' + (p.mood || 'neutral');
  dot.style.left = x + '%';
  dot.style.top = y + '%';
  dot.title = (p.name || 'Amigo') + ' — ' + (p.mood || 'neutral') + ' — murió ' + (p.deathCount || 0) + ' veces';

  const label = document.createElement('span');
  label.textContent = p.name || 'Amigo';
  dot.appendChild(label);
  friendsRadarEl.appendChild(dot);
}

// --- Gestos idle: parpadeo, guiño, boca suelta ---
let busy = false;

function scheduleBlink() {
  setTimeout(() => {
    if (!busy && !state.dead) {
      eyesGroup.classList.add('blink');
      setTimeout(() => eyesGroup.classList.remove('blink'), 280);
    }
    scheduleBlink();
  }, rand(2200, 4800) * moodTimingMultiplier());
}
function scheduleWink() {
  setTimeout(() => {
    if (!busy && !state.dead && currentTier() !== 'enfermo') {
      const eye = Math.random() < 0.5 ? eyeL : eyeR;
      eye.classList.add('blink');
      setTimeout(() => eye.classList.remove('blink'), 280);
    }
    scheduleWink();
  }, rand(6000, 14000) * moodTimingMultiplier());
}
function scheduleMouthIdle() {
  setTimeout(() => {
    if (!busy && !state.dead && currentTier() !== 'enfermo') {
      const base = mouth.getAttribute('d');
      mouth.setAttribute('d', MOUTH_IDLE_OPEN);
      setTimeout(() => mouth.setAttribute('d', base), 260);
    }
    scheduleMouthIdle();
  }, rand(8000, 16000) * moodTimingMultiplier());
}

// --- Comer / beber ---
let eating = false;
let rapidFeedAttempts = 0;

function feed() {
  if (state.dead) return;
  if (eating) {
    // Le dieron otra croqueta antes de tragar la anterior: riesgo de ahogo.
    rapidFeedAttempts++;
    denied();
    if (rapidFeedAttempts > MAX_RAPID_FEED) choke();
    return;
  }
  if (busy) { denied(); return; }

  const startingNewPlato = state.bitesInCurrentPlato === 0;
  if (startingNewPlato && state.platosToday >= PLATOS_CAP) {
    // Ya comió sus 3 platos de hoy — este cuarto la empacha.
    triggerOverfeed();
    return;
  }
  if (startingNewPlato) {
    state.platosToday++;
    resetKibbles();
    plateEl.classList.add('show');
  }

  state.bitesInCurrentPlato++;
  state.bitesEatenTotalToday++;
  state.daysWithoutFood = 0;
  save();
  playEatAnimation();
}
function water() {
  if (state.dead) return;
  if (busy) { denied(); return; }
  if (state.waterToday >= WATER_CAP) { triggerOverfeed(); return; }
  state.waterToday++;
  state.daysWithoutWater = 0;
  save();
  playDrinkAnimation();
}

function resetKibbles() {
  plateEl.querySelectorAll('.kibble').forEach((k) => k.classList.remove('eaten'));
}
function hideKibble(biteIndex) {
  const kibbles = plateEl.querySelectorAll('.kibble');
  const k = kibbles[biteIndex - 1];
  if (k) k.classList.add('eaten');
}

function spawnFlyingKibble() {
  const k = document.createElement('div');
  k.className = 'kibble-flying';
  avatarFrame.appendChild(k);
  const anim = k.animate([
    { transform: 'translate(-50%, 0) scale(1)', bottom: '14%', opacity: 1 },
    { transform: 'translate(-50%, 0) scale(.55)', bottom: '36%', opacity: 0 }
  ], { duration: 520, easing: 'ease-in' });
  anim.onfinish = () => k.remove();
}

function playEatAnimation() {
  eating = true;
  busy = true;
  hideKibble(state.bitesInCurrentPlato);
  spawnFlyingKibble();

  const base = MOUTH[currentTier()] || MOUTH.neutral;
  setTimeout(() => {
    let n = 0;
    const chew = setInterval(() => {
      mouth.setAttribute('d', n % 2 === 0 ? MOUTH_CHEW : base);
      n++;
      if (n >= 4) {
        clearInterval(chew);
        // Traga: siempre abre la boca en O, es la señal de que ya se le puede dar la próxima.
        mouth.setAttribute('d', MOUTH_O);
        setTimeout(() => {
          eating = false;
          busy = false;
          rapidFeedAttempts = 0;

          if (state.bitesInCurrentPlato >= BITES_PER_PLATE) {
            state.platosCompletedToday = (state.platosCompletedToday || 0) + 1;
            state.bitesInCurrentPlato = 0;
            plateEl.classList.remove('show');
            applyBaseExpression();
          }
          // Si queda comida en el plato, se queda con la boca en O esperando
          // la próxima croqueta en vez de volver a la expresión normal.
          save();
        }, 380);
      }
    }, 220);
  }, 520);
}

function choke() {
  eating = false;
  busy = false;
  rapidFeedAttempts = 0;
  plateEl.classList.remove('show');
  die();
  save();
  applyBaseExpression();
  updateReviveHint();
}
function playDrinkAnimation() {
  busy = true;
  cupEl.classList.add('show');
  requestAnimationFrame(() => cupEl.classList.add('drink'));
  setTimeout(() => {
    cupEl.classList.remove('show');
    cupEl.classList.remove('drink');
    busy = false;
  }, 1600);
}

// --- Enfermedad por sobrealimentar/sobrehidratar ---
let vomitTimers = [];

function triggerOverfeed() {
  state.overflowUnits = (state.overflowUnits || 0) + 1;
  const addMs = 2 * HOUR + (state.overflowUnits - 1) * HOUR;
  const now = Date.now();
  state.sickUntil = Math.max(state.sickUntil || 0, now) + addMs;
  save();
  applyBaseExpression();
  scheduleVomitBursts();
}
function scheduleVomitBursts() {
  vomitTimers.forEach(clearTimeout);
  vomitTimers = [];
  const remaining = state.sickUntil - Date.now();
  if (remaining <= 0) return;
  const severity = state.overflowUnits || 1;
  let count = 1;
  if (Math.random() < Math.min(0.25 + severity * 0.12, 0.85)) count++;
  if (count === 2 && Math.random() < Math.min(0.15 + severity * 0.1, 0.7)) count++;
  count = Math.min(count, 3);
  for (let i = 0; i < count; i++) {
    const delay = Math.random() * remaining;
    vomitTimers.push(setTimeout(() => { if (isSick() && !busy) burstVomit(); }, delay));
  }
}
function burstVomit() {
  vomitEl.classList.remove('burst');
  void vomitEl.offsetWidth;
  vomitEl.classList.add('burst');
}

// --- Acariciar (espacio mantenido) / jugar a la pelota (espacio tocado y soltado) ---
let spaceHeld = false;
let isPetting = false;
let petTimeout = null;
let affectionInterval = null;

function onSpaceDown() {
  if (state.dead || spaceHeld) return;
  if (busy) { denied(); return; }
  spaceHeld = true;
  petTimeout = setTimeout(enterPetting, PET_HOLD_THRESHOLD);
}
function onSpaceUp() {
  if (!spaceHeld) return;
  spaceHeld = false;
  if (petTimeout) { clearTimeout(petTimeout); petTimeout = null; }
  if (isPetting) exitPetting();
  else playWithBall();
}
function enterPetting() {
  isPetting = true;
  busy = true;
  avatarFrame.classList.add('petting');
  eyeL.setAttribute('ry', 1.5);
  eyeR.setAttribute('ry', 1.5);
  mouth.setAttribute('d', MOUTH.petting);
  affectionInterval = setInterval(() => {
    state.affectionToday = Math.min((state.affectionToday || 0) + 1, 5);
    save();
  }, 400);
}
function exitPetting() {
  isPetting = false;
  busy = false;
  avatarFrame.classList.remove('petting');
  clearInterval(affectionInterval);
  affectionInterval = null;
  if ((state.affectionToday || 0) < 1) state.affectionToday = 1;
  save();
  applyBaseExpression();
}

// Curvas físicas: al subir frena (como si la gravedad la fuera parando),
// al caer acelera (como si la gravedad la tirara para abajo).
const EASE_RISE = 'cubic-bezier(0,0,.2,1)';
const EASE_FALL = 'cubic-bezier(.8,0,1,1)';

// Puntos de un pique real: x avanza parejo, y sigue una parábola (sube y
// baja), muestreada en varios pasos para que se vea un arco curvo y no una
// línea recta en V.
function bounceArc(fromX, dx, height, steps = 8) {
  const kfs = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + dx * t;
    const y = -4 * height * t * (1 - t);
    kfs.push({ transform: `translate(calc(-50% + ${x}px), ${y}px)` });
  }
  return kfs;
}

let ballBusy = false;
function playWithBall() {
  if (state.dead || ballBusy || busy) return;
  ballBusy = true;
  busy = true;
  state.ballPlaysToday = (state.ballPlaysToday || 0) + 1;
  save();

  ballEl.style.transition = '';
  ballEl.style.transform = 'translate(-50%, -260px)';
  ballEl.classList.add('visible');

  // 1) Cae de arriba de la pantalla al piso (primer pique).
  const fall = ballEl.animate(
    [{ transform: 'translate(-50%, -260px)' }, { transform: 'translate(-50%, 0px)' }],
    { duration: 480, easing: EASE_FALL, fill: 'forwards' }
  );
  fall.onfinish = () => {
    ballEl.style.transform = 'translate(-50%, 0px)';

    // 2) Segundo pique: arco hacia el costado donde la va a agarrar.
    const bounce2 = ballEl.animate(bounceArc(0, 55, 85), { duration: 480, easing: 'linear', fill: 'forwards' });
    bounce2.onfinish = () => {
      ballEl.style.transform = 'translate(calc(-50% + 55px), 0px)';

      // 3) Tercer pique, más chico, termina justo donde la "agarra".
      const bounce3 = ballEl.animate(bounceArc(55, 9, 30), { duration: 360, easing: 'linear', fill: 'forwards' });
      bounce3.onfinish = () => {
        ballEl.style.transform = 'translate(calc(-50% + 64px), 0px)';

        // Se acomoda pegada a la mano, como agarrada.
        ballEl.style.transition = 'transform .25s ease';
        ballEl.style.transform = 'translate(64px, -6px)';

        setTimeout(() => {
          state.parkUntil = Date.now() + PARK_SOLO_MS;
          save();
          stageEl.classList.add('away');
          parkEl.classList.add('active');
          setTimeout(playParkTrick, 350);
          // Se queda ahí de verdad (15 min reales sola, 2hs si se encuentra con
          // amigos) — la vuelta la maneja returnFromPark() desde tick().
          setTimeout(() => {
            ballEl.classList.remove('visible');
            ballEl.style.transform = '';
            ballEl.style.transition = '';
          }, 1600);
        }, 450);
      };
    };
  };
}

// En el parque, la pelota hace algo random: patada, tiro alto, o cabeceo.
function playParkTrick() {
  const tricks = [
    // patear: sale disparada al costado y vuelve
    [
      { transform: 'translate(64px, -6px)',   offset: 0,    easing: EASE_RISE },
      { transform: 'translate(150px, -34px)', offset: 0.4,  easing: EASE_FALL },
      { transform: 'translate(64px, -6px)',   offset: 1 }
    ],
    // lanzar: la tira bien alto y la recibe de vuelta
    [
      { transform: 'translate(64px, -6px)',    offset: 0,    easing: EASE_RISE },
      { transform: 'translate(64px, -170px)',  offset: 0.45, easing: EASE_FALL },
      { transform: 'translate(64px, -6px)',    offset: 1 }
    ],
    // cabecear: un par de golpecitos cortos justo arriba de la cabeza
    [
      { transform: 'translate(64px, -6px)',   offset: 0,    easing: EASE_RISE },
      { transform: 'translate(64px, -60px)',  offset: 0.25, easing: EASE_FALL },
      { transform: 'translate(64px, -6px)',   offset: 0.5,  easing: EASE_RISE },
      { transform: 'translate(64px, -50px)',  offset: 0.75, easing: EASE_FALL },
      { transform: 'translate(64px, -6px)',   offset: 1 }
    ]
  ];
  const pick = tricks[Math.floor(Math.random() * tricks.length)];
  ballEl.style.transition = '';
  ballEl.animate(pick, { duration: 950 });
}

function revive() {
  if (!state.dead) return;
  if (mourningRemaining() > 0) { denied(); return; }
  const keepName = state.petName;
  state = defaultState();
  state.petName = keepName;
  save();
  applyBaseExpression();
  updateReviveHint();
  renderName();
}

// --- Hablarle por voz (cerebro local vía Ollama, sin nube ni key) ---
// Requiere tener Ollama corriendo en la misma compu con CORS habilitado:
//   OLLAMA_ORIGINS="*" ollama serve
// y el modelo bajado: ollama pull llama3.2:1b (o cambiá OLLAMA_MODEL abajo).
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2:1b';

let voiceOn = false;
let ollamaBusy = false;
let talkTimer = null;
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognitionCtor) {
  recognition = new SpeechRecognitionCtor();
  recognition.lang = 'es-AR';
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    if (busy || ollamaBusy) return;
    const last = e.results[e.results.length - 1];
    if (!last.isFinal) return;
    const text = last[0].transcript.trim();
    if (text) handleVoiceInput(text);
  };
  recognition.onerror = () => {};
  recognition.onend = () => { if (voiceOn) { try { recognition.start(); } catch {} } };
}

function toggleVoice() {
  if (state.dead) return;
  if (!recognition) { denied(); return; }
  voiceOn = !voiceOn;
  if (voiceOn) { try { recognition.start(); } catch {} }
  else { try { recognition.stop(); } catch {} }
}

async function handleVoiceInput(text) {
  if (state.dead || ollamaBusy) return;
  ollamaBusy = true;
  if (recognition) { try { recognition.stop(); } catch {} }

  const system = `Sos ${state.petName || 'Lu'}, una mascota virtual con personalidad propia: `
    + 'cálida, curiosa, un poco traviesa. Hablás en español rioplatense, corto (1-3 frases). '
    + 'El micrófono capta todo el ambiente, no solo lo que te hablan a vos directamente — si lo '
    + 'que escuchás es ruido, una charla entre otras personas, o claramente no es para vos, no '
    + 'respondas: devolvé exactamente {"texto":"","emocion":"neutral"}. Respondé SIEMPRE en JSON '
    + 'puro, sin markdown: {"texto":"tu respuesta acá (o vacío)", "emocion":"neutral|feliz|triste"}.';

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, system, prompt: text, format: 'json', stream: false })
    });
    if (!res.ok) throw new Error('ollama-error');
    const data = await res.json();
    let parsed;
    try { parsed = JSON.parse(data.response); } catch { parsed = { texto: data.response, emocion: 'neutral' }; }
    if (parsed.texto && parsed.texto.trim()) speakReply(parsed.texto, parsed.emocion);
  } catch (err) {
    denied();
  } finally {
    ollamaBusy = false;
    if (voiceOn && !busy) { try { recognition.start(); } catch {} }
  }
}

function speakReply(text, emocion) {
  const tier = ['feliz', 'triste'].includes(emocion) ? emocion : 'neutral';
  const eyeShape = EYES[tier] || EYES.neutral;
  eyeL.setAttribute('rx', eyeShape.rx); eyeL.setAttribute('ry', eyeShape.ry); eyeL.setAttribute('cy', eyeShape.cy);
  eyeR.setAttribute('rx', eyeShape.rx); eyeR.setAttribute('ry', eyeShape.ry); eyeR.setAttribute('cy', eyeShape.cy);
  mouth.setAttribute('d', MOUTH[tier] || MOUTH.neutral);

  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'es-AR';
  const esVoice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
  if (esVoice) utter.voice = esVoice;

  busy = true;
  let open = false;
  const base = mouth.getAttribute('d');
  talkTimer = setInterval(() => {
    open = !open;
    mouth.setAttribute('d', open ? MOUTH_O : base);
  }, 170);

  const finish = () => {
    clearInterval(talkTimer);
    busy = false;
    applyBaseExpression();
    if (voiceOn) { try { recognition.start(); } catch {} }
  };
  utter.onend = finish;
  utter.onerror = finish;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// --- Teclado ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) onSpaceDown();
    return;
  }
  const key = e.key.toLowerCase();
  if (key === 'c') feed();
  else if (key === 'a') water();
  else if (key === 'v') toggleVoice();
  else if (key === 'r' && state.dead) revive();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    onSpaceUp();
  }
});

// --- Ciclo de mantenimiento (día, enfermedad) ---
function tick() {
  rolloverIfNeeded();
  if (state.sickUntil && Date.now() >= state.sickUntil) {
    state.sickUntil = null;
    state.overflowUnits = 0;
    save();
  }
  if (state.parkUntil && Date.now() >= state.parkUntil) returnFromPark();
  updateReviveHint();
  if (!busy) applyBaseExpression();
  broadcastPresence();
  checkForFriendsNearby();
}
setInterval(tick, 15000);

// --- Arranque ---
rolloverIfNeeded();
if (state.parkUntil && Date.now() >= state.parkUntil) {
  state.parkUntil = null;
  save();
} else if (isAtPark()) {
  // Seguía en el parque de una visita anterior (se cerró la pestaña antes de volver).
  busy = true;
  ballBusy = true;
  stageEl.classList.add('away');
  parkEl.classList.add('active');
}
applyBaseExpression();
updateReviveHint();
renderName();
if (isSick()) scheduleVomitBursts();
scheduleBlink();
scheduleWink();
scheduleMouthIdle();
setTimeout(broadcastPresence, 2000);
