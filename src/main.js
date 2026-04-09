// main.js — Entry point and game loop

import { LEVELS } from './levels.js';
import { G, totalGravity, circularOrbitVelocity, gravityAcceleration } from './physics.js';
import { Ship, Planet, Moon, Asteroid, World, Particle } from './entities.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { isThrusting, isBraking, isRotatingLeft, isRotatingRight, wasJustPressed, clearFrameInputs } from './input.js';
import { initAudio, updateThrustSound, playCrash, playOrbitAchieved, playSlingshot } from './audio.js';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_THRUST = 0.07;
const THROTTLE_RAMP = 0.05;
const ROTATE_SPEED = 0.04;
const PARTICLE_LIFE = 60;
const ORBIT_CHECK_FRAMES = 120;
const SLINGSHOT_ZONE = 3.5;   // radius multiplier for slingshot detection
const SLINGSHOT_GAIN = 1.12;  // 12% speed gain triggers slingshot
const SLINGSHOT_FUEL = 8;     // fuel bonus from gravity assist

// ── Canvas setup ─────────────────────────────────────────────────────────

const canvas = document.getElementById('c');
const renderer = new Renderer(canvas);
const camera = new Camera(window.innerWidth, window.innerHeight);
const ui = new UI();

// ── Resize ──────────────────────────────────────────────────────────────

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

// ── Game State ───────────────────────────────────────────────────────────

let gameState = 'title';
let currentLevelIdx = 0;

// ── World objects ────────────────────────────────────────────────────────

let ship = null;
let world = null;
let planet = null;
let moons = [];
let asteroids = [];

// ── Trajectory prediction ───────────────────────────────────────────────

let trajectoryPoints = [];
let trajectoryTimer = 0;

function computeTrajectory(steps, stepDt) {
  const pts = [];
  let x = ship.x, y = ship.y, vx = ship.vx, vy = ship.vy;
  const bodies = [planet, ...moons];

  for (let i = 0; i < steps; i++) {
    let ax = 0, ay = 0;
    let hit = false;
    for (const body of bodies) {
      const dx = body.x - x;
      const dy = body.y - y;
      const r2 = dx * dx + dy * dy;
      const r = Math.sqrt(r2);
      if (r < body.radius) { hit = true; break; }
      const a = G * body.mass / r2;
      ax += a * dx / r;
      ay += a * dy / r;
    }
    if (hit) break;

    // Check asteroid collisions too
    for (const ast of asteroids) {
      const dx = ast.x - x;
      const dy = ast.y - y;
      if (dx * dx + dy * dy < ast.size * ast.size) { hit = true; break; }
    }
    if (hit) break;

    vx += ax * stepDt;
    vy += ay * stepDt;
    x += vx * stepDt;
    y += vy * stepDt;
    pts.push({ x, y });
  }
  return pts;
}

// ── Slingshot tracking ──────────────────────────────────────────────────

let slingshot = { body: null, entrySpeed: 0, active: false };

function updateSlingshot() {
  const bodies = [...moons]; // only moons count for slingshot (not planet)
  let closest = null;
  let closestDist = Infinity;

  for (const body of bodies) {
    const dx = ship.x - body.x;
    const dy = ship.y - body.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = body;
    }
  }

  if (!closest) return;

  const zoneRadius = closest.radius * SLINGSHOT_ZONE;
  const inZone = closestDist < zoneRadius;

  if (inZone && !slingshot.active) {
    // Enter slingshot zone
    slingshot.active = true;
    slingshot.body = closest;
    slingshot.entrySpeed = ship.speed;
  } else if (!inZone && slingshot.active && slingshot.body === closest) {
    // Exit slingshot zone — check for speed gain
    const exitSpeed = ship.speed;
    if (exitSpeed > slingshot.entrySpeed * SLINGSHOT_GAIN) {
      // Gravity assist detected
      ship.fuel = Math.min(ship.maxFuel, ship.fuel + SLINGSHOT_FUEL);
      playSlingshot();
      ui.showNotification(`GRAVITY ASSIST  +${SLINGSHOT_FUEL} FUEL`);
    }
    slingshot.active = false;
    slingshot.body = null;
  }

  // Reset if we switched to a different body
  if (slingshot.active && slingshot.body !== closest) {
    slingshot.active = false;
    slingshot.body = null;
  }
}

