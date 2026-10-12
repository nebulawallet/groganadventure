// ---------- Mobile / touch controls ----------
(() => {
  const $ = (id) => document.getElementById(id);
  const ui = $('touchui');
  const key = (code, type) => dispatchEvent(new KeyboardEvent(type, { code }));

  function enable() {
    if (G.touch.on) return;
    G.touch.on = true;
    document.body.classList.add('touch');
    ui.classList.remove('hidden');
    dispatchEvent(new Event('resize'));
  }
  if (matchMedia('(pointer: coarse)').matches) enable();
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') enable(); SFX.init(); }, true);
  addEventListener('touchstart', () => SFX.init(), { passive: true });

  // ---- virtual joystick (anywhere on the left half of the screen) ----
  const zone = $('joyzone'), joy = $('joy'), knob = $('joyknob');
  const R = 52;
  let joyId = null, ox = 0, oy = 0;
  zone.addEventListener('pointerdown', (e) => {
    if (joyId !== null) return;
    joyId = e.pointerId; ox = e.clientX; oy = e.clientY;
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already-released pointer */ }
    joy.style.left = ox + 'px'; joy.style.top = oy + 'px';
    joy.classList.remove('hidden');
    knob.style.transform = 'translate(-50%,-50%)';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const m = Math.min(1, d / R);
    if (m < 0.18) { G.touch.mx = G.touch.my = 0; return; }
    // full speed past ~60% tilt, gentle walk below
    const s = Math.min(1, m / 0.6) / Math.max(d, 1e-6);
    G.touch.mx = dx * s; G.touch.my = -dy * s;
  });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null; G.touch.mx = G.touch.my = 0;
    joy.classList.add('hidden');
  };
  zone.addEventListener('pointerup', joyEnd);
  zone.addEventListener('pointercancel', joyEnd);

  // ---- buttons ----
  for (const b of ui.querySelectorAll('[data-act],[data-key]')) {
    const act = b.dataset.act, code = b.dataset.key;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      b.classList.add('down');
      SFX.init();
      if (act === 'melee') { G.mouse.l = true; G.mouse.lq = G.time; }
      else if (act === 'ranged') { G.mouse.r = true; G.mouse.rq = G.time; }
      else if (code) key(code, 'keydown');
    });
    const up = () => {
      b.classList.remove('down');
      if (act === 'melee') G.mouse.l = false;
      else if (act === 'ranged') G.mouse.r = false;
      else if (code) key(code, 'keyup');
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  $('tb-fs').addEventListener('click', () => {
    const d = document;
    if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
    else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  });

  // tap the dialogue text to skip typing / continue, tap the big map to close it
  $('dtext').addEventListener('click', () => key('Space', 'keydown'));
  $('mapview').addEventListener('click', () => key('Escape', 'keydown'));

  // keep buttons in sync with game state
  let hinted = false;
  setInterval(() => {
    if (!G.touch.on) return;
    const playing = G.mode === 'play';
    $('ttop').classList.toggle('hidden', !G.p);
    document.body.classList.toggle('t-inplay', playing);
    $('tb-talk').classList.toggle('ready', playing && !$('prompt').classList.contains('hidden'));
    $('tb-mega').classList.toggle('hidden', !G.hasPerk || !G.hasPerk('megabark'));
    $('tb-whistle').classList.toggle('hidden', !G.has || !G.has('dog_whistle'));
    $('tb-ranged').classList.toggle('off', !G.equipped.ranged);
    $('tb-bark').classList.toggle('on', !!G.barkTime);
    if (!playing && joyId === null) { G.touch.mx = G.touch.my = 0; }
    if (playing && !hinted && innerHeight > innerWidth) { hinted = true; UI.toast('Tip: turn your phone sideways for a bigger view!', 'item'); }
  }, 150);
})();
