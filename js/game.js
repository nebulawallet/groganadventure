// ---------- Eli Grogan's Adventure: core game ----------
const PX = 20; // low-res pixels per world unit
const SAVE_KEY = 'eliGrogan_save_v1';
const ISO = { up: { x: -Math.SQRT1_2, z: -Math.SQRT1_2 }, right: { x: Math.SQRT1_2, z: -Math.SQRT1_2 } };

const G = {
  mode: 'title', // title | play | dialogue | menu | dead | ending
  time: 0,
  // ---- persistent state (saved) ----
  S: { STR: 4, PER: 4, END: 4, CHA: 4, INT: 4, AGI: 4, LUK: 4 },
  alloc: {}, level: 1, xpCur: 0, hp: 100, ap: 80, bucks: 20,
  inv: {}, equipped: { melee: 'fists', ranged: null, armor: 'hoodie' }, perks: [],
  quests: {}, flags: {}, picked: {}, pylonHp: {}, campsCleared: {}, discovered: {},
  pendingPerk: 0, pendingSkill: 0, pendingSpecial: 0, tracked: 'main', look: 'eli',
  // ---- runtime ----
  p: null, npcs: {}, enemies: [], projectiles: [], pickups: [], effects: [], pylons: [], camps: {}, boss: null,
  barkTime: false, touch: { on: false, mx: 0, my: 0 }, keys: {}, mouse: { x: 0, y: 0, l: false, r: false, wx: 0, wz: 0, lq: -9, rq: -9 },
};