// ── Particles ──────────────────────────────────────────────────────────

function spawnThrustParticles(count) {
  const backAngle = ship.angle + Math.PI;
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 2 + 2;
    world.addParticle(new Particle(
      ship.x + Math.cos(backAngle) * 18,
      ship.y + Math.sin(backAngle) * 18,
      Math.cos(backAngle + spread) * speed + ship.vx * 0.1,
      Math.sin(backAngle + spread) * speed + ship.vy * 0.1,
      ['#ff9933', '#ff6622', '#ffcc44', '#ff4411'][Math.floor(Math.random() * 4)],
      Math.random() * 3 + 2,
      PARTICLE_LIFE
    ));
  }
}

function spawnTrailParticle() {
  world.addParticle(new Particle(
    ship.x + (Math.random() - 0.5) * 4,
    ship.y + (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 0.3,
    '#aabbcc',
    Math.random() * 1.5 + 0.5,
    30
  ));
}

function spawnExplosion(x, y) {
  const colors = ['#ff6b35', '#ff9933', '#ffd60a', '#ff4422', '#ffcc88'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    world.addParticle(new Particle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      colors[Math.floor(Math.random() * colors.length)],
      Math.random() * 4 + 1,
      80
    ));
  }
}

// ── Level Init ───────────────────────────────────────────────────────────

function initLevel(lvlIdx) {
  const lvl = LEVELS[lvlIdx];
  currentLevelIdx = lvlIdx;

  planet = new Planet(0, 0, lvl.planet.radius, lvl.planet.mass, lvl.planet.color, lvl.planet.type);

  moons = [];
  for (const m of lvl.moons) {
    const moon = new Moon(m.orbitRadius, m.angle, m.angularVel, m.radius, m.mass, m.color, m.glowColor);
    moon.update(0, 0, 0);
    moons.push(moon);
  }

  // Generate asteroids
  asteroids = [];
  if (lvl.asteroids) {
    const a = lvl.asteroids;
    for (let i = 0; i < a.count; i++) {
      const orbitR = a.minOrbit + Math.random() * (a.maxOrbit - a.minOrbit);
      const angle = Math.random() * Math.PI * 2;
      const speed = a.minSpeed + Math.random() * (a.maxSpeed - a.minSpeed);
      const size = a.minSize + Math.random() * (a.maxSize - a.minSize);
      const ast = new Asteroid(orbitR, angle, speed, size);
      ast.update(0, 0, 0);
      asteroids.push(ast);
    }
  }

  const surfaceR = planet.radius + 2;
  ship = new Ship(0, -surfaceR, 0, 0, -Math.PI / 2, lvl.fuel, lvl.fuel);

  world = new World(planet, moons, asteroids);
  world.initStars(600);

  // Reset tracking state
  trajectoryPoints = [];
  trajectoryTimer = 0;
  slingshot = { body: null, entrySpeed: 0, active: false };

  camera.x = 0;
  camera.y = 0;
  camera.targetX = 0;
  camera.targetY = 0;
  camera.zoom = camera.BASE_ZOOM;
  camera.targetZoom = camera.BASE_ZOOM;
}

// ── Physics Update ───────────────────────────────────────────────────────

