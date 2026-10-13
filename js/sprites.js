// ---------- Procedural 32x32 pixel-art sprite painter ----------
const SPR = (() => {
  const OUT = '#1b1424';
  const S = U.shade;
  const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));
  const px = (g, x, y, c) => { if (c && y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c; };
  const rect = (g, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); };
  // shaded rect: darker left column, lighter top-right
  const srect = (g, x, y, w, h, c) => { rect(g, x, y, w, h, c); rect(g, x, y, 1, h, S(c, 0.78)); rect(g, x + w - 1, y, 1, Math.min(2, h), S(c, 1.12)); };

  function outline(g) {
    const h = g.length, w = g[0].length;
    const copy = g.map((r) => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (copy[y][x]) continue;
      if ((x > 0 && copy[y][x - 1]) || (x < w - 1 && copy[y][x + 1]) || (y > 0 && copy[y - 1][x]) || (y < h - 1 && copy[y + 1][x])) g[y][x] = OUT;
    }
    return g;
  }
  function toCanvas(g, scale = 1, flip = false) {
    const h = g.length, w = g[0].length;
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = g[y][flip ? w - 1 - x : x];
      if (col) { ctx.fillStyle = col; ctx.fillRect(x * scale, y * scale, scale, scale); }
    }
    return c;
  }

  // ---- humanoid ----
  // d: {skin, hair, hairStyle, shirt, pants, shoes, hat, dog:{color,belly,ear,full,eye}, robe, extras:[]}
  function humanoid(d, frame) {
    const g = grid(32, 32);
    const has = (e) => d.extras && d.extras.includes(e);
    const skin = d.skin || '#f0c8a0';
    const shirt = d.dog ? d.dog.color : d.shirt || '#3a7bd5';
    const pants = d.dog ? d.dog.color : d.pants || '#334';
    const shoes = d.dog ? S(d.dog.color, 0.6) : d.shoes || '#222';
    const bob = frame === 1 || frame === 2 ? -1 : 0;
    const by = (y) => y + bob;
    const short = d.short ? 1 : 0; // shorter characters (kids)

    // tail (behind)
    if (d.dog) {
      rect(g, 9, by(18), 2, 2, S(d.dog.color, 0.85));
      rect(g, 8, by(16), 2, 2, S(d.dog.color, 0.9));
      px(g, 8, by(15), d.dog.belly || S(d.dog.color, 1.3));
    }
    // legs
    if (!d.robe) {
      let l1 = 0, l2 = 0;
      if (frame === 1) { l1 = -2; l2 = 2; }
      if (frame === 2) { l1 = 2; l2 = -2; }
      srect(g, 13 + l1, by(23), 2, 6 - (frame === 1 ? 0 : 0), S(pants, 0.82));
      srect(g, 16 + l2, by(23), 2, 6, pants);
      if (has('stripes')) { rect(g, 17 + l2, by(23), 1, 6, '#eeeeee'); }
      rect(g, 13 + l1, 29, 3, 2, S(shoes, 0.8));
      rect(g, 16 + l2, 29, 3, 2, shoes);
    } else {
      // robe skirt
      const rc = d.robe;
      for (let y = 22; y <= 29; y++) {
        const ext = Math.floor((y - 22) / 3);
        rect(g, 11 - ext, by(y), 9 + ext * 2, 1, y % 2 ? rc : S(rc, 0.95));
        px(g, 11 - ext, by(y), S(rc, 0.7));
      }
      const f = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      rect(g, 12 + f, 30, 3, 1, d.shoes || '#3a1d4a');
      rect(g, 16 - f, 30, 4, 1, d.shoes || '#3a1d4a');
      if (has('stars')) { px(g, 13, by(25), '#ffe066'); px(g, 17, by(27), '#ffe066'); px(g, 11, by(28), '#ffe066'); px(g, 19, by(24), '#7af8ff'); }
    }
    // back arm
    const torsoC = d.robe || shirt;
    srect(g, 10, by(15 + short), 2, 7, S(torsoC, 0.7));
    px(g, 10, by(22), d.dog ? S(d.dog.color, 0.6) : S(skin, 0.85));
    px(g, 11, by(22), d.dog ? S(d.dog.color, 0.6) : S(skin, 0.85));
    // torso
    srect(g, 12, by(15 + short), 7, 8 - short, torsoC);
    if (d.dog) rect(g, 15, by(17), 3, 5, d.dog.belly || S(d.dog.color, 1.35));
    if (has('agar')) { rect(g, 14, by(17), 3, 3, '#5cf06a'); px(g, 15, by(18), '#2a9a3a'); px(g, 16, by(17), '#a8ffb0'); }
    if (has('hivis')) { rect(g, 12, by(17), 7, 1, '#e8ff3a'); rect(g, 12, by(20), 7, 1, '#e8ff3a'); }
    if (has('camo')) { px(g, 13, by(16), '#4a5a2a'); px(g, 16, by(18), '#4a5a2a'); px(g, 14, by(20), '#2a3a1a'); px(g, 17, by(16), '#6a7a3a'); }
    if (has('stripes')) { rect(g, 12, by(16), 1, 6, '#eeeeee'); }
    if (has('tie')) { rect(g, 16, by(16), 1, 5, '#a32a2a'); }
    if (has('polish')) { rect(g, 12, by(19), 7, 3, '#dc143c'); rect(g, 12, by(19), 1, 3, '#a80f2c'); }
    if (has('longtie')) { rect(g, 14, by(15), 3, 2, '#f4f4f4'); rect(g, 13, by(16), 1, 3, '#2a3050'); rect(g, 17, by(16), 1, 3, '#2a3050'); }
    if (has('cardigan')) { rect(g, 15, by(15), 1, 8, S(torsoC, 0.6)); px(g, 16, by(17), '#ddd'); px(g, 16, by(19), '#ddd'); }
    if (has('heart')) { px(g, 14, by(17), '#ff5a8a'); px(g, 16, by(17), '#ff5a8a'); rect(g, 14, by(18), 3, 1, '#ff5a8a'); px(g, 15, by(19), '#ff5a8a'); }
    if (has('bug')) { rect(g, 14, by(17), 3, 2, '#3a3a3a'); px(g, 13, by(18), '#3a3a3a'); px(g, 17, by(18), '#3a3a3a'); px(g, 15, by(17), '#e04040'); }
    if (has('star')) { px(g, 15, by(17), '#ffe066'); rect(g, 14, by(18), 3, 1, '#ffe066'); px(g, 15, by(19), '#ffe066'); }
    if (has('bolt')) { px(g, 16, by(16), '#ffe066'); px(g, 15, by(17), '#ffe066'); rect(g, 15, by(18), 2, 1, '#ffe066'); px(g, 16, by(19), '#ffe066'); px(g, 15, by(20), '#ffe066'); }
    // belt
    if (!d.robe && !d.dog) rect(g, 12, by(22), 7, 1, S(pants, 0.6));
    if (has('longtie')) { rect(g, 15, by(16), 2, 7, '#d0202a'); rect(g, 15, by(23), 2, 1, '#a01820'); px(g, 15, by(16), '#ff4a4a'); }
    // chain (bling)
    if (has('chain')) { rect(g, 13, by(15 + short), 5, 1, '#ffd23a'); px(g, 13, by(16), '#ffd23a'); px(g, 17, by(16), '#ffd23a'); rect(g, 14, by(17), 3, 1, '#ffd23a'); px(g, 15, by(18), '#fff59a'); }
    // front arm
    if (frame === 3) {
      rect(g, 17, by(17), 6, 2, S(torsoC, 0.92));
      rect(g, 23, by(17), 2, 2, d.dog ? S(d.dog.color, 0.6) : skin);
    } else {
      const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
      srect(g, 17 + sw, by(16 + short), 2, 6, S(torsoC, 0.92));
      rect(g, 17 + sw, by(22), 2, 1, d.dog ? S(d.dog.color, 0.6) : skin);
    }
    if (has('cane') && frame !== 3) { rect(g, 20, by(20), 1, 10 - bob, '#6a4a2a'); px(g, 19, by(20), '#6a4a2a'); }
    // neck
    rect(g, 14, by(14), 3, 1, d.dog && d.dog.full ? d.dog.color : S(skin, 0.85));

    // head
    const hy = 6 + short;
    if (d.dog && d.dog.full) {
      const dc = d.dog.color;
      srect(g, 12, by(hy), 8, 8, dc);
      rect(g, 19, by(hy + 4), 3, 3, d.dog.belly || S(dc, 1.3)); // snout
      px(g, 22, by(hy + 4), '#141014'); // nose
      px(g, 21, by(hy + 6), S(dc, 0.6));
      px(g, 17, by(hy + 2), d.dog.eye || '#141014'); px(g, 17, by(hy + 3), d.dog.eye || '#141014');
      if (d.dog.eye) px(g, 16, by(hy + 2), S(d.dog.eye, 0.6));
      if (d.dog.ear === 'pointy') { rect(g, 13, by(hy - 3), 2, 3, S(dc, 0.85)); px(g, 13, by(hy - 4), S(dc, 0.85)); rect(g, 16, by(hy - 2), 2, 2, dc); }
      else { rect(g, 11, by(hy + 1), 2, 6, S(dc, 0.65)); rect(g, 12, by(hy), 3, 2, S(dc, 0.75)); }
      if (d.dog.spots) { px(g, 14, by(hy + 1), '#222'); px(g, 13, by(hy + 5), '#222'); px(g, 14, by(19), '#222'); px(g, 13, by(25), '#222'); }
      if (has('shades')) { rect(g, 15, by(hy + 2), 4, 2, '#111'); px(g, 18, by(hy + 2), '#5a5aff'); }
      if (has('collar')) rect(g, 12, by(14), 7, 1, '#d02a2a');
    } else {
      srect(g, 12, by(hy), 8, 8, skin);
      // eyes & face
      px(g, 18, by(hy + 4), '#1a1020');
      px(g, 15, by(hy + 4), '#1a1020');
      if (has('derp')) { px(g, 18, by(hy + 3), '#1a1020'); px(g, 18, by(hy + 4), null); px(g, 18, by(hy + 4), skin); }
      px(g, 18, by(hy + 6), S(skin, 0.7)); // mouth
      if (has('smile')) { px(g, 17, by(hy + 6), S(skin, 0.6)); px(g, 19, by(hy + 5), S(skin, 0.6)); }
      px(g, 13, by(hy + 4), S(skin, 0.75)); // ear
      if (has('blush')) { px(g, 16, by(hy + 5), '#ff9aa8'); px(g, 19, by(hy + 5), '#ff9aa8'); }
      if (has('clown')) { px(g, 20, by(hy + 4), '#ff2a2a'); px(g, 20, by(hy + 5), '#ff2a2a'); }
      // hair
      const hc = d.hair || '#3a2618';
      const st = d.hairStyle || 'short';
      if (st === 'short' || st === 'messy' || st === 'spiky') {
        rect(g, 12, by(hy - 1), 8, 2, hc); rect(g, 12, by(hy + 1), 3, 3, hc); px(g, 15, by(hy + 1), hc);
        if (st === 'messy') { px(g, 11, by(hy), hc); px(g, 14, by(hy - 2), hc); px(g, 18, by(hy - 2), hc); px(g, 20, by(hy), hc); }
        if (st === 'spiky') { px(g, 13, by(hy - 2), hc); px(g, 15, by(hy - 3), hc); px(g, 17, by(hy - 2), hc); px(g, 19, by(hy - 3), hc); }
      } else if (st === 'long') {
        rect(g, 12, by(hy - 1), 8, 2, hc); rect(g, 11, by(hy), 4, 10, hc); px(g, 15, by(hy + 1), hc); rect(g, 19, by(hy + 1), 1, 2, hc);
      } else if (st === 'bald') {
        rect(g, 12, by(hy + 1), 2, 3, hc); px(g, 14, by(hy + 1), hc);
      } else if (st === 'buzz') {
        rect(g, 12, by(hy), 8, 1, hc); rect(g, 12, by(hy + 1), 2, 2, hc);
      } else if (st === 'swoop') {
        rect(g, 11, by(hy - 3), 10, 3, hc); rect(g, 12, by(hy - 4), 7, 1, hc);
        rect(g, 14, by(hy), 7, 1, hc); px(g, 21, by(hy), hc); px(g, 21, by(hy + 1), hc);
        rect(g, 11, by(hy), 3, 4, hc); rect(g, 13, by(hy - 3), 6, 1, S(hc, 1.15));
      } else if (st === 'hyper') {
        rect(g, 12, by(hy), 8, 2, '#ff4fd8'); rect(g, 11, by(hy + 1), 3, 4, '#7af8ff'); px(g, 20, by(hy + 1), '#ff4fd8'); px(g, 11, by(hy + 5), '#ff4fd8');
      }
      if (has('beard')) { rect(g, 14, by(hy + 5), 6, 4, d.beard || hc); px(g, 18, by(hy + 6), S(d.beard || hc, 0.6)); }
      if (has('neckbeard')) { rect(g, 14, by(hy + 7), 6, 2, hc); }
      if (has('mustache')) { rect(g, 16, by(hy + 5), 4, 1, d.hair || '#6a4a2a'); px(g, 20, by(hy + 6), d.hair || '#6a4a2a'); }
      if (has('glasses')) { rect(g, 14, by(hy + 3), 6, 1, '#222'); px(g, 15, by(hy + 4), '#9ad8ff'); px(g, 18, by(hy + 4), '#9ad8ff'); }
      if (has('bow')) { rect(g, 12, by(hy - 2), 2, 2, '#ff6fa8'); rect(g, 15, by(hy - 2), 2, 2, '#ff6fa8'); px(g, 14, by(hy - 1), '#d03a78'); }
      if (has('antenna')) { px(g, 14, by(hy - 2), '#222'); px(g, 13, by(hy - 3), '#222'); px(g, 13, by(hy - 4), '#5cf06a'); px(g, 18, by(hy - 2), '#222'); px(g, 19, by(hy - 3), '#222'); px(g, 19, by(hy - 4), '#5cf06a'); rect(g, 12, by(hy - 1), 8, 1, '#5cf06a'); }
    }
    // hats
    const hy2 = hy;
    if (d.hat === 'cap') { rect(g, 12, by(hy2 - 1), 8, 3, d.hatColor || '#c22'); rect(g, 19, by(hy2 + 1), 3, 1, S(d.hatColor || '#c22', 0.7)); }
    if (d.hat === 'beanie') { rect(g, 12, by(hy2 - 2), 8, 3, d.hatColor || '#2a6'); rect(g, 12, by(hy2 + 1), 8, 1, S(d.hatColor || '#2a6', 0.7)); px(g, 15, by(hy2 - 3), '#eee'); }
    if (d.hat === 'helmet') { rect(g, 11, by(hy2 - 2), 10, 4, d.hatColor || '#4a5a2a'); rect(g, 10, by(hy2 + 1), 12, 1, S(d.hatColor || '#4a5a2a', 0.7)); px(g, 13, by(hy2 - 1), '#6a7a3a'); px(g, 17, by(hy2 - 2), '#3a4a1a'); }
    if (d.hat === 'fedora') { rect(g, 13, by(hy2 - 3), 6, 3, '#3a3a3a'); rect(g, 10, by(hy2), 12, 1, '#2a2a2a'); rect(g, 13, by(hy2 - 1), 6, 1, '#8a2a2a'); }
    if (d.hat === 'bucket') { rect(g, 12, by(hy2 - 2), 8, 3, d.hatColor || '#e8a82a'); rect(g, 11, by(hy2 + 1), 10, 1, S(d.hatColor || '#e8a82a', 0.8)); px(g, 14, by(hy2 - 1), '#ff4a4a'); px(g, 17, by(hy2 - 2), '#4a8aff'); }
    if (d.hat === 'bikehelm') { rect(g, 12, by(hy2 - 2), 8, 3, d.hatColor || '#2ad0ff'); rect(g, 12, by(hy2 - 2), 8, 1, S(d.hatColor || '#2ad0ff', 1.2)); px(g, 14, by(hy2 - 1), '#111'); px(g, 17, by(hy2 - 1), '#111'); }
    if (d.hat === 'wizard') {
      const wc = d.hatColor || '#5a2a8a';
      rect(g, 9, by(hy2), 14, 1, S(wc, 0.7));
      rect(g, 11, by(hy2 - 2), 10, 2, wc);
      rect(g, 12, by(hy2 - 4), 8, 2, wc);
      rect(g, 12, by(hy2 - 6), 6, 2, S(wc, 1.1));
      rect(g, 11, by(hy2 - 7), 4, 1, wc);
      rect(g, 9, by(hy2 - 8), 3, 1, wc);
      px(g, 8, by(hy2 - 8), '#ffe066');
      rect(g, 12, by(hy2 - 1), 8, 1, '#ffd23a');
      px(g, 16, by(hy2 - 4), '#7af8ff'); px(g, 14, by(hy2 - 3), '#ff4fd8');
    }
    if (d.hood) { // eli's dog hood (face open)
      const dc = d.hood;
      rect(g, 11, by(hy - 1), 9, 2, dc); rect(g, 11, by(hy + 1), 3, 7, dc); px(g, 20, by(hy), dc);
      rect(g, 12, by(hy - 3), 2, 2, S(dc, 0.8)); rect(g, 16, by(hy - 3), 2, 2, S(dc, 0.8));
      // a fedora sits on top of the hood (Roby wearing Eli's costume), ears poking out the sides
      if (d.hat === 'fedora') { rect(g, 13, by(hy - 4), 6, 3, '#3a3a3a'); rect(g, 10, by(hy - 1), 12, 1, '#2a2a2a'); rect(g, 13, by(hy - 2), 6, 1, '#8a2a2a'); px(g, 11, by(hy - 2), S(dc, 0.8)); px(g, 20, by(hy - 2), S(dc, 0.8)); }
    }
    return outline(g);
  }

  function character(def) {
    const right = [], left = [];
    for (let f = 0; f < 4; f++) {
      const g = humanoid(def, f);
      right.push(toCanvas(g));
      left.push(toCanvas(g, 1, true));
    }
    return { right, left };
  }
  function portrait(def, scale = 5) {
    const g = humanoid(def, 0);
    // crop to head/torso area
    const crop = g.slice(0, 24).map((r) => r.slice(4, 28));
    return toCanvas(crop, scale);
  }

  // ---- 16x16 item icons ----
  function icon(name) {
    const g = grid(16, 16);
    const R = (x, y, w, h, c) => rect(g, x, y, w, h, c);
    const P = (x, y, c) => px(g, x, y, c);
    switch (name) {
      case 'fists': R(4, 5, 8, 7, '#f0c8a0'); R(4, 5, 8, 1, '#ffe0c0'); for (let i = 0; i < 4; i++) P(5 + i * 2, 7, '#c89878'); R(3, 9, 2, 3, '#e0b090'); break;
      case 'foam_bat': for (let i = 0; i < 10; i++) R(3 + i, 12 - i, 3, 2, i < 3 ? '#555' : '#ff9a2a'); P(12, 2, '#ffd08a'); break;
      case 'rubber_chicken': R(3, 7, 8, 4, '#ffe066'); R(10, 5, 3, 3, '#ffe066'); P(13, 6, '#ff7a2a'); P(11, 6, '#111'); R(10, 4, 2, 1, '#e22'); R(2, 10, 2, 3, '#ff7a2a'); break;
      case 'chav_chain': for (let i = 0; i < 6; i++) { R(2 + i * 2, 3 + i * 2, 2, 2, i % 2 ? '#ffd23a' : '#d8a820'); } R(12, 13, 2, 2, '#fff59a'); break;
      case 'shock_baton': for (let i = 0; i < 9; i++) R(4 + i, 12 - i, 2, 2, i < 3 ? '#222' : '#2a6aff'); P(13, 2, '#9af8ff'); P(14, 1, '#ffffff'); P(12, 1, '#9af8ff'); break;
      case 'ban_hammer': R(7, 7, 2, 8, '#6a4a2a'); R(3, 2, 10, 5, '#d02a2a'); R(3, 2, 10, 1, '#ff6a6a'); R(5, 4, 6, 1, '#fff'); break;
      case 'slingshot': R(7, 8, 2, 7, '#8a5a2a'); R(4, 3, 2, 6, '#8a5a2a'); R(10, 3, 2, 6, '#8a5a2a'); R(5, 4, 6, 1, '#d0d0d0'); break;
      case 'paintball': R(2, 7, 11, 3, '#2a8a3a'); R(12, 8, 3, 1, '#333'); R(4, 10, 2, 4, '#333'); R(6, 4, 3, 3, '#e04aff'); R(9, 10, 1, 2, '#333'); break;
      case 'agar_blaster': R(2, 7, 10, 4, '#5a5a7a'); R(10, 5, 5, 8, '#5cf06a'); R(11, 6, 3, 6, '#a8ffb0'); R(4, 11, 2, 3, '#333'); break;
      case 'hornet_jar': R(4, 4, 8, 10, '#c8e8ff'); R(4, 3, 8, 2, '#8a6a3a'); P(6, 7, '#ffd23a'); P(7, 7, '#222'); P(9, 10, '#ffd23a'); P(10, 10, '#222'); P(7, 11, '#ffd23a'); break;
      case 'dog_treat': R(3, 6, 10, 4, '#c8884a'); R(2, 5, 3, 3, '#c8884a'); R(2, 8, 3, 3, '#c8884a'); R(11, 5, 3, 3, '#c8884a'); R(11, 8, 3, 3, '#c8884a'); R(5, 7, 6, 1, '#e8a86a'); break;
      case 'pizza': for (let i = 0; i < 10; i++) R(3 + (i >> 1), 3 + i, 10 - i, 1, '#ffd060'); R(3, 3, 10, 2, '#c8884a'); P(6, 6, '#d02a2a'); P(9, 6, '#d02a2a'); P(7, 9, '#d02a2a'); break;
      case 'fizzy_pop': R(5, 3, 6, 11, '#2ab8ff'); R(5, 3, 6, 1, '#ccc'); R(5, 7, 6, 3, '#fff'); P(7, 8, '#ff3a3a'); P(8, 8, '#ff3a3a'); break;
      case 'packed_lunch': R(3, 6, 10, 7, '#ff8ab8'); R(3, 6, 10, 2, '#ffb8d8'); R(6, 4, 4, 2, '#d03a78'); P(8, 10, '#fff'); break;
      case 'tonic': R(6, 2, 4, 3, '#8a6a3a'); R(4, 5, 8, 9, '#5aff9a'); R(5, 6, 2, 5, '#b8ffd8'); P(9, 10, '#2a8a4a'); break;
      case 'volt_cell': R(4, 3, 8, 11, '#3a3a4a'); R(6, 2, 4, 1, '#999'); P(8, 6, '#ffe066'); P(7, 7, '#ffe066'); R(7, 8, 2, 1, '#ffe066'); P(8, 9, '#ffe066'); P(7, 10, '#ffe066'); break;
      case 'speaker': R(3, 3, 10, 11, '#2a2a2a'); R(5, 5, 6, 6, '#555'); R(6, 6, 4, 4, '#111'); P(7, 7, '#ff4fd8'); R(5, 12, 6, 1, '#ffd23a'); break;
      case 'rare_bug': R(6, 5, 4, 7, '#3ae0a0'); R(6, 5, 4, 1, '#9affd8'); R(7, 3, 2, 2, '#222'); P(5, 7, '#222'); P(10, 7, '#222'); P(5, 10, '#222'); P(10, 10, '#222'); P(8, 8, '#ffe066'); break;
      case 'perfect_rock': R(3, 6, 10, 7, '#9a9aa8'); R(4, 5, 8, 1, '#b8b8c8'); R(5, 7, 3, 2, '#d8d8e8'); P(10, 10, '#6a6a78'); P(6, 11, '#6a6a78'); break;
      case 'glowcap': R(7, 9, 2, 5, '#e8e0c8'); R(3, 5, 10, 4, '#b04aff'); R(4, 4, 8, 1, '#d08aff'); P(5, 6, '#7af8ff'); P(9, 5, '#7af8ff'); P(11, 7, '#7af8ff'); break;
      case 'wildflower': R(7, 8, 1, 7, '#3a8a3a'); R(5, 4, 5, 5, '#ff8ac8'); P(7, 6, '#ffe066'); P(5, 4, null); P(9, 4, null); R(8, 11, 3, 1, '#3a8a3a'); break;
      case 'dog_whistle': R(2, 7, 9, 3, '#c0c0d0'); R(2, 7, 9, 1, '#f0f0ff'); R(10, 6, 4, 5, '#c0c0d0'); P(12, 8, '#333'); R(1, 8, 1, 1, '#d02a2a'); break;
      case 'hydro_scooter': R(2, 10, 12, 3, '#2ad0ff'); R(10, 4, 2, 7, '#888'); R(9, 3, 4, 1, '#333'); R(3, 9, 6, 1, '#1a8ab8'); P(4, 13, '#fff'); P(10, 13, '#fff'); break;
      case 'flyer': R(3, 2, 10, 12, '#ffe8f8'); R(4, 3, 8, 2, '#ff4fd8'); R(4, 6, 8, 1, '#7af8ff'); R(4, 8, 6, 1, '#aaa'); R(4, 10, 7, 1, '#aaa'); P(10, 12, '#ff4fd8'); break;
      case 'pylon_map': R(2, 3, 12, 10, '#e8d8a8'); R(3, 4, 10, 8, '#c8e8f8'); P(5, 6, '#e22'); P(10, 7, '#e22'); P(7, 10, '#e22'); R(2, 3, 12, 1, '#a88858'); break;
      case 'badge': R(4, 3, 8, 8, '#3a6aff'); R(5, 4, 6, 6, '#ffd23a'); P(7, 6, '#3a6aff'); P(8, 7, '#3a6aff'); R(5, 11, 2, 4, '#d02a2a'); R(9, 11, 2, 4, '#d02a2a'); break;
      case 'bracelet': for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; P(8 + Math.round(Math.cos(t) * 5), 8 + Math.round(Math.sin(t) * 4), a % 3 ? '#ff8ac8' : '#7af8ff'); } break;
      case 'dog_costume': R(4, 4, 8, 10, '#c8884a'); R(3, 2, 3, 3, '#8a5a2a'); R(10, 2, 3, 3, '#8a5a2a'); R(6, 8, 4, 5, '#f0d0a0'); P(6, 6, '#111'); P(9, 6, '#111'); break;
      case 'bucks': R(4, 4, 8, 8, '#ffd23a'); R(5, 5, 6, 6, '#ffe88a'); R(7, 6, 2, 4, '#c89a1a'); break;
      case 'bass_cannon': R(2, 6, 9, 5, '#2a2a2a'); R(10, 4, 4, 9, '#3a3a3a'); R(11, 6, 2, 5, '#ff4fd8'); P(12, 8, '#7af8ff'); R(4, 11, 2, 3, '#555'); R(3, 7, 5, 1, '#ffd23a'); break;
      case 'fishing_rod': for (let i = 0; i < 12; i++) P(2 + i, 13 - i, i < 3 ? '#4a2a1a' : '#8a6a3a'); for (let i = 0; i < 8; i++) P(13, 2 + i, '#dddddd'); R(12, 10, 3, 2, '#ff3a3a'); R(3, 11, 2, 2, '#888'); break;
      case 'whoopee': R(3, 5, 10, 7, '#ff8ac8'); R(4, 4, 8, 1, '#ffb8e0'); R(11, 9, 4, 2, '#e85aa8'); P(6, 7, '#ffffff'); break;
      case 'butterfly_net': for (let i = 0; i < 8; i++) P(3 + i, 13 - i, '#8a6a3a'); R(9, 2, 6, 6, '#e8f8ff'); R(9, 2, 6, 1, '#888'); P(11, 4, '#5cf06a'); P(13, 5, '#ffe066'); break;
      case 'nunchucks': R(2, 3, 3, 6, '#ff4fd8'); R(11, 7, 3, 6, '#7af8ff'); for (let i = 0; i < 6; i++) P(5 + i, 6 + (i >> 1), '#cccccc'); break;
      case 'ghillie': R(4, 3, 8, 11, '#4a6a2a'); P(5, 5, '#6a8a3a'); P(9, 4, '#2a4a1a'); P(7, 9, '#7a9a4a'); P(10, 11, '#2a4a1a'); R(3, 6, 1, 4, '#5a7a2a'); R(12, 6, 1, 4, '#5a7a2a'); break;
      case 'sneakers': R(2, 8, 11, 4, '#ff3a3a'); R(2, 11, 12, 2, '#ffffff'); R(5, 6, 4, 2, '#ff3a3a'); P(8, 9, '#ffe066'); P(10, 9, '#ffe066'); R(12, 12, 3, 1, '#7af8ff'); break;
      case 'scarf': R(3, 4, 10, 4, '#ff8ac8'); R(9, 8, 3, 6, '#ff8ac8'); P(4, 5, '#ffffff'); P(7, 6, '#ffffff'); P(10, 11, '#ffffff'); R(9, 13, 3, 1, '#d03a78'); break;
      case 'amulet': for (let i = 0; i < 6; i++) { P(4 + i, 2 + (i >> 1), '#c8a050'); P(11 - i, 2 + (i >> 1), '#c8a050'); } R(5, 6, 6, 6, '#3a2a4a'); R(6, 7, 4, 4, '#ffffff'); R(7, 8, 2, 2, '#5cf06a'); P(7, 8, '#111'); break;
      case 'medal': R(5, 2, 2, 5, '#3a6aff'); R(9, 2, 2, 5, '#d02a2a'); R(4, 7, 8, 7, '#ffd23a'); R(5, 8, 6, 5, '#ffe88a'); P(7, 10, '#c89a1a'); P(8, 10, '#c89a1a'); break;
      case 'vip': R(2, 4, 12, 8, '#1a1a2a'); R(3, 5, 10, 6, '#ff4fd8'); R(4, 6, 3, 1, '#ffe066'); R(4, 8, 8, 1, '#7af8ff'); R(7, 2, 2, 2, '#888'); break;
      case 'merch': R(2, 5, 12, 9, '#c8a068'); R(2, 5, 12, 2, '#a8804a'); R(6, 8, 4, 3, '#ff4fd8'); P(7, 9, '#ffffff'); break;
      case 'mixtape': R(2, 4, 12, 8, '#2a2a3a'); R(3, 5, 10, 3, '#ffe066'); R(4, 9, 2, 2, '#888'); R(10, 9, 2, 2, '#888'); R(6, 10, 4, 1, '#555'); break;
      case 'catfish': R(2, 6, 10, 5, '#7a8a6a'); R(11, 5, 4, 7, '#6a7a5a'); P(4, 7, '#111'); R(1, 8, 2, 1, '#aaa'); R(1, 10, 2, 1, '#aaa'); R(4, 10, 6, 1, '#a8b898'); break;
      case 'candle': R(6, 6, 4, 8, '#f0f0e0'); R(6, 13, 4, 1, '#c8c8b0'); R(7, 3, 2, 3, '#7af8ff'); P(7, 2, '#ffffff'); P(8, 4, '#3a8aff'); break;
      case 'bone': R(4, 7, 8, 2, '#f0f0e0'); R(3, 6, 2, 2, '#f0f0e0'); R(3, 8, 2, 2, '#f0f0e0'); R(11, 6, 2, 2, '#f0f0e0'); R(11, 8, 2, 2, '#f0f0e0'); break;
      default: R(4, 4, 8, 8, '#ff00ff');
    }
    return toCanvas(outline(g));
  }

  return { character, portrait, icon, toCanvas, humanoid };
})();
