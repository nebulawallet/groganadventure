// ---------- Tiny WebAudio chiptune + SFX ----------
const SFX = (() => {
  let ctx = null, master = null, musicGain = null, musicOn = true, seqTimer = null, step = 0, track = 'world';
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type = 'square', vol = 0.2, slide = 0, dest) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, hp = 800) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  }
  const fx = {
    swing: () => noise(0.08, 0.12, 2000),
    hit: () => { tone(180, 0.1, 'square', 0.18, 0.5); noise(0.06, 0.15, 600); },
    crit: () => { tone(520, 0.12, 'square', 0.18, 0.4); noise(0.1, 0.2, 400); },
    shoot: () => tone(700, 0.08, 'square', 0.1, 0.5),
    blob: () => tone(240, 0.18, 'sine', 0.2, 2),
    hurt: () => { tone(140, 0.2, 'sawtooth', 0.22, 0.5); },
    pickup: () => { tone(880, 0.06, 'square', 0.12); setTimeout(() => tone(1320, 0.08, 'square', 0.12), 60); },
    coin: () => { tone(1200, 0.05, 'square', 0.1); setTimeout(() => tone(1600, 0.08, 'square', 0.1), 50); },
    talk: () => tone(300 + Math.random() * 200, 0.03, 'square', 0.05),
    level: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.16), i * 110)),
    quest: () => [659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.2), i * 120)),
    bark: () => { tone(420, 0.09, 'sawtooth', 0.3, 0.6); setTimeout(() => tone(380, 0.12, 'sawtooth', 0.3, 0.5), 110); },
    boom: () => { noise(0.5, 0.35, 80); tone(80, 0.5, 'sine', 0.35, 0.3); },
    dodge: () => noise(0.12, 0.08, 3000),
    squeak: () => tone(1400, 0.1, 'square', 0.12, 1.5),
    zap: () => { tone(1800, 0.1, 'sawtooth', 0.1, 0.3); noise(0.08, 0.1, 3000); },
    whistle: () => tone(2400, 0.6, 'sine', 0.15, 1.2),
    ui: () => tone(600, 0.04, 'square', 0.08),
    death: () => [400, 300, 200, 120].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'square', 0.2), i * 180)),
  };
  // --- music: simple 16-step pattern sequencer ---
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const TRACKS = {
    world: { bpm: 112, bass: [45, 0, 45, 0, 52, 0, 45, 0, 43, 0, 43, 0, 50, 0, 47, 0], lead: [69, 0, 72, 0, 76, 0, 74, 72, 67, 0, 71, 0, 74, 0, 72, 71], arp: true },
    boss: { bpm: 150, bass: [38, 38, 50, 38, 41, 41, 53, 41, 36, 36, 48, 36, 43, 43, 55, 43], lead: [74, 0, 77, 74, 81, 0, 79, 77, 72, 0, 76, 72, 79, 0, 81, 83], arp: false },
    end: { bpm: 96, bass: [48, 0, 55, 0, 53, 0, 55, 0, 48, 0, 52, 0, 50, 0, 55, 0], lead: [72, 76, 79, 84, 81, 79, 76, 79, 72, 74, 76, 79, 77, 76, 74, 72], arp: false },
  };
  function tick() {
    if (!ctx || !musicOn) return;
    const tr = TRACKS[track];
    const i = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const tp = bar === 2 ? 5 : bar === 3 ? -2 : 0;
    if (tr.bass[i]) tone(N(tr.bass[i] + tp), 0.18, 'triangle', 0.5, 0, musicGain);
    if (tr.lead[i] && (bar % 2 === 0 || track !== 'world')) tone(N(tr.lead[i] + tp), 0.14, 'square', 0.16, 0, musicGain);
    if (tr.arp && i % 2 === 1) tone(N(tr.bass[(i + 15) % 16] + 24 + tp || 69), 0.05, 'square', 0.06, 0, musicGain);
    if (track === 'boss' && i % 4 === 0) { /* kick */ tone(120, 0.12, 'sine', 0.6, 0.3, musicGain); }
    step++;
  }
  function startMusic(name) {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (name) track = name;
    if (seqTimer) clearInterval(seqTimer);
    step = 0;
    seqTimer = setInterval(tick, 60000 / TRACKS[track].bpm / 4);
  }
  function toggleMusic() { musicOn = !musicOn; return musicOn; }
  function play(n) { if (ctx && fx[n]) fx[n](); }
  return { init, play, startMusic, toggleMusic, get track() { return track; } };
})();