function updatePhysics(dt) {
  if (!ship.alive || gameState !== 'playing') return;

  const lvl = LEVELS[currentLevelIdx];

  // Always update moon and asteroid positions
  for (const moon of moons) moon.update(planet.x, planet.y, dt);
  for (const ast of asteroids) ast.update(planet.x, planet.y, dt);

  // Ship on planet surface
  if (ship.landed) {
    const surfaceR = planet.radius + 2;
    ship.x = planet.x;
    ship.y = planet.y - surfaceR;

    if (isThrusting() && ship.fuel > 0) {
      initAudio();
      ship.landed = false;
      ship.launchGrace = 15;
      ship.throttle = 0.20;

      const orbitV = circularOrbitVelocity(lvl.planet.mass, surfaceR) * 0.5;
      ship.vx = orbitV;
      ship.vy = -0.5;
      ship.angle = -Math.PI / 2;
      ship.fuel -= 0.25;
      spawnThrustParticles(3);
    }

    updateThrustSound(0);
    return;
  }

  if (ship.launchGrace > 0) ship.launchGrace--;

  // Gravity
  const bodies = [planet, ...moons];
  const { ax, ay } = totalGravity(bodies, ship.x, ship.y);
  ship.vx += ax * dt;
  ship.vy += ay * dt;

  // Throttle
  if (isThrusting()) {
    if (wasJustPressed('ArrowUp')) ship.throttle = Math.min(1.0, ship.throttle + 0.10);
    ship.throttle = Math.min(1.0, ship.throttle + THROTTLE_RAMP);
  } else if (isBraking()) {
    if (wasJustPressed('ArrowDown')) ship.throttle = Math.max(0, ship.throttle - 0.10);
    ship.throttle = Math.max(0, ship.throttle - THROTTLE_RAMP);
  }

  ship.isThrusting = false;
  ship.isBraking = false;

  if (ship.throttle > 0 && ship.fuel > 0) {
    ship.vx += Math.cos(ship.angle) * MAX_THRUST * ship.throttle;
    ship.vy += Math.sin(ship.angle) * MAX_THRUST * ship.throttle;
    ship.fuel -= 0.25 * ship.throttle * dt;
    ship.isThrusting = true;
    spawnThrustParticles(Math.ceil(ship.throttle * 3));
  }

  // Audio
  updateThrustSound(ship.isThrusting ? ship.throttle : 0);

  // Rotation
  if (isRotatingLeft()) ship.angle -= ROTATE_SPEED;
  if (isRotatingRight()) ship.angle += ROTATE_SPEED;

  // Move
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Trail
  if (ship.isThrusting && world.frameCount % 3 === 0) spawnTrailParticle();
  if (world.frameCount % 2 === 0) world.addTrailPoint(ship.x, ship.y);
  world.ageTrail();

  // Collision checks
  if (ship.launchGrace === 0) {
    // Planet
    const dxP = ship.x - planet.x;
    const dyP = ship.y - planet.y;
    if (Math.sqrt(dxP * dxP + dyP * dyP) <= planet.radius) {
      triggerCrash('Crashed into planet!');
      return;
    }

    // Moons
    for (const moon of moons) {
      const dx = ship.x - moon.x;
      const dy = ship.y - moon.y;
      if (Math.sqrt(dx * dx + dy * dy) <= moon.radius) {
        triggerCrash('Crashed into moon!');
        return;
      }
    }

    // Asteroids
    for (const ast of asteroids) {
      const dx = ship.x - ast.x;
      const dy = ship.y - ast.y;
      if (Math.sqrt(dx * dx + dy * dy) <= ast.size + 4) {
        triggerCrash('Destroyed by asteroid!');
        return;
      }
    }
  }

  // Slingshot detection
  updateSlingshot();

  // Fuel out
  if (!ship.fuelEmptyTime && ship.fuel <= 0 && !ship.orbitAchieved) {
    ship.fuelEmptyTime = world.frameCount;
  }
  if (ship.fuelEmptyTime && world.frameCount - ship.fuelEmptyTime > 180 && !ship.orbitAchieved) {
    triggerCrash('Out of fuel \u2014 mission failed.');
    return;
  }

  // Out of bounds
  if (Math.sqrt(ship.x * ship.x + ship.y * ship.y) > 2000) {
    triggerCrash('Lost in deep space!');
    return;
  }

  checkOrbit();
}

// ── Orbit Detection ───────────────────────────────────────────────────────

