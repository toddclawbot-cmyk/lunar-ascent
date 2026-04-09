// audio.js — Web Audio sound effects

let ctx = null;
let masterGain = null;
let noiseBuffer = null;
let thrustSource = null;
let thrustGainNode = null;
let thrustFilter = null;
let ambientOsc = null;

function ensureContext() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    // Create reusable noise buffer
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, length, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Start ambient drone
    ambientOsc = ctx.createOscillator();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 55;
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.025;
    ambientOsc.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientOsc.start();

    return true;
  } catch (e) {
    return false;
  }
}

export function initAudio() {
  ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function updateThrustSound(throttle) {
  if (!ensureContext()) return;

  if (throttle > 0 && !thrustSource) {
    thrustSource = ctx.createBufferSource();
    thrustSource.buffer = noiseBuffer;
    thrustSource.loop = true;

    thrustFilter = ctx.createBiquadFilter();
    thrustFilter.type = 'bandpass';
    thrustFilter.frequency.value = 180;
    thrustFilter.Q.value = 1.5;

    thrustGainNode = ctx.createGain();
    thrustGainNode.gain.value = 0;

    thrustSource.connect(thrustFilter);
    thrustFilter.connect(thrustGainNode);
    thrustGainNode.connect(masterGain);
    thrustSource.start();
  }

  if (thrustGainNode) {
    // Pitch rises with throttle
    if (thrustFilter) {
      thrustFilter.frequency.setTargetAtTime(150 + throttle * 200, ctx.currentTime, 0.05);
    }
    thrustGainNode.gain.setTargetAtTime(throttle * 0.35, ctx.currentTime, 0.05);
  }

  if (throttle <= 0 && thrustSource) {
    if (thrustGainNode) {
      thrustGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    }
    const src = thrustSource;
    thrustSource = null;
    thrustGainNode = null;
    thrustFilter = null;
    setTimeout(() => { try { src.stop(); } catch (e) {} }, 300);
  }
}

export function playCrash() {
  if (!ensureContext()) return;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  src.start();
  src.stop(ctx.currentTime + 0.8);
}

export function playOrbitAchieved() {
  if (!ensureContext()) return;

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.9);
  });
}

export function playSlingshot() {
  if (!ensureContext()) return;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}
