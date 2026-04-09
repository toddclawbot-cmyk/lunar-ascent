// renderer.js — Canvas 2D rendering with unique planet visuals

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
  }

  resize(w, h) {
    this.W = w;
    this.H = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  clear() {
    this.ctx.fillStyle = '#050510';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  applyCamera(cam) {
    const t = cam.getTransform();
    this.ctx.save();
    this.ctx.translate(t.offsetX, t.offsetY);
    this.ctx.scale(t.scale, t.scale);
  }

  restoreCamera() {
    this.ctx.restore();
  }

  // ── Stars ─────────────────────────────────────────────────────────────

  renderStars(stars, camX, camY, frameCount) {
    const parallax = 0.15;
    for (const s of stars) {
      const px = s.x - camX * parallax;
      const py = s.y - camY * parallax;
      const twinkle = Math.sin(frameCount * 0.02 + s.twinkleOffset) * 0.3 + 0.7;
      const alpha = s.bright * twinkle;
      this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(px, py, s.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // ── Gravity field visualization ───────────────────────────────────────

  renderGravityFields(bodies) {
    const ctx = this.ctx;
    for (const body of bodies) {
      const maxR = body.radius * 5;
      const gradient = ctx.createRadialGradient(body.x, body.y, body.radius, body.x, body.y, maxR);
      gradient.addColorStop(0, 'rgba(100, 150, 255, 0.045)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(body.x, body.y, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Concentric rings
      for (let i = 1; i <= 3; i++) {
        const r = body.radius * (1 + i * 1.2);
        ctx.strokeStyle = `rgba(100, 150, 255, ${0.05 / i})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(body.x, body.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ── Moon orbit paths ──────────────────────────────────────────────────

  renderMoonOrbits(moons, planetX, planetY) {
    const ctx = this.ctx;
    for (const moon of moons) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 16]);
      ctx.beginPath();
      ctx.arc(planetX, planetY, moon.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Orbit bands ──────────────────────────────────────────────────────

  renderOrbitBands(moons, orbitBand, orbitCheckCounter, ORBIT_CHECK_FRAMES) {
    for (const moon of moons) {
      const inner = orbitBand.inner;
      const outer = orbitBand.outer;

      this.ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([8, 10]);
      this.ctx.beginPath();
      this.ctx.arc(moon.x, moon.y, inner, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(moon.x, moon.y, outer, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      const baseAlpha = orbitCheckCounter > 0
        ? 0.12 + 0.25 * (orbitCheckCounter / ORBIT_CHECK_FRAMES)
        : 0.05;
      this.ctx.fillStyle = `rgba(0, 255, 200, ${baseAlpha})`;
      this.ctx.beginPath();
      this.ctx.arc(moon.x, moon.y, outer, 0, Math.PI * 2);
      this.ctx.arc(moon.x, moon.y, inner, 0, Math.PI * 2, true);
      this.ctx.fill();
    }
  }

  // ── Trajectory prediction line ────────────────────────────────────────

  renderTrajectory(points) {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.setLineDash([4, 6]);
    for (let i = 1; i < points.length; i++) {
      const t = i / points.length;
      const alpha = 0.45 * (1 - t);
      ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.lineWidth = 1.5 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // ── Trail ────────────────────────────────────────────────────────────

  renderTrail(trail) {
    if (trail.length < 2) return;
    this.ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const t = trail[i];
      const prev = trail[i - 1];
      const alpha = Math.max(0, 1 - t.age / 200) * 0.5;
      const width = (1 - t.age / 200) * 2;
      this.ctx.strokeStyle = `rgba(160, 180, 200, ${alpha})`;
      this.ctx.lineWidth = width;
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(t.x, t.y);
      this.ctx.stroke();
    }
  }

  // ── Particles ─────────────────────────────────────────────────────────

  renderParticles(particles) {
    for (const p of particles) {
      const alpha = p.alpha;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }

  // ── Asteroids ─────────────────────────────────────────────────────────

  renderAsteroids(asteroids) {
    const ctx = this.ctx;
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);

      // Body
      const grad = ctx.createRadialGradient(-a.size * 0.2, -a.size * 0.2, 0, 0, 0, a.size);
      grad.addColorStop(0, '#8a8a7a');
      grad.addColorStop(1, '#4a4a40');
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(120, 120, 100, 0.5)';
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      const v0 = a.vertices[0];
      ctx.moveTo(v0.x * a.size, v0.y * a.size);
      for (let i = 1; i < a.vertices.length; i++) {
        ctx.lineTo(a.vertices[i].x * a.size, a.vertices[i].y * a.size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── Planet (type-based) ───────────────────────────────────────────────

  renderPlanet(planet) {
    const ctx = this.ctx;
    const { x, y, radius, color, type } = planet;

    // Outer glow
    const glow = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 3);
    const glowMap = {
      rocky: 'rgba(74,127,170,0.2)',
      ice: 'rgba(139,181,208,0.25)',
      volcanic: 'rgba(204,85,51,0.3)',
      gas: 'rgba(119,85,170,0.25)',
      crystal: 'rgba(51,170,119,0.25)'
    };
    glow.addColorStop(0, glowMap[type] || glowMap.rocky);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0, x, y, radius
    );

    switch (type) {
      case 'rocky':
        bodyGrad.addColorStop(0, lightenColor(color, 40));
        bodyGrad.addColorStop(1, darkenColor(color, 30));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 6; i++) {
          const a = i * 1.1 + 0.3;
          const d = radius * (0.25 + (i % 3) * 0.15);
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, radius * (0.08 + (i % 2) * 0.05), 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'ice':
        bodyGrad.addColorStop(0, '#d4e8f0');
        bodyGrad.addColorStop(0.5, '#8bb5d0');
        bodyGrad.addColorStop(1, '#5588aa');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3;
          const sx = x + Math.cos(a) * radius * 0.2;
          const sy = y + Math.sin(a) * radius * 0.2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          for (let j = 1; j <= 3; j++) {
            ctx.lineTo(
              sx + Math.cos(a + j * 0.4) * radius * 0.3 * j,
              sy + Math.sin(a + j * 0.5) * radius * 0.25 * j
            );
          }
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.ellipse(x - radius * 0.25, y - radius * 0.3, radius * 0.4, radius * 0.25, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;

      case 'volcanic':
        bodyGrad.addColorStop(0, '#e87744');
        bodyGrad.addColorStop(0.6, '#993322');
        bodyGrad.addColorStop(1, '#551a11');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 120, 20, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.6 + 0.5;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * radius * 0.1, y + Math.sin(a) * radius * 0.1);
          ctx.quadraticCurveTo(
            x + Math.cos(a + 0.8) * radius * 0.6,
            y + Math.sin(a + 0.6) * radius * 0.5,
            x + Math.cos(a + 1.2) * radius * 0.9,
            y + Math.sin(a + 1.0) * radius * 0.8
          );
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 180, 50, 0.4)';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 3; i++) {
          const a = i * 2.1 + 0.7;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * radius * 0.4, y + Math.sin(a) * radius * 0.35, radius * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
        break;

      case 'gas':
        bodyGrad.addColorStop(0, lightenColor(color, 50));
        bodyGrad.addColorStop(1, darkenColor(color, 40));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        const bandColors = [
          'rgba(140, 100, 200, 0.25)', 'rgba(100, 70, 160, 0.2)',
          'rgba(170, 130, 220, 0.2)', 'rgba(90, 60, 140, 0.25)',
          'rgba(150, 110, 190, 0.15)'
        ];
        for (let i = 0; i < 5; i++) {
          const by = y - radius + (i + 0.5) * (radius * 2 / 5);
          const bh = radius * 0.15 + (i % 2) * radius * 0.1;
          ctx.fillStyle = bandColors[i];
          ctx.fillRect(x - radius, by - bh / 2, radius * 2, bh);
        }
        ctx.fillStyle = 'rgba(200, 160, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + radius * 0.2, y + radius * 0.1, radius * 0.2, radius * 0.12, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;

      case 'crystal':
        bodyGrad.addColorStop(0, '#66ddaa');
        bodyGrad.addColorStop(0.5, '#33aa77');
        bodyGrad.addColorStop(1, '#1a6644');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(150, 255, 200, 0.3)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(200, 255, 230, 0.4)';
        ctx.shadowColor = '#66ffaa';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.6 + 0.4;
          const d = radius * 0.45;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, radius * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
    }
  }

  // ── Moon ─────────────────────────────────────────────────────────────

  renderMoon(moon) {
    const ctx = this.ctx;
    const { x, y, radius, color, glowColor } = moon;

    const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
    gradient.addColorStop(0, glowColor || 'rgba(200,214,229,0.2)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    bodyGrad.addColorStop(0, lightenColor(color, 50));
    bodyGrad.addColorStop(1, color);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * radius * 0.35, y + Math.sin(a) * radius * 0.3, radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = glowColor || 'rgba(200,214,229,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Ship ─────────────────────────────────────────────────────────────

  renderShip(ship) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    const isThrusting = ship.isThrusting;
    const isBraking = ship.isBraking;

    ctx.fillStyle = '#3a3a4a';
    ctx.strokeStyle = '#5a5a6a';
    ctx.lineWidth = 1;
    roundRect(ctx, -16, -5, 10, 10, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2a2a3a';
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-20, 6);
    ctx.lineTo(-16, 4);
    ctx.closePath();
    ctx.fill();

    if (isThrusting) {
      const flameLen = 18 + Math.random() * 12;
      const grad = ctx.createLinearGradient(-16, 0, -16 - flameLen, 0);
      grad.addColorStop(0, 'rgba(255, 200, 80, 0.95)');
      grad.addColorStop(0.3, 'rgba(255, 120, 40, 0.85)');
      grad.addColorStop(0.7, 'rgba(255, 60, 20, 0.4)');
      grad.addColorStop(1, 'rgba(255, 30, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(-16 - flameLen, 0);
      ctx.lineTo(-16, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
      ctx.beginPath();
      ctx.moveTo(-16, -1.5);
      ctx.lineTo(-16 - flameLen * 0.4, 0);
      ctx.lineTo(-16, 1.5);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = '#ff9933';
      ctx.shadowBlur = 25;
      ctx.fillStyle = 'rgba(255, 150, 50, 0.3)';
      ctx.beginPath();
      ctx.arc(-16 - flameLen * 0.3, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const hullGrad = ctx.createLinearGradient(0, -8, 0, 8);
    hullGrad.addColorStop(0, '#c8d4e0');
    hullGrad.addColorStop(0.4, '#8a9aaa');
    hullGrad.addColorStop(1, '#5a6a7a');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = '#aabbcc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(14, -6);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-12, 4);
    ctx.lineTo(-6, 6);
    ctx.lineTo(14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(100, 130, 160, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(10, 6);
    ctx.stroke();

    ctx.fillStyle = '#aabbcc';
    for (const [rx, ry] of [[6, -4], [6, 4], [0, -4], [0, 4]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const cockpitGrad = ctx.createRadialGradient(13, -1, 0, 13, -1, 5);
    cockpitGrad.addColorStop(0, 'rgba(100, 230, 220, 0.9)');
    cockpitGrad.addColorStop(0.6, 'rgba(40, 180, 200, 0.7)');
    cockpitGrad.addColorStop(1, 'rgba(20, 100, 140, 0.5)');
    ctx.fillStyle = cockpitGrad;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(13, -1, 5, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(15, -2.5, 1.5, 1, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7a8a9a';
    ctx.strokeStyle = '#9aabbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -6); ctx.lineTo(-2, -10); ctx.lineTo(-8, -9); ctx.lineTo(-6, -6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 6); ctx.lineTo(-2, 10); ctx.lineTo(-8, 9); ctx.lineTo(-6, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = '#aabbcc';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(8, -6); ctx.lineTo(8, -11);
    ctx.stroke();
    ctx.fillStyle = '#ff6b35';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(8, -11, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isBraking) {
      ctx.fillStyle = 'rgba(255, 107, 53, 0.8)';
      ctx.shadowColor = '#ff6b35';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(16, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