function checkOrbit() {
  const lvl = LEVELS[currentLevelIdx];

  let nearestMoon = null;
  let nearestDist = Infinity;
  for (const moon of moons) {
    const dx = ship.x - moon.x;
    const dy = ship.y - moon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestMoon = moon;
    }
  }
  if (!nearestMoon) { resetOrbitTracking(); return; }

  if (nearestDist < lvl.orbitBand.inner || nearestDist > lvl.orbitBand.outer) {
    resetOrbitTracking();
    return;
  }

  const relVx = ship.vx - nearestMoon.vx;
  const relVy = ship.vy - nearestMoon.vy;
  const dx = ship.x - nearestMoon.x;
  const dy = ship.y - nearestMoon.y;

  const radialVel = (dx * relVx + dy * relVy) / nearestDist;
  const tanSq = relVx * relVx + relVy * relVy - radialVel * radialVel;
  const tangentialSpeed = Math.sqrt(Math.max(0, tanSq));
  const orbitalVel = Math.sqrt(G * nearestMoon.mass / nearestDist);

  const isOrbiting = Math.abs(radialVel) < tangentialSpeed * 0.5
    && tangentialSpeed > orbitalVel * 0.4
    && tangentialSpeed < orbitalVel * 1.8;

  if (isOrbiting) {
    const currentAngle = Math.atan2(dy, dx);
    if (ship.lastOrbitAngle === null) {
      ship.lastOrbitAngle = currentAngle;
    } else {
      let delta = currentAngle - ship.lastOrbitAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      ship.totalOrbitAngle += Math.abs(delta);
      ship.lastOrbitAngle = currentAngle;
    }
    ship.orbitCheckCounter++;
    if (ship.orbitCheckCounter >= ORBIT_CHECK_FRAMES && ship.totalOrbitAngle >= Math.PI * 2) {
      triggerSuccess();
    }
  } else {
    ship.orbitCheckCounter = Math.max(0, ship.orbitCheckCounter - 2);
    if (ship.orbitCheckCounter === 0) {
      ship.totalOrbitAngle = Math.max(0, ship.totalOrbitAngle - 0.05);
    }
  }
}

function resetOrbitTracking() {
  ship.orbitCheckCounter = 0;
  ship.totalOrbitAngle = 0;
  ship.lastOrbitAngle = null;
}

// ── Crash / Success ───────────────────────────────────────────────────────

function triggerCrash(reason) {
  ship.alive = false;
  ship.crashed = true;
  camera.shake(20);
  spawnExplosion(ship.x, ship.y);
  playCrash();
  updateThrustSound(0);
  setTimeout(() => {
    ui.showMessage('failure', 'MISSION FAILED', reason, [
      { label: 'Retry', fn: () => { ui.hideMessage(); startLevel(currentLevelIdx); } },
      { label: 'Level Select', fn: () => { ui.hideMessage(); showLevelSelect(); } }
    ]);
  }, 800);
}

function triggerSuccess() {
  if (ship.orbitAchieved) return;
  ship.orbitAchieved = true;
  ui.unlockLevel(currentLevelIdx);

  const lvl = LEVELS[currentLevelIdx];
  const stars = ui.calcStars(ship, lvl);
  ui.setStars(currentLevelIdx, stars);

  playOrbitAchieved();

  setTimeout(() => {
    ui.showSuccessMessage(
      stars,
      lvl.name,
      currentLevelIdx,
      LEVELS.length,
      () => {
        ui.hideMessage();
        if (currentLevelIdx < LEVELS.length - 1) startLevel(currentLevelIdx + 1);
        else showLevelSelect();
      },
      () => { ui.hideMessage(); showLevelSelect(); }
    );
  }, 500);
}

// ── Render ────────────────────────────────────────────────────────────────

