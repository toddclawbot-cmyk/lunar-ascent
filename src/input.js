// input.js — Keyboard and Touch handling

const keys = {};
const justPressed = {};
const justReleased = {};

const KEY_ALIASES = {
  'ArrowUp': ['ArrowUp', 'KeyW', 'w', 'W'],
  'ArrowDown': ['ArrowDown', 'KeyS', 's', 'S'],
  'ArrowLeft': ['ArrowLeft', 'KeyA', 'a', 'A'],
  'ArrowRight': ['ArrowRight', 'KeyD', 'd', 'D'],
  'Space': ['Space', ' '],
};

function normalizeKey(key) {
  for (const [primary, aliases] of Object.entries(KEY_ALIASES)) {
    if (aliases.includes(key)) return primary;
  }
  return key;
}

function pressKey(key) {
  const k = normalizeKey(key);
  if (!keys[k]) {
    justPressed[k] = true;
  }
  keys[k] = true;
}

function releaseKey(key) {
  const k = normalizeKey(key);
  keys[k] = false;
  justReleased[k] = true;
}

function setupKeyboardListeners() {
  window.addEventListener('keydown', e => {
    pressKey(e.key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    releaseKey(e.key);
  });
}

// ── Touch Controls ────────────────────────────────────────────────────────

// Map touch button IDs to key names
const TOUCH_KEYS = {
  'touch-left':  'ArrowLeft',
  'touch-right': 'ArrowRight',
  'touch-up':    'ArrowUp',
  'touch-down':  'ArrowDown',
};

function setupTouchListeners() {
  // Handle touch on virtual buttons
  for (const [id, key] of Object.entries(TOUCH_KEYS)) {
    const el = document.getElementById(id);
    if (!el) continue;

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      pressKey(key);
      el.classList.add('active');
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      releaseKey(key);
      el.classList.remove('active');
    }, { passive: false });

    el.addEventListener('touchcancel', e => {
      releaseKey(key);
      el.classList.remove('active');
    });

    // Also support mouse for desktop testing of touch buttons
    el.addEventListener('mousedown', e => {
      pressKey(key);
      el.classList.add('active');
    });
    el.addEventListener('mouseup', e => {
      releaseKey(key);
      el.classList.remove('active');
    });
    el.addEventListener('mouseleave', e => {
      releaseKey(key);
      el.classList.remove('active');
    });
  }

  // Prevent default touch behavior on canvas (no scrolling/zooming)
  const canvas = document.getElementById('c');
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

setupKeyboardListeners();
setupTouchListeners();

// ── Input API ────────────────────────────────────────────────────────────

export function isDown(key) {
  const k = normalizeKey(key);
  return keys[k] === true;
}

export function wasJustPressed(key) {
  const k = normalizeKey(key);
  return justPressed[k] === true;
}

export function wasJustReleased(key) {
  const k = normalizeKey(key);
  return justReleased[k] === true;
}

export function clearFrameInputs() {
  for (const k in justPressed) delete justPressed[k];
  for (const k in justReleased) delete justReleased[k];
}

export function isThrusting() {
  return isDown('ArrowUp');
}

export function isBraking() {
  return isDown('ArrowDown');
}

export function isRotatingLeft() {
  return isDown('ArrowLeft');
}

export function isRotatingRight() {
  return isDown('ArrowRight');
}
