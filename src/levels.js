// levels.js — Level definitions for Lunar Ascent
// All coordinates in world units. Planet always at (0,0).

export const LEVELS = [
  {
    name: 'First Light',
    planet: { radius: 60, mass: 5000, color: '#4a7faa', type: 'rocky' },
    moons: [
      { radius: 22, mass: 25000, color: '#d0d8e0', orbitRadius: 350, angle: 0, angularVel: 0.025, glowColor: 'rgba(208,216,224,0.35)' }
    ],
    fuel: 200,
    orbitBand: { inner: 32, outer: 130 },
    starThresholds: [0.55, 0.25],
    description: 'A gentle moon in a slow orbit. Learn the basics of spaceflight.'
  },
  {
    name: 'Frozen Reach',
    planet: { radius: 75, mass: 6000, color: '#8bb5d0', type: 'ice' },
    moons: [
      { radius: 16, mass: 18000, color: '#99aabb', orbitRadius: 420, angle: Math.PI * 0.3, angularVel: 0.038, glowColor: 'rgba(153,170,187,0.3)' }
    ],
    fuel: 120,
    orbitBand: { inner: 26, outer: 90 },
    starThresholds: [0.50, 0.20],
    description: 'A frozen giant with a swift icy moon. Navigate the larger gravity well.'
  },
  {
    name: "Ember's Edge",
    planet: { radius: 55, mass: 7500, color: '#cc5533', type: 'volcanic' },
    moons: [
      { radius: 20, mass: 22000, color: '#e8b84a', orbitRadius: 380, angle: Math.PI * 0.7, angularVel: 0.032, glowColor: 'rgba(232,184,74,0.35)' }
    ],
    fuel: 110,
    orbitBand: { inner: 28, outer: 100 },
    starThresholds: [0.45, 0.18],
    asteroids: {
      count: 10,
      minOrbit: 170,
      maxOrbit: 270,
      minSize: 3,
      maxSize: 7,
      minSpeed: 0.015,
      maxSpeed: 0.035
    },
    description: 'A volcanic world with fierce gravity and orbiting debris.'
  },
  {
    name: 'Binary Dance',
    planet: { radius: 50, mass: 4500, color: '#7755aa', type: 'gas' },
    moons: [
      { radius: 18, mass: 16000, color: '#6ec8e3', orbitRadius: 320, angle: 0, angularVel: 0.045, glowColor: 'rgba(110,200,227,0.3)' },
      { radius: 14, mass: 13000, color: '#e3c87e', orbitRadius: 500, angle: Math.PI, angularVel: -0.02, glowColor: 'rgba(227,200,126,0.3)' }
    ],
    fuel: 150,
    orbitBand: { inner: 25, outer: 85 },
    starThresholds: [0.50, 0.22],
    asteroids: {
      count: 14,
      minOrbit: 370,
      maxOrbit: 460,
      minSize: 2,
      maxSize: 6,
      minSpeed: -0.025,
      maxSpeed: 0.025
    },
    description: 'Two moons in opposing orbits with a debris field between them.'
  },
  {
    name: 'The Gauntlet',
    planet: { radius: 40, mass: 3500, color: '#33aa77', type: 'crystal' },
    moons: [
      { radius: 15, mass: 15000, color: '#ff6b6b', orbitRadius: 520, angle: Math.PI * 0.5, angularVel: 0.055, glowColor: 'rgba(255,107,107,0.35)' }
    ],
    fuel: 80,
    orbitBand: { inner: 22, outer: 70 },
    starThresholds: [0.40, 0.15],
    asteroids: {
      count: 18,
      minOrbit: 340,
      maxOrbit: 490,
      minSize: 3,
      maxSize: 8,
      minSpeed: 0.02,
      maxSpeed: 0.05
    },
    description: 'A fast, distant moon through a dense asteroid field. Good luck.'
  }
];

export function getLevel(idx) {
  return LEVELS[idx] ?? LEVELS[0];
}