function render() {
  renderer.clear();
  if (gameState !== 'playing') return;

  const lvl = LEVELS[currentLevelIdx];

  // Camera
  let camNearestMoon = null;
  let camNearestDist = Infinity;
  for (const moon of moons) {
    const dx = ship.x - moon.x;
    const dy = ship.y - moon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < camNearestDist) { camNearestDist = dist; camNearestMoon = moon; }
  }
  camera.follow(ship.x, ship.y, planet.x, planet.y, camNearestMoon, ship.speed);
  camera.update();

  renderer.applyCamera(camera);

  // Stars
  renderer.renderStars(world.stars, camera.x, camera.y, world.frameCount);

  // Gravity field visualization
  renderer.renderGravityFields([planet, ...moons]);

  // Moon orbital paths
  renderer.renderMoonOrbits(moons, planet.x, planet.y);

  // Orbit bands
  renderer.renderOrbitBands(moons, lvl.orbitBand, ship.orbitCheckCounter, ORBIT_CHECK_FRAMES);

  // Trajectory prediction (update every 4 frames)
  if (!ship.landed && ship.alive) {
    trajectoryTimer++;
    if (trajectoryTimer >= 4) {
      trajectoryPoints = computeTrajectory(200, 1 / 60 * 3);
      trajectoryTimer = 0;
    }
    renderer.renderTrajectory(trajectoryPoints);
  }

  // Trail
  renderer.renderTrail(world.trail);

  // Particles
  renderer.renderParticles(world.particles);

  // Asteroids
  if (asteroids.length > 0) renderer.renderAsteroids(asteroids);

  // Planet & moons
  renderer.renderPlanet(planet);
  for (const moon of moons) renderer.renderMoon(moon);

  // Ship
  if (ship.alive) renderer.renderShip(ship);

  renderer.restoreCamera();

  // HUD
  let nearestMoon = null;
  let nearestDist = Infinity;
  for (const moon of moons) {
    const dx = ship.x - moon.x;
    const dy = ship.y - moon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) { nearestDist = dist; nearestMoon = moon; }
  }
  ui.updateHUD(ship, nearestMoon, ship.orbitCheckCounter, ORBIT_CHECK_FRAMES, currentLevelIdx, LEVELS, G);
}

// ── Game Loop ─────────────────────────────────────────────────────────────

let lastTime = 0;
const FIXED_DT = 1 / 60;
const MAX_DT = 0.1;
let accumulator = 0;

function gameLoop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  let rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (rawDt > MAX_DT) rawDt = MAX_DT;
  accumulator += rawDt;

  while (accumulator >= FIXED_DT) {
    if (gameState === 'playing') {
      updatePhysics(FIXED_DT);
      world.updateParticles();
    }
    accumulator -= FIXED_DT;
  }

  render();
  clearFrameInputs();
  requestAnimationFrame(gameLoop);
}

// ── Screen Transitions ───────────────────────────────────────────────────

function showTitle() {
  gameState = 'title';
  ui.showTitle();
  document.getElementById('touch-controls').classList.remove('active');
}
window.showTitle = showTitle;

function showLevelSelect() {
  gameState = 'levelSelect';
  ui.showLevelSelect(LEVELS);
  document.getElementById('touch-controls').classList.remove('active');
}
window.showLevelSelect = showLevelSelect;

function startLevel(idx) {
  gameState = 'playing';
  document.getElementById('title-screen').classList.remove('active');
  document.getElementById('level-screen').classList.remove('active');
  document.getElementById('touch-controls').classList.add('active');
  resize();
  ui.showHUD();
  initLevel(idx);
  initAudio();
}
window.startLevel = startLevel;

function restartLevel() { startLevel(currentLevelIdx); }
window.restartLevel = restartLevel;

// ── Boot ─────────────────────────────────────────────────────────────────

function boot() {
  document.getElementById('btn-launch')?.addEventListener('click', () => { initAudio(); showLevelSelect(); });
  document.getElementById('btn-levels')?.addEventListener('click', () => { initAudio(); showLevelSelect(); });
  document.getElementById('btn-back')?.addEventListener('click', () => showTitle());
  document.getElementById('hud-restart')?.addEventListener('click', () => restartLevel());
}

const bootWorld = new World(null, []);
bootWorld.initStars(600);

function menuLoop() {
  if (gameState !== 'playing') {
    renderer.clear();
    renderer.ctx.save();
    renderer.renderStars(bootWorld.stars, 0, 0, 0);
    renderer.ctx.restore();
  }
  requestAnimationFrame(menuLoop);
}

menuLoop();
gameLoop(0);
boot();
