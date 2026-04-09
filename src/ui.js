// ui.js — UI management: screens, HUD, messages, star ratings

export class UI {
  constructor() {
    this.canvas = document.getElementById('c');
    this.unlockedLevels = parseInt(localStorage.getItem('lunarAscent_unlocked') || '1');
  }

  // ── Star rating persistence ───────────────────────────────────────────

  getStars(levelIdx) {
    return parseInt(localStorage.getItem(`lunarAscent_stars_${levelIdx}`) || '0');
  }

  setStars(levelIdx, stars) {
    const current = this.getStars(levelIdx);
    if (stars > current) {
      localStorage.setItem(`lunarAscent_stars_${levelIdx}`, stars);
    }
  }

  calcStars(ship, lvl) {
    const fuelPct = ship.fuel / ship.maxFuel;
    const [three, two] = lvl.starThresholds || [0.5, 0.2];
    if (fuelPct >= three) return 3;
    if (fuelPct >= two) return 2;
    return 1;
  }

  // ── Screens ───────────────────────────────────────────────────────────

  showTitle() {
    document.getElementById('title-screen').classList.add('active');
    document.getElementById('level-screen').classList.remove('active');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('hud-restart').style.display = 'none';
  }

  showLevelSelect(LEVELS) {
    document.getElementById('title-screen').classList.remove('active');
    document.getElementById('level-screen').classList.add('active');
    document.getElementById('hud').classList.remove('active');
    document.getElementById('hud-restart').style.display = 'none';

    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const btn = document.createElement('button');
      const locked = i >= this.unlockedLevels;
      btn.className = 'level-btn' + (locked ? ' locked' : '');

      const stars = this.getStars(i);
      const starStr = locked ? '' : '<span class="lvl-stars">' + '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) + '</span>';
      btn.innerHTML = `<span class="lvl-num">${i + 1}</span><span class="lvl-name">${lvl.name}</span>${starStr}`;

      if (!locked) {
        btn.onclick = () => window.startLevel && window.startLevel(i);
      }
      grid.appendChild(btn);
    });
  }

  showHUD() {
    document.getElementById('hud').classList.add('active');
    document.getElementById('hud-restart').style.display = 'block';
  }

  // ── Notifications (slingshot, etc.) ───────────────────────────────────

  showNotification(text) {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('active');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('active');
  }

  // ── HUD ───────────────────────────────────────────────────────────────

  updateHUD(ship, nearestMoon, orbitCheckCounter, ORBIT_CHECK_FRAMES, currentLevel, LEVELS, G) {
    const fuelPct = Math.max(0, ship.fuel / ship.maxFuel) * 100;
    const fuelBar = document.getElementById('fuel-bar');
    fuelBar.style.width = fuelPct + '%';
    fuelBar.className = 'gauge-fill' + (fuelPct < 15 ? ' low critical' : fuelPct < 30 ? ' low' : '');

    const throttlePct = (ship.throttle || 0) * 100;
    document.getElementById('throttle-bar').style.width = throttlePct + '%';

    if (nearestMoon) {
      const dx = ship.x - nearestMoon.x;
      const dy = ship.y - nearestMoon.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      document.getElementById('hud-alt').textContent = Math.round(Math.max(0, dist - nearestMoon.radius)) + ' km';
    } else {
      document.getElementById('hud-alt').textContent = '\u2014';
    }

    const speed = ship.speed;
    document.getElementById('hud-vel').textContent = speed.toFixed(1) + ' m/s';

    if (nearestMoon) {
      const dx = ship.x - nearestMoon.x;
      const dy = ship.y - nearestMoon.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const orbitalVel = Math.sqrt(G * nearestMoon.mass / dist);
      document.getElementById('hud-vel-needed').textContent = 'orbit: ' + orbitalVel.toFixed(1);
      const velEl = document.getElementById('hud-vel');
      const diff = speed - orbitalVel;
      velEl.className = 'current' + (Math.abs(diff) < orbitalVel * 0.3 ? ' success' : diff > orbitalVel ? ' danger' : '');
    }

    this.updateOrbitalParams(ship, LEVELS[currentLevel], nearestMoon, G);

    document.getElementById('hud-level').textContent = `LEVEL ${currentLevel + 1}`;

    const statusEl = document.getElementById('hud-status');
    if (!ship.landed && ship.orbitAchieved) {
      statusEl.textContent = 'ORBITING \u2713';
      statusEl.className = 'hud-value success';
    } else if (!ship.landed && orbitCheckCounter > 0) {
      statusEl.textContent = `STABILIZING ${Math.round(100 * orbitCheckCounter / ORBIT_CHECK_FRAMES)}%`;
      statusEl.className = 'hud-value success';
    } else if (!ship.landed && ship.fuel <= 0) {
      statusEl.textContent = 'NO FUEL';
      statusEl.className = 'hud-value danger';
    } else if (ship.landed) {
      statusEl.textContent = 'PRESS \u2191 TO LAUNCH';
      statusEl.className = 'hud-value';
    } else if (!ship.landed && ship.throttle > 0) {
      statusEl.textContent = 'THROTTLE ' + Math.round(ship.throttle * 100) + '%';
      statusEl.className = 'hud-value';
    } else {
      statusEl.textContent = 'MANEUVERING';
      statusEl.className = 'hud-value';
    }
  }

  updateOrbitalParams(ship, lvl, nearestMoon, G) {
    const periEl = document.getElementById('hud-peri');
    const apoEl = document.getElementById('hud-apo');

    if (!nearestMoon || ship.landed) {
      periEl.textContent = '\u2014';
      apoEl.textContent = '\u2014';
      return;
    }

    const dx = ship.x - nearestMoon.x;
    const dy = ship.y - nearestMoon.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const relVx = ship.vx - (nearestMoon.vx || 0);
    const relVy = ship.vy - (nearestMoon.vy || 0);
    const v2 = relVx * relVx + relVy * relVy;
    const GM = G * nearestMoon.mass;

    const epsilon = v2 / 2 - GM / r;
    const a = epsilon === 0 ? Infinity : -GM / (2 * epsilon);
    const h = dx * relVy - dy * relVx;
    const e2 = 1 + (2 * epsilon * h * h) / (GM * GM);
    const e = Math.sqrt(Math.max(0, e2));

    if (a > 0 && isFinite(a)) {
      const peri = a * (1 - Math.min(e, 0.9999));
      const apo = a * (1 + Math.min(e, 0.9999));
      periEl.textContent = Math.max(0, Math.round(peri - nearestMoon.radius)) + ' km';
      apoEl.textContent = e < 0.999 ? Math.round(apo - nearestMoon.radius) + ' km' : '\u221E';
    } else {
      periEl.textContent = '\u2014';
      apoEl.textContent = '\u221E';
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────

  showMessage(type, title, desc, buttons) {
    const overlay = document.getElementById('msg-overlay');
    const box = document.getElementById('msg-box');
    box.className = 'msg-box ' + type;
    document.getElementById('msg-title').textContent = title;
    document.getElementById('msg-desc').textContent = desc;
    const btnContainer = document.getElementById('msg-buttons');
    btnContainer.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small' + (type === 'failure' ? ' btn-danger' : '');
      btn.innerHTML = `<span>${b.label}</span>`;
      btn.onclick = b.fn;
      btnContainer.appendChild(btn);
    });
    overlay.classList.add('active');
  }

  showSuccessMessage(stars, levelName, levelIdx, totalLevels, onNext, onSelect) {
    const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
    const overlay = document.getElementById('msg-overlay');
    const box = document.getElementById('msg-box');
    box.className = 'msg-box success';
    document.getElementById('msg-title').innerHTML = 'ORBIT ACHIEVED';
    document.getElementById('msg-desc').innerHTML =
      `Level ${levelIdx + 1}: ${levelName} complete!<br><span class="msg-stars">${starStr}</span>`;

    const btnContainer = document.getElementById('msg-buttons');
    btnContainer.innerHTML = '';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-small';
    nextBtn.innerHTML = `<span>${levelIdx < totalLevels - 1 ? 'Next Level' : 'All Done!'}</span>`;
    nextBtn.onclick = onNext;
    btnContainer.appendChild(nextBtn);

    const selBtn = document.createElement('button');
    selBtn.className = 'btn btn-small';
    selBtn.innerHTML = '<span>Level Select</span>';
    selBtn.onclick = onSelect;
    btnContainer.appendChild(selBtn);

    overlay.classList.add('active');
  }

  hideMessage() {
    document.getElementById('msg-overlay').classList.remove('active');
  }

  unlockLevel(levelIdx) {
    if (levelIdx + 1 > this.unlockedLevels) {
      this.unlockedLevels = levelIdx + 1;
      localStorage.setItem('lunarAscent_unlocked', this.unlockedLevels);
    }
  }
}
