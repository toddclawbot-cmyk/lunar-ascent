// physics.js — Orbital mechanics

export const G = 2.0;

export function circularOrbitVelocity(mass, radius) {
  return Math.sqrt(G * mass / radius);
}

export function escapeVelocity(mass, radius) {
  return Math.sqrt(2 * G * mass / radius);
}

export function orbitalParameters(GM, rx, ry, vx, vy) {
  const r = Math.sqrt(rx * rx + ry * ry);
  const v2 = vx * vx + vy * vy;
  const epsilon = v2 / 2 - GM / r;
  const a = epsilon === 0 ? Infinity : -GM / (2 * epsilon);
  const h = rx * vy - ry * vx;
  const h2 = h * h;
  const e2 = 1 + (2 * epsilon * h2) / (GM * GM);
  const e = Math.sqrt(Math.max(0, e2));

  let periapsis, apoapsis;
  if (a > 0) {
    periapsis = a * (1 - Math.min(e, 0.9999));
    apoapsis = a * (1 + Math.min(e, 0.9999));
  } else {
    periapsis = a * (1 - e);
    apoapsis = Infinity;
  }

  return { a, e, periapsis, apoapsis };
}

export function gravityAcceleration(bodyX, bodyY, shipX, shipY, bodyMass) {
  const dx = bodyX - shipX;
  const dy = bodyY - shipY;
  const r2 = dx * dx + dy * dy;
  const r = Math.sqrt(r2);
  if (r < 1) return { ax: 0, ay: 0 };
  const a = G * bodyMass / r2;
  return { ax: a * dx / r, ay: a * dy / r };
}

export function totalGravity(bodies, shipX, shipY) {
  let ax = 0, ay = 0;
  for (const body of bodies) {
    const g = gravityAcceleration(body.x, body.y, shipX, shipY, body.mass);
    ax += g.ax;
    ay += g.ay;
  }
  return { ax, ay };
}
