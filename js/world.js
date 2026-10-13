// ---------- Builds the 3D isometric world from the generated map ----------
const WORLD = (() => {
  let map = null;
  // materials are cached by colour: far fewer GPU state changes
  const matCache = new Map();
  const lam = (c, extra) => {
    if (extra) return new THREE.MeshPhongMaterial(Object.assign({ color: c, flatShading: true, shininess: 0, specular: 0x000000 }, extra));
    const k = 'p' + c;
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshPhongMaterial({ color: c, flatShading: true, shininess: 0, specular: 0x000000 }));
    return matCache.get(k);
  };
  const basic = (c, extra) => {
    if (extra) return new THREE.MeshBasicMaterial(Object.assign({ color: c }, extra));
    const k = 'b' + c;
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: c }));
    return matCache.get(k);
  };
  const anim = { water: null, barrier: null, orbs: [], flags: [], lamps: [] };

  const TILE_COL = {
    [T.GRASS]: '#5f9e3e', [T.FOREST]: '#3f7a34', [T.MEADOW]: '#7aac4c', [T.SAND]: '#d8c48a', [T.ROAD]: '#4b4b55',
    [T.DIRT]: '#8d6c46', [T.PAVE]: '#9a968c', [T.BRIDGE]: '#8b6a46', [T.DOCK]: '#a07850', [T.ISLAND]: '#6e4a92',
    [T.DAM]: '#a8a8a0', [T.FLOOR]: '#6a6058', [T.WATER]: '#2b4d6a',
  };
  const TILE_H = { [T.WATER]: -0.7, [T.SAND]: -0.02, [T.ROAD]: 0.01, [T.BRIDGE]: 0.06, [T.DOCK]: 0.06, [T.DAM]: 0.12 };

  function pixelTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  }

  function build(scene) {
    map = genWorld();
    const W = map.W;
    const col = new THREE.Color();
    const dummy = new THREE.Object3D();

    // ---- static scenery is merged into chunks (one draw call each, culled when off-screen) ----
    const CH = 20, NC = Math.ceil(W / CH);
    const chunks = new Array(NC * NC);
    const chunkOf = (x, z) => {
      const i = Math.min(NC - 1, Math.max(0, Math.floor(z / CH))) * NC + Math.min(NC - 1, Math.max(0, Math.floor(x / CH)));
      return chunks[i] || (chunks[i] = { pos: [], nor: [], col: [] });
    };
    const pushTri = (c, a, b, d, n, cl) => {
      c.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], d[0], d[1], d[2]);
      for (let k = 0; k < 3; k++) { c.nor.push(n[0], n[1], n[2]); c.col.push(cl.r, cl.g, cl.b); }
    };
    const quad = (c, p0, p1, p2, p3, n, cl) => { pushTri(c, p0, p1, p2, n, cl); pushTri(c, p0, p2, p3, n, cl); };
    // template geometry appended with a transform (flat normals)
    const tmpl = (g) => { const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng; };
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    const append = (c, g, m, cl) => {
      const P = g.attributes.position, N = g.attributes.normal;
      nm.getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m); c.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); c.nor.push(v.x, v.y, v.z);
        c.col.push(cl.r, cl.g, cl.b);
      }
    };
    const heightAt = (x, z) => {
      if (x < 0 || z < 0 || x >= W || z >= W) return -1.5;
      const t = map.tiles[z * W + x];
      return TILE_H[t] !== undefined ? TILE_H[t] : 0;
    };
    for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
      const t = map.tiles[z * W + x];
      const h = heightAt(x, z);
      const base = TILE_COL[t] || '#ff00ff';
      let j = 0.93 + U.hash(x * 3 + 1, z * 5 + 7) * 0.12;
      if (t === T.GRASS || t === T.FOREST || t === T.MEADOW) j *= 0.94 + U.fbm(x * 0.2, z * 0.2) * 0.14;
      if (t === T.WATER) j = 0.8 + Math.min(0.4, Math.max(0, map.lakeVal[z * W + x] + 3) * 0.1);
      col.set(base).multiplyScalar(j);
      const c = chunkOf(x, z);
      quad(c, [x, h, z], [x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z], [0, 1, 0], col);
      // only the +x and +z sides can ever face the camera
      const hx = heightAt(x + 1, z), hz = heightAt(x, z + 1);
      if (hx < h - 0.001) quad(c, [x + 1, h, z], [x + 1, h, z + 1], [x + 1, hx, z + 1], [x + 1, hx, z], [1, 0, 0], col);
      if (hz < h - 0.001) quad(c, [x, h, z + 1], [x, hz, z + 1], [x + 1, hz, z + 1], [x + 1, h, z + 1], [0, 0, 1], col);
    }

    // ---- water ----
    const wtex = pixelTex(32, 32, (ctx) => {
      ctx.fillStyle = '#3a78b8'; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#4a8cc8';
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(U.hash(i, 1) * 32), Math.floor(U.hash(i, 2) * 32), 2 + Math.floor(U.hash(i, 3) * 3), 1);
      ctx.fillStyle = '#9ad0f0';
      for (let i = 0; i < 10; i++) ctx.fillRect(Math.floor(U.hash(i, 5) * 32), Math.floor(U.hash(i, 6) * 32), 2, 1);
    }, W / 6);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, W + 40), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.82 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(W / 2, -0.12, W / 2);
    scene.add(water);
    anim.water = wtex;

    // ---- road markings ----
    const markCol = new THREE.Color(0xf2dc7a);
    for (let z = 1; z < W - 1; z++) for (let x = 1; x < W - 1; x++) {
      if (map.tiles[z * W + x] !== T.ROAD) continue;
      const up = map.tiles[(z - 1) * W + x], dn = map.tiles[(z + 1) * W + x];
      const lf = map.tiles[z * W + x - 1], rt = map.tiles[z * W + x + 1];
      const y = 0.025;
      if (dn === T.ROAD && up !== T.ROAD && x % 3 === 0) quad(chunkOf(x, z), [x + 0.2, y, z + 0.95], [x + 0.2, y, z + 1.05], [x + 0.8, y, z + 1.05], [x + 0.8, y, z + 0.95], [0, 1, 0], markCol);
      if (rt === T.ROAD && lf !== T.ROAD && z % 3 === 0) quad(chunkOf(x, z), [x + 0.95, y, z + 0.2], [x + 0.95, y, z + 0.8], [x + 1.05, y, z + 0.8], [x + 1.05, y, z + 0.2], [0, 1, 0], markCol);
    }

    // ---- trees, rocks, bushes, flowers ----
    const G_TRUNK = tmpl(new THREE.BoxGeometry(0.28, 0.9, 0.28));
    const G_CONE1 = tmpl(new THREE.ConeGeometry(0.85, 1.3, 6));
    const G_CONE2 = tmpl(new THREE.ConeGeometry(0.6, 1.1, 6));
    const G_LEAF1 = tmpl(new THREE.BoxGeometry(1.25, 0.95, 1.25));
    const G_LEAF2 = tmpl(new THREE.BoxGeometry(0.8, 0.5, 0.8));
    const G_ROCK = tmpl(new THREE.DodecahedronGeometry(0.42));
    const G_BUSH = tmpl(new THREE.IcosahedronGeometry(0.38, 0));
    const G_FLOWER = tmpl(new THREE.BoxGeometry(0.14, 0.14, 0.14));
    const trunkCol = new THREE.Color(0x6a4a2a);
    for (const t of map.trees) {
      const c = chunkOf(t.x, t.z), s2 = t.s;
      dummy.rotation.set(0, 0, 0); dummy.scale.set(s2, s2, s2);
      dummy.position.set(t.x + 0.5, 0.45 * s2, t.z + 0.5); dummy.updateMatrix(); append(c, G_TRUNK, dummy.matrix, trunkCol);
      if (t.kind === 'pine') {
        dummy.rotation.y = U.hash(t.x, t.z) * 3;
        col.set('#2f6a3a').multiplyScalar(0.85 + U.hash(t.z, t.x) * 0.3);
        dummy.position.set(t.x + 0.5, 1.15 * s2, t.z + 0.5); dummy.updateMatrix(); append(c, G_CONE1, dummy.matrix, col);
        col.multiplyScalar(1.12);
        dummy.position.set(t.x + 0.5, 1.85 * s2, t.z + 0.5); dummy.updateMatrix(); append(c, G_CONE2, dummy.matrix, col);
      } else {
        col.set(U.hash(t.x, t.z) > 0.85 ? '#c8783a' : '#4a8a3a').multiplyScalar(0.85 + U.hash(t.z, t.x) * 0.3);
        dummy.position.set(t.x + 0.5, 1.25 * s2, t.z + 0.5); dummy.updateMatrix(); append(c, G_LEAF1, dummy.matrix, col);
        col.multiplyScalar(1.15);
        dummy.position.set(t.x + 0.5, 1.9 * s2, t.z + 0.5); dummy.updateMatrix(); append(c, G_LEAF2, dummy.matrix, col);
      }
    }
    for (const r of map.rocks) {
      dummy.position.set(r.x + 0.5, 0.2, r.z + 0.5); dummy.scale.set(r.s * 1.3, r.s, r.s * 1.2); dummy.rotation.set(0, r.s * 5, 0); dummy.updateMatrix();
      col.set('#8a8a92').multiplyScalar(0.8 + r.s * 0.4);
      append(chunkOf(r.x, r.z), G_ROCK, dummy.matrix, col);
    }
    dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0);
    for (const b of map.bushes) {
      dummy.position.set(b.x + 0.3 + U.hash(b.x, 4) * 0.4, 0.22, b.z + 0.3 + U.hash(b.z, 9) * 0.4); dummy.updateMatrix();
      col.set('#3d7a2e').multiplyScalar(0.9 + U.hash(b.x, b.z) * 0.3);
      append(chunkOf(b.x, b.z), G_BUSH, dummy.matrix, col);
    }
    const FC = ['#ff8ac8', '#ffe066', '#ffffff', '#9a8aff', '#ff6a4a', '#7af8ff'];
    for (const f of map.flowers) {
      for (let q = 0; q < 3; q++) {
        dummy.position.set(f.x + U.hash(f.x + q, f.z) * 0.9 + 0.05, 0.08, f.z + U.hash(f.z, f.x + q) * 0.9 + 0.05); dummy.updateMatrix();
        col.set(FC[f.c]).multiplyScalar(1.15);
        append(chunkOf(f.x, f.z), G_FLOWER, dummy.matrix, col);
      }
    }

    // ---- turn every chunk into one mesh ----
    const chunkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const c of chunks) {
      if (!c || !c.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
      g.computeBoundingSphere();
      scene.add(new THREE.Mesh(g, chunkMat));
    }
    [G_TRUNK, G_CONE1, G_CONE2, G_LEAF1, G_LEAF2, G_ROCK, G_BUSH, G_FLOWER].forEach((g) => g.dispose());

    // ---- buildings ----
    for (const b of map.buildings) scene.add(makeBuilding(b));

    // ---- lamp posts along Aldersprings Lane ----
    for (let x = 86; x <= 128; x += 6) {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), lam(0x333338)); post.position.y = 0.9; g.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), basic(0xfff0a0)); lamp.position.y = 1.85; g.add(lamp);
      g.position.set(x + 0.5, 0, 39.3);
      scene.add(g);
    }

    // ---- bridge railings ----
    const rails = [];
    for (let z = 1; z < W - 1; z++) for (let x = 1; x < W - 1; x++) {
      const t = map.tiles[z * W + x];
      if (t !== T.BRIDGE && t !== T.DAM) continue;
      if (map.tiles[(z - 1) * W + x] === T.WATER) rails.push([x + 0.5, z + 0.06, 1, 0.08]);
      if (map.tiles[(z + 1) * W + x] === T.WATER) rails.push([x + 0.5, z + 0.94, 1, 0.08]);
      if (map.tiles[z * W + x - 1] === T.WATER) rails.push([x + 0.06, z + 0.5, 0.08, 1]);
      if (map.tiles[z * W + x + 1] === T.WATER) rails.push([x + 0.94, z + 0.5, 0.08, 1]);
    }
    if (rails.length) {
      const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.35, 1), lam(0x6a5038), rails.length);
      rails.forEach((r, i) => { dummy.position.set(r[0], 0.3, r[1]); dummy.scale.set(r[2], 1, r[3]); dummy.updateMatrix(); rm.setMatrixAt(i, dummy.matrix); });
      dummy.scale.set(1, 1, 1);
      scene.add(rm);
    }

    // ---- set pieces ----
    buildOutpost(scene);
    buildPier(scene);
    buildCamps(scene);
    buildIsland(scene);
    buildDam(scene);
    buildExpansion(scene);
    return anim;
  }

  function addBox(g, w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); g.add(m); return m;
  }

  function makeBuilding(b) {
    const g = new THREE.Group();
    const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
    const wall = lam(b.wall);
    addBox(g, b.w - 0.1, b.h, b.d - 0.1, 0, b.h / 2, 0, wall);
    // trim strip
    addBox(g, b.w, 0.15, b.d, 0, 0.07, 0, lam(U.shade(b.wall, 0.6)));
    const win = basic(0x9ad8ff);
    const winDark = basic(0x2a3a5a);
    if (b.kind === 'flats') {
      for (let fl = 0; fl < Math.floor(b.h / 1.3); fl++) {
        for (let i = 0; i < Math.floor(b.w / 1.2); i++) addBox(g, 0.5, 0.5, 0.05, -b.w / 2 + 0.8 + i * 1.2, 0.9 + fl * 1.3, b.d / 2 - 0.02, (i + fl) % 3 ? win : winDark);
        for (let i = 0; i < Math.floor(b.d / 1.2); i++) addBox(g, 0.05, 0.5, 0.5, b.w / 2 - 0.02, 0.9 + fl * 1.3, -b.d / 2 + 0.8 + i * 1.2, (i + fl) % 2 ? win : winDark);
      }
      addBox(g, b.w + 0.2, 0.2, b.d + 0.2, 0, b.h + 0.1, 0, lam(b.roof));
      addBox(g, 0.9, 1.3, 0.1, 0, 0.65, b.d / 2, lam(0x3a2a1a));
    } else if (b.kind === 'factory') {
      // sawtooth roof
      for (let i = 0; i < 3; i++) {
        const r = addBox(g, b.w / 3, 0.9, b.d, -b.w / 3 + (i * b.w) / 3, b.h + 0.35, 0, lam(b.roof));
        r.rotation.z = 0.35;
        addBox(g, b.w / 3 - 0.2, 0.5, 0.05, -b.w / 3 + (i * b.w) / 3, b.h + 0.4, b.d / 2, win);
      }
      // roller door
      addBox(g, 2.4, 2.0, 0.08, -1.5, 1.0, b.d / 2, lam(0x8a9aaa));
      for (let i = 0; i < 6; i++) addBox(g, 2.4, 0.04, 0.1, -1.5, 0.2 + i * 0.32, b.d / 2 + 0.01, lam(0x6a7a8a));
      // sign
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 0.1), new THREE.MeshBasicMaterial({ map: textTex('VOLT VALENTINE', '#ffe066', '#1a2a3a', 96, 22) }));
      sign.position.set(1.6, b.h - 0.6, b.d / 2 + 0.06); g.add(sign);
      // scooters out front
      for (let i = 0; i < 3; i++) {
        const sc = new THREE.Group();
        addBox(sc, 0.7, 0.08, 0.2, 0, 0.12, 0, lam([0x2ad0ff, 0xff4fd8, 0xffe066][i]));
        addBox(sc, 0.05, 0.6, 0.05, 0.3, 0.42, 0, lam(0x333333));
        addBox(sc, 0.05, 0.05, 0.4, 0.3, 0.72, 0, lam(0x333333));
        sc.position.set(2.5 + i * 0.6, 0, b.d / 2 + 0.8);
        g.add(sc);
      }
    } else if (b.kind === 'warehouse') {
      const r = addBox(g, b.w + 0.2, 0.3, b.d + 0.2, 0, b.h + 0.15, 0, lam(b.roof));
      void r;
      addBox(g, 3.2, 2.4, 0.08, 0, 1.2, b.d / 2, lam(0x8a8a90));
      for (let i = 0; i < 7; i++) addBox(g, 3.2, 0.04, 0.1, 0, 0.2 + i * 0.32, b.d / 2 + 0.01, lam(0x5a5a60));
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.1), new THREE.MeshBasicMaterial({ map: textTex('GOON HQ', '#ff4fd8', '#1a1a22', 96, 20) }));
      sign.position.set(0, b.h - 0.6, b.d / 2 + 0.06); g.add(sign);
      for (let i = 0; i < 4; i++) addBox(g, 0.7, 0.7, 0.7, -b.w / 2 + 1 + i * 0.9, 0.35, b.d / 2 + 1.4, lam(0x8a6a3a));
    } else if (b.kind === 'church') {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), lam(b.roof));
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((b.w / Math.SQRT2) * 1.1, b.h * 0.7, (b.d / Math.SQRT2) * 1.1);
      roof.position.y = b.h + (b.h * 0.7) / 2; g.add(roof);
      addBox(g, 1.2, b.h + 2.2, 1.2, 0, (b.h + 2.2) / 2, b.d / 2 - 0.6, lam(b.wall));
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), lam(b.roof)); spire.rotation.y = Math.PI / 4; spire.position.set(0, b.h + 3.1, b.d / 2 - 0.6); g.add(spire);
      addBox(g, 0.1, 0.6, 0.1, 0, b.h + 4.2, b.d / 2 - 0.6, lam(0xd8c070));
      addBox(g, 0.4, 0.1, 0.1, 0, b.h + 4.3, b.d / 2 - 0.6, lam(0xd8c070));
      addBox(g, 0.9, 1.5, 0.08, 0, 0.75, b.d / 2, lam(0x4a2a1a));
      addBox(g, 0.06, 0.9, 0.5, b.w / 2, 1.6, -1, basic(0x7a5aa8));
      addBox(g, 0.06, 0.9, 0.5, b.w / 2, 1.6, 1, basic(0xa85a5a));
    } else if (b.kind === 'stage') {
      // stage faces +x (towards the camera and the crowd)
      addBox(g, b.w + 0.4, 0.2, b.d + 0.4, 0, b.h + 0.1, 0, lam(0x1a0a2a));
      addBox(g, 0.4, 4.2, b.d, -b.w / 2 + 0.3, b.h + 2.1, 0, lam(0x1a1a22));
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(b.d * 0.6, 2.4), new THREE.MeshBasicMaterial({ map: textTex('DOGCORE', '#7af8ff', '#3a0a4a', 96, 24) }));
      scr.rotation.y = Math.PI / 2; scr.position.set(-b.w / 2 + 0.52, b.h + 2.5, 0); g.add(scr);
      for (const sz of [-b.d / 2 + 1, b.d / 2 - 1]) {
        addBox(g, 1.2, 3, 1.4, -0.5, b.h + 1.5, sz, lam(0x111111));
        addBox(g, 0.05, 0.9, 0.9, 0.12, b.h + 2.1, sz, basic(0xff4fd8));
        addBox(g, 0.05, 0.6, 0.6, 0.12, b.h + 0.9, sz, basic(0x7af8ff));
      }
      for (let i = 0; i < 7; i++) { const l = addBox(g, 0.3, 0.3, 0.3, -b.w / 2 + 0.6, b.h + 4.4, -b.d / 2 + 1.5 + i * 2.5, basic(i % 2 ? 0xff4fd8 : 0x7af8ff)); anim.orbs.push(l); }
      // crowd barrier in front of the stage
      for (let i = 0; i < 6; i++) addBox(g, 0.1, 0.6, 1.6, b.w / 2 + 0.9, 0.3, -b.d / 2 + 2 + i * 2.8, lam(0xc0c0c8));
    } else {
      // hip roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), lam(b.roof));
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((b.w / Math.SQRT2) * 1.12, b.h * 0.55, (b.d / Math.SQRT2) * 1.12);
      roof.position.y = b.h + (b.h * 0.55) / 2;
      g.add(roof);
      // door + windows facing +z (front) and +x
      addBox(g, 0.7, 1.2, 0.08, -0.3, 0.6, b.d / 2, lam(U.shade(b.roof, 0.8)));
      addBox(g, 0.08, 0.08, 0.1, -0.05, 0.6, b.d / 2 + 0.05, basic(0xffe066));
      addBox(g, 0.8, 0.6, 0.06, b.w / 2 - 1.2, 1.3, b.d / 2, win);
      addBox(g, 0.8, 0.6, 0.06, -b.w / 2 + 1.0, 1.3, b.d / 2, win);
      addBox(g, 0.06, 0.6, 0.8, b.w / 2, 1.3, 0, win);
      if (b.id === 'sinder_house') {
        // creepy porch + rocking chair + cobweb-dark windows
        addBox(g, b.w, 0.12, 1.2, 0, 0.06, b.d / 2 + 0.6, lam(0x4a3a2a));
        addBox(g, 0.5, 0.5, 0.5, 1.6, 0.4, b.d / 2 + 0.6, lam(0x3a2a1a));
      }
      if (b.id === 'eli_house') {
        // doghouse in the yard (empty... for now)
        const k = new THREE.Group();
        addBox(k, 0.9, 0.7, 0.9, 0, 0.35, 0, lam(0xc8884a));
        const kr = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 4), lam(0xb4413a)); kr.rotation.y = Math.PI / 4; kr.position.y = 0.95; k.add(kr);
        addBox(k, 0.4, 0.45, 0.05, 0, 0.22, 0.46, basic(0x1a1010));
        k.position.set(b.w / 2 + 0.9, 0, -0.6);
        g.add(k);
      }
      if (b.id === 'roby_house') {
        // satellite dish & bug garden sign
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.1, 0.2, 8), lam(0xdddddd)); dish.position.set(1.5, b.h + 0.9, 0.8); dish.rotation.z = 0.7; g.add(dish);
      }
      if (b.id === 'townhall') {
        for (let i = 0; i < 4; i++) addBox(g, 0.25, b.h, 0.25, -b.w / 2 + 0.8 + i * 1.5, b.h / 2, b.d / 2 + 0.3, lam(0xf8f8f0));
      }
    }
    g.position.set(cx, 0, cz);
    return g;
  }

  function textTex(text, fg, bg, w, h) {
    return pixelTex(w, h, (ctx) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = fg; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 1);
    });
  }

  function buildOutpost(scene) {
    const g = new THREE.Group();
    const bag = lam(0xb8a878);
    // sandbag ring
    for (let a = 0; a < 26; a++) {
      const t = (a / 26) * Math.PI * 2;
      if (t > 0.35 && t < 1.15) continue; // gap toward the road (north-east)
      const r = 6.2;
      const m = addBox(g, 0.9, 0.45, 0.5, Math.cos(t) * r, 0.22, Math.sin(t) * r, bag);
      m.rotation.y = -t + Math.PI / 2;
    }
    // tents
    for (const [x, z] of [[-3, 2], [2.5, 3]]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.5, 4), lam(0x5a6a3a));
      tent.rotation.y = Math.PI / 4; tent.position.set(x, 0.75, z); g.add(tent);
    }
    // flag
    addBox(g, 0.08, 3.2, 0.08, -1, 1.6, -2, lam(0x888888));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: pixelTex(12, 8, (ctx) => {
      ctx.fillStyle = '#4a5a2a'; ctx.fillRect(0, 0, 12, 8); ctx.fillStyle = '#ffe066';
      ctx.fillRect(4, 2, 4, 4); ctx.fillStyle = '#c86a2a'; ctx.fillRect(5, 3, 2, 2);
    }), side: THREE.DoubleSide }));
    flag.position.set(-0.45, 2.85, -2); g.add(flag);
    anim.flags.push(flag);
    // crates
    addBox(g, 0.7, 0.7, 0.7, 3.5, 0.35, -2.5, lam(0x8a6a3a));
    addBox(g, 0.6, 0.6, 0.6, 3.6, 1.0, -2.4, lam(0x9a7a4a));
    // target dummy
    addBox(g, 0.1, 1.2, 0.1, -4, 0.6, -1, lam(0x6a4a2a));
    addBox(g, 0.5, 0.5, 0.15, -4, 1.1, -1, lam(0xe04040));
    g.position.set(119, 0, 62);
    scene.add(g);
    // mark sandbags solid on the map
    for (let a = 0; a < 26; a++) {
      const t = (a / 26) * Math.PI * 2;
      if (t > 0.35 && t < 1.15) continue;
      setSolid(Math.floor(119 + Math.cos(t) * 6.2), Math.floor(62 + Math.sin(t) * 6.2));
    }
  }

  function buildPier(scene) {
    const g = new THREE.Group();
    const p = map.pier;
    for (let x = p.x; x <= p.x + 3; x += 2) {
      addBox(g, 0.15, 0.9, 0.15, x + 0.5, -0.3, p.z - 0.05, lam(0x5a3a1a));
      addBox(g, 0.15, 0.9, 0.15, x + 0.5, -0.3, p.z + 2.05, lam(0x5a3a1a));
    }
    // little stage + mic
    addBox(g, 2, 0.3, 1.6, 86.5, 0.15, 58.5, lam(0x8a3a5a));
    addBox(g, 0.05, 1.2, 0.05, 86.5, 0.9, 58.6, lam(0x333333));
    addBox(g, 0.12, 0.15, 0.12, 86.5, 1.55, 58.6, lam(0x222222));
    // island dock posts
    const d = map.isleDock;
    addBox(g, 0.15, 0.9, 0.15, d.x + 0.5, -0.3, d.z - 0.6, lam(0x5a3a1a));
    addBox(g, 0.15, 0.9, 0.15, d.x + 1.5, -0.3, d.z + 1.5, lam(0x5a3a1a));
    scene.add(g);
  }

  function kennel(g, x, z, c) {
    const k = new THREE.Group();
    addBox(k, 1.0, 0.75, 1.0, 0, 0.37, 0, lam(c));
    const kr = new THREE.Mesh(new THREE.ConeGeometry(0.82, 0.55, 4), lam(0x5a2a2a)); kr.rotation.y = Math.PI / 4; kr.position.y = 1.0; k.add(kr);
    addBox(k, 0.45, 0.5, 0.05, 0, 0.25, 0.51, basic(0x100808));
    // bowl
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.1, 8), lam(0xd02a2a)); bowl.position.set(0.6, 0.05, 0.7); k.add(bowl);
    k.position.set(x, 0, z); g.add(k);
  }

  function buildCamps(scene) {
    const g = new THREE.Group();
    const camps = [[72, 15], [101, 80], [22, 47], [40, 8], [12, 64], [132, 112], [178, 105], [144, 84], [40, 186], [186, 112]];
    camps.forEach(([cx, cz], i) => {
      kennel(g, cx - 2.5, cz - 2.2, ['#8a6a4a', '#6a5a7a', '#7a7a4a'][i % 3]);
      kennel(g, cx + 2.6, cz - 1.8, ['#7a4a3a', '#5a6a6a', '#8a5a5a'][i % 3]);
      if (i < 3) kennel(g, cx - 2.2, cz + 2.6, '#6a5a4a');
      // campfire
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 5), basic(0xff8a2a));
      fire.position.set(cx + 0.2, 0.25, cz + 0.3); g.add(fire);
      anim.lamps.push(fire);
    });
    // scrapyard junk
    for (let i = 0; i < 14; i++) {
      const x = 67 + U.hash(i, 77) * 11, z = 10 + U.hash(i, 78) * 11;
      if (U.dist(x, z, 72, 15) < 3) continue;
      const s = 0.4 + U.hash(i, 79) * 0.7;
      const m = addBox(g, s * 1.4, s, s, x, s / 2, z, lam([0x7a6a5a, 0x5a6a7a, 0x8a4a3a, 0x6a6a6a][i % 4]));
      m.rotation.y = U.hash(i, 80) * 3;
      setSolid(Math.floor(x), Math.floor(z));
    }
    // a rusty car
    const car = new THREE.Group();
    addBox(car, 2, 0.6, 1, 0, 0.45, 0, lam(0x8a4a2a));
    addBox(car, 1.1, 0.45, 0.9, -0.1, 0.95, 0, lam(0x7a3a1a));
    car.position.set(76.5, 0, 12.5); car.rotation.y = 0.4; g.add(car);
    setSolid(76, 12); setSolid(77, 12); setSolid(76, 13);
    scene.add(g);
  }

  function buildIsland(scene) {
    const g = new THREE.Group();
    const s = map.spire;
    const cx = s.x + 0.5, cz = s.z + 0.5;
    const purple = lam(0x5a2a8a), gold = lam(0xffd23a), pink = basic(0xff4fd8);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 1.2, 8), purple); base.position.set(cx, 0.6, cz); g.add(base);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 4, 8), lam(0x6a3a9a)); mid.position.set(cx, 3.2, cz); g.add(mid);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.25, 8), gold); ring.position.set(cx, 5.2, cz); g.add(ring);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 8), purple); top.position.set(cx, 6.6, cz); g.add(top);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), pink); orb.position.set(cx, 8.4, cz); g.add(orb);
    anim.orbs.push(orb);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addBox(g, 0.3, 0.4, 0.05, cx + Math.cos(a) * 1.2, 3 + (i % 2), cz + Math.sin(a) * 1.2, basic(i % 2 ? 0x7af8ff : 0xff4fd8)).rotation.y = -a + Math.PI / 2;
    }
    // gold lambo (flexing)
    const car = new THREE.Group();
    addBox(car, 2.2, 0.4, 1.0, 0, 0.3, 0, gold);
    addBox(car, 1.0, 0.3, 0.85, -0.1, 0.62, 0, basic(0x2a1a3a));
    addBox(car, 0.1, 0.2, 1.0, 1.1, 0.35, 0, basic(0xff4fd8));
    car.position.set(cx - 3, 0, cz + 2.2); car.rotation.y = 0.6; g.add(car);
    setSolid(Math.floor(cx - 3), Math.floor(cz + 2.2)); setSolid(Math.floor(cx - 3.8), Math.floor(cz + 2.2));
    // speaker stacks
    for (const [ox, oz] of [[3.2, -1.5], [-3.2, -1.2]]) {
      addBox(g, 0.8, 1.6, 0.8, cx + ox, 0.8, cz + oz, lam(0x1a1a1a));
      addBox(g, 0.5, 0.5, 0.05, cx + ox, 1.2, cz + oz + 0.41, pink);
      addBox(g, 0.3, 0.3, 0.05, cx + ox, 0.5, cz + oz + 0.41, basic(0x7af8ff));
      setSolid(Math.floor(cx + ox), Math.floor(cz + oz));
    }
    scene.add(g);
    // barrier dome
    const bar = new THREE.Mesh(new THREE.SphereGeometry(map.ISLE.r + 2.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, wireframe: false }));
    bar.position.set(map.ISLE.x, -0.2, map.ISLE.z);
    scene.add(bar);
    const barWire = new THREE.Mesh(bar.geometry, new THREE.MeshBasicMaterial({ color: 0x7af8ff, transparent: true, opacity: 0.35, wireframe: true, depthWrite: false }));
    bar.add(barWire);
    anim.barrier = bar;
  }

  function buildDam(scene) {
    const g = new THREE.Group();
    // concrete face on the downstream side
    for (let i = -14; i <= 14; i += 2) {
      const x = 126 + i / 2 + 0.5, z = 126 - i / 2 + 0.5;
      addBox(g, 0.4, 1.0, 0.4, x + 1.2, -0.4, z + 1.2, lam(0x8a8a84));
    }
    scene.add(g);
  }

  // ---- expansion set pieces: festival fence & gate, watchtowers, park, graveyard ----
  let gateMesh = null;
  function buildExpansion(scene) {
    const g = new THREE.Group();
    const F = map.festival;
    const fenceMat = lam(0x2a2a32), railMat = lam(0xff4fd8);
    // fence panels along the perimeter
    const seg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = addBox(g, len, 1.6, 0.15, (x0 + x1) / 2, 0.8, (z0 + z1) / 2, fenceMat);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      const r = addBox(g, len, 0.12, 0.2, (x0 + x1) / 2, 1.65, (z0 + z1) / 2, railMat);
      r.rotation.y = m.rotation.y;
    };
    const gx0 = F.gate[0][0], gx1 = F.gate[F.gate.length - 1][0] + 1;
    seg(F.x0 + 0.5, F.z0 + 0.5, gx0, F.z0 + 0.5);
    seg(gx1, F.z0 + 0.5, F.x1 + 0.5, F.z0 + 0.5);
    seg(F.x0 + 0.5, F.z1 + 0.5, F.x1 + 0.5, F.z1 + 0.5);
    seg(F.x0 + 0.5, F.z0 + 0.5, F.x0 + 0.5, F.z1 + 0.5);
    seg(F.x1 + 0.5, F.z0 + 0.5, F.x1 + 0.5, F.z1 + 0.5);
    // gate arch + closable gate
    for (const x of [gx0 - 0.3, gx1 + 0.3]) addBox(g, 0.4, 3.2, 0.4, x, 1.6, F.z0 + 0.5, lam(0x111111));
    const arch = new THREE.Mesh(new THREE.BoxGeometry(gx1 - gx0 + 1.4, 0.8, 0.3), new THREE.MeshBasicMaterial({ map: textTex('DOGCORE FEST', '#ffe066', '#3a0a4a', 96, 20) }));
    arch.position.set((gx0 + gx1) / 2, 3.3, F.z0 + 0.5); g.add(arch);
    gateMesh = addBox(g, gx1 - gx0, 1.8, 0.2, (gx0 + gx1) / 2, 0.9, F.z0 + 0.5, lam(0xffd23a));
    // light towers & banners inside
    for (const [x, z] of [[F.x0 + 3, F.z0 + 4], [F.x1 - 3, F.z0 + 4], [F.x0 + 3, F.z1 - 9], [F.x1 - 3, F.z1 - 9]]) {
      addBox(g, 0.3, 5, 0.3, x, 2.5, z, lam(0x333338));
      const l = addBox(g, 0.8, 0.5, 0.5, x, 5, z, basic(0xffffff)); anim.orbs.push(l);
      setSolid(Math.floor(x), Math.floor(z));
    }
    for (let i = 0; i < 8; i++) {
      const x = F.x0 + 4 + i * 4, z = F.z0 + 2;
      const b = addBox(g, 0.05, 1.2, 0.8, x, 2.2, z, basic([0xff4fd8, 0x7af8ff, 0xffe066][i % 3]));
      b.rotation.y = Math.PI / 2;
    }
    // watchtowers
    for (const tw of map.towers) {
      const t = new THREE.Group();
      for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) addBox(t, 0.12, 3.2, 0.12, dx, 1.6, dz, lam(0x6a4a2a));
      addBox(t, 1.4, 0.15, 1.4, 0, 3.2, 0, lam(0x8a6a3a));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 4), lam(0x4a5a2a)); roof.rotation.y = Math.PI / 4; roof.position.y = 4.1; t.add(roof);
      for (let k = 0; k < 4; k++) addBox(t, 0.6, 0.06, 0.06, 0.3, 0.5 + k * 0.7, 0.5, lam(0x6a4a2a));
      t.position.set(tw.x + 0.5, 0, tw.z + 0.5);
      g.add(t);
    }
    // Ramsey Creek picnic tables
    for (const [x, z] of [[141, 84], [145, 83], [143, 88]]) {
      addBox(g, 1.4, 0.1, 0.7, x, 0.6, z, lam(0x8a5a2a));
      addBox(g, 1.4, 0.08, 0.25, x, 0.35, z - 0.55, lam(0x7a4a2a));
      addBox(g, 1.4, 0.08, 0.25, x, 0.35, z + 0.55, lam(0x7a4a2a));
    }
    // graveyard by the old church
    for (let i = 0; i < 9; i++) {
      const x = 52 + (i % 3) * 2, z = 177 + Math.floor(i / 3) * 2.5;
      addBox(g, 0.5, 0.7, 0.15, x, 0.35, z, lam(0x8a8a8a));
      setSolid(Math.floor(x), Math.floor(z));
    }
    // I-77 sign
    const sgn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.1), new THREE.MeshBasicMaterial({ map: textTex('I-77', '#ffffff', '#1a6a3a', 48, 26) }));
    sgn.position.set(148.5, 2.2, 60); g.add(sgn);
    addBox(g, 0.1, 1.8, 0.1, 148.5, 0.9, 59.9, lam(0x888888));
    scene.add(g);
  }
  function openGate() {
    if (gateMesh) gateMesh.visible = false;
    for (const [x, z] of map.festival.gate) map.solid[z * map.W + x] = 0;
  }

  function setSolid(x, z) { if (x >= 0 && z >= 0 && x < map.W && z < map.W) map.solid[z * map.W + x] = 1; }
  function solidAt(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    if (xi < 0 || zi < 0 || xi >= map.W || zi >= map.W) return true;
    return map.solid[zi * map.W + xi] === 1;
  }
  function tileAt(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    if (xi < 0 || zi < 0 || xi >= map.W || zi >= map.W) return T.WATER;
    return map.tiles[zi * map.W + xi];
  }
  // nearest walkable tile centre to (x,z)
  function snap(x, z) {
    if (!solidAt(x, z)) return { x, z };
    for (let r = 1; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
      const nx = Math.floor(x) + dx + 0.5, nz = Math.floor(z) + dz + 0.5;
      if (!solidAt(nx, nz)) return { x: nx, z: nz };
    }
    return { x, z };
  }
  function update(t) {
    if (anim.water) { anim.water.offset.x = (t * 0.02) % 1; anim.water.offset.y = Math.sin(t * 0.3) * 0.02; }
    if (anim.barrier && anim.barrier.visible) {
      anim.barrier.material.opacity = 0.16 + Math.sin(t * 2) * 0.06;
      anim.barrier.material.color.setHSL(0.85 + Math.sin(t * 0.7) * 0.08, 1, 0.6);
      anim.barrier.rotation.y = t * 0.1;
    }
    for (const o of anim.orbs) { o.rotation.y = t * 1.5; o.position.y = 8.4 + Math.sin(t * 2) * 0.2; }
    for (const f of anim.flags) f.rotation.y = Math.sin(t * 2.3) * 0.25;
    for (const l of anim.lamps) l.scale.set(1, 0.8 + Math.sin(t * 13 + l.position.x) * 0.25, 1);
  }

  return { build, solidAt, tileAt, snap, update, openGate, get map() { return map; }, TILE_COL, anim };
})();
