// camera.js — Smooth follow camera with dynamic zoom

export class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.W = canvasWidth;
    this.H = canvasHeight;
    this.CAM_LERP = 0.08;
    this.ZOOM_LERP = 0.05;
    this.MIN_ZOOM = 0.25;
    this.screenShake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.updateBaseZoom();
  }

  resize(w, h) {
    this.W = w;
    this.H = h;
    this.updateBaseZoom();
  }

  updateBaseZoom() {
    // Adaptive base zoom: ensures world fits on any screen size
    this.BASE_ZOOM = Math.min(this.W, this.H) / 900;
  }

  follow(x, y, planetX, planetY, nearestMoon, shipSpeed) {
    this.targetX = x;
    this.targetY = y;

    // Zoom in when near a moon
    let moonZoomFactor = 1.0;
    if (nearestMoon) {
      const moonDist = Math.sqrt((x - nearestMoon.x) ** 2 + (y - nearestMoon.y) ** 2);
      if (moonDist < nearestMoon.radius * 10) {
        const t = (nearestMoon.radius * 10 - moonDist) / (nearestMoon.radius * 10);
        moonZoomFactor = 1.0 + t * 0.6;
      }
    }

    // Zoom out with speed
    const speedZoom = Math.min(shipSpeed / 8, 1.0) * 0.35;

    // Zoom out with distance from planet
    const dist = Math.sqrt((x - planetX) ** 2 + (y - planetY) ** 2);
    const maxDist = 800;
    const distZoom = Math.max(this.MIN_ZOOM, this.BASE_ZOOM - (dist / maxDist) * (this.BASE_ZOOM - this.MIN_ZOOM));

    this.targetZoom = Math.max(this.MIN_ZOOM, (distZoom + speedZoom) / moonZoomFactor);
  }

  update() {
    this.x += (this.targetX - this.x) * this.CAM_LERP;
    this.y += (this.targetY - this.y) * this.CAM_LERP;
    this.zoom += (this.targetZoom - this.zoom) * this.ZOOM_LERP;

    if (this.screenShake > 0) {
      this.shakeX = (Math.random() - 0.5) * this.screenShake;
      this.shakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.85;
      if (this.screenShake < 0.5) this.screenShake = 0;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  shake(amount) {
    this.screenShake = amount;
  }

  getTransform() {
    return {
      offsetX: this.W / 2 - this.x * this.zoom + this.shakeX,
      offsetY: this.H / 2 - this.y * this.zoom + this.shakeY,
      scale: this.zoom
    };
  }
}
