// sounds.js — Web Audio API tone synthesis (no external files needed)
// All play() calls are wrapped in try/catch for iOS compatibility.

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

function simpleTone(freq, dur, vol, type = 'sine') {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

// tap.mp3 equivalent — soft click, 800hz, 0.2s
export const playTap = () => {
  try { simpleTone(800, 0.2, 0.2); } catch (_) {}
};

// bloom.mp3 equivalent — gentle chime, 523hz + 659hz harmonics, 1s
export const playBloom = () => {
  try {
    simpleTone(523, 1.0, 0.15);
    simpleTone(659, 1.0, 0.15);
  } catch (_) {}
};

// streak.mp3 equivalent — soft whoosh/rise, 300→600hz sweep, 0.6s
export const playStreak = () => {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
};
