// ---------- UI: HUD, dialogue, menus, maps ----------
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let panel = null; // current open panel name
  let mapImg = null;
  const floaters = [];
  const iconURL = {};
  const icon = (name) => { if (!iconURL[name]) iconURL[name] = SPR.icon(name).toDataURL(); return iconURL[name]; };
  const itemIcon = (id) => icon(DATA.ITEMS[id].icon);

  // ======================= basics =======================
  function init() {
    buildMapImage();
    $('portrait-mini').appendChild(SPR.portrait(DATA.LOOKS.eli, 2));
    document.addEventListener('mousedown', () => SFX.init());
  }
  function setPanel(name) {
    panel = name;
    G.keys = {}; G.mouse.l = G.mouse.r = false;
    if (name) { $('prompt').classList.add('hidden'); if (G.mode === 'play') G.mode = name === 'dialogue' ? 'dialogue' : 'menu'; }
    else if (G.mode === 'menu' || G.mode === 'dialogue') G.mode = 'play';
  }
  function closePanel() {
    for (const id of ['dialogue', 'menu', 'mapview']) $(id).classList.add('hidden');
    setPanel(null);
  }

  function toast(text, kind = 'item') {
    const box = $('toasts');
    const t = el('div', 'toast ' + kind, esc(text));
    box.appendChild(t);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => t.classList.add('out'), kind === 'level' || kind === 'quest' ? 3800 : 2600);
    setTimeout(() => t.remove(), kind === 'level' || kind === 'quest' ? 4400 : 3200);
  }
  function floatText(x, y, z, text, color, big) {
    const d = el('div', 'floater' + (big ? ' big' : ''), esc(text));
    d.style.color = color || '#fff';
    $('floaters').appendChild(d);
    floaters.push({ d, x, y, z, life: 1.0, ox: (Math.random() - 0.5) * 20 });
  }
  function updateFloaters(dt) {
    for (const f of floaters) {
      f.life -= dt; f.y += dt * 1.0;
      const s = G.project(f.x, f.y, f.z);
      f.d.style.transform = `translate(${s.x + f.ox}px, ${s.y}px) translate(-50%,-50%)`;
      f.d.style.opacity = Math.min(1, f.life * 2);
    }
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) { floaters[i].d.remove(); floaters.splice(i, 1); }
  }
  function prompt(text) {
    const p = $('prompt');
    if (!text || G.mode !== 'play') { p.classList.add('hidden'); return; }
    p.textContent = G.touch.on ? text.replace('[E] ', '') : text; p.classList.remove('hidden');
  }
  function discover(name) {
    const d = $('discover');
    d.innerHTML = `<div class="small">DISCOVERED</div><div>${esc(name)}</div>`;
    d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
    SFX.play('quest');
  }
  function setLocation(name) { $('locname').textContent = name; }
  function shake(s) { G.shake(s); }
  function flash(color) {
    const f = $('flash');
    f.style.background = color; f.style.opacity = color === '#ff2020' ? 0.25 : 0.35;
    setTimeout(() => (f.style.opacity = 0), 60);
  }
  function fade(cb) {
    const f = $('fader');
    f.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 150); }, 450);
  }

  // ======================= HUD =======================
  let lastWeaponKey = '';
  const npcLabels = {};
  function hud(force) {
    if (!G.p) return;
    $('hud').classList.remove('hidden');
    const mh = G.maxHp(), ma = G.maxAp();
    $('hpfill').style.width = (100 * Math.max(0, G.hp) / mh) + '%';
    $('hptext').textContent = `HP ${Math.ceil(Math.max(0, G.hp))}/${mh}`;
    $('apfill').style.width = (100 * G.ap / ma) + '%';
    $('aptext').textContent = `AP ${Math.floor(G.ap)}/${ma}`;
    $('xpfill').style.width = (100 * G.xpCur / G.xpNext()) + '%';
    $('lvl').textContent = `LVL ${G.level}`;
    $('bucks').textContent = `$${G.bucks}`;
    $('lvlup').classList.toggle('hidden', !(G.pendingPerk || G.pendingSkill || G.pendingSpecial));
    // weapons
    const wk = G.equipped.melee + '|' + G.equipped.ranged + '|' + G.look;
    if (force || wk !== lastWeaponKey) {
      lastWeaponKey = wk;
      const m = DATA.ITEMS[G.equipped.melee || 'fists'];
      $('wmelee').innerHTML = `<img src="${itemIcon(m.id)}"><div><b>${esc(m.name)}</b><span>LMB · ${m.dmg} dmg</span></div>`;
      const r = G.equipped.ranged ? DATA.ITEMS[G.equipped.ranged] : null;
      $('wranged').innerHTML = r ? `<img src="${itemIcon(r.id)}"><div><b>${esc(r.name)}</b><span>RMB · ${r.dmg} dmg · ${r.ap} AP</span></div>` : `<div><b>No ranged</b><span>RMB</span></div>`;
      const pm = $('portrait-mini'); pm.innerHTML = ''; pm.appendChild(SPR.portrait(DATA.LOOKS[G.look], 2));
    }
    // abilities
    const p = G.p;
    const heals = Object.keys(G.inv).filter((id) => DATA.ITEMS[id].type === 'use' && DATA.ITEMS[id].heal).reduce((s, id) => s + G.inv[id], 0);
    let ab = `<span class="${p.dodgeCd > 0 ? 'cd' : ''}">[SPACE] Dodge</span><span class="${G.barkTime ? 'on' : ''}">[Q] B.A.R.K.</span><span>[H] Heal ×${heals}</span>`;
    if (G.hasPerk('megabark')) ab += `<span class="${p.barkCd > 0 ? 'cd' : ''}">[F] Mega Bark${p.barkCd > 0 ? ' ' + Math.ceil(p.barkCd) : ''}</span>`;
    if (G.has('dog_whistle')) ab += `<span class="${p.whistleCd > 0 ? 'cd' : ''}">[G] Whistle${p.whistleCd > 0 ? ' ' + Math.ceil(p.whistleCd) : ''}</span>`;
    $('abilities').innerHTML = ab;
    // tracked quest
    let qid = G.tracked;
    if (!DATA.QUESTS[qid] || !G.qStage(qid) && qid !== 'main') qid = 'main';
    const q = DATA.QUESTS[qid], st = q.stages[G.qStage(qid)];
    if (st) {
      const txt = typeof st.text === 'function' ? st.text(G) : st.text;
      $('tracker').innerHTML = `<div class="qname">${q.main ? '★ ' : ''}${esc(q.name)}</div><div>${esc(txt)}</div><div class="small">[J] Quests · [M] Map</div>`;
    }
    // quest pointer
    const tgt = G.questTarget(qid);
    const arrow = $('qarrow'), pin = $('qpin');
    if (tgt && G.mode === 'play') {
      const s = G.project(tgt.x, 1.0, tgt.z);
      const m = 60;
      const dist = Math.round(U.dist(G.p.x, G.p.z, tgt.x, tgt.z));
      if (s.x < m || s.y < m || s.x > innerWidth - m || s.y > innerHeight - m) {
        const cx = innerWidth / 2, cy = innerHeight / 2;
        const a = Math.atan2(s.y - cy, s.x - cx);
        const rx = innerWidth / 2 - m, ry = innerHeight / 2 - m;
        const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
        arrow.style.transform = `translate(${cx + Math.cos(a) * k}px, ${cy + Math.sin(a) * k}px) translate(-50%,-50%)`;
        arrow.querySelector('.arr').style.transform = `rotate(${a}rad)`;
        arrow.querySelector('.dist').textContent = dist + 'm';
        arrow.classList.remove('hidden'); pin.classList.add('hidden');
      } else {
        const sp = G.project(tgt.x, 2.4, tgt.z);
        pin.style.transform = `translate(${sp.x}px, ${sp.y + Math.sin(G.time * 5) * 3}px) translate(-50%,-100%)`;
        pin.classList.remove('hidden'); arrow.classList.add('hidden');
      }
    } else { arrow.classList.add('hidden'); pin.classList.add('hidden'); }
    // npc name labels
    for (const id in G.npcs) {
      const n = G.npcs[id];
      let lab = npcLabels[id];
      if (!lab) { lab = npcLabels[id] = el('div', 'npclabel', esc(n.name)); $('floaters').appendChild(lab); }
      const d = U.dist(n.x, n.z, G.p.x, G.p.z);
      if (n.sprite.visible && d < 6 && G.mode === 'play') {
        const s = G.project(n.x, 2.1 * (id === 'shive' ? 1.3 : 1), n.z);
        lab.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%,-100%)`;
        lab.style.display = 'block';
      } else lab.style.display = 'none';
    }
  }
  function bossBar(show, frac, shielded, whistle) {
    const b = $('bossbar');
    b.classList.toggle('hidden', !show);
    if (!show || frac === undefined) return;
    $('bossfill').style.width = Math.max(0, frac * 100) + '%';
    $('bossstate').textContent = shielded ? (whistle ? 'DIAMOND DRIP SHIELD: press G to blow the Dog Whistle!' : 'DIAMOND DRIP SHIELD: wait for his Bass Drop, then hit him!') : 'VULNERABLE!';
    $('bossstate').className = shielded ? 'sh' : 'vul';
  }

  // ======================= minimap / map =======================
  function buildMapImage() {
    const M = WORLD.map, W = M.W;
    const c = document.createElement('canvas'); c.width = W; c.height = W;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, W);
    const MC = {
      [T.WATER]: [44, 96, 160], [T.GRASS]: [86, 140, 60], [T.FOREST]: [52, 104, 48], [T.MEADOW]: [116, 160, 72], [T.SAND]: [200, 182, 128],
      [T.ROAD]: [70, 70, 80], [T.DIRT]: [140, 108, 70], [T.PAVE]: [150, 146, 136], [T.BRIDGE]: [150, 110, 70], [T.DOCK]: [160, 120, 80],
      [T.ISLAND]: [120, 70, 160], [T.DAM]: [180, 180, 172], [T.FLOOR]: [96, 70, 56],
    };
    for (let i = 0; i < W * W; i++) {
      const col = MC[M.tiles[i]] || [255, 0, 255];
      let k = 1;
      if (M.solid[i] && M.tiles[i] !== T.WATER && M.tiles[i] !== T.FLOOR) k = 0.7;
      img.data[i * 4] = col[0] * k; img.data[i * 4 + 1] = col[1] * k; img.data[i * 4 + 2] = col[2] * k; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    mapImg = c;
  }
  const R2 = Math.SQRT1_2;
  function mapPt(x, z, cx, cy, s, px, pz) { return { x: cx + s * R2 * ((x - px) - (z - pz)), y: cy + s * R2 * ((x - px) + (z - pz)) }; }
  function drawMap(ctx, cx, cy, s, px, pz, full) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(s * R2, s * R2, -s * R2, s * R2, cx - s * R2 * (px - pz), cy - s * R2 * (px + pz));
    ctx.drawImage(mapImg, 0, 0);
    ctx.restore();
    const P = (x, z) => mapPt(x, z, cx, cy, s, px, pz);
    const dot = (x, z, color, r, stroke = '#111') => { const q = P(x, z); ctx.fillStyle = color; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return q; };
    // barrier
    if (G.pylonsDown && G.pylonsDown() < 3) { const q = P(WORLD.map.ISLE.x, WORLD.map.ISLE.z); ctx.strokeStyle = 'rgba(255,79,216,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, 9 * s, 0, Math.PI * 2); ctx.stroke(); }
    // pylons
    if (G.has('pylon_map') || G.qStage('main') >= 60) for (const py of G.pylons) dot(py.x, py.z, py.dead ? '#555' : '#ff4fd8', full ? 6 : 4);
    // enemies (perception range)
    const perR = 10 + G.S.PER * 2.5;
    for (const e of G.enemies) if (!e.dead && (full || U.dist(e.x, e.z, G.p.x, G.p.z) < perR)) { if (U.dist(e.x, e.z, G.p.x, G.p.z) < perR) dot(e.x, e.z, '#ff3a3a', full ? 3 : 2.5, '#300'); }
    if (G.boss && G.boss.active) dot(G.boss.x, G.boss.z, '#ff4fd8', 6, '#fff');
    // npcs
    for (const id in G.npcs) {
      const n = G.npcs[id];
      if (!n.sprite.visible) continue;
      const q = dot(n.x, n.z, id === 'shive' ? '#c04aff' : '#5ab8ff', full ? 5 : 3.5, '#fff');
      if (full) { ctx.font = '13px VT323, monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(n.name, q.x + 7, q.y + 4); }
    }
    // quest pickups
    for (const pk of G.pickups) if (pk.quest) dot(pk.x, pk.z, '#fff59a', full ? 3.5 : 2.5, '#665');
    // tracked target
    const t = G.questTarget(G.tracked) || G.questTarget('main');
    if (t) {
      const q = P(t.x, t.z);
      ctx.save(); ctx.translate(q.x, q.y);
      ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3 : 7; ctx.lineTo(Math.cos(a) * r * (full ? 1.3 : 1), Math.sin(a) * r * (full ? 1.3 : 1)); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // player arrow
    const q = P(G.p.x, G.p.z);
    const aw = Math.atan2(Math.sin(G.p.aimA), Math.cos(G.p.aimA));
    const dx = Math.cos(aw), dz = Math.sin(aw);
    const sa = Math.atan2(R2 * (dx + dz), R2 * (dx - dz));
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(sa);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    const k = full ? 1.5 : 1;
    ctx.beginPath(); ctx.moveTo(8 * k, 0); ctx.lineTo(-5 * k, 5 * k); ctx.lineTo(-2 * k, 0); ctx.lineTo(-5 * k, -5 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function minimap() {
    if (!G.p) return;
    const c = $('minimap'), ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2c60a0'; ctx.fillRect(0, 0, w, h);
    drawMap(ctx, w / 2, h / 2, 3.2, G.p.x, G.p.z, false);
    ctx.restore();
    ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e8c070'; ctx.font = '16px "Press Start 2P", monospace'; ctx.textAlign = 'center';
    ctx.fillText('N', w / 2, 16);
  }
  function openMap() {
    setPanel('map');
    const mv = $('mapview');
    mv.classList.remove('hidden');
    const c = $('fullmap');
    const size = Math.min(innerWidth * 0.95, innerHeight * 0.92);
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#16304e'; ctx.fillRect(0, 0, size, size);
    const W = WORLD.map.W;
    const s = (size * 0.98) / (W * Math.SQRT2);
    drawMap(ctx, size / 2, size / 2, s, W / 2, W / 2, true);
    // location labels
    ctx.textAlign = 'center';
    for (const L of WORLD.map.LOCS) {
      if (L.map === false) continue;
      const q = mapPt(L.x, L.z, size / 2, size / 2, s, W / 2, W / 2);
      const known = G.discovered[L.id];
      ctx.font = known ? '18px VT323, monospace' : '15px VT323, monospace';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      const label = known ? L.name : '???';
      ctx.strokeText(label, q.x, q.y - 10); ctx.fillStyle = known ? '#ffe9a8' : '#9aa';
      ctx.fillText(label, q.x, q.y - 10);
    }
    ctx.font = '20px "Press Start 2P", monospace'; ctx.fillStyle = '#e8c070'; ctx.textAlign = 'left';
    ctx.fillText('LAKE NORMAN, NC', 16, 34);
    ctx.font = '18px VT323, monospace'; ctx.fillStyle = '#ccc';
    const legend = [['#ffffff', 'Eli (you)'], ['#5ab8ff', 'Friends'], ['#ffe066', 'Quest target'], ['#ff4fd8', 'Bass Pylon'], ['#fff59a', 'Quest item'], ['#ff3a3a', 'Goons nearby']];
    legend.forEach(([c2, t], i) => { ctx.fillStyle = c2; ctx.fillRect(16, size - 20 - (legend.length - i) * 20, 10, 10); ctx.fillStyle = '#ddd'; ctx.fillText(t, 32, size - 11 - (legend.length - i) * 20); });
    ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.fillText('[M] / [ESC] close', size - 16, size - 14);
  }

  // ======================= dialogue =======================
  let dlg = null, typeTimer = null;
  function openDialogue(npcId, nodeId) {
    const tree = DLG[npcId];
    if (!tree) return;
    const npc = G.npcs[npcId];
    dlg = { npcId, tree, name: npc ? npc.name : npcId };
    setPanel('dialogue');
    $('dialogue').classList.remove('hidden');
    const pc = $('dportrait'); pc.innerHTML = '';
    pc.appendChild(SPR.portrait(DATA.LOOKS[npc.def.look], 5));
    $('dname').textContent = dlg.name;
    const d = npc.def;
    $('diq').innerHTML = d.iq !== undefined ? `IQ <b>${esc(d.iq)}</b> <span>(${esc(d.iqNote)})</span> · Eli's IQ <b>${G.eliIQ()}</b>` : '';
    goNode(nodeId || tree.entry(G));
  }
  function checkLabel(c) {
    const ch = c.check;
    const have = ch.skill ? G.skill(ch.skill) : G.S[ch.stat] + (ch.stat === 'LUK' && G.has('bracelet') ? 1 : 0);
    const name = ch.skill ? DATA.SKILLS.find((s) => s.k === ch.skill).name : ch.stat;
    return { pass: have >= ch.v, label: `[${name} ${ch.v}]` };
  }
  function goNode(id) {
    if (id === null || id === undefined) { closeDialogue(); return; }
    const node = dlg.tree.nodes[id];
    if (!node) { closeDialogue(); return; }
    dlg.nodeId = id;
    if (node.on) node.on(G);
    const text = typeof node.text === 'function' ? node.text(G) : node.text;
    const choices = node.choices.filter((c) => !c.cond || c.cond(G));
    if (!choices.length) choices.push({ t: '[Leave]', next: null });
    dlg.choices = choices;
    // typewriter
    const tEl = $('dtext');
    tEl.textContent = '';
    dlg.full = text; dlg.shown = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      dlg.shown += 2;
      tEl.textContent = dlg.full.slice(0, dlg.shown);
      if (dlg.shown % 6 === 0) SFX.play('talk');
      if (dlg.shown >= dlg.full.length) { clearInterval(typeTimer); tEl.textContent = dlg.full; }
    }, 22);
    const box = $('dchoices'); box.innerHTML = '';
    choices.forEach((c, i) => {
      const b = el('button', 'choice');
      let label = esc(c.t);
      if (c.check) { const cl = checkLabel(c); label = `<span class="${cl.pass ? 'pass' : 'fail'}">${cl.label}</span> ${label}`; }
      b.innerHTML = `<span class="num">${i + 1}.</span> ${label}`;
      b.onclick = () => choose(i);
      box.appendChild(b);
    });
  }
  function choose(i) {
    if (!dlg) return;
    const c = dlg.choices[i];
    if (!c) return;
    SFX.play('ui');
    let next = c.next, ok = true;
    if (c.check) {
      const cl = checkLabel(c);
      ok = cl.pass;
      const key = 'chk_' + dlg.npcId + '_' + dlg.nodeId + '_' + i;
      if (ok) { if (!G.flags[key]) { G.flags[key] = true; G.xp(15, true); } toast(`${cl.label} Success!`, 'quest'); }
      else toast(`${cl.label} Failed.`, 'warn');
      next = ok ? c.next : c.fail;
    }
    if (next === null || next === undefined) { closeDialogue(); if (ok && c.do) c.do(G); }
    else { if (ok && c.do) c.do(G); goNode(next); }
  }
  function closeDialogue() {
    clearInterval(typeTimer);
    dlg = null;
    $('dialogue').classList.add('hidden');
    setPanel(null);
    G.checkQuests();
    hud(true);
  }

  // ======================= generic menu panel =======================
  function openMenu(title, bodyFn, name) {
    setPanel(name || 'menu');
    const m = $('menu');
    m.classList.remove('hidden');
    m.innerHTML = '';
    const head = el('div', 'mhead');
    head.appendChild(el('div', 'mtitle', esc(title)));
    const tabs = el('div', 'mtabs');
    [['C', 'STATS', openChar], ['I', 'INVENTORY', openInv], ['J', 'QUESTS', openQuests], ['M', 'MAP', () => { closePanel(); openMap(); }]].forEach(([k, t, fn]) => {
      const b = el('button', 'tab' + (title.startsWith(t) ? ' active' : ''), `${t} <small>[${k}]</small>`);
      b.onclick = () => { SFX.play('ui'); fn(); };
      tabs.appendChild(b);
    });
    head.appendChild(tabs);
    const x = el('button', 'mclose', '✕'); x.onclick = closePanel; head.appendChild(x);
    m.appendChild(head);
    const body = el('div', 'mbody');
    m.appendChild(body);
    bodyFn(body);
  }

  // ---- character sheet ----
  let charTab = 'special';
  function openChar() {
    openMenu('STATS', (body) => {
      const sub = el('div', 'subtabs');
      [['special', 'S.P.E.C.I.A.L.'], ['skills', 'SKILLS'], ['perks', 'PERKS']].forEach(([k, t]) => {
        let badge = '';
        if (k === 'special' && G.pendingSpecial) badge = ` (${G.pendingSpecial})`;
        if (k === 'skills' && G.pendingSkill) badge = ` (${G.pendingSkill})`;
        if (k === 'perks' && G.pendingPerk) badge = ` (${G.pendingPerk})`;
        const b = el('button', 'subtab' + (charTab === k ? ' active' : '') + (badge ? ' glow' : ''), t + badge);
        b.onclick = () => { charTab = k; SFX.play('ui'); openChar(); };
        sub.appendChild(b);
      });
      body.appendChild(sub);
      const wrap = el('div', 'charwrap');
      const left = el('div', 'charleft');
      left.appendChild(SPR.portrait(DATA.LOOKS[G.look], 6));
      left.appendChild(el('div', 'cname', 'ELI GROGAN'));
      left.appendChild(el('div', 'cstat', `IQ ${G.eliIQ()}<br>Level ${G.level}<br>XP ${G.xpCur} / ${G.xpNext()}<br>HP ${Math.ceil(G.hp)} / ${G.maxHp()}<br>AP ${G.maxAp()}<br>Crit ${(G.critChance() * 100).toFixed(1)}%<br>Damage Resist ${Math.round(G.armorDR() * 100)}%<br>Bucks $${G.bucks}`));
      wrap.appendChild(left);
      const right = el('div', 'charright');
      if (charTab === 'special') {
        right.appendChild(el('div', 'hint', G.pendingSpecial ? `You have ${G.pendingSpecial} S.P.E.C.I.A.L. point(s) to spend!` : 'You gain a S.P.E.C.I.A.L. point every 3 levels.'));
        for (const s of DATA.SPECIAL) {
          const row = el('div', 'srow');
          const v = G.S[s.k];
          row.innerHTML = `<div class="sk">${s.k}</div><div class="sn">${s.name}<small>${s.desc}</small></div><div class="pips">${'■'.repeat(v)}<span>${'■'.repeat(10 - v)}</span></div><div class="sv">${v}</div>`;
          if (G.pendingSpecial && v < 10) {
            const b = el('button', 'plus', '+');
            b.onclick = () => { G.S[s.k]++; G.pendingSpecial--; if (s.k === 'END') G.hp += 10; G.recalc(); SFX.play('ui'); openChar(); };
            row.appendChild(b);
          }
          right.appendChild(row);
        }
      } else if (charTab === 'skills') {
        right.appendChild(el('div', 'hint', G.pendingSkill ? `${G.pendingSkill} skill points to spend. (Shift+click = +5)` : 'You gain skill points every level (more with high INT).'));
        for (const s of DATA.SKILLS) {
          const row = el('div', 'srow');
          const v = G.skill(s.k);
          row.innerHTML = `<div class="sk">${s.stat}</div><div class="sn">${s.name}<small>${s.desc}</small></div><div class="bar"><div style="width:${v}%"></div></div><div class="sv">${v}</div>`;
          if (G.pendingSkill && v < 100) {
            const b = el('button', 'plus', '+');
            b.onclick = (e) => { const n = Math.min(e.shiftKey ? 5 : 1, G.pendingSkill, 100 - v); G.alloc[s.k] = (G.alloc[s.k] || 0) + n; G.pendingSkill -= n; SFX.play('ui'); openChar(); };
            row.appendChild(b);
          }
          right.appendChild(row);
        }
      } else {
        right.appendChild(el('div', 'hint', G.pendingPerk ? `Choose ${G.pendingPerk} perk(s)!` : 'You choose a new perk every level.'));
        for (const pk of DATA.PERKS) {
          const owned = G.hasPerk(pk.id);
          const ok = !owned && pk.req(G);
          const row = el('div', 'prow' + (owned ? ' owned' : ok ? ' avail' : ' locked'));
          row.innerHTML = `<b>${pk.name}</b>${owned ? ' <span class="tag">OWNED</span>' : ok ? '' : ' <span class="tag">LOCKED</span>'}<small>${pk.desc}</small>`;
          if (ok && G.pendingPerk) {
            const b = el('button', 'take', 'TAKE');
            b.onclick = () => { G.perks.push(pk.id); G.pendingPerk--; G.recalc(); if (pk.id === 'thickfur') G.hp += 30; SFX.play('level'); toast(`Perk gained: ${pk.name}`, 'level'); openChar(); };
            row.appendChild(b);
          }
          right.appendChild(row);
        }
      }
      wrap.appendChild(right);
      body.appendChild(wrap);
    });
  }

  // ---- inventory ----
  let invSel = null;
  function openInv() {
    openMenu('INVENTORY', (body) => {
      const wrap = el('div', 'invwrap');
      const list = el('div', 'invlist');
      const groups = [['weapon', 'WEAPONS'], ['armor', 'APPAREL'], ['use', 'AID'], ['quest', 'KEY ITEMS']];
      const eq = (id) => G.equipped.melee === id || G.equipped.ranged === id || G.equipped.armor === id;
      const owned = Object.keys(G.inv).filter((id) => G.inv[id] > 0);
      if (!owned.includes('fists')) owned.unshift('fists');
      if (!owned.includes('hoodie')) owned.push('hoodie');
      for (const [type, title] of groups) {
        const ids = owned.filter((id) => DATA.ITEMS[id].type === type);
        if (!ids.length) continue;
        list.appendChild(el('div', 'ghead', title));
        for (const id of ids) {
          const it = DATA.ITEMS[id];
          const row = el('div', 'irow' + (invSel === id ? ' sel' : '') + (eq(id) ? ' eq' : ''));
          const n = id === 'fists' || id === 'hoodie' ? '' : G.inv[id] > 1 ? ' ×' + G.inv[id] : '';
          row.innerHTML = `<img src="${itemIcon(id)}"><span>${esc(it.name)}${n}</span>${eq(id) ? '<em>E</em>' : ''}`;
          row.onclick = () => { invSel = id; SFX.play('ui'); openInv(); };
          row.ondblclick = () => { useOrEquip(id); };
          list.appendChild(row);
        }
      }
      wrap.appendChild(list);
      const det = el('div', 'invdet');
      if (invSel && (G.has(invSel) || invSel === 'fists' || invSel === 'hoodie')) {
        const it = DATA.ITEMS[invSel];
        const big = SPR.icon(it.icon); const img = el('img'); img.src = big.toDataURL(); img.className = 'bigicon';
        det.appendChild(img);
        det.appendChild(el('div', 'dname2', esc(it.name)));
        let stats = '';
        if (it.type === 'weapon') stats = `Damage ${it.dmg}${it.ap ? ` · AP ${it.ap}` : ''} · ${it.wtype === 'melee' ? 'Melee (LMB)' : 'Ranged (RMB)'}${it.stun ? ' · Stuns' : ''}${it.aoe ? ' · Area' : ''}${it.proj && it.proj.pierce ? ' · Pierces' : ''}`;
        if (it.type === 'armor') stats = `Damage Resist ${Math.round(it.dr * 100)}%`;
        if (it.type === 'use' && it.heal) stats = `Heals ${Math.round(it.heal * (1 + G.skill('medicine') / 150) * (G.hasPerk('ironstomach') ? 1.4 : 1))} HP${it.ap ? ` · +${it.ap} AP` : ''}`;
        if (stats) det.appendChild(el('div', 'dstats', stats));
        det.appendChild(el('div', 'ddesc', esc(it.desc)));
        if (it.type === 'weapon' || it.type === 'armor') {
          const b = el('button', 'btn', eq(invSel) ? 'EQUIPPED' : 'EQUIP');
          b.disabled = eq(invSel);
          b.onclick = () => useOrEquip(invSel);
          det.appendChild(b);
        } else if (it.type === 'use') {
          const b = el('button', 'btn', 'USE'); b.onclick = () => useOrEquip(invSel); det.appendChild(b);
        }
      } else det.appendChild(el('div', 'ddesc', 'Select an item. Double-click to use or equip.<br><br>Number keys 1-9 swap weapons in play. Mouse wheel cycles ranged weapons.'));
      det.appendChild(el('div', 'dbucks', `Bucks: $${G.bucks}`));
      wrap.appendChild(det);
      body.appendChild(wrap);
    });
  }
  function useOrEquip(id) { G.useItem(id); SFX.play('ui'); openInv(); }

  // ---- quests ----
  function openQuests() {
    openMenu('QUESTS', (body) => {
      const wrap = el('div', 'qwrap');
      const active = Object.keys(DATA.QUESTS).filter((id) => (G.qStage(id) > 0 || id === 'main') && G.qStage(id) < 100);
      const done = Object.keys(DATA.QUESTS).filter((id) => G.qStage(id) >= 100);
      wrap.appendChild(el('div', 'ghead', 'ACTIVE (click to track)'));
      for (const id of active) {
        const q = DATA.QUESTS[id], st = q.stages[G.qStage(id)];
        const txt = typeof st.text === 'function' ? st.text(G) : st.text;
        const row = el('div', 'qrow' + (G.tracked === id ? ' tracked' : ''));
        row.innerHTML = `<b>${q.main ? '★ ' : ''}${esc(q.name)}</b> <small>from ${esc(q.giver)}</small><div>${esc(txt)}</div>`;
        row.onclick = () => { G.tracked = id; SFX.play('ui'); openQuests(); };
        wrap.appendChild(row);
      }
      if (done.length) {
        wrap.appendChild(el('div', 'ghead', 'COMPLETED'));
        for (const id of done) wrap.appendChild(el('div', 'qrow done', `<b>✔ ${esc(DATA.QUESTS[id].name)}</b>`));
      }
      const avail = [];
      if (G.qStage('fox') === 0 && G.qStage('main') >= 40) avail.push('FlowingFox has a mission for you.');
      if (!G.flags.metJack) avail.push('Jack Valentine works at Volt Valentine Scooters in Mooresville.');
      if (!G.flags.metEski) avail.push('Eski hangs about at The Estate in Mooresville.');
      if (!G.flags.metRiver) avail.push('Rivergrain does comedy on his pier south of the lane.');
      if (!G.flags.metSquid || !G.flags.metRack || !G.flags.metSinder || !G.flags.metRoby) avail.push('Your friends on Aldersprings Lane might need help too.');
      if (avail.length) {
        wrap.appendChild(el('div', 'ghead', 'RUMOURS'));
        for (const a of avail) wrap.appendChild(el('div', 'qrow rumour', esc(a)));
      }
      body.appendChild(wrap);
    });
  }

  // ---- shop ----
  function price(id, shop, sell) {
    const it = DATA.ITEMS[id];
    const b = G.skill('barter');
    if (sell) return Math.max(1, Math.round(it.value * 0.4 * (1 + b / 250)));
    let p = it.value * (1.15 - b / 300);
    if (G.hasPerk('goodboy')) p *= 0.9;
    if (shop === 'eski' && G.flags.eskiDiscount) p *= 0.8;
    return Math.max(1, Math.round(p));
  }
  function openShop(shopId) {
    const shop = DATA.SHOPS[shopId];
    setPanel('menu');
    const m = $('menu');
    m.classList.remove('hidden');
    m.innerHTML = '';
    const head = el('div', 'mhead');
    head.appendChild(el('div', 'mtitle', esc(shop.name)));
    head.appendChild(el('div', 'shopbucks', `Your Bucks: $${G.bucks} · Barter ${G.skill('barter')}`));
    const x = el('button', 'mclose', '✕'); x.onclick = closePanel; head.appendChild(x);
    m.appendChild(head);
    const body = el('div', 'mbody shopbody');
    const buy = el('div', 'shopcol'); buy.appendChild(el('div', 'ghead', 'BUY'));
    for (const id of shop.stock) {
      const it = DATA.ITEMS[id], p = price(id, shopId);
      const row = el('div', 'srowshop');
      const ownedW = (it.type === 'weapon' || it.type === 'armor') && G.has(id);
      row.innerHTML = `<img src="${itemIcon(id)}"><div><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></div>`;
      const b = el('button', 'btn', ownedW ? 'OWNED' : `$${p}`);
      b.disabled = ownedW || G.bucks < p;
      b.onclick = () => { G.bucks -= p; G.give(id, 1); SFX.play('coin'); openShop(shopId); };
      row.appendChild(b);
      buy.appendChild(row);
    }
    const sell = el('div', 'shopcol'); sell.appendChild(el('div', 'ghead', 'SELL'));
    const eq = (id) => G.equipped.melee === id || G.equipped.ranged === id || G.equipped.armor === id;
    const sellable = Object.keys(G.inv).filter((id) => DATA.ITEMS[id].value && DATA.ITEMS[id].type !== 'quest' && !eq(id));
    if (!sellable.length) sell.appendChild(el('div', 'ddesc', 'Nothing to sell. (Equipped items and key items cannot be sold.)'));
    for (const id of sellable) {
      const it = DATA.ITEMS[id], p = price(id, shopId, true);
      const row = el('div', 'srowshop');
      row.innerHTML = `<img src="${itemIcon(id)}"><div><b>${esc(it.name)} ×${G.inv[id]}</b></div>`;
      const b = el('button', 'btn', `+$${p}`);
      b.onclick = () => { G.take(id, 1); G.bucks += p; SFX.play('coin'); openShop(shopId); };
      row.appendChild(b);
      sell.appendChild(row);
    }
    body.appendChild(buy); body.appendChild(sell);
    m.appendChild(body);
  }

  // ---- pause ----
  function openPause() {
    setPanel('menu');
    const m = $('menu');
    m.classList.remove('hidden');
    m.innerHTML = `<div class="mhead"><div class="mtitle">PAUSED</div></div>`;
    const body = el('div', 'mbody pausebody');
    const btn = (t, fn) => { const b = el('button', 'btn big', t); b.onclick = () => { SFX.play('ui'); fn(); }; body.appendChild(b); };
    btn('RESUME', closePanel);
    btn('SAVE GAME', () => { G.save(true); });
    btn('CONTROLS', () => { closePanel(); showControls(true); });
    btn('TOGGLE MUSIC', () => toast(SFX.toggleMusic() ? 'Music on' : 'Music off', 'item'));
    btn('SAVE & QUIT TO TITLE', () => { G.save(false); location.reload(); });
    m.appendChild(body);
  }
  function showControls(fromGame) {
    const c = $('controls');
    c.classList.remove('hidden');
    if (fromGame) setPanel('controls');
    $('controls-close').onclick = () => { c.classList.add('hidden'); if (fromGame) setPanel(null); };
  }

  // ======================= title / creation / intro =======================
  function title() {
    G.mode = 'title';
    const t = $('title');
    t.classList.remove('hidden');
    const has = G.hasSave();
    $('btn-continue').classList.toggle('hidden', !has);
    $('btn-new').textContent = has ? 'NEW GAME (replaces save)' : 'NEW GAME';
    $('btn-new').onclick = () => { SFX.init(); SFX.play('ui'); t.classList.add('hidden'); creation(); };
    $('btn-continue').onclick = () => { SFX.init(); SFX.play('ui'); t.classList.add('hidden'); if (!G.load()) { toast('Save could not be loaded.', 'warn'); title(); } };
    $('btn-controls').onclick = () => { SFX.init(); showControls(false); };
    const pc = $('title-eli'); pc.innerHTML = ''; pc.appendChild(SPR.portrait(DATA.LOOKS.eli, 7));
    const ps = $('title-shive'); ps.innerHTML = ''; ps.appendChild(SPR.portrait(DATA.LOOKS.shive, 7));
  }
  function creation() {
    const c = $('creation');
    c.classList.remove('hidden');
    const S = { STR: 4, PER: 4, END: 4, CHA: 4, INT: 4, AGI: 4, LUK: 4 };
    let pts = 7;
    const render = () => {
      const box = $('cre-stats'); box.innerHTML = '';
      $('cre-pts').textContent = pts;
      for (const s of DATA.SPECIAL) {
        const row = el('div', 'srow');
        row.innerHTML = `<div class="sk">${s.k}</div><div class="sn">${s.name}<small>${s.desc}</small></div><div class="pips">${'■'.repeat(S[s.k])}<span>${'■'.repeat(10 - S[s.k])}</span></div><div class="sv">${S[s.k]}</div>`;
        const minus = el('button', 'plus', '−'); minus.disabled = S[s.k] <= 1;
        minus.onclick = () => { S[s.k]--; pts++; SFX.play('ui'); render(); };
        const plus = el('button', 'plus', '+'); plus.disabled = pts <= 0 || S[s.k] >= 10;
        plus.onclick = () => { S[s.k]++; pts--; SFX.play('ui'); render(); };
        row.appendChild(minus); row.appendChild(plus);
        box.appendChild(row);
      }
      $('cre-go').disabled = pts > 0;
      $('cre-go').textContent = pts > 0 ? `SPEND ${pts} MORE POINT${pts > 1 ? 'S' : ''}` : "LET'S GO!";
    };
    const pcc = $('cre-portrait'); pcc.innerHTML = ''; pcc.appendChild(SPR.portrait(DATA.LOOKS.eli, 6));
    $('cre-go').onclick = () => { c.classList.add('hidden'); intro(S); };
    render();
  }
  function intro(S) {
    const i = $('intro');
    i.classList.remove('hidden');
    $('intro-go').onclick = () => { i.classList.add('hidden'); SFX.play('quest'); G.startNew(S); showControls(true); };
  }

  // ======================= death / ending =======================
  function death() {
    $('death').classList.remove('hidden');
    $('death-go').onclick = () => { $('death').classList.add('hidden'); G.respawn(); };
  }
  function showEnding() {
    setPanel('menu');
    G.mode = 'menu';
    const e = $('ending');
    e.classList.remove('hidden');
    const fate = { spared: 'You showed Shive mercy. He now sells his music for 99p and volunteers at the animal shelter.', bonked: 'You bonked Shive into next week. He was last seen in a Lambo heading to South Carolina.', reformed: "You reformed Shive. He returned all 47 dog costumes and released a lo-fi album called 'Good Boy'. It's actually... good?" }[G.flags.shiveEnd] || '';
    const lines = [
      ['vea', 'Vea', "I knew you could do it. You're my favourite dog in the whole world."],
      ['fox', 'FlowingFox', 'Private Grogan... no. SERGEANT Grogan. Hooah!'],
      ['jack', 'Jack Valentine', 'Dog costumes. E-scooters. Full send. Tomorrow. Be there.'],
      ['eski', 'Eski', 'Bruv you\'re a LEGEND. I\'m putting you in my next track, innit.'],
      ['roby', 'Roby Mink', 'My thread about you hit the front page of r/LakeNorman. Statistically, you are now a hero.'],
      ['squid', 'Squid', 'The crickets are chirping on beat again! Thank you, Eli!'],
      ['rack', 'Rack', 'Rocky Steve says congratulations. He said it with his eyes.'],
      ['sinder', 'Sinder', "Hehehe... I'll be watching you celebrate. From a respectful distance."],
      ['rivergrain', 'Rivergrain', 'Why did Eli cross the lake? To get his costume back! ...I workshopped that for a week.'],
    ];
    const box = $('ending-lines'); box.innerHTML = '';
    for (const [look, name, txt] of lines) {
      const row = el('div', 'eline');
      row.appendChild(SPR.portrait(DATA.LOOKS[look], 2));
      row.appendChild(el('div', '', `<b>${name}:</b> ${esc(txt)}`));
      box.appendChild(row);
    }
    $('ending-fate').textContent = fate;
    $('ending-stats').textContent = `Final level ${G.level} · Quests complete: ${Object.keys(DATA.QUESTS).filter((q) => G.qStage(q) >= 100).length}/${Object.keys(DATA.QUESTS).length} · Places found: ${Object.keys(G.discovered).length}/${WORLD.map.LOCS.length}`;
    $('ending-go').onclick = () => { e.classList.add('hidden'); setPanel(null); G.mode = 'play'; G.save(false); toast('Lake Norman is yours to explore, dog. Finish any leftover quests!', 'quest'); };
  }

  // ======================= keys =======================
  function handleKey(e) {
    const k = e.code;
    if (G.mode === 'dead' || G.mode === 'title') return true;
    if (!$('controls').classList.contains('hidden')) { if (k === 'Escape' || k === 'Enter') $('controls-close').click(); return true; }
    if (!$('ending').classList.contains('hidden')) return true;
    if (panel === 'dialogue') {
      if (dlg && dlg.shown < dlg.full.length && (k === 'Space' || k === 'Enter')) { dlg.shown = dlg.full.length; clearInterval(typeTimer); $('dtext').textContent = dlg.full; return true; }
      if (k.startsWith('Digit') || k.startsWith('Numpad')) { const n = parseInt(k.replace(/\D/g, '')) - 1; if (dlg && dlg.shown < dlg.full.length) { dlg.shown = dlg.full.length; clearInterval(typeTimer); $('dtext').textContent = dlg.full; } choose(n); }
      if ((k === 'Space' || k === 'Enter') && dlg && dlg.choices.length === 1) choose(0);
      if (k === 'Escape' && dlg) { const leave = dlg.choices.findIndex((c) => c.next === null && !c.check && !c.do); if (leave >= 0) choose(leave); }
      return true;
    }
    if (panel) {
      const map = { KeyC: openChar, KeyI: openInv, Tab: openInv, KeyJ: openQuests };
      if (k === 'Escape') { closePanel(); return true; }
      if (k === 'KeyM') { if (panel === 'map') closePanel(); else { closePanel(); openMap(); } return true; }
      if (map[k]) { const cur = $('menu').querySelector('.mtitle'); const want = { KeyC: 'STATS', KeyI: 'INVENTORY', Tab: 'INVENTORY', KeyJ: 'QUESTS' }[k]; if (panel === 'menu' && cur && cur.textContent === want) closePanel(); else { closePanel(); map[k](); } return true; }
      return true;
    }
    return false;
  }

  return { init, toast, floatText, updateFloaters, prompt, discover, setLocation, shake, flash, fade, hud, bossBar, minimap, openMap, openDialogue, openChar, openInv, openQuests, openShop, openPause, title, death, showEnding, handleKey };
})();
