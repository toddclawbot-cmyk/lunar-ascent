// entities.js — Ship, Planet, Moon, Asteroid, Particle classes

// ── Particle ──────────────────────────────────────────────────────────────

export class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    return this.life > 0;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

// ── TrailPoint ────────────────────────────────────────────────────────────

export class TrailPoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
  }
}

// ── Star ──────────────────────────────────────────────────────────────────

export class Star {
  constructor(bounds = 6000) {
    this.x = Math.random() * bounds * 2 - bounds;
    this.y = Math.random() * bounds * 2 - bounds;
    this.size = Math.random() * 2 + 0.3;
    this.bright = Math.random();
    this.twinkleOffset = Math.random() * Math.PI * 2;
  }
}

// ── Planet ────────────────────────────────────────────────────────────────

export class Planet {
  constructor(x, y, radius, mass, color, type = 'rocky') {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.mass = mass;
    this.color = color;
  }
}

// ── Moon ──────────────────────────────────────────────────────────────────

export class Moon {
  constructor(orbitRadius, angle, angularVel, radius, mass, color, glowColor) {
    this.type = 'moon';
    this.orbitRadius = orbitRadius;
    this.angle = angle;
    this.angularVel = angularVel;
    this.radius = radius;
    this.mass = mass;
    this.color = color;
    this.glowColor = glowColor;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(planetX, planetY, dt = 1) {
    this.angle += this.angularVel * dt;
    this.x = planetX + Math.cos(this.angle) * this.orbitRadius;
    this.y = planetY + Math.sin(this.angle) * this.orbitRadius;
    this.vx = -this.angularVel * this.orbitRadius * Math.sin(this.angle);
    this.vy = this.angularVel * this.orbitRadius * Math.cos(this.angle);
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────

export class Asteroid {
  constructor(orbitRadius, angle, angularVel, size) {
    this.orbitRadius = orbitRadius;
    this.angle = angle;
    this.angularVel = angularVel;
    this.size = size;
    this.x = 0;
    this.y = 0;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.03;

    // Generate irregular polygon shape (unit scale, multiply by size when rendering)
    const numVerts = 5 + Math.floor(Math.random() * 4);
    this.vertices = [];
    for (let i = 0; i < numVerts; i++) {
      const a = (i / numVerts) * Math.PI * 2;
      const r = 0.55 + Math.random() * 0.45;
      this.vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }

  update(planetX, planetY, dt) {
    this.angle += this.angularVel * dt;
    this.x = planetX + Math.cos(this.angle) * this.orbitRadius;
    this.y = planetY + Math.sin(this.angle) * this.orbitRadius;
    this.rotation += this.rotSpeed * dt;
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────

export class Ship {
  constructor(x, y, vx, vy, angle, fuel, maxFuel) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = angle;
    this.fuel = fuel;
    this.maxFuel = maxFuel;
    this.alive = true;
    this.crashed = false;
    this.landed = true;
    this.throttle = 0;
    this.launchGrace = 0;
    this.orbitAchieved = false;
    this.orbitCheckCounter = 0;
    this.totalOrbitAngle = 0;
    this.lastOrbitAngle = null;
    this.fuelEmptyTime = null;
    this._isThrusting = false;
    this._isBraking = false;
  }

  get speed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  get isThrusting() { return this._isThrusting; }
  set isThrusting(val) { this._isThrusting = val; }

  get isBraking() { return this._isBraking; }
  set isBraking(val) { this._isBraking = val; }
}

// ── World ──────────────────────────────────────────────────────────────────

export class World {
  constructor(planet, moons = [], asteroids = []) {
    this.planet = planet;
    this.moons = moons;
    this.asteroids = asteroids;
    this.particles = [];
    this.trail = [];
    this.stars = [];
    this.TRAIL_MAX = 200;
    this.frameCount = 0;
  }

  addParticle(p) {
    this.particles.push(p);
  }

  addTrailPoint(x, y) {
    this.trail.push({ x, y, age: 0 });
    if (this.trail.length > this.TRAIL_MAX) {
      this.trail.shift();
    }
  }

  ageTrail() {
    for (const t of this.trail) t.age++;
    while (this.trail.length > 0 && this.trail[0].age > this.TRAIL_MAX) {
      this.trail.shift();
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(p => p.update());
    this.frameCount++;
  }

  initStars(count = 600) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push(new Star());
    }
  }
}