(function () {
  // ======================= THREE setup =======================
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2a3a);
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
  const CAM_OFF = new THREE.Vector3(20, 16.33, 20);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x405030, 0.55));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.75);
  sun.position.set(0.55, 1, 0.25);
  scene.add(sun);
  let lowW = 320, lowH = 180, pixScale = 3;
  function resize() {
    if (!innerWidth || !innerHeight) return; // hidden / minimised window
    // touch devices: show more of the world on small screens (fractional scale is fine with pixelated upscaling)
    pixScale = G.touch.on ? Math.max(1, Math.min(innerWidth, innerHeight) / 250) : Math.max(2, Math.round(innerHeight / 330));
    lowW = Math.ceil(innerWidth / pixScale); lowH = Math.ceil(innerHeight / pixScale);
    renderer.setSize(lowW, lowH, false);
    const vw = lowW / PX, vh = lowH / PX;
    cam.left = -vw / 2; cam.right = vw / 2; cam.top = vh / 2; cam.bottom = -vh / 2;
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  G.scene = scene; G.cam = cam; G.renderer = renderer;

  const anim = WORLD.build(scene);
  const MAP = WORLD.map;

  // ======================= textures =======================
  const texCache = {};
  const toTex = (c) => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  function charTex(key, look) {
    if (!texCache[key]) { const s = SPR.character(look); texCache[key] = { right: s.right.map(toTex), left: s.left.map(toTex) }; }
    return texCache[key];
  }
  const iconTex = {};
  function itemTex(icon) { if (!iconTex[icon]) iconTex[icon] = toTex(SPR.icon(icon)); return iconTex[icon]; }
  function orbTex(color, size = 8) {
    const key = 'orb' + color + size;
    if (!texCache[key]) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const x = c.getContext('2d');
      const r = size / 2;
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const d = Math.hypot(i + 0.5 - r, j + 0.5 - r);
        if (d < r - 1.2) { x.fillStyle = d < r * 0.4 && i < r && j < r ? '#ffffff' : color; x.fillRect(i, j, 1, 1); }
        else if (d < r) { x.fillStyle = '#1b1424'; x.fillRect(i, j, 1, 1); }
      }
      texCache[key] = toTex(c);
    }
    return texCache[key];
  }
  function markTex() {
    if (!texCache.mark) {
      const c = document.createElement('canvas'); c.width = 6; c.height = 12;
      const x = c.getContext('2d');
      x.fillStyle = '#1b1424'; x.fillRect(1, 0, 4, 9); x.fillRect(1, 8, 4, 4);
      x.fillStyle = '#ffe066'; x.fillRect(2, 1, 2, 6); x.fillRect(2, 9, 2, 2);
      texCache.mark = toTex(c);
    }
    return texCache.mark;
  }

  const shadowGeo = new THREE.CircleGeometry(0.34, 10);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  function makeActor(tex, scale = 1) {
    const mat = new THREE.SpriteMaterial({ map: tex.right[0], alphaTest: 0.5 });
    const sp = new THREE.Sprite(mat);
    sp.center.set(0.5, 1 / 32);
    sp.scale.set(1.6 * scale, 1.6 * scale, 1);
    scene.add(sp);
    const sh = new THREE.Mesh(shadowGeo, shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.scale.setScalar(scale);
    scene.add(sh);
    return { sprite: sp, shadow: sh, tex, face: 1, frame: 0, animT: 0, scale };
  }
  function placeActor(a, y = 0) {
    a.sprite.position.set(a.x, y + 0.02, a.z);
    a.shadow.position.set(a.x, 0.03, a.z);
  }
  function setFrame(a, f) {
    a.frame = f;
    a.sprite.material.map = (a.face < 0 ? a.tex.left : a.tex.right)[f];
  }
  function removeActor(a) { scene.remove(a.sprite); scene.remove(a.shadow); a.sprite.material.dispose(); if (a.mark) scene.remove(a.mark); if (a.ghost) scene.remove(a.ghost); }
  const screenDX = (dx, dz) => dx - dz; // + means moving right on screen

  // ======================= stats & API =======================
  G.has = (id) => (G.inv[id] || 0) > 0;
  G.count = (id) => G.inv[id] || 0;
  G.hasPerk = (id) => G.perks.includes(id);
  G.qStage = (id) => G.quests[id] || 0;
  G.skill = (k) => {
    const sk = DATA.SKILLS.find((s) => s.k === k);
    let v = 2 + G.eff(sk.stat) * 2 + Math.ceil(G.effLUK() / 2) + (G.alloc[k] || 0);
    if (k === 'speech' && G.has('debate_badge')) v += 10;
    if (k === 'speech' && G.has('council_medal')) v += 10;
    if (k === 'sneak' && (DATA.ITEMS[G.equipped.armor] || {}).sneak) v += DATA.ITEMS[G.equipped.armor].sneak;
    if (k === 'speech' && G.hasPerk('chavdiplo')) v += 15;
    return Math.min(100, v);
  };
  G.eliIQ = () => 100 + G.S.INT * 8 + (G.level - 1) + (G.hasPerk('bigbrain') ? 15 : 0);
  G.eff = (k) => G.S[k] + (k === 'LUK' && G.has('bracelet') ? 1 : 0) + (k === 'PER' && G.has('sinder_amulet') ? 1 : 0);
  G.effLUK = () => G.eff('LUK');
  G.maxHp = () => 80 + G.S.END * 10 + (G.level - 1) * 8 + (G.hasPerk('thickfur') ? 30 : 0) + (G.has('bracelet') ? 15 : 0) + (G.has('lucky_scarf') ? 20 : 0);
  G.maxAp = () => 60 + G.S.AGI * 6 + (G.hasPerk('packrat') ? 20 : 0);
  G.xpNext = () => 100 + (G.level - 1) * 125;
  G.armorDR = () => (DATA.ITEMS[G.equipped.armor] || {}).dr || 0;
  G.critChance = () => 0.02 + G.effLUK() * 0.015 + (G.hasPerk('luckypup') ? 0.07 : 0) + (G.flags.veaBlessing ? 0.03 : 0);
  G.moveSpeed = () => 5 * (1 + (G.S.AGI - 5) * 0.03) * (G.hasPerk('parkour') ? 1.15 : 1) * (G.hasPerk('packrat') ? 1.1 : 1) * (G.has('turbo_sneakers') ? 1.1 : 1) * (G.race ? 1.6 : 1);
  G.pylonsDown = () => DATA.PYLONS.filter((p) => G.pylonHp[p.id] !== undefined && G.pylonHp[p.id] <= 0).length;
  G.zappersDown = () => DATA.ZAPPERS.filter((z) => G.pylonHp[z.id] !== undefined && G.pylonHp[z.id] <= 0).length;
  G.raidWave = () => (raid ? raid.wave : 0);
  G.sigs = () => ['rack', 'squid', 'sinder', 'river'].filter((n) => G.flags['sig_' + n]).length;
  G.addSig = (n) => { G.flags['sig_' + n] = true; UI.toast(`Signature collected (${G.sigs()}/4)`, 'quest'); SFX.play('pickup'); checkQuests(); };

  G.give = (id, n = 1) => {
    const it = DATA.ITEMS[id];
    G.inv[id] = (G.inv[id] || 0) + n;
    UI.toast(`+ ${it.name}${n > 1 ? ' x' + n : ''}`, 'item');
    if (it.type === 'weapon') {
      if (it.wtype === 'melee' && (G.equipped.melee === 'fists' || !G.equipped.melee)) G.equip(id);
      if (it.wtype !== 'melee' && !G.equipped.ranged) G.equip(id);
    }
    if (id === 'bracelet' || id === 'lucky_scarf') recalc();
    checkQuests();
  };
  G.take = (id, n = 1) => { G.inv[id] = Math.max(0, (G.inv[id] || 0) - n); if (!G.inv[id]) delete G.inv[id]; };
  G.money = (n) => { G.bucks += n; UI.toast(`${n >= 0 ? '+' : ''}${n} Bucks`, 'money'); SFX.play('coin'); };
  G.equip = (id) => {
    const it = DATA.ITEMS[id];
    if (!it) return;
    if (it.type === 'armor') G.equipped.armor = id;
    else if (it.type === 'weapon') { if (it.wtype === 'melee') G.equipped.melee = id; else G.equipped.ranged = id; }
    UI.hud(true);
  };
  G.healFull = () => { G.hp = G.maxHp(); G.ap = G.maxAp(); SFX.play('pickup'); };
  G.xp = (n, social) => {
    let m = 1 + (G.S.INT - 5) * 0.03 + (G.hasPerk('bigbrain') ? 0.15 : 0) + (social && G.hasPerk('goodboy') ? 0.15 : 0);
    const amt = Math.max(1, Math.round(n * m));
    G.xpCur += amt;
    UI.floatText(G.p.x, 2.0, G.p.z, `+${amt} XP`, '#9affb0');
    while (G.xpCur >= G.xpNext() && G.level < 30) {
      G.xpCur -= G.xpNext();
      G.level++;
      G.pendingPerk++;
      G.pendingSkill += 8 + Math.floor(G.S.INT / 2);
      if (G.level % 3 === 0) G.pendingSpecial++;
      recalc(); G.hp = G.maxHp();
      SFX.play('level');
      UI.toast(`LEVEL UP! You are now level ${G.level}. Press C to spend points.`, 'level');
      UI.flash('#ffe066');
    }
  };
  G.qSet = (id, stage) => {
    const q = DATA.QUESTS[id];
    const old = G.quests[id] || 0;
    if (old === stage) return;
    G.quests[id] = stage;
    if (old === 0 && stage > 0 && id !== 'main') { UI.toast(`NEW QUEST: ${q.name}`, 'quest'); G.tracked = G.tracked && G.qStage(G.tracked) < 100 ? G.tracked : id; }
    else if (stage >= 100) { UI.toast(`QUEST COMPLETE: ${q.name}`, 'quest'); if (G.tracked === id) G.tracked = 'main'; }
    else UI.toast(`Quest updated: ${q.name}`, 'quest');
    SFX.play('quest');
    if (id === 'main') onMainStage(stage);
    autosave();
  };
  G.openShop = (id) => UI.openShop(id);
  G.showEnding = () => UI.showEnding();

  function recalc() {
    G.hp = Math.min(G.hp, G.maxHp());
    G.ap = Math.min(G.ap, G.maxAp());
  }
  G.recalc = recalc;

  // ======================= player =======================
  function makePlayer(x, z) {
    const a = makeActor(charTex(G.look, DATA.LOOKS[G.look]));
    Object.assign(a, { x, z, vx: 0, vz: 0, atkT: 0, meleeCd: 0, rangedCd: 0, dodgeT: 0, dodgeCd: 0, dx: 0, dz: 0, iframes: 0, lastHurt: -99, barkCd: 0, whistleCd: 0, aimA: 0 });
    // see-through ghost so Eli is visible behind trees & houses
    const gm = new THREE.SpriteMaterial({ map: a.tex.right[0], transparent: true, opacity: 0.35, depthTest: false });
    a.ghost = new THREE.Sprite(gm); a.ghost.center.copy(a.sprite.center); a.ghost.scale.copy(a.sprite.scale); a.ghost.renderOrder = 999;
    scene.add(a.ghost);
    return a;
  }
  function setPlayerLook(key) {
    G.look = key;
    G.p.tex = charTex(key, DATA.LOOKS[key]);
    setFrame(G.p, 0);
  }
  G.setPlayerLook = setPlayerLook;

  function blocked(x, z, r = 0.28) {
    return WORLD.solidAt(x - r, z - r) || WORLD.solidAt(x + r, z - r) || WORLD.solidAt(x - r, z + r) || WORLD.solidAt(x + r, z + r);
  }
  function moveEnt(e, dx, dz, r) {
    if (!blocked(e.x + dx, e.z, r)) e.x += dx;
    if (!blocked(e.x, e.z + dz, r)) e.z += dz;
  }

  // movement input from keyboard, or the on-screen joystick (analog, screen space)
  function inputVec() {
    const k = G.keys;
    let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let iy = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (!ix && !iy && (G.touch.mx || G.touch.my)) { ix = G.touch.mx; iy = G.touch.my; }
    return [ix, iy];
  }

  function updatePlayer(dt) {
    const p = G.p;
    const [ix, iy] = inputVec();
    let mx = ISO.right.x * ix + ISO.up.x * iy, mz = ISO.right.z * ix + ISO.up.z * iy;
    let ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; ml = 1; }
    if (ml > 0.1) { p.lastMx = mx / ml; p.lastMz = mz / ml; }
    p.meleeCd -= dt; p.rangedCd -= dt; p.dodgeCd -= dt; p.iframes -= dt; p.atkT -= dt; p.barkCd -= dt; p.whistleCd -= dt;

    // aim
    const ax = G.mouse.wx - p.x, az = G.mouse.wz - p.z;
    p.aimA = Math.atan2(az, ax);

    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      moveEnt(p, p.dx * 13 * dt, p.dz * 13 * dt);
    } else {
      const sp = G.moveSpeed();
      moveEnt(p, mx * sp * dt + p.vx * dt, mz * sp * dt + p.vz * dt);
    }
    p.vx *= Math.pow(0.002, dt); p.vz *= Math.pow(0.002, dt);

    // facing follows aim while attacking, otherwise movement
    const sdx = p.atkT > 0 || G.mouse.l || G.mouse.r ? screenDX(ax, az) : ml > 0 ? screenDX(mx, mz) : 0;
    if (sdx > 0.01) p.face = 1; else if (sdx < -0.01) p.face = -1;
    p.animT += dt;
    let f = 0;
    if (p.atkT > 0) f = 3;
    else if (ml > 0 || p.dodgeT > 0) f = Math.floor(p.animT * 7) % 2 ? 1 : 2;
    setFrame(p, f);
    p.ghost.material.map = p.sprite.material.map;
    const blink = p.iframes > 0 && p.dodgeT <= 0 && Math.floor(G.time * 20) % 2;
    p.sprite.visible = !blink;
    placeActor(p, p.dodgeT > 0 ? Math.sin((p.dodgeT / 0.28) * Math.PI) * 0.4 : 0);
    p.ghost.position.copy(p.sprite.position);
    p.sprite.material.color.setRGB(1, p.iframes > 0.2 && p.dodgeT <= 0 ? 0.5 : 1, p.iframes > 0.2 && p.dodgeT <= 0 ? 0.5 : 1);

    // attacks
    if ((G.mouse.l || G.time - G.mouse.lq < 0.3) && p.meleeCd <= 0) { G.mouse.lq = -9; meleeAttack(); }
    if ((G.mouse.r || G.time - G.mouse.rq < 0.3) && p.rangedCd <= 0) { G.mouse.rq = -9; rangedAttack(); }

    // regen
    const outOfCombat = G.time - p.lastHurt > 4;
    if (outOfCombat) G.hp = Math.min(G.maxHp(), G.hp + G.S.END * 0.18 * dt);
    if (G.barkTime) {
      G.ap -= 24 * (G.hasPerk('zoomies') ? 0.65 : 1) * dt;
      if (G.ap <= 0) { G.ap = 0; toggleBark(false); }
    } else G.ap = Math.min(G.maxAp(), G.ap + 14 * dt);
  }

  function dodge() {
    const p = G.p;
    if (p.dodgeCd > 0 || p.dodgeT > 0 || G.ap < 8) return;
    const [ix, iy] = inputVec();
    let dx = ISO.right.x * ix + ISO.up.x * iy, dz = ISO.right.z * ix + ISO.up.z * iy;
    if (!dx && !dz) { dx = Math.cos(p.aimA); dz = Math.sin(p.aimA); }
    const l = Math.hypot(dx, dz); p.dx = dx / l; p.dz = dz / l;
    p.dodgeT = 0.28; p.iframes = 0.32; p.dodgeCd = G.hasPerk('parkour') ? 0.45 : 0.65;
    G.ap -= 8;
    SFX.play('dodge');
    for (let i = 0; i < 6; i++) particle(p.x, 0.1, p.z, '#d8c8a8', U.rand(-1, 1), U.rand(0.5, 1.5), U.rand(-1, 1), 0.4);
  }

  function toggleBark(on) {
    if (on === undefined) on = !G.barkTime;
    if (on && G.ap < 15) { UI.toast('Not enough AP for B.A.R.K. Time!', 'warn'); return; }
    G.barkTime = on;
    document.body.classList.toggle('bark', on);
    if (on) { SFX.play('bark'); UI.toast('B.A.R.K. TIME!', 'level'); }
  }

  // ---- damage helpers ----
  function weaponDamage(w) {
    let d = w.dmg;
    if (w.wtype === 'melee') d *= 1 + (G.S.STR - 5) * 0.07 + G.skill('melee') / 250 + (G.hasPerk('bonk') ? 0.2 : 0);
    else d *= 1 + (G.eff('PER') - 5) * 0.06 + G.skill('ranged') / 250 + (G.hasPerk('eagle') ? 0.2 : 0);
    if (G.hasPerk('bassboost') && (w.wtype === 'thrown' || w.aoe || w.id === 'bass_cannon')) d *= 1.25;
    if (G.hasPerk('adrenaline') && G.hp < G.maxHp() * 0.35) d *= 1.25;
    d *= U.rand(0.88, 1.12);
    const crit = Math.random() < G.critChance();
    if (crit) d *= G.hasPerk('crit') ? 2.5 : 2;
    return { d: Math.max(1, Math.round(d)), crit };
  }

  function meleeAttack() {
    const p = G.p;
    const w = DATA.ITEMS[G.equipped.melee || 'fists'];
    p.meleeCd = w.rate * (1 - (G.S.AGI - 5) * 0.02);
    p.atkT = 0.16;
    const a = p.aimA;
    swingFx(p.x, p.z, a, w.range, w.arc, w.id === 'shock_baton' ? 0x7af8ff : 0xffffff);
    SFX.play(G.equipped.melee === 'rubber_chicken' ? 'squeak' : 'swing');
    let hitAny = false;
    const inArc = (x, z, extra) => {
      const d = U.dist(p.x, p.z, x, z);
      if (d > w.range + extra) return false;
      if (d < 0.6) return true;
      return Math.abs(U.angDiff(Math.atan2(z - p.z, x - p.x), a)) < w.arc / 2;
    };
    for (const e of G.enemies) {
      if (e.dead || !inArc(e.x, e.z, 0.35 * e.scale)) continue;
      const r = weaponDamage(w);
      const kb = (w.kb || 3) * (G.hasPerk('bonk') ? 1.5 : 1);
      hurtEnemy(e, r.d, r.crit, Math.cos(a) * kb, Math.sin(a) * kb, w.stun || 0);
      hitAny = true;
    }
    if (G.boss && G.boss.active && inArc(G.boss.x, G.boss.z, 0.6)) { const r = weaponDamage(w); hurtBoss(r.d, r.crit); hitAny = true; }
    for (const py of G.pylons) {
      if (py.dead || !inArc(py.x, py.z, 0.7)) continue;
      const r = weaponDamage(w); hurtPylon(py, r.d, r.crit); hitAny = true;
    }
    if (hitAny && w.id === 'shock_baton') SFX.play('zap');
  }

  function rangedAttack() {
    const p = G.p;
    const id = G.equipped.ranged;
    if (!id) { if (!G.flags.noRangedHint) { G.flags.noRangedHint = true; UI.toast('No ranged weapon equipped yet.', 'warn'); } p.rangedCd = 0.5; return; }
    const w = DATA.ITEMS[id];
    if (G.ap < w.ap) { p.rangedCd = 0.25; UI.toast('Not enough AP!', 'warn'); return; }
    G.ap -= w.ap;
    p.rangedCd = w.rate;
    p.atkT = 0.12;
    const spread = w.proj.spread || 0;
    const a = p.aimA + U.rand(-spread, spread);
    const r = weaponDamage(w);
    spawnProjectile({
      x: p.x + Math.cos(a) * 0.5, z: p.z + Math.sin(a) * 0.5, a, speed: w.proj.speed, dmg: r.d, crit: r.crit, owner: 'p',
      life: w.proj.life, size: w.proj.size, color: w.proj.color, grow: w.proj.grow, pierce: w.proj.pierce, aoe: w.aoe, stunAoe: w.stunAoe,
      kind: id === 'hornet_jar' ? 'jar' : id === 'whoopee_cushion' ? 'cushion' : id === 'agar_blaster' || id === 'bass_cannon' ? 'blob' : 'pellet',
    });
    SFX.play(id === 'agar_blaster' || id === 'bass_cannon' ? 'blob' : 'shoot');
  }

  function megaBark() {
    const p = G.p;
    if (!G.hasPerk('megabark')) return;
    if (p.barkCd > 0) { UI.toast(`Mega Bark recharging (${Math.ceil(p.barkCd)}s)`, 'warn'); return; }
    p.barkCd = 12;
    SFX.play('bark');
    UI.shake(0.3);
    ringFx(p.x, p.z, 4.5, 0xffe066);
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = U.dist(p.x, p.z, e.x, e.z);
      if (d < 4.5) { const a = Math.atan2(e.z - p.z, e.x - p.x); hurtEnemy(e, 10, false, Math.cos(a) * 9, Math.sin(a) * 9, 2.2); }
    }
  }

  function blowWhistle() {
    if (!G.has('dog_whistle')) return;
    const p = G.p;
    if (p.whistleCd > 0) { UI.toast(`Whistle recharging (${Math.ceil(p.whistleCd)}s)`, 'warn'); return; }
    p.whistleCd = 12;
    SFX.play('whistle');
    ringFx(p.x, p.z, 9, 0xeeeeff);
    const b = G.boss;
    if (b && b.active && U.dist(p.x, p.z, b.x, b.z) < 10) {
      b.shieldT = 5.5; b.stun = 1.6;
      UI.toast(b.who === 'joe' ? "The dog whistle wakes Joe right up! His SECRET SERVICE SHIELD drops!" : b.who === 'roby' ? "The dog whistle makes Roby's costume ears ring! His BAN SHIELD shatters!" : "The dog whistle SHATTERS Shive's shield!", 'level');
      UI.floatText(b.x, 3, b.z, 'AWOOOO?!', '#ff4fd8');
      SFX.play('boom');
    } else {
      // nearby goons are stunned
      for (const e of G.enemies) if (!e.dead && U.dist(p.x, p.z, e.x, e.z) < 7) e.stun = 1.5;
      UI.floatText(p.x, 2.4, p.z, '*FWEEEE*', '#eeeeff');
    }
  }

  function quickHeal() {
    const heals = Object.keys(G.inv).filter((id) => DATA.ITEMS[id].type === 'use' && DATA.ITEMS[id].heal);
    if (!heals.length) { UI.toast('No healing items!', 'warn'); return; }
    const miss = G.maxHp() - G.hp;
    if (miss < 1) { UI.toast('Already at full health.', 'warn'); return; }
    heals.sort((a, b) => DATA.ITEMS[a].heal - DATA.ITEMS[b].heal);
    const best = heals.find((id) => DATA.ITEMS[id].heal * healMult() >= miss) || heals[heals.length - 1];
    G.useItem(best);
  }
  const healMult = () => (1 + G.skill('medicine') / 150) * (G.hasPerk('ironstomach') ? 1.4 : 1);
  G.useItem = (id) => {
    const it = DATA.ITEMS[id];
    if (!G.has(id)) return;
    if (it.type === 'weapon' || it.type === 'armor') { G.equip(id); UI.toast(`Equipped ${it.name}`, 'item'); return; }
    if (it.type !== 'use') return;
    G.take(id, 1);
    if (id === 'tonic') { G.S.END++; recalc(); UI.toast('You feel... sturdier. +1 Endurance!', 'level'); SFX.play('level'); return; }
    if (it.heal) { const h = Math.round(it.heal * healMult()); G.hp = Math.min(G.maxHp(), G.hp + h); UI.floatText(G.p.x, 2, G.p.z, `+${h} HP`, '#7aff7a'); }
    if (it.ap) G.ap = Math.min(G.maxAp(), G.ap + it.ap);
    SFX.play('pickup');
  };

  // ======================= enemies =======================
  function spawnEnemy(kind, x, z, lvl, camp) {
    const def = DATA.ENEMIES[kind];
    const pos = WORLD.snap(x, z);
    const a = makeActor(charTex('enemy_' + kind, def.look), def.scale || 1);
    const lv = lvl + Math.floor(G.level / 4) * 0.5;
    Object.assign(a, {
      kind, def, x: pos.x, z: pos.z, homeX: pos.x, homeZ: pos.z, camp, lvl: lv,
      hp: Math.round(def.hp * (1 + 0.3 * (lv - 1))), dmg: def.dmg * (1 + 0.2 * (lv - 1)), xpv: Math.round(def.xp * (1 + 0.25 * (lv - 1))),
      state: 'idle', cd: U.rand(0, 1), wanderT: U.rand(0, 3), tx: pos.x, tz: pos.z, vx: 0, vz: 0, stun: 0, flash: 0, windup: 0, chargeT: 0, chargeCd: U.rand(2, 5), aggro: false,
    });
    a.maxHp = a.hp;
    G.enemies.push(a);
    placeActor(a);
    return a;
  }

  function hurtEnemy(e, dmg, crit, kbx, kbz, stun) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.12;
    e.vx += kbx || 0; e.vz += kbz || 0;
    if (stun) e.stun = Math.max(e.stun, stun);
    e.aggro = true; e.state = 'chase';
    UI.floatText(e.x, 1.9 * e.scale, e.z, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffe066' : '#ffffff', crit);
    SFX.play(crit ? 'crit' : 'hit');
    for (let i = 0; i < (crit ? 8 : 4); i++) particle(e.x, 0.8, e.z, i % 2 ? '#ffffff' : '#d8a868', U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2), 0.35);
    if (e.hp <= 0) killEnemy(e);
    // alert nearby campmates
    for (const o of G.enemies) if (!o.dead && o.camp === e.camp && U.dist(o.x, o.z, e.x, e.z) < 8) { o.aggro = true; o.state = 'chase'; }
  }

  function killEnemy(e) {
    e.dead = true;
    removeActor(e);
    for (let i = 0; i < 12; i++) particle(e.x, 0.7, e.z, U.pick(['#ffffff', '#d8d8d8', e.def.look.dog ? e.def.look.dog.color : e.def.look.shirt]), U.rand(-3, 3), U.rand(1, 4), U.rand(-3, 3), 0.6);
    G.xp(e.xpv);
    if (G.hasPerk('agar')) G.hp = Math.min(G.maxHp(), G.hp + 6);
    const [lo, hi] = e.def.bucks;
    let b = U.randi(lo, hi);
    if (G.hasPerk('luckypup')) b = Math.round(b * 1.5);
    spawnPickup('bucks', b, e.x + U.rand(-0.3, 0.3), e.z + U.rand(-0.3, 0.3));
    if (e.def.drop && !G.has(e.def.drop)) spawnPickup(e.def.drop, 1, e.x - 0.4, e.z);
    if (e.kind === 'bigdawg') UI.toast('Big Dawg is down!', 'quest');
    if (e.camp === 'bouncer') { G.flags.bouncerBeaten = true; G.flags.bouncerFighting = false; UI.toast('The Bouncer is out cold. The gate is open!', 'quest'); G.openGate(); }
    if (e.raid && raid) raid.left--;
    if (Math.random() < (0.1 + G.effLUK() * 0.012) * (G.hasPerk('scavenger') ? 2 : 1)) spawnPickup(Math.random() < 0.2 ? 'big_bone' : Math.random() < 0.3 ? 'pizza' : Math.random() < 0.5 ? 'fizzy_pop' : 'dog_treat', 1, e.x + 0.4, e.z + 0.2);
    if (e.camp === 'lane') { G.flags.laneKills = (G.flags.laneKills || 0) + 1; G.flags.flyerX = e.x; G.flags.flyerZ = e.z; }
    if (e.minion && G.boss) G.boss.minions--;
  }

  function updateEnemies(dt) {
    const p = G.p;
    const sneakMul = 1 - G.skill('sneak') / 260;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dp = U.dist(e.x, e.z, p.x, p.z);
      if (dp > 45) continue; // frozen when far away
      e.cd -= dt; e.flash -= dt; e.chargeCd -= dt;
      // knockback
      if (Math.abs(e.vx) + Math.abs(e.vz) > 0.05) { moveEnt(e, e.vx * dt, e.vz * dt, 0.3); e.vx *= Math.pow(0.001, dt); e.vz *= Math.pow(0.001, dt); }
      let mx = 0, mz = 0, speed = e.def.spd;
      if (e.stun > 0) { e.stun -= dt; e.windup = 0; e.chargeT = 0; }
      else if (e.chargeT > 0) {
        e.chargeT -= dt;
        moveEnt(e, e.cdx * 12 * dt, e.cdz * 12 * dt, 0.3);
        if (dp < 1.0 && !e.chargeHit) { e.chargeHit = true; hurtPlayer(e.dmg * 1.3, e.x, e.z); }
      } else if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (e.pendingCharge) {
            e.pendingCharge = false; e.chargeT = 0.45; e.chargeHit = false;
            const l = Math.max(0.01, dp); e.cdx = (p.x - e.x) / l; e.cdz = (p.z - e.z) / l;
          } else if (e.def.ranged) {
            const a = Math.atan2(p.z - e.z, p.x - e.x);
            if (e.def.spread) for (let k = 0; k < e.def.spread; k++) spawnProjectile({ x: e.x, z: e.z, a: a + (k - (e.def.spread - 1) / 2) * 0.28, speed: 8.5, dmg: e.dmg, owner: 'e', life: 1.3, size: 0.22, kind: 'glow', colorStr: e.def.scoop ? U.pick(['#ffd0e0', '#fff4d8', '#8a5a3a']) : k % 2 ? '#ff8ae8' : '#7af8ff' });
            else spawnProjectile({ x: e.x, z: e.z, a, speed: 8, dmg: e.dmg, owner: 'e', life: 1.4, size: 0.25, kind: 'bone' });
            SFX.play('shoot');
          } else if (dp < e.def.range + 0.5) hurtPlayer(e.dmg, e.x, e.z);
        }
      } else {
        const aggroR = (e.aggro ? 14 : 7.5) * sneakMul;
        const leash = e.raid ? 0 : U.dist(e.x, e.z, e.homeX, e.homeZ);
        if (G.mode === 'play' && (dp < aggroR || e.raid) && leash < 22 && G.hp > 0) { e.state = 'chase'; e.aggro = true; }
        else if (e.state === 'chase' && (dp > aggroR * 1.4 || leash > 22)) { e.state = 'return'; e.aggro = false; }
        if (e.state === 'chase') {
          if (e.def.ranged) {
            if (dp < 4) { mx = e.x - p.x; mz = e.z - p.z; }
            else if (dp > 7) { mx = p.x - e.x; mz = p.z - e.z; }
            if (dp < 9 && e.cd <= 0) { e.windup = 0.35; e.cd = e.def.cd; }
          } else {
            if (e.def.charge && e.chargeCd <= 0 && dp > 2.5 && dp < 8) { e.windup = 0.6; e.pendingCharge = true; e.chargeCd = U.rand(4, 6); UI.floatText(e.x, 2.3, e.z, '!', '#ff4040'); }
            else if (dp > e.def.range * 0.8) { mx = p.x - e.x; mz = p.z - e.z; }
            else if (e.cd <= 0) { e.windup = 0.4; e.cd = e.def.cd; }
          }
        } else if (e.state === 'return') {
          mx = e.homeX - e.x; mz = e.homeZ - e.z;
          if (leash < 1) e.state = 'idle';
          e.hp = Math.min(e.maxHp, e.hp + 20 * dt);
        } else {
          e.wanderT -= dt;
          if (e.wanderT <= 0) { e.wanderT = U.rand(2, 5); e.tx = e.homeX + U.rand(-3, 3); e.tz = e.homeZ + U.rand(-3, 3); }
          if (U.dist(e.x, e.z, e.tx, e.tz) > 0.3) { mx = e.tx - e.x; mz = e.tz - e.z; speed *= 0.35; }
        }
      }
      const ml = Math.hypot(mx, mz);
      if (ml > 0.01) {
        mx /= ml; mz /= ml;
        // separation
        for (const o of G.enemies) {
          if (o === e || o.dead) continue;
          const d = U.dist(e.x, e.z, o.x, o.z);
          if (d < 0.7 && d > 0.001) { mx += ((e.x - o.x) / d) * 0.6; mz += ((e.z - o.z) / d) * 0.6; }
        }
        moveEnt(e, mx * speed * dt, mz * speed * dt, 0.3);
        const s = screenDX(mx, mz); if (s > 0.05) e.face = 1; else if (s < -0.05) e.face = -1;
      } else if (e.state === 'chase') { e.face = screenDX(p.x - e.x, p.z - e.z) >= 0 ? 1 : -1; }
      e.animT += dt;
      setFrame(e, e.windup > 0 || e.chargeT > 0 ? 3 : ml > 0.01 ? (Math.floor(e.animT * 6) % 2 ? 1 : 2) : 0);
      const c = e.sprite.material.color;
      if (e.flash > 0) c.setRGB(1, 0.35, 0.35);
      else if (e.stun > 0) c.setRGB(0.6, 0.8, 1.3);
      else if (e.windup > 0) c.setRGB(1.3, 1.1, 0.6);
      else c.setRGB(1, 1, 1);
      placeActor(e, e.chargeT > 0 ? 0.1 : 0);
    }
    G.enemies = G.enemies.filter((e) => !e.dead);
  }

  function hurtPlayer(dmg, sx, sz) {
    const p = G.p;
    if (p.iframes > 0 || G.hp <= 0 || G.mode !== 'play') return;
    let d = dmg * (1 - G.armorDR()) * (G.hasPerk('toughness') ? 0.9 : 1);
    d = Math.max(1, Math.round(d));
    G.hp -= d;
    p.iframes = 0.45; p.lastHurt = G.time;
    const a = Math.atan2(p.z - sz, p.x - sx);
    p.vx += Math.cos(a) * 3; p.vz += Math.sin(a) * 3;
    UI.floatText(p.x, 2, p.z, `-${d}`, '#ff5050');
    UI.shake(0.15); UI.flash('#ff2020');
    SFX.play('hurt');
    if (G.hp <= 0 && G.hasPerk('secondwind') && G.time - (p.swT || -999) > 90) {
      p.swT = G.time; G.hp = 1; p.iframes = 1.5;
      UI.toast('SECOND WIND!', 'level'); UI.flash('#ffe066');
      return;
    }
    if (G.hp <= 0) die();
  }

  function die() {
    G.hp = 0;
    toggleBark(false);
    SFX.play('death');
    G.mode = 'dead';
    UI.death();
  }
  G.respawn = () => {
    const lost = Math.floor(G.bucks * 0.1);
    G.bucks -= lost;
    G.hp = G.maxHp(); G.ap = G.maxAp();
    const round = G.boss ? G.boss.round : 0;
    if (G.race) endRace(false);
    let where = 'the nearest safe spot';
    if (round === 4) { resetBoss(); const q = WORLD.snap(170, 41); G.p.x = q.x; G.p.z = q.z; where = 'Davidson'; }
    else if (round === 1 || round === 3) { resetBoss(); G.p.x = MAP.isleDock.x + 0.5; G.p.z = MAP.isleDock.z; where = 'the island dock'; }
    else if (round === 2) { resetBoss(); G.p.x = MAP.festival.cx; G.p.z = MAP.festival.z0 + 3; where = 'the festival entrance'; }
    else {
      let best = SAFE[0], bd = 1e9;
      for (const sp of SAFE) { const d = U.dist(sp[0], sp[1], G.p.x, G.p.z); if (d < bd) { bd = d; best = sp; } }
      const q = WORLD.snap(best[0], best[1]); G.p.x = q.x; G.p.z = q.z; where = best[2];
    }
    const onIsland = round > 0;
    for (const pr of G.projectiles) scene.remove(pr.sprite);
    G.projectiles = [];
    for (const e of G.enemies) if (e.aggro) { e.aggro = false; e.state = 'return'; }
    G.p.iframes = 2;
    G.mode = 'play';
    void onIsland;
    UI.toast(lost ? `You wake up at ${where}. Lost ${lost} Bucks.` : 'You wake up, a bit sore.', 'warn');
  };

  // game-time timers (pause with the game, unlike setTimeout)
  let timers = [];
  function after(sec, fn) { timers.push({ at: G.time + sec, fn }); }
  function runTimers() {
    if (!timers.length) return;
    const due = timers.filter((t) => t.at <= G.time);
    timers = timers.filter((t) => t.at > G.time);
    for (const t of due) t.fn();
  }
  const SAFE = [[91, 39.2, 'home'], [119, 58, "FlowingFox's Outpost"], [96, 20, 'Mooresville'], [166, 128, 'Birkdale Village'], [168, 30, 'Davidson'], [40, 167, 'Terrell'], [126, 129, 'Cowans Ford Dam'], [80, 106, 'Sherrills Ford'], [26, 60, 'Denver']];

  // ======================= projectiles & effects =======================
  function spawnProjectile(o) {
    let tex;
    if (o.kind === 'bone') tex = itemTex('bone');
    else if (o.kind === 'jar') tex = itemTex('hornet_jar');
    else if (o.kind === 'cushion') tex = itemTex('whoopee');
    else if (o.kind === 'note' || o.kind === 'glow') tex = orbTex(o.colorStr || '#ff4fd8', o.kind === 'glow' ? 6 : 8);
    else tex = orbTex('#' + (o.color || 0xffffff).toString(16).padStart(6, '0'), o.kind === 'blob' ? 12 : 6);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5 }));
    const s = o.kind === 'bone' || o.kind === 'jar' || o.kind === 'cushion' ? 0.6 : o.kind === 'note' ? 0.55 : (o.size || 0.2) * 2.4;
    sp.scale.set(s, s, 1);
    scene.add(sp);
    const p = Object.assign({ vx: Math.cos(o.a) * o.speed, vz: Math.sin(o.a) * o.speed, hit: new Set(), sprite: sp, baseScale: s, age: 0 }, o);
    G.projectiles.push(p);
    return p;
  }

  function explode(pr) {
    const cush = pr.kind === 'cushion';
    SFX.play(cush ? 'squeak' : 'boom');
    ringFx(pr.x, pr.z, pr.aoe, cush ? 0xff8ac8 : 0xffd23a);
    for (let i = 0; i < 16; i++) particle(pr.x, 0.5, pr.z, i % 2 ? (cush ? '#ff8ac8' : '#ffd23a') : (cush ? '#ffffff' : '#222222'), U.rand(-4, 4), U.rand(1, 4), U.rand(-4, 4), 0.7);
    if (cush) UI.floatText(pr.x, 1.8, pr.z, 'PFFFBBBT!', '#ff8ac8', true);
    for (const e of G.enemies) if (!e.dead && U.dist(e.x, e.z, pr.x, pr.z) < pr.aoe) hurtEnemy(e, pr.dmg, pr.crit, 0, 0, pr.stunAoe || 1.0);
    if (G.boss && G.boss.active && U.dist(G.boss.x, G.boss.z, pr.x, pr.z) < pr.aoe) hurtBoss(pr.dmg, pr.crit);
    for (const py of G.pylons) if (!py.dead && U.dist(py.x, py.z, pr.x, pr.z) < pr.aoe + 0.5) hurtPylon(py, pr.dmg, pr.crit);
  }

  function updateProjectiles(dt, slow) {
    const p = G.p;
    for (const pr of G.projectiles) {
      const d = pr.owner === 'p' ? dt : dt * slow;
      pr.age += d;
      pr.x += pr.vx * d; pr.z += pr.vz * d; pr.life -= d;
      if (pr.grow) { pr.size += pr.grow * d; pr.sprite.scale.setScalar(pr.size * 2.4); }
      const lob = pr.kind === 'jar' || pr.kind === 'cushion';
      pr.sprite.position.set(pr.x, 0.7 + (lob ? Math.sin(Math.min(1, pr.age / 0.9) * Math.PI) * 1.2 : 0), pr.z);
      if (pr.kind === 'bone' || lob) pr.sprite.material.rotation = pr.age * 12;
      const t = WORLD.tileAt(pr.x, pr.z);
      if (t !== T.WATER && WORLD.solidAt(pr.x, pr.z) && pr.kind !== 'note' && pr.kind !== 'coin') { if (pr.aoe) explode(pr); pr.life = 0; }
      if (pr.life <= 0) { if (pr.aoe && pr.life > -1 && !pr.exploded) { pr.exploded = true; explode(pr); } continue; }
      const r = pr.size || 0.25;
      if (pr.owner === 'p') {
        for (const e of G.enemies) {
          if (e.dead || pr.hit.has(e)) continue;
          if (U.dist(e.x, e.z, pr.x, pr.z) < r + 0.42 * e.scale) {
            if (pr.aoe) { pr.exploded = true; explode(pr); pr.life = -2; break; }
            hurtEnemy(e, pr.dmg, pr.crit, pr.vx * 0.15, pr.vz * 0.15, 0);
            pr.hit.add(e);
            if (!pr.pierce) { pr.life = -2; break; }
          }
        }
        if (pr.life > 0 && G.boss && G.boss.active && !pr.hit.has('boss') && U.dist(G.boss.x, G.boss.z, pr.x, pr.z) < r + 0.7) {
          if (pr.aoe) { pr.exploded = true; explode(pr); pr.life = -2; }
          else { hurtBoss(pr.dmg, pr.crit); pr.hit.add('boss'); if (!pr.pierce) pr.life = -2; }
        }
        for (const py of G.pylons) {
          if (pr.life <= 0 || py.dead || pr.hit.has(py)) continue;
          if (U.dist(py.x, py.z, pr.x, pr.z) < r + 0.7) {
            if (pr.aoe) { pr.exploded = true; explode(pr); pr.life = -2; break; }
            hurtPylon(py, pr.dmg, pr.crit); pr.hit.add(py); if (!pr.pierce) pr.life = -2;
          }
        }
      } else if (U.dist(p.x, p.z, pr.x, pr.z) < r + 0.32) {
        if (p.iframes <= 0) { hurtPlayer(pr.dmg, pr.x - pr.vx, pr.z - pr.vz); pr.life = -2; }
      }
    }
    G.projectiles = G.projectiles.filter((pr) => { if (pr.life <= 0) { scene.remove(pr.sprite); pr.sprite.material.dispose(); return false; } return true; });
  }

  const partGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const partMats = {};
  function particle(x, y, z, color, vx, vy, vz, life) {
    if (G.effects.length > 260) return;
    if (!partMats[color]) partMats[color] = new THREE.MeshBasicMaterial({ color });
    const m = new THREE.Mesh(partGeo, partMats[color]);
    m.position.set(x, y, z);
    scene.add(m);
    G.effects.push({ m, vx, vy, vz, life, max: life, type: 'p' });
  }
  function swingFx(x, z, a, range, arc, color) {
    const geo = new THREE.RingGeometry(0.35, range, 10, 1, -arc / 2, arc);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -a;
    m.position.set(x, 0.6, z);
    scene.add(m);
    G.effects.push({ m, life: 0.12, max: 0.12, type: 'fade', geo });
  }
  function ringFx(x, z, r, color, life = 0.4) {
    const geo = new THREE.RingGeometry(0.85, 1, 24);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.15, z);
    scene.add(m);
    G.effects.push({ m, life, max: life, type: 'ring', r, geo });
  }
  function markerFx(x, z, r, life) { // telegraphed danger circle
    const geo = new THREE.CircleGeometry(r, 16);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.25, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z);
    scene.add(m);
    G.effects.push({ m, life, max: life, type: 'mark', geo });
    return m;
  }
  function updateEffects(dt) {
    for (const f of G.effects) {
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      if (f.type === 'p') { f.vy -= 9 * dt; f.m.position.x += f.vx * dt; f.m.position.y = Math.max(0.05, f.m.position.y + f.vy * dt); f.m.position.z += f.vz * dt; f.m.scale.setScalar(0.4 + k); }
      else if (f.type === 'fade') f.m.material.opacity = 0.55 * k;
      else if (f.type === 'ring') { const s = f.r * (1 - k * 0.8); f.m.scale.set(s, s, s); f.m.material.opacity = 0.8 * k; }
      else if (f.type === 'mark') f.m.material.opacity = 0.15 + (1 - k) * 0.4;
    }
    G.effects = G.effects.filter((f) => {
      if (f.life <= 0) { scene.remove(f.m); if (f.geo) f.geo.dispose(); if (f.type !== 'p') f.m.material.dispose(); return false; }
      return true;
    });
  }

  // ======================= pickups =======================
  function spawnPickup(item, qty, x, z, pid) {
    const icon = item === 'bucks' ? 'bucks' : DATA.ITEMS[item].icon;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: itemTex(icon), alphaTest: 0.5 }));
    sp.scale.set(0.75, 0.75, 1); sp.center.set(0.5, 0);
    scene.add(sp);
    const pos = pid ? WORLD.snap(x, z) : { x, z };
    const pk = { item, qty, x: pos.x, z: pos.z, sprite: sp, pid, t: Math.random() * 6, quest: item !== 'bucks' && DATA.ITEMS[item].type === 'quest' };
    if (pk.quest) { // sparkle for quest items
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: orbTex('#fff59a', 8), transparent: true, opacity: 0.5, depthWrite: false }));
      glow.scale.set(1.2, 1.2, 1); glow.center.set(0.5, 0.2);
      scene.add(glow); pk.glow = glow;
    }
    G.pickups.push(pk);
    return pk;
  }
  function updatePickups(dt) {
    const p = G.p;
    for (const pk of G.pickups) {
      pk.t += dt;
      pk.sprite.position.set(pk.x, 0.1 + Math.abs(Math.sin(pk.t * 3)) * 0.18, pk.z);
      if (pk.glow) { pk.glow.position.set(pk.x, 0.1, pk.z); pk.glow.material.opacity = 0.3 + Math.sin(pk.t * 4) * 0.2; }
      const d = U.dist(p.x, p.z, pk.x, pk.z);
      if (pk.item === 'bucks' && d < 2.2) { pk.x += (p.x - pk.x) * dt * 8; pk.z += (p.z - pk.z) * dt * 8; }
      if (d < 0.7) {
        pk.taken = true;
        if (pk.item === 'bucks') { G.bucks += pk.qty; SFX.play('coin'); UI.floatText(p.x, 2.1, p.z, `+$${pk.qty}`, '#ffe066'); }
        else { G.give(pk.item, pk.qty); SFX.play('pickup'); }
        if (pk.pid) G.picked[pk.pid] = true;
      }
    }
    G.pickups = G.pickups.filter((pk) => { if (pk.taken) { scene.remove(pk.sprite); if (pk.glow) scene.remove(pk.glow); return false; } return true; });
  }
  const EXTRA_PICKUPS = [
    { id: 'flyer', item: 'flyer', x: 110, z: 40.5, cond: (g) => g.qStage('main') >= 30 && !g.has('flyer') },
  ];
  function syncWorldPickups() {
    for (const def of DATA.PICKUPS.concat(EXTRA_PICKUPS)) {
      if (G.picked[def.id]) continue;
      if (G.pickups.some((pk) => pk.pid === def.id)) continue;
      if (!def.cond(G)) continue;
      let x = def.x, z = def.z;
      if (def.id === 'flyer' && G.flags.flyerX) { x = G.flags.flyerX; z = G.flags.flyerZ; }
      spawnPickup(def.item, 1, x, z, def.id);
    }
  }

  // ======================= pylons =======================
  function buildZapper(def) {
    const g = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a34, flatShading: true });
    const blue = new THREE.MeshBasicMaterial({ color: 0x5ab8ff });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), dark); base.position.y = 0.1; g.add(base);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), dark); pole.position.y = 0.8; g.add(pole);
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), new THREE.MeshBasicMaterial({ color: 0x9ad8ff, wireframe: true })); cage.position.y = 1.9; g.add(cage);
    const orb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), blue); orb.position.y = 1.9; g.add(orb);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), dark); ring.position.y = 2.4; g.add(ring);
    g.position.set(def.x, 0, def.z);
    scene.add(g);
    return { g, orb, ring, hpMax: 120 };
  }
  function buildPylons() {
    for (const def of DATA.ZAPPERS) {
      const m = buildZapper(def);
      const zp = { def, id: def.id, kind: 'zapper', x: def.x, z: def.z, g: m.g, orb: m.orb, ring: m.ring, hpMax: m.hpMax, hp: G.pylonHp[def.id] !== undefined ? G.pylonHp[def.id] : m.hpMax, dead: false, flash: 0 };
      if (zp.hp <= 0) breakPylon(zp, true);
      G.pylons.push(zp);
      WORLD.map.solid[Math.floor(def.z) * WORLD.map.W + Math.floor(def.x)] = 1;
    }
    for (const def of DATA.PYLONS) {
      const g = new THREE.Group();
      const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a22, flatShading: true });
      const pink = new THREE.MeshBasicMaterial({ color: 0xff4fd8 });
      const cyan = new THREE.MeshBasicMaterial({ color: 0x7af8ff });
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), dark); base.position.y = 0.2; g.add(base);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), dark); tower.position.y = 2; g.add(tower);
      for (let i = 0; i < 3; i++) {
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10), i % 2 ? cyan : pink);
        c1.rotation.x = Math.PI / 2; c1.position.set(0, 1 + i * 0.9, 0.42); g.add(c1);
        const c2 = c1.clone(); c2.rotation.set(0, 0, Math.PI / 2); c2.position.set(0.42, 1 + i * 0.9, 0); g.add(c2);
      }
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), pink); orb.position.y = 4; g.add(orb);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 4, 16), cyan); ring.rotation.x = Math.PI / 2; ring.position.y = 3.6; g.add(ring);
      g.position.set(def.x, 0, def.z);
      scene.add(g);
      const hpMax = 220;
      const py = { def, id: def.id, kind: 'pylon', x: def.x, z: def.z, g, orb, ring, hpMax, hp: G.pylonHp[def.id] !== undefined ? G.pylonHp[def.id] : hpMax, dead: false, flash: 0 };
      if (py.hp <= 0) breakPylon(py, true);
      G.pylons.push(py);
      WORLD.map.solid[Math.floor(def.z) * WORLD.map.W + Math.floor(def.x)] = 1;
    }
  }
  function hurtPylon(py, dmg, crit) {
    if (py.dead) return;
    const d = Math.round(dmg * (1 + G.skill('tech') / 200));
    py.hp -= d; py.flash = 0.1;
    G.pylonHp[py.id] = py.hp;
    UI.floatText(py.x, 3, py.z, crit ? `${d}!` : `${d}`, crit ? '#ffe066' : '#ff9af0', crit);
    SFX.play('hit');
    for (let i = 0; i < 4; i++) particle(py.x, 1.5, py.z, i % 2 ? '#ff4fd8' : '#7af8ff', U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2), 0.4);
    if (py.hp <= 0) breakPylon(py);
  }
  function breakPylon(py, silent) {
    py.dead = true; py.hp = 0; G.pylonHp[py.id] = 0;
    py.orb.visible = false; py.ring.visible = false;
    py.g.children[1].rotation.z = 0.5; py.g.children[1].position.set(0.6, 1.4, 0);
    py.g.traverse((m) => { if (m.material && m.material.color) m.material = new THREE.MeshLambertMaterial({ color: 0x2a2a2a, flatShading: true }); });
    if (silent) return;
    SFX.play('boom'); UI.shake(0.4);
    for (let i = 0; i < 30; i++) particle(py.x, 2, py.z, U.pick(['#ff4fd8', '#7af8ff', '#ffe066', '#333333']), U.rand(-5, 5), U.rand(2, 6), U.rand(-5, 5), 1);
    if (py.kind === 'zapper') {
      G.xp(70);
      UI.toast(`Bug Zapper smashed! (${G.zappersDown()}/3) The moths are free!`, 'quest');
      for (let i = 0; i < 10; i++) particle(py.x, 1.8, py.z, '#fff59a', U.rand(-2, 2), U.rand(3, 6), U.rand(-2, 2), 1.5);
      checkQuests(); autosave();
      return;
    }
    G.xp(150);
    UI.toast(`${py.def.name} destroyed! (${G.pylonsDown()}/3)`, 'quest');
    if (G.pylonsDown() >= 3) UI.toast("Shive's barrier is collapsing!", 'level');
    checkQuests(); autosave();
  }
  function updatePylons(dt) {
    for (const py of G.pylons) {
      if (py.dead) continue;
      if (py.kind === 'zapper') {
        py.orb.material.color.setHSL(0.58, 1, 0.55 + Math.sin(G.time * 20) * 0.2);
        if (Math.random() < dt * 2 && U.dist(py.x, py.z, G.p.x, G.p.z) < 14) particle(py.x, 1.9, py.z, '#bfe8ff', U.rand(-1, 1), U.rand(0.5, 2), U.rand(-1, 1), 0.3);
        continue;
      }
      py.orb.rotation.y += dt * 2; py.orb.position.y = 4 + Math.sin(G.time * 3) * 0.15;
      py.ring.scale.setScalar(1 + Math.sin(G.time * 8) * 0.12);
      // thumping bass pulse
      if (Math.floor(G.time * 2) !== Math.floor((G.time - dt) * 2) && U.dist(py.x, py.z, G.p.x, G.p.z) < 14) ringFx(py.x, py.z, 3, 0xff4fd8, 0.5);
    }
  }

  // ======================= NPCs =======================
  function buildNpcs() {
    for (const def of DATA.NPCS) {
      const pos = WORLD.snap(def.x, def.z);
      const a = makeActor(charTex('npc_' + def.id, DATA.LOOKS[def.look]), def.id === 'shive' ? 1.35 : def.scale || 1);
      Object.assign(a, { id: def.id, name: def.name, def, x: pos.x, z: pos.z });
      a.face = -1; setFrame(a, 0);
      const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex(), alphaTest: 0.5, depthTest: false }));
      mk.scale.set(0.3, 0.6, 1); mk.center.set(0.5, 0); mk.renderOrder = 998;
      scene.add(mk); a.mark = mk;
      placeActor(a);
      G.npcs[def.id] = a;
    }
  }
  const SECOND = { vea: ['vea', 'vea2'], fox: ['fox', 'fox2'], jack: ['jack', 'jack2'], eski: ['eski', 'eski2'], squid: ['squid', 'squid2'], rack: ['rack', 'rack2'], sinder: ['sinder', 'sinder2'], rivergrain: ['river', 'river2'] };
  function npcWants(id) {
    if (id === 'shive') return (G.qStage('main') === 80 || G.qStage('main') === 89) && !G.flags.shiveDefeated;
    if (id === 'robyboss') return G.qStage('main') === 92 && !G.flags.robyDefeated;
    if (id === 'rump' && G.qStage('main') === 100 && G.flags.robyEnd && !G.flags.joeEnd) return true;
    if (id === 'joe') return G.qStage('main') === 95 && !G.flags.joeDefeated;
    if (id === 'squid' && (G.qStage('main') === 91 || G.qStage('main') === 92) && !G.flags.squidWorried) return true;
    if (SECOND[id] && G.qStage(SECOND[id][0]) === 100 && G.qStage(SECOND[id][1]) === 0) return true;
    if (id === 'roby' && G.qStage('main') >= 60 && G.qStage('roby2') === 0) return true;
    if (G.qStage('eski2') === 10 && G.has('mixtape') && ['rack', 'squid', 'rivergrain', 'jack'].includes(id) && !G.flags['tape_' + id]) return true;
    const meet = { vea: null, rack: 'metRack', roby: 'metRoby', squid: 'metSquid', sinder: 'metSinder', jack: 'metJack', eski: 'metEski', rivergrain: 'metRiver', fox: null };
    if (meet[id] && !G.flags[meet[id]]) return true;
    for (const qid in DATA.QUESTS) {
      const st = G.qStage(qid);
      const stage = DATA.QUESTS[qid].stages[st];
      if (stage && stage.target === 'npc:' + id && !(qid === 'main' && st === 0 && id !== 'vea')) return true;
    }
    if (G.qStage('roby') === 10) { const sig = { rack: 'rack', squid: 'squid', sinder: 'sinder', rivergrain: 'river' }[id]; if (sig && !G.flags['sig_' + sig]) return true; }
    if (id === 'fox' && G.qStage('main') >= 40 && G.qStage('fox') === 0) return true;
    return false;
  }
  function updateNpcs(dt) {
    const p = G.p;
    for (const id in G.npcs) {
      const n = G.npcs[id];
      let vis = true;
      if (id === 'shive') {
        const s = G.qStage('main');
        const atIsland = s >= 70 && s <= 80 && !G.flags.shiveRound1;
        const atFest = s >= 88 && s < 90 && !G.flags.shiveGone;
        vis = (atIsland || atFest) && !(G.boss && G.boss.active);
        const spot = atFest ? MAP.festival.shive : { x: 68, z: 70 };
        const key = atFest ? 'fest' : 'isle';
        if (n.spotKey !== key && !G.boss && !G.flags.shiveDefeated) { n.spotKey = key; const q = WORLD.snap(spot.x, spot.z); n.x = q.x; n.z = q.z; placeActor(n); }
      }
      if (id === 'bouncer') vis = !G.flags.bouncerBeaten && !G.flags.bouncerFighting;
      if (id === 'roby') vis = !(G.flags.robyTurned && !G.flags.robyEnd);
      if (id === 'joe') {
        const st = G.qStage('main');
        const friends = G.flags.joeEnd === 'friends';
        vis = (st === 95 && !(G.boss && G.boss.active) && !G.flags.joeEnd) || friends;
        const key = friends ? 'hall' : 'quad';
        if (vis && n.spotKey !== key && !(st === 95 && G.flags.joeDefeated && !friends)) {
          n.spotKey = key; const q = friends ? WORLD.snap(126.5, 27.5) : WORLD.snap(177, 54.5); n.x = q.x; n.z = q.z; placeActor(n);
        }
      }
      if (id === 'robyboss') {
        vis = G.qStage('main') === 92 && !G.flags.robyEnd && !(G.boss && G.boss.active);
        if (vis && !G.flags.robyDefeated && n.spotKey !== 'isle') { n.spotKey = 'isle'; const q = WORLD.snap(68, 70); n.x = q.x; n.z = q.z; placeActor(n); }
      }
      n.sprite.visible = n.shadow.visible = vis;
      n.mark.visible = vis && npcWants(id);
      n.mark.position.set(n.x, (id === 'shive' ? 2.5 : 1.85) + Math.sin(G.time * 4) * 0.08, n.z);
      if (!vis) continue;
      const d = U.dist(n.x, n.z, p.x, p.z);
      if (d < 5) { const f = screenDX(p.x - n.x, p.z - n.z) >= 0 ? 1 : -1; if (f !== n.face) { n.face = f; } }
      n.animT += dt;
      setFrame(n, d < 5 && Math.floor(n.animT * 1.5) % 4 === 0 ? 1 : 0);
    }
  }

  // ======================= interaction =======================
  let interactTarget = null;
  function findInteract() {
    const p = G.p;
    let best = null, bd = 1.9;
    for (const id in G.npcs) {
      const n = G.npcs[id];
      if (!n.sprite.visible) continue;
      const d = U.dist(n.x, n.z, p.x, p.z);
      if (d < bd) { bd = d; best = { type: 'npc', id, label: `Talk to ${n.name}` }; }
    }
    if (!best) {
      for (const py of G.pylons) if (!py.dead && py.kind === 'pylon' && U.dist(py.x, py.z, p.x, p.z) < 2.3) best = { type: 'pylon', py, label: G.skill('tech') >= 40 ? `Hack ${py.def.name} [Tech ${G.skill('tech')}/40]` : `Hack pylon [Tech ${G.skill('tech')}/40]: smash it instead!` };
      const pier = MAP.pier, dock = MAP.isleDock;
      if (U.dist(p.x, p.z, pier.x + 0.5, pier.z + 1) < 2.4) best = { type: 'pier', label: G.has('hydro_scooter') ? "Ride the Hydro-Scooter to Shive's Island" : 'The island is too far to swim...' };
      if (U.dist(p.x, p.z, dock.x + 1, dock.z + 0.5) < 2.4 && !(G.boss && G.boss.active)) best = { type: 'dock', label: 'Ride the Hydro-Scooter back to the pier' };
      for (const sp of spots) {
        if (best && (best.type === 'pier' || best.type === 'dock')) break; // the scooter ride always wins
        if (U.dist(p.x, p.z, sp.x, sp.z) > 2.2) continue;
        if (sp.kind === 'fish') best = { type: 'fish', sp, label: G.qStage('rack2') === 10 && !G.has('catfish') ? 'Fish for the Legendary Catfish' : 'Go fishing' };
        if (sp.kind === 'tower' && G.qStage('fox2') === 10 && !G.flags['cam_' + sp.id]) best = { type: 'tower', sp, label: 'Plant a spy cam' };
      }
    }
    interactTarget = best;
    UI.prompt(best ? `[E] ${best.label}` : null);
  }
  function interact() {
    const t = interactTarget;
    if (!t) return;
    if (t.type === 'npc') UI.openDialogue(t.id);
    else if (t.type === 'pylon') {
      if (G.skill('tech') >= 40) {
        UI.toast('You reroute the bass into a lo-fi study playlist. The pylon powers down.', 'quest');
        SFX.play('zap'); G.xp(40);
        breakPylon(t.py);
      } else UI.toast('Need Tech 40 to hack it. Bonk it to bits instead!', 'warn');
    } else if (t.type === 'pier') {
      if (!G.has('hydro_scooter')) { UI.toast("You'd need a boat... or something that floats. Jack Valentine might be able to build one.", 'warn'); return; }
      if (G.pylonsDown() < 3) { UI.toast(`Shive's barrier blocks the way! Destroy the Bass Pylons first (${G.pylonsDown()}/3).`, 'warn'); return; }
      UI.fade(() => {
        G.p.x = MAP.isleDock.x + 0.5; G.p.z = MAP.isleDock.z + 0.2;
        if (G.qStage('main') === 70) G.qSet('main', 80);
        if (G.qStage('main') === 91) G.qSet('main', 92);
        UI.toast("You zoom across the lake to Shive's Island!", 'quest');
      });
    } else if (t.type === 'dock') {
      UI.fade(() => { G.p.x = MAP.pier.x + 3; G.p.z = MAP.pier.z + 0.7; });
    } else if (t.type === 'fish') goFish();
    else if (t.type === 'tower') {
      G.flags['cam_' + t.sp.id] = true;
      SFX.play('zap'); G.xp(40);
      UI.toast(`Spy cam planted! (${['tower1', 'tower2', 'tower3'].filter((k) => G.flags['cam_' + k]).length}/3)`, 'quest');
      checkQuests();
    }
  }

  // ======================= spots: fishing & watchtowers =======================
  const spots = [];
  function buildSpots() {
    const W = MAP.W;
    const nearShore = (x, z) => {
      let best = null, bd = 1e9;
      for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
        const tx = Math.floor(x) + dx, tz = Math.floor(z) + dz;
        if (tx < 1 || tz < 1 || tx >= W - 1 || tz >= W - 1 || MAP.solid[tz * W + tx]) continue;
        const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => MAP.tiles[(tz + b) * W + tx + a] === T.WATER);
        if (!wet) continue;
        const d = Math.hypot(dx, dz);
        if (d < bd) { bd = d; best = { x: tx + 0.5, z: tz + 0.5 }; }
      }
      return best || { x, z };
    };
    for (const def of DATA.SPOTS) {
      let pos;
      if (def.at === 'pier') pos = { x: MAP.pier.x + 0.5, z: MAP.pier.z + 1 };
      else if (def.kind === 'fish') pos = nearShore(def.x, def.z);
      else pos = WORLD.snap(def.x, def.z);
      const sp = { id: def.id, kind: def.kind, x: pos.x, z: pos.z };
      if (def.kind === 'fish') {
        const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: itemTex('catfish'), alphaTest: 0.5 }));
        icon.scale.set(0.55, 0.55, 1); icon.center.set(0.5, 0);
        scene.add(icon); sp.icon = icon;
      }
      spots.push(sp);
    }
  }
  let fishCd = 0;
  function goFish() {
    if (G.time < fishCd) { UI.toast('Patience... the fish are thinking.', 'warn'); return; }
    fishCd = G.time + 2.2;
    SFX.play('ui');
    const p = G.p;
    const questing = G.qStage('rack2') === 10 && !G.has('catfish');
    const chance = 0.18 + G.effLUK() * 0.045;
    if (Math.random() < chance) {
      if (questing) {
        UI.floatText(p.x, 2.4, p.z, 'THE LEGENDARY CATFISH!!', '#ffe066', true);
        G.give('catfish', 1); G.xp(60); SFX.play('level');
      } else {
        const b = U.randi(4, 12); G.bucks += b;
        UI.floatText(p.x, 2.2, p.z, `Caught a bass! (+$${b})`, '#7af8ff'); SFX.play('coin');
      }
    } else {
      UI.floatText(p.x, 2.2, p.z, U.pick(['An old boot.', 'Seaweed.', "A goon's sock. Gross.", 'A tiny fish. You let it go.', 'Nothing. The fish are laughing.', 'A Roblox gift card (expired).']), '#cccccc');
    }
  }

  // ======================= Jack's scooter rally =======================
  let raceRings = [];
  G.race = null;
  G.startRace = () => {
    if (G.race) return;
    UI.fade(() => {
      const st = DATA.RACE.cps[0];
      G.p.x = st[0]; G.p.z = st[1] - 1.5;
      G.race = { cp: 1, t: DATA.RACE.time };
      for (const [x, z] of DATA.RACE.cps) {
        const m = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 20), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z);
        scene.add(m); raceRings.push(m);
      }
      raceRings[0].visible = false;
      UI.toast(`RACE! Hit all the checkpoints in ${DATA.RACE.time} seconds! (You're on Jack's scooter: +60% speed)`, 'level');
      SFX.play('quest');
    });
  };
  function endRace(won) {
    for (const m of raceRings) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    raceRings = [];
    G.race = null;
    UI.raceTimer(null);
    if (won) { SFX.play('level'); UI.toast('RALLY COMPLETE! New record!', 'level'); if (G.qStage('jack2') === 10) G.qSet('jack2', 20); }
    else UI.toast('Out of time! Talk to Jack to try again.', 'warn');
  }
  function updateRace(dt) {
    const r = G.race;
    if (!r) return;
    r.t -= dt;
    UI.raceTimer(r.t, r.cp, DATA.RACE.cps.length);
    raceRings.forEach((m, i) => { m.visible = i >= r.cp; m.material.color.setHex(i === r.cp ? 0xffe066 : 0x666666); if (i === r.cp) m.rotation.z = G.time * 2; });
    const [cx, cz] = DATA.RACE.cps[r.cp];
    if (U.dist(G.p.x, G.p.z, cx, cz) < 2.3) {
      r.cp++;
      SFX.play('coin');
      if (r.cp >= DATA.RACE.cps.length) { endRace(true); return; }
    }
    if (r.t <= 0) endRace(false);
  }

  // ======================= Aldersprings raid (main stage 87) =======================
  let raid = null;
  function updateRaid(dt) {
    if (G.qStage('main') !== 87) { raid = null; return; }
    const p = G.p, cx = 108, cz = 40.5;
    if (!raid) {
      if (U.dist(p.x, p.z, cx, cz) > 22) return;
      raid = { wave: 0, left: 0, wait: 1.5 };
      UI.toast("SHIVE'S GOONS ARE RAIDING ALDERSPRINGS LANE! Hold the line!", 'level');
      SFX.play('bark');
    }
    if (raid.left > 0) return;
    raid.wait -= dt;
    if (raid.wait > 0) return;
    if (raid.wave >= DATA.RAID.length) {
      raid = null;
      G.xp(300);
      UI.toast('The raid is over! Aldersprings Lane is safe!', 'level');
      G.qSet('main', 88);
      return;
    }
    const list = DATA.RAID[raid.wave];
    raid.wave++;
    raid.left = list.length;
    raid.wait = 2.5;
    UI.toast(`WAVE ${raid.wave}/${DATA.RAID.length}`, 'level');
    list.forEach((k, i) => {
      const side = i % 2 ? 128 : 88;
      const e = spawnEnemy(k, side + U.rand(-1.5, 1.5), cz + U.rand(-1, 1), 3, 'raid');
      e.raid = true; e.aggro = true; e.state = 'chase'; e.homeX = cx; e.homeZ = cz;
    });
  }

  // ======================= festival gate / bouncer =======================
  G.openGate = () => {
    G.flags.gateOpen = true;
    WORLD.openGate();
    if (G.qStage('main') === 88) G.qSet('main', 89);
    SFX.play('quest');
  };
  G.bouncerFight = () => {
    const n = G.npcs.bouncer;
    G.flags.bouncerFighting = true;
    const e = spawnEnemy('rottweiler', n.x, n.z - 1, 4, 'bouncer');
    e.aggro = true; e.state = 'chase';
    UI.toast('The Bouncer wants to fight!', 'warn');
  };

  // ======================= fast travel =======================
  const TRAVEL_FIX = { mil: [100, 170], river: [132, 137], festival: [170, 155], island: null, i77: [151, 70], pier: [86, 60] };
  G.canTravel = (id) => {
    if (!G.discovered[id]) return 'You have not discovered that place yet.';
    if (G.boss && G.boss.active) return "Can't fast travel during a boss fight!";
    if (G.race) return "Can't fast travel during a race!";
    if (raid) return "Can't fast travel during the raid!";
    if (TRAVEL_FIX[id] === null) return 'You need the Hydro-Scooter to get there.';
    if (U.dist(G.p.x, G.p.z, MAP.ISLE.x, MAP.ISLE.z) < 12) return 'Use the Hydro-Scooter to leave the island.';
    if (G.enemies.some((e) => !e.dead && e.aggro && U.dist(e.x, e.z, G.p.x, G.p.z) < 14)) return "Can't fast travel with goons chasing you!";
    return null;
  };
  G.fastTravel = (id) => {
    const why = G.canTravel(id);
    if (why) { UI.toast(why, 'warn'); return false; }
    const L = MAP.LOCS.find((l) => l.id === id);
    const fx = TRAVEL_FIX[id] || [L.x, L.z];
    const q = WORLD.snap(fx[0], fx[1]);
    UI.fade(() => { G.p.x = q.x; G.p.z = q.z; UI.toast(`Travelled to ${L.name}.`, 'item'); });
    return true;
  };

  // ======================= camps =======================
  function initCamps() {
    for (const c of DATA.CAMPS) G.camps[c.id] = { def: c, spawned: false, members: [], clearedAt: null };
  }
  function updateCamps() {
    const p = G.p;
    for (const id in G.camps) {
      const c = G.camps[id], def = c.def;
      if (G.campsCleared[id]) continue;
      if (c.spawned) {
        c.members = c.members.filter((e) => !e.dead);
        if (!c.members.length) {
          c.spawned = false; c.clearedAt = G.time;
          onCampCleared(id);
          if (!def.respawn) G.campsCleared[id] = true;
        }
        continue;
      }
      if (def.when && !def.when(G)) continue;
      const far = U.dist(p.x, p.z, def.x, def.z) > 26;
      if (c.clearedAt !== null && !c.force && (!def.respawn || G.time - c.clearedAt < def.respawn || !far)) continue;
      c.spawned = true; c.force = false;
      if (id === 'lane') G.flags.laneKills = 0;
      c.members = def.members.map((k, i) => {
        const a = (i / def.members.length) * Math.PI * 2;
        return spawnEnemy(k, def.x + Math.cos(a) * def.r * 0.6, def.z + Math.sin(a) * def.r * 0.6, def.lvl, id);
      });
    }
  }
  // make a respawning camp come back right away (used when a quest needs it)
  G.forceCamp = (id) => { const c = G.camps[id]; if (c && !c.spawned && !G.campsCleared[id] && c.clearedAt !== null) c.force = true; };
  function onCampCleared(id) {
    if (id === 'lane' && G.qStage('main') === 20) { G.qSet('main', 30); UI.toast('One of the goons dropped something...', 'quest'); }
    if (id === 'doghouse' && G.qStage('fox') === 10) G.qSet('fox', 20);
    if (id === 'hecklers' && G.qStage('river') === 10) G.qSet('river', 20);
    if (id.startsWith('pylon')) UI.toast('The Goon Alpha is down! Now smash that pylon!', 'quest');
    if (id === 'ramsey' && G.qStage('vea2') === 10) G.qSet('vea2', 20);
    if (id === 'bluearmy' && G.qStage('main') === 94) { G.qSet('main', 95); UI.toast('The Blue Army is routed! Sleepy Joe is on the quad...', 'quest'); }
  }

  // ======================= quest checks =======================
  function checkQuests() {
    if (G.qStage('main') === 60 && G.pylonsDown() >= 3 && G.has('hydro_scooter')) G.qSet('main', 70);
    if (G.qStage('jack') === 10 && G.count('volt_cell') >= 3) G.qSet('jack', 20);
    if (G.qStage('eski') === 10 && G.has('speaker')) G.qSet('eski', 20);
    if (G.qStage('squid') === 10 && G.count('rare_bug') >= 5) G.qSet('squid', 20);
    if (G.qStage('rack') === 10 && G.has('perfect_rock')) G.qSet('rack', 20);
    if (G.qStage('sinder') === 10 && G.count('glowcap') >= 3) G.qSet('sinder', 20);
    if (G.qStage('vea') === 10 && G.count('wildflower') >= 4) G.qSet('vea', 20);
    if (G.qStage('roby') === 10 && G.sigs() >= 4) G.qSet('roby', 20);
    if (G.qStage('main') === 84 && G.count('merch_box') >= 4) G.qSet('main', 85);
    if (G.qStage('squid2') === 10 && G.zappersDown() >= 3) G.qSet('squid2', 20);
    if (G.qStage('sinder2') === 10 && G.count('spirit_candle') >= 3) G.qSet('sinder2', 20);
    if (G.qStage('rack2') === 10 && G.has('catfish')) G.qSet('rack2', 20);
    if (G.qStage('eski2') === 10 && ['rack', 'squid', 'rivergrain', 'jack'].every((n) => G.flags['tape_' + n])) G.qSet('eski2', 20);
    if (G.qStage('fox2') === 10 && ['tower1', 'tower2', 'tower3'].every((t) => G.flags['cam_' + t])) G.qSet('fox2', 20);
    if (G.qStage('main') === 60 && G.pylonsDown() >= 3 && !G.has('hydro_scooter') && !G.flags.needScooterHint) { G.flags.needScooterHint = true; UI.toast("Barrier's down! Now you need a way across the water. Talk to Jack Valentine.", 'quest'); }
  }
  G.checkQuests = checkQuests;
  function onMainStage(s) {
    if (s === 60 && G.qStage('jack') === 0) UI.toast('Tip: Jack Valentine at Volt Valentine Scooters (Mooresville) might help you cross the lake.', 'quest');
    if (s === 80) SFX.startMusic('world');
    if (s === 83) UI.toast('Tip: Birkdale Village is south-east, past I-77. Open the map (M) and look for Huntersville.', 'quest');
    if (s === 87) UI.toast('Get back to Aldersprings Lane! The goons are coming!', 'warn');
  }

  // quest target position resolver (for markers)
  G.questTarget = (qid) => {
    const st = G.qStage(qid);
    const q = DATA.QUESTS[qid];
    if (!q) return null;
    const stage = q.stages[st];
    if (!stage || stage.done) return null;
    let t = stage.target;
    if (!t) return null;
    if (Array.isArray(t)) return { x: t[0], z: t[1] };
    if (t.startsWith('npc:')) { const n = G.npcs[t.slice(4)]; return n ? { x: n.x, z: n.z } : null; }
    if (t === 'pier') return { x: MAP.pier.x + 0.5, z: MAP.pier.z + 1 };
    if (t === 'pylon') {
      if (G.pylonsDown() >= 3 && !G.has('hydro_scooter')) return { x: G.npcs.jack.x, z: G.npcs.jack.z };
      let best = null, bd = 1e9;
      for (const py of G.pylons) if (!py.dead) { const d = U.dist(py.x, py.z, G.p.x, G.p.z); if (d < bd) { bd = d; best = { x: py.x, z: py.z }; } }
      return best;
    }
    if (t === 'sigs') {
      let best = null, bd = 1e9;
      for (const [nid, sig] of [['rack', 'rack'], ['squid', 'squid'], ['sinder', 'sinder'], ['rivergrain', 'river']]) {
        if (G.flags['sig_' + sig]) continue;
        const n = G.npcs[nid]; const d = U.dist(n.x, n.z, G.p.x, G.p.z);
        if (d < bd) { bd = d; best = { x: n.x, z: n.z }; }
      }
      return best;
    }
    if (t === 'race') {
      if (G.race) { const c = DATA.RACE.cps[G.race.cp]; return { x: c[0], z: c[1] }; }
      return { x: G.npcs.jack.x, z: G.npcs.jack.z };
    }
    const nearest = (list) => { let best = null, bd = 1e9; for (const o of list) { const d = U.dist(o.x, o.z, G.p.x, G.p.z); if (d < bd) { bd = d; best = { x: o.x, z: o.z }; } } return best; };
    if (t === 'tapes') return nearest(['rack', 'squid', 'rivergrain', 'jack'].filter((n) => !G.flags['tape_' + n]).map((n) => G.npcs[n]));
    if (t === 'zapper') return nearest(G.pylons.filter((py) => py.kind === 'zapper' && !py.dead));
    if (t === 'spot:fish') return nearest(spots.filter((sp) => sp.kind === 'fish'));
    if (t === 'spot:tower') return nearest(spots.filter((sp) => sp.kind === 'tower' && !G.flags['cam_' + sp.id]));
    if (t.startsWith('item:')) {
      const it = t.slice(5);
      let best = null, bd = 1e9;
      for (const pk of G.pickups) if (pk.item === it) { const d = U.dist(pk.x, pk.z, G.p.x, G.p.z); if (d < bd) { bd = d; best = { x: pk.x, z: pk.z }; } }
      return best;
    }
    return null;
  };

  // ======================= discovery =======================
  let curLoc = '';
  function updateDiscovery() {
    const p = G.p;
    let here = 'The Wilds of Lake Norman';
    let bestR = 1e9;
    for (const L of MAP.LOCS) {
      const d = U.dist(p.x, p.z, L.x, L.z);
      if (d < L.r) {
        if (L.r < bestR) { bestR = L.r; here = L.name; }
        if (!G.discovered[L.id]) {
          G.discovered[L.id] = true;
          UI.discover(L.name);
          G.xp(20);
          autosave();
        }
      }
    }
    if (here !== curLoc) { curLoc = here; UI.setLocation(here); }
  }

  // ======================= boss: SHIVE =======================
  G.bossStart = (where, who = 'shive') => {
    const roby = who === 'roby', joe = who === 'joe';
    const n = roby ? G.npcs.robyboss : joe ? G.npcs.joe : G.npcs.shive;
    const fest = where === 'festival';
    const hp = joe ? (G.flags.joeRattled ? 1300 : 1500) : roby ? (G.flags.robyRattled ? 1450 : 1700) : fest ? (G.flags.shiveRattled2 ? 1250 : 1450) : (G.flags.shiveRattled ? 650 : 750);
    const arena = joe ? { x: 177, z: 54.5, r: 3, tr: 4 } : fest ? { x: MAP.festival.cx, z: MAP.festival.cz, r: 6, tr: 7 } : { x: MAP.ISLE.x, z: MAP.ISLE.z + 1, r: 3, tr: 5 };
    const a = makeActor(joe ? charTex('npc_joe', DATA.LOOKS.joe) : roby ? charTex('npc_robyboss', DATA.LOOKS.roby_boss) : charTex('npc_shive', DATA.LOOKS.shive), 1.35);
    Object.assign(a, { who, round: joe ? 4 : roby ? 3 : fest ? 2 : 1, arena, x: n.x, z: n.z, hp, maxHp: hp, active: true, shieldT: 0, stun: 0, atk: null, atkT: 2.0, tired: 0, minions: 0, flash: 0, mvT: 0, tx: n.x, tz: n.z });
    // shield bubble
    const sh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: joe ? 0x3a6aff : roby ? 0x5a8aff : 0xff4fd8, transparent: true, opacity: 0.3, depthWrite: false }));
    scene.add(sh); a.bubble = sh;
    G.boss = a;
    SFX.startMusic('boss');
    UI.bossBar(true);
  };
  function resetBoss() {
    const b = G.boss;
    if (!b) return;
    removeActor(b); scene.remove(b.bubble);
    for (const e of G.enemies) if (e.minion) { e.dead = true; removeActor(e); }
    G.enemies = G.enemies.filter((e) => !e.dead);
    G.boss = null;
    UI.bossBar(false);
    SFX.startMusic('world');
  }
  function hurtBoss(dmg, crit) {
    const b = G.boss;
    if (!b || !b.active) return;
    const shielded = b.shieldT <= 0 && b.tired <= 0;
    let d = dmg * (G.hasPerk('hater') && b.who === 'shive' ? 1.3 : 1) * (shielded ? 0.15 : 1);
    d = Math.max(1, Math.round(d));
    b.hp -= d; b.flash = 0.1;
    UI.floatText(b.x, 2.6, b.z, shielded ? `${d} (shield)` : crit ? `${d}!` : `${d}`, shielded ? '#ff9af0' : crit ? '#ffe066' : '#ffffff', crit);
    SFX.play(crit ? 'crit' : 'hit');
    if (b.hp <= 0) bossDefeated();
  }
  function bossShoot(a, speed, color) {
    spawnProjectile({ x: G.boss.x, z: G.boss.z, a, speed, dmg: 11, owner: 'e', life: 3, size: 0.28, kind: 'note', colorStr: color });
  }
  function updateBoss(dt) {
    const b = G.boss;
    if (!b || !b.active) return;
    const p = G.p;
    b.flash -= dt; b.shieldT -= dt; b.tired -= dt;
    const phase2 = b.hp < b.maxHp * 0.5;
    if (b.dashT > 0) {
      b.dashT -= dt;
      moveEnt(b, b.ddx * 11 * dt, b.ddz * 11 * dt, 0.4);
      if (!b.dashHit && U.dist(p.x, p.z, b.x, b.z) < 1.1) { b.dashHit = true; hurtPlayer(18, b.x, b.z); }
    }
    if (b.stun > 0) b.stun -= dt;
    else {
      b.atkT -= dt;
      // drift around the arena
      b.mvT -= dt;
      if (b.mvT <= 0) { b.mvT = U.rand(1.5, 3); const a = Math.random() * Math.PI * 2; b.tx = b.arena.x + Math.cos(a) * b.arena.r; b.tz = b.arena.z + Math.sin(a) * b.arena.r; }
      const dx = b.tx - b.x, dz = b.tz - b.z, dl = Math.hypot(dx, dz);
      if (dl > 0.2 && b.tired <= 0) moveEnt(b, (dx / dl) * 2.2 * dt, (dz / dl) * 2.2 * dt, 0.4);
      if (b.atkT <= 0 && b.tired <= 0) {
        let opts;
        if (b.who === 'joe') {
          opts = ['scoops', 'scoops', 'sprinkles', 'charge', 'nap', 'freeze'];
          if (b.minions < 3) opts.push('summon');
          if (phase2) opts.push('charge', 'freeze', 'scoops', 'sprinkles');
        } else if (b.who === 'roby') {
          opts = ['downvote', 'downvote', 'wall', 'ratio', 'iq', 'teleport'];
          if (b.minions < 3) opts.push('summon');
          if (phase2) opts.push('spiral', 'wall', 'iq', 'downvote');
        } else {
          opts = ['ring', 'burst', 'burst', 'drop', 'teleport'];
          if (b.minions < 3) opts.push('summon');
          if (phase2) opts.push('money', 'money', 'ring');
          if (b.round === 2) opts.push('spiral', 'burst');
          if (b.round === 2 && phase2) opts.push('spiral');
        }
        b.atk = U.pick(opts); b.step = 0; b.stepT = 0;
        b.atkT = phase2 ? 2.0 : 2.8;
        const taunts = b.who === 'joe'
          ? { scoops: 'ICE CREAM, JACK!', sprinkles: 'SPRINKLES!', charge: "C'MON, MAN!", nap: '*yaaawn*', freeze: 'BRAIN FREEZE!', summon: 'BLUE ARMY, ROLL OUT!' }
          : b.who === 'roby'
          ? { downvote: 'DOWNVOTED!', wall: 'WALL OF TEXT!', ratio: 'RATIO!', iq: 'IQ BLAST!!!', teleport: '*refreshes page*', summon: 'MODS! BAN HIM!', spiral: 'INFINITE SCROLL!!' }
          : { spiral: 'DOGCORE SPIRAL!!', ring: 'DROP THE BEAT!', burst: 'AUTOTUNE ORBS!', drop: 'BASS... DROP!!!', teleport: '*glitter poof*', summon: 'GOONS! ASSEMBLE!', money: 'MAKE IT RAIN!' };
        UI.floatText(b.x, 3.2, b.z, taunts[b.atk], b.who === 'joe' ? '#9ac0ff' : b.who === 'roby' ? '#7ab8ff' : '#ff4fd8');
      }
      if (b.atk) {
        b.stepT -= dt;
        if (b.stepT <= 0) {
          const ap = Math.atan2(p.z - b.z, p.x - b.x);
          switch (b.atk) {
            case 'ring': {
              const n = phase2 ? 16 : 12;
              for (let i = 0; i < n; i++) bossShoot((i / n) * Math.PI * 2 + b.step * 0.25, 5.5, i % 2 ? '#7af8ff' : '#ff4fd8');
              SFX.play('blob');
              b.step++; b.stepT = 0.45; if (b.step >= 3) b.atk = null;
              break;
            }
            case 'downvote': {
              for (let i = -3; i <= 3; i++) bossShoot(ap + i * 0.16, 9, '#5a8aff');
              SFX.play('shoot');
              b.step++; b.stepT = 0.4; if (b.step >= (phase2 ? 3 : 2)) b.atk = null;
              break;
            }
            case 'ratio': {
              const n = phase2 ? 18 : 14;
              for (let i = 0; i < n; i++) bossShoot((i / n) * Math.PI * 2 + b.step * 0.2, 5.5, i % 2 ? '#ff7a2a' : '#5a8aff');
              SFX.play('blob');
              b.step++; b.stepT = 0.5; if (b.step >= 3) b.atk = null;
              break;
            }
            case 'scoops': {
              for (let i = -2; i <= 2; i++) bossShoot(ap + i * 0.2, 7.5, U.pick(['#ffd0e0', '#fff4d8', '#8a5a3a', '#a8f0c8']));
              SFX.play('blob');
              b.step++; b.stepT = 0.45; if (b.step >= (phase2 ? 3 : 2)) b.atk = null;
              break;
            }
            case 'sprinkles': {
              const n = phase2 ? 20 : 16;
              for (let i = 0; i < n; i++) bossShoot((i / n) * Math.PI * 2 + b.step * 0.3, 5, ['#ff4fd8', '#ffe066', '#7af8ff', '#9aff9a'][i % 4]);
              SFX.play('shoot');
              b.step++; b.stepT = 0.55; if (b.step >= 2) b.atk = null;
              break;
            }
            case 'charge': {
              if (b.step === 0) { b.step = 1; b.stepT = 0.7; UI.floatText(b.x, 2.8, b.z, '?!', '#ff5050'); }
              else { const l = Math.max(0.01, U.dist(p.x, p.z, b.x, b.z)); b.ddx = (p.x - b.x) / l; b.ddz = (p.z - b.z) / l; b.dashT = 0.5; b.dashHit = false; b.atk = null; SFX.play('dodge'); }
              break;
            }
            case 'nap': {
              b.tired = 3.6; b.atk = null;
              UI.floatText(b.x, 3.0, b.z, 'Zzz... corn pop... zzz', '#aaaaff');
              for (let k = 0; k < 6; k++) particle(b.x, 2.4, b.z, '#ffffff', U.rand(-0.5, 0.5), U.rand(0.5, 1.5), U.rand(-0.5, 0.5), 1.2);
              break;
            }
            case 'freeze': {
              for (let i = 0; i < 5; i++) {
                const tx = p.x + U.rand(-2.5, 2.5), tz = p.z + U.rand(-2.5, 2.5);
                markerFx(tx, tz, 1.3, 1.0);
                after(1.0, () => {
                  if (!G.boss || !G.boss.active) return;
                  ringFx(tx, tz, 1.4, 0x9ad8ff, 0.3);
                  for (let k = 0; k < 4; k++) particle(tx, 1.5, tz, '#e8f8ff', U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2), 0.5);
                  if (U.dist(G.p.x, G.p.z, tx, tz) < 1.4) hurtPlayer(13, tx, tz);
                });
              }
              b.atk = null;
              break;
            }
            case 'wall': {
              // a wall of text rolls toward Eli with one gap to dodge through
              const px2 = -Math.sin(ap), pz2 = Math.cos(ap);
              const gap = U.randi(-4, 3);
              for (let k = -5; k <= 5; k++) {
                if (k === gap || k === gap + 1) continue;
                spawnProjectile({ x: b.x + px2 * k * 0.75, z: b.z + pz2 * k * 0.75, a: ap, speed: 5, dmg: 12, owner: 'e', life: 3, size: 0.28, kind: 'note', colorStr: '#e8e8f0' });
              }
              SFX.play('shoot');
              b.step++; b.stepT = 0.9; if (b.step >= (phase2 ? 3 : 2)) b.atk = null;
              break;
            }
            case 'iq': {
              if (b.step === 0) { b.iqX = p.x; b.iqZ = p.z; markerFx(b.iqX, b.iqZ, 2.4, 1.2); b.stepT = 1.2; b.step = 1; }
              else {
                ringFx(b.iqX, b.iqZ, 2.6, 0x7ab8ff, 0.5); SFX.play('boom'); UI.shake(0.4);
                for (let k = 0; k < 12; k++) particle(b.iqX, 1, b.iqZ, U.pick(['#7ab8ff', '#ffffff']), U.rand(-4, 4), U.rand(2, 5), U.rand(-4, 4), 0.7);
                if (U.dist(p.x, p.z, b.iqX, b.iqZ) < 2.4) hurtPlayer(18, b.iqX, b.iqZ);
                b.tired = 3.2; b.atk = null;
                UI.floatText(b.x, 3.2, b.z, '*brain buffering...*', '#aaaaff');
              }
              break;
            }
            case 'spiral': {
              for (let k = 0; k < 3; k++) bossShoot(b.step * 0.42 + (k * Math.PI * 2) / 3, 6, b.who === 'roby' ? (k % 2 ? '#5a8aff' : '#ff7a2a') : k % 2 ? '#7af8ff' : '#ffe066');
              b.step++; b.stepT = 0.07; if (b.step >= 30) b.atk = null;
              if (b.step % 4 === 0) SFX.play('shoot');
              break;
            }
            case 'burst': {
              for (let i = -2; i <= 2; i++) bossShoot(ap + i * 0.18, 8, '#ffe066');
              SFX.play('shoot');
              b.step++; b.stepT = 0.35; if (b.step >= (phase2 ? 3 : 2)) b.atk = null;
              break;
            }
            case 'drop': {
              if (b.step === 0) { markerFx(b.x, b.z, 7, 1.0); b.stepT = 1.0; b.step = 1; b.dropX = b.x; b.dropZ = b.z; }
              else {
                ringFx(b.dropX, b.dropZ, 7, 0xff4fd8, 0.5); SFX.play('boom'); UI.shake(0.4);
                if (U.dist(p.x, p.z, b.dropX, b.dropZ) < 7) hurtPlayer(16, b.dropX, b.dropZ);
                b.tired = 3.5; b.atk = null;
                UI.floatText(b.x, 3.2, b.z, '*out of breath*', '#aaaaff');
              }
              break;
            }
            case 'teleport': {
              for (let i = 0; i < 14; i++) particle(b.x, 1, b.z, U.pick(['#ff4fd8', '#7af8ff', '#ffe066']), U.rand(-3, 3), U.rand(1, 4), U.rand(-3, 3), 0.6);
              for (let tries = 0; tries < 20; tries++) {
                const a = Math.random() * Math.PI * 2, r = U.rand(2, 5);
                const nx = b.arena.x + Math.cos(a) * r * (b.arena.tr / 5), nz = b.arena.z + Math.sin(a) * r * (b.arena.tr / 5);
                if (!blocked(nx, nz, 0.4) && U.dist(nx, nz, p.x, p.z) > 3) { b.x = nx; b.z = nz; break; }
              }
              b.atk = null; b.atkT = 0.6;
              break;
            }
            case 'summon': {
              for (let i = 0; i < 2; i++) {
                const kind = b.who === 'joe' ? U.pick(['blueagent', 'bluescoop']) : b.who === 'roby' ? (phase2 ? U.pick(['hound', 'raver']) : U.pick(['barker', 'pup'])) : b.round === 2 ? (phase2 ? 'raver' : U.pick(['pup', 'barker'])) : phase2 ? 'barker' : 'pup';
                const e = spawnEnemy(kind, b.x + U.rand(-2, 2), b.z + U.rand(-2, 2), b.round === 2 ? 4 : 3, 'boss');
                e.minion = true; e.aggro = true; e.state = 'chase'; e.homeX = b.arena.x; e.homeZ = b.arena.z; b.minions++;
              }
              b.atk = null;
              break;
            }
            case 'money': {
              for (let i = 0; i < 6; i++) {
                const tx = p.x + U.rand(-3, 3), tz = p.z + U.rand(-3, 3);
                markerFx(tx, tz, 1.2, 1.0);
                after(1.0, () => {
                  if (!G.boss || !G.boss.active) return;
                  ringFx(tx, tz, 1.3, 0xffd23a, 0.3);
                  for (let k = 0; k < 4; k++) particle(tx, 2, tz, '#ffd23a', U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2), 0.5);
                  if (U.dist(G.p.x, G.p.z, tx, tz) < 1.3) hurtPlayer(13, tx, tz);
                });
              }
              SFX.play('coin');
              b.atk = null;
              break;
            }
          }
        }
      }
    }
    b.face = screenDX(p.x - b.x, p.z - b.z) >= 0 ? 1 : -1;
    b.animT += dt;
    setFrame(b, b.atk ? 3 : Math.floor(b.animT * 4) % 2 ? 1 : 0);
    b.sprite.material.color.setRGB(b.flash > 0 ? 1.5 : 1, b.flash > 0 ? 0.6 : 1, b.flash > 0 ? 0.6 : 1);
    placeActor(b, 0.15 + Math.sin(G.time * 3) * 0.1);
    const shielded = b.shieldT <= 0 && b.tired <= 0;
    b.bubble.visible = shielded;
    b.bubble.position.set(b.x, 1.1, b.z);
    b.bubble.material.opacity = 0.2 + Math.sin(G.time * 6) * 0.08;
    // contact damage
    if (U.dist(p.x, p.z, b.x, b.z) < 0.8) hurtPlayer(8, b.x, b.z);
    UI.bossBar(true, b.hp / b.maxHp, shielded, G.has('dog_whistle'), b.who);
  }
  function bossDefeated() {
    const b = G.boss;
    b.active = false;
    if (b.who === 'joe') G.flags.joeDefeated = true;
    else if (b.who === 'roby') G.flags.robyDefeated = true;
    else if (b.round === 2) G.flags.shiveDefeated = true;
    else G.flags.shiveR1Down = true;
    SFX.play('boom'); UI.shake(0.6);
    for (let i = 0; i < 50; i++) particle(b.x, 1.5, b.z, U.pick(['#ff4fd8', '#7af8ff', '#ffe066', '#ffffff']), U.rand(-5, 5), U.rand(2, 7), U.rand(-5, 5), 1.2);
    for (const e of G.enemies) if (e.minion) { e.dead = true; removeActor(e); }
    G.enemies = G.enemies.filter((e) => !e.dead);
    for (const pr of G.projectiles) pr.life = -5;
    const n = b.who === 'joe' ? G.npcs.joe : b.who === 'roby' ? G.npcs.robyboss : G.npcs.shive;
    n.x = b.x; n.z = b.z; placeActor(n);
    removeActor(b); scene.remove(b.bubble);
    UI.bossBar(false);
    SFX.startMusic(b.round === 1 || b.round === 4 ? 'world' : 'end');
    G.boss = null;
    after(0.9, () => (b.who === 'joe' ? UI.openDialogue('joe', 'defeated') : b.who === 'roby' ? UI.openDialogue('robyboss', 'defeated') : UI.openDialogue('shive', b.round === 2 ? 'defeated' : 'escape')));
  }
  // ---- Roby's betrayal ----
  G.robyAmbush = () => {
    const r = G.npcs.roby;
    const q = WORLD.snap(G.p.x + 1.3, G.p.z + 0.3);
    r.x = q.x; r.z = q.z; placeActor(r);
    G.flags.robyAmbushing = true;
    UI.openDialogue('roby', 'betray');
  };
  G.robyBetray = () => {
    G.flags.robyTurned = true; G.flags.robyAmbushing = false;
    const r = G.npcs.roby;
    for (let i = 0; i < 40; i++) particle(r.x, 1.5, r.z, U.pick(['#5a8aff', '#ff7a2a', '#ffffff']), U.rand(-4, 4), U.rand(2, 6), U.rand(-4, 4), 1.2);
    SFX.play('boom'); UI.shake(0.4);
    G.take('dog_costume', 9);
    G.equipped.armor = 'hoodie';
    setPlayerLook('eli');
    G.qSet('main', 91);
    UI.toast('Roby stole your dog costume and flew off to the Spire!', 'warn');
    UI.hud(true);
  };
  G.robyEnd = (kind) => {
    G.flags.robyEnd = kind;
    G.give('dog_costume', 1);
    G.equip('dog_costume');
    setPlayerLook('eli_dog');
    G.xp(600, true);
    const n = G.npcs.robyboss;
    for (let i = 0; i < 30; i++) particle(n.x, 1.5, n.z, U.pick(['#5a8aff', '#ff7a2a', '#ffe066']), U.rand(-3, 3), U.rand(2, 5), U.rand(-3, 3), 1);
    // Roby heads home to Aldersprings Lane
    const home = WORLD.snap(115.5, 38.8); G.npcs.roby.x = home.x; G.npcs.roby.z = home.z; placeActor(G.npcs.roby);
    G.qSet('main', 93);
    UI.toast('You put your dog costume back on. For good this time.', 'level');
  };
  G.joeEnd = (kind) => {
    G.flags.joeEnd = kind;
    const n = G.npcs.joe;
    for (let i = 0; i < 24; i++) particle(n.x, 1.5, n.z, U.pick(['#ffd0e0', '#fff4d8', '#3a6aff', '#ffffff']), U.rand(-3, 3), U.rand(2, 5), U.rand(-3, 3), 1);
    G.xp(400, true);
    G.qSet('main', 96);
  };
  function checkAmbush() {
    const s = G.qStage('main');
    if (G.mode !== 'play' || G.flags.robyTurned || G.flags.robyAmbushing) return;
    if (!(s === 90 || (s === 100 && G.flags.shiveEnd))) return;
    if (U.dist(G.p.x, G.p.z, 106, 40) > 20) return;
    G.robyAmbush();
  }
  G.shiveEscape = () => {
    G.flags.shiveRound1 = true;
    const n = G.npcs.shive;
    for (let i = 0; i < 40; i++) particle(n.x, 1.5, n.z, U.pick(['#ff4fd8', '#7af8ff', '#ffe066']), U.rand(-4, 4), U.rand(2, 6), U.rand(-4, 4), 1.2);
    SFX.play('boom');
    G.xp(300, true);
    G.qSet('main', 81);
    UI.toast('Shive escaped with your costume! Ride back to the pier.', 'warn');
  };
  G.shiveEnd = (kind) => {
    G.flags.shiveEnd = kind;
    G.give('dog_costume', 1);
    G.equip('dog_costume');
    setPlayerLook('eli_dog');
    G.xp(500, true);
    G.flags.shiveGone = true;
    const n = G.npcs.shive;
    for (let i = 0; i < 30; i++) particle(n.x, 1.5, n.z, U.pick(['#ff4fd8', '#7af8ff', '#ffe066']), U.rand(-3, 3), U.rand(2, 5), U.rand(-3, 3), 1);
    G.qSet('main', 90);
    UI.toast('You put on your dog costume. You are COMPLETE again!', 'level');
  };

  // ======================= input =======================
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab' || e.code === 'F5' || e.code === 'Space') e.preventDefault();
    SFX.init();
    if (UI.handleKey(e)) return;
    if (G.mode !== 'play') return;
    G.keys[e.code] = true;
    switch (e.code) {
      case 'KeyE': interact(); break;
      case 'Space': dodge(); break;
      case 'KeyQ': toggleBark(); break;
      case 'KeyF': megaBark(); break;
      case 'KeyG': blowWhistle(); break;
      case 'KeyH': quickHeal(); break;
      case 'KeyM': UI.openMap(); break;
      case 'KeyJ': UI.openQuests(); break;
      case 'KeyC': UI.openChar(); break;
      case 'KeyI': case 'Tab': UI.openInv(); break;
      case 'Escape': UI.openPause(); break;
      case 'KeyN': UI.toast(SFX.toggleMusic() ? 'Music on' : 'Music off', 'item'); break;
      case 'F5': G.save(true); break;
      default:
        if (e.code.startsWith('Digit')) {
          const idx = parseInt(e.code.slice(5)) - 1;
          const owned = G.ownedWeapons();
          if (owned[idx]) { G.equip(owned[idx]); UI.toast(`Equipped ${DATA.ITEMS[owned[idx]].name}`, 'item'); }
        }
    }
  });
  addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  addEventListener('blur', () => { G.keys = {}; G.mouse.l = G.mouse.r = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => { SFX.init(); if (G.mode !== 'play') return; if (e.button === 0) { G.mouse.l = true; G.mouse.lq = G.time; } if (e.button === 2) { G.mouse.r = true; G.mouse.rq = G.time; } });
  addEventListener('mouseup', (e) => { if (e.button === 0) G.mouse.l = false; if (e.button === 2) G.mouse.r = false; });
  addEventListener('mousemove', (e) => { G.mouse.x = e.clientX; G.mouse.y = e.clientY; });
  canvas.addEventListener('wheel', (e) => {
    if (G.mode !== 'play') return;
    const owned = G.ownedWeapons().filter((id) => DATA.ITEMS[id].wtype !== 'melee');
    if (owned.length < 2) return;
    const i = owned.indexOf(G.equipped.ranged);
    const next = owned[(i + (e.deltaY > 0 ? 1 : owned.length - 1)) % owned.length];
    G.equip(next); UI.toast(`Ranged: ${DATA.ITEMS[next].name}`, 'item');
  }, { passive: true });
  G.ownedWeapons = () => ['fists'].concat(Object.keys(DATA.ITEMS).filter((id) => id !== 'fists' && DATA.ITEMS[id].type === 'weapon' && G.has(id)));

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  const v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
  function updateMouseWorld() {
    if (G.touch.on) { autoAim(); return; }
    v2.set((G.mouse.x / innerWidth) * 2 - 1, -(G.mouse.y / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, cam);
    if (ray.ray.intersectPlane(plane, v3)) { G.mouse.wx = v3.x; G.mouse.wz = v3.z; }
  }
  // touch: aim at the nearest goon / boss / pylon, otherwise where Eli is walking
  function autoAim() {
    const p = G.p;
    let best = null, bd = 9;
    const consider = (t, x, z) => { const d = U.dist(p.x, p.z, x, z); if (d < bd) { bd = d; best = t; } };
    for (const e of G.enemies) if (!e.dead) consider(e, e.x, e.z);
    if (G.boss && G.boss.active) consider(G.boss, G.boss.x, G.boss.z);
    if (!best) for (const py of G.pylons) if (!py.dead) consider(py, py.x, py.z);
    if (best) { G.mouse.wx = best.x; G.mouse.wz = best.z; }
    else { G.mouse.wx = p.x + (p.lastMx || 0.7) * 3; G.mouse.wz = p.z + (p.lastMz || 0.7) * 3; }
  }
  G.project = (x, y, z) => {
    v3.set(x, y, z).project(cam);
    return { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight };
  };

  // ======================= save / load =======================
  const SAVE_FIELDS = ['S', 'alloc', 'level', 'xpCur', 'hp', 'ap', 'bucks', 'inv', 'equipped', 'perks', 'quests', 'flags', 'picked', 'pylonHp', 'campsCleared', 'discovered', 'pendingPerk', 'pendingSkill', 'pendingSpecial', 'tracked', 'look'];
  G.save = (manual) => {
    if (G.mode === 'title' || !G.p) return;
    const data = { v: 1, px: G.p.x, pz: G.p.z, t: Date.now() };
    for (const k of SAVE_FIELDS) data[k] = G[k];
    // never save mid-boss: put Eli back on the island dock
    if (G.boss && G.boss.active) {
      if (G.boss.round === 4) { data.px = 170; data.pz = 41; }
      else if (G.boss.round === 2) { data.px = MAP.festival.cx; data.pz = MAP.festival.z0 + 3; }
      else { data.px = MAP.isleDock.x + 0.5; data.pz = MAP.isleDock.z; }
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); if (manual) UI.toast('Game saved.', 'item'); }
    catch (e) { if (manual) UI.toast('Could not save (storage blocked).', 'warn'); }
  };
  function autosave() { if (G.p && G.mode !== 'title') G.save(false); }
  G.hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  G.load = () => {
    let data;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { data = null; }
    if (!data) return false;
    for (const k of SAVE_FIELDS) if (data[k] !== undefined) G[k] = data[k];
    // older saves: the Rump vs Sleepy Joe quest used to be a side quest
    if (G.quests.rump2 !== undefined) {
      const r = G.quests.rump2;
      if (r > 0 && r < 100 && G.quests.main === 100) G.quests.main = { 10: 94, 20: 95, 30: 96 }[r] || 94;
      if (G.tracked === 'rump2') G.tracked = 'main';
      delete G.quests.rump2;
    }
    startWorld(data.px, data.pz);
    UI.toast('Welcome back, Eli.', 'item');
    return true;
  };

  // ======================= start =======================
  let worldStarted = false;
  function startWorld(px, pz) {
    if (!worldStarted) { buildPylons(); buildNpcs(); initCamps(); buildSpots(); worldStarted = true; }
    if (G.flags.gateOpen) WORLD.openGate();
    else {
      // re-apply pylon state from the save
      for (const py of G.pylons) { py.hp = G.pylonHp[py.id] !== undefined ? G.pylonHp[py.id] : py.hpMax; if (py.hp <= 0 && !py.dead) breakPylon(py, true); }
    }
    if (G.p) removeActor(G.p);
    G.p = makePlayer(px, pz);
    recalc();
    if (G.hp <= 0) G.hp = G.maxHp();
    updateCamps();
    syncWorldPickups();
    G.mode = 'play';
    UI.hud(true);
    SFX.startMusic(G.qStage('main') >= 100 ? 'end' : 'world');
  }
  G.startNew = (special) => {
    Object.assign(G.S, special);
    G.hp = G.maxHp(); G.ap = G.maxAp();
    G.inv = { dog_treat: 3 };
    G.quests = { main: 0 };
    startWorld(91, 39.2);
    UI.toast(G.touch.on ? 'Walk to Vea and tap TALK.' : 'Press E to talk to Vea.', 'quest');
    autosave();
  };

  // ======================= main loop =======================
  let last = performance.now(), slowT = 0, uiT = 0;
  const camTarget = new THREE.Vector3(91, 0, 39);
  let shakeT = 0;
  G.shake = (s) => { shakeT = Math.max(shakeT, s); };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  // advance the simulation without rendering (used by automated tests)
  G.debugStep = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) tick(dt); };
  function tick(dt) {
    G.time += dt;
    WORLD.update(G.time);
    if (WORLD.anim.barrier) WORLD.anim.barrier.visible = G.pylonsDown() < 3;
    if (G.p) {
      if (G.mode === 'play') {
        updateMouseWorld();
        const slow = G.barkTime ? 0.35 : 1;
        updatePlayer(dt);
        updateEnemies(dt * slow);
        updateBoss(dt * slow);
        updateProjectiles(dt, slow);
        updatePickups(dt);
        updatePylons(dt);
        updateRace(dt);
        updateRaid(dt);
        runTimers();
        slowT -= dt;
        if (slowT <= 0) {
          slowT = 0.5; updateCamps(); syncWorldPickups(); updateDiscovery(); checkQuests(); findInteract(); checkAmbush();
          if (G.time - (G.lastSave || 0) > 45) { G.lastSave = G.time; autosave(); }
        }
        else findInteract();
      }
      updateNpcs(dt);
      updateEffects(dt);
      for (const sp of spots) if (sp.icon) sp.icon.position.set(sp.x, 0.2 + Math.abs(Math.sin(G.time * 2 + sp.x)) * 0.15, sp.z);
      // camera follow
      camTarget.x += (G.p.x - camTarget.x) * Math.min(1, dt * 8);
      camTarget.z += (G.p.z - camTarget.z) * Math.min(1, dt * 8);
      let sx = 0, sz = 0;
      if (shakeT > 0) { shakeT -= dt; sx = U.rand(-0.15, 0.15); sz = U.rand(-0.15, 0.15); }
      // snap to the pixel grid to avoid shimmering
      const snapU = 1 / PX;
      const tx = Math.round((camTarget.x + sx) / snapU) * snapU, tz = Math.round((camTarget.z + sz) / snapU) * snapU;
      cam.position.set(tx + CAM_OFF.x, CAM_OFF.y, tz + CAM_OFF.z);
      cam.lookAt(tx, 0, tz);
      uiT -= dt;
      if (uiT <= 0) { uiT = 1 / 20; UI.hud(); UI.minimap(); }
      UI.updateFloaters(dt);
    } else {
      // title screen: slow pan over the lake
      const a = G.time * 0.05;
      cam.position.set(68 + Math.cos(a) * 30 + CAM_OFF.x, CAM_OFF.y, 68 + Math.sin(a) * 30 + CAM_OFF.z);
      cam.lookAt(68 + Math.cos(a) * 30, 0, 68 + Math.sin(a) * 30);
    }
  }
  requestAnimationFrame(frame);
  UI.init();
  UI.title();
})();
