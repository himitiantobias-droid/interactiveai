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

const HOUR = 3_600_000;
const DAY_MS = 24 * HOUR;
const PLATOS_CAP = 3;
const BITES_PER_PLATE = 10;
const WATER_CAP = 8;
const DEATH_DAYS = 14;
const PET_HOLD_THRESHOLD = 250;
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
    dead: false
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
  const goodDay = bitesTotal >= 1 && water >= 1 && played;
  state.moodScore = Math.max(-3, Math.min(3, state.moodScore + (goodDay ? 1 : -1)));

  state.malnourishedStreak = platosCompleted >= PLATOS_CAP ? 0 : (state.malnourishedStreak || 0) + 1;

  if (state.daysWithoutFood >= DEATH_DAYS && state.daysWithoutWater >= DEATH_DAYS) {
    state.dead = true;
  }
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

function updateReviveHint() {
  reviveHint.hidden = !state.dead;
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
    if (rapidFeedAttempts > MAX_RAPID_FEED) choke();
    return;
  }
  if (busy) return;

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
  if (state.dead || busy) return;
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
          }
          save();
          applyBaseExpression();
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
  state.dead = true;
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
  if (state.dead || spaceHeld || busy) return;
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
          stageEl.classList.add('away');
          parkEl.classList.add('active');
          setTimeout(playParkTrick, 350);

          setTimeout(() => {
            stageEl.classList.remove('away');
            parkEl.classList.remove('active');

            setTimeout(() => {
              ballEl.classList.remove('visible');
              ballEl.style.transform = '';
              ballEl.style.transition = '';
              ballBusy = false;
              busy = false;
            }, 700);
          }, 2400);
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

function restart() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
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
  else if (key === 'r' && state.dead) restart();
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
  updateReviveHint();
  if (!busy) applyBaseExpression();
}
setInterval(tick, 15000);

// --- Arranque ---
rolloverIfNeeded();
applyBaseExpression();
updateReviveHint();
if (isSick()) scheduleVomitBursts();
scheduleBlink();
scheduleWink();
scheduleMouthIdle();
