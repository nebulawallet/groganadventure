// ---------- Lake Norman map generation (pure data, no THREE) ----------
// Grid: x grows to screen-right/down, z grows to screen-left/down.
// Screen "north" (up) is small x+z. Tile (x,z) covers world [x,x+1) x [z,z+1).
const MAPW = 200;
const T = { WATER: 0, GRASS: 1, SAND: 2, ROAD: 3, DIRT: 4, PAVE: 5, BRIDGE: 6, DOCK: 7, FOREST: 8, MEADOW: 9, ISLAND: 10, DAM: 11, FLOOR: 12 };

const LAKE_SEGS = [
  // main channel  [ax,az,bx,bz,ra,rb]
  [-4, -4, 30, 28, 5, 6], [30, 28, 50, 50, 6, 7], [50, 50, 68, 68, 7, 8], [68, 68, 90, 90, 8, 7],
  [90, 90, 110, 110, 6.5, 6], [110, 110, 124, 124, 6, 5.5],
  // arms
  [28, 26, 46, 13, 4, 3.5], [46, 13, 57, 9, 3.5, 2.5],
  [55, 55, 38, 68, 4.5, 4], [38, 68, 22, 84, 4, 3.5], [22, 84, 11, 99, 3.5, 2.5],
  [82, 82, 66, 98, 4.5, 4], [66, 98, 57, 115, 4, 2.5],
  [112, 112, 126, 101, 3, 2.5], [126, 101, 140, 93, 2.5, 2],
  // Catawba River below the dam, flowing into Mountain Island Lake
  [131, 131, 138, 148, 2.5, 3], [138, 148, 128, 164, 3, 3.5], [128, 164, 117, 173, 3.5, 5],
];
const MIL = { x: 108, z: 180, r: 11 };
const BASIN = { x: 68, z: 68, r: 17.5 };
const ISLE = { x: 68, z: 68, r: 7.5 };

function genWorld() {
  const W = MAPW;
  const tiles = new Uint8Array(W * W).fill(T.GRASS);
  const solid = new Uint8Array(W * W);
  const deco = []; // {type,x,z,...}
  const I = (x, z) => z * W + x;
  const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < W;
  const set = (x, z, t) => { if (inb(x, z)) tiles[I(x, z)] = t; };
  const get = (x, z) => (inb(x, z) ? tiles[I(x, z)] : T.WATER);

  // --- lake ---
  const lakeVal = new Float32Array(W * W);
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const cx = x + 0.5, cz = z + 0.5;
    let best = 99;
    for (const s of LAKE_SEGS) {
      const r = U.segDist(cx, cz, s[0], s[1], s[2], s[3]);
      const rad = U.lerp(s[4], s[5], r.t);
      best = Math.min(best, r.d - rad);
    }
    best = Math.min(best, Math.hypot(cx - BASIN.x, cz - BASIN.z) - BASIN.r);
    best = Math.min(best, Math.hypot(cx - MIL.x, cz - MIL.z) - MIL.r);
    best += (U.fbm(x * 0.15, z * 0.15) - 0.5) * 3.2;
    // island
    const di = Math.hypot(cx - ISLE.x, cz - ISLE.z) - ISLE.r + (U.fbm(x * 0.3 + 9, z * 0.3) - 0.5) * 1.5;
    lakeVal[I(x, z)] = best;
    if (di < 0) { tiles[I(x, z)] = di < -1.2 ? T.ISLAND : T.SAND; continue; }
    if (best < 0) tiles[I(x, z)] = T.WATER;
    else if (best < 1.3) tiles[I(x, z)] = T.SAND;
  }
  // map edges: a little water/forest border handled by solid edge
  // --- forests & meadows by noise ---
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    if (get(x, z) !== T.GRASS) continue;
    const n = U.fbm(x * 0.07 + 31, z * 0.07 + 17, 3);
    const m = U.fbm(x * 0.09 + 101, z * 0.09 + 3, 2);
    if (n > 0.56) set(x, z, T.FOREST);
    else if (m > 0.62) set(x, z, T.MEADOW);
  }

  // --- painting helpers ---
  const fill = (x0, z0, w, d, t) => { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) set(x, z, t); };
  const road = (x0, z0, x1, z1, t = T.ROAD, wdt = 2) => {
    // axis aligned roads; bridges over water automatically
    const xs = Math.min(x0, x1), xe = Math.max(x0, x1), zs = Math.min(z0, z1), ze = Math.max(z0, z1);
    const horiz = z0 === z1;
    for (let z = zs; z <= ze + (horiz ? wdt - 1 : 0); z++) for (let x = xs; x <= xe + (horiz ? 0 : wdt - 1); x++) {
      const cur = get(x, z);
      if (cur === T.WATER) set(x, z, T.BRIDGE);
      else if (cur !== T.BRIDGE && cur !== T.DAM) set(x, z, t);
    }
  };
  const clearArea = (x0, z0, w, d, t = T.GRASS) => fill(x0, z0, w, d, t);

  // --- settlements (clear ground first) ---
  clearArea(80, 30, 52, 19, T.GRASS); // Aldersprings area
  clearArea(66, 4, 66, 24, T.GRASS); // Mooresville
  fill(88, 8, 14, 9, T.PAVE); // factory lot
  fill(108, 7, 16, 11, T.PAVE); // the estate courtyard
  clearArea(110, 54, 18, 16, T.DIRT); // fox outpost
  clearArea(66, 9, 14, 14, T.DIRT); // scrapyard
  clearArea(94, 74, 14, 13, T.DIRT); // doghouse camp
  clearArea(16, 42, 14, 12, T.DIRT); // denver goon camp
  // --- expansion: Davidson, Huntersville, Birkdale, festival, Terrell ---
  clearArea(152, 8, 46, 40, T.GRASS);  // Davidson
  fill(157, 44, 26, 16, T.PAVE);       // college quad
  clearArea(137, 80, 14, 11, T.MEADOW); // Ramsey Creek Park
  clearArea(166, 89, 27, 23, T.DIRT);  // goon warehouse yard
  clearArea(152, 115, 42, 30, T.GRASS); // Birkdale / Huntersville
  fill(153, 125, 38, 5, T.PAVE);       // Birkdale plaza
  fill(152, 160, 37, 35, T.DIRT);      // festival grounds
  clearArea(26, 156, 34, 16, T.GRASS); // Terrell
  clearArea(50, 172, 20, 20, T.GRASS); // church grounds
  for (const [tx, tz] of [[186, 64], [190, 146], [16, 184]]) clearArea(tx - 3, tz - 3, 7, 7, T.DIRT); // watchtowers

  // --- roads ---
  road(26, 40, 130, 40);            // Brawley Rd -> Aldersprings Lane (crosses N bridge)
  road(100, 8, 100, 40);            // Main St north
  road(66, 18, 130, 18);            // Mooresville cross street
  road(86, 42, 86, 61, T.DIRT);     // pier path
  road(118, 42, 118, 56);           // fox road
  road(124, 42, 124, 100);          // south road
  road(86, 100, 125, 100);          // S bridge road
  road(132, 100, 132, 121);         // dam road
  road(125, 100, 133, 100);
  road(26, 42, 26, 48, T.DIRT);     // west path to denver camp
  road(26, 48, 26, 100, T.DIRT);    // west trail south
  road(60, 18, 66, 18, T.DIRT);     // to state park pocket
  road(60, 2, 60, 18, T.DIRT);
  road(30, 2, 60, 2, T.DIRT);
  road(72, 102, 86, 102, T.DIRT);   // sherrills ford path
  road(72, 102, 72, 126, T.DIRT);
  road(26, 126, 120, 126, T.DIRT);  // southern trail to the dam
  road(26, 100, 26, 126, T.DIRT);
  road(130, 40, 190, 40);           // Griffith St to Davidson
  road(130, 18, 190, 18);           // Mooresville -> Davidson
  road(150, 2, 150, 196);           // I-77
  road(165, 18, 165, 44);           // Davidson Main St -> college
  road(140, 42, 140, 84, T.DIRT);   // Ramsey Creek Park path
  road(133, 100, 150, 100);
  road(150, 100, 190, 100);         // to the warehouse
  road(150, 130, 190, 130);         // Huntersville main road
  road(169, 130, 169, 159);         // festival approach
  road(132, 121, 132, 140);         // dam -> south (bridges the river)
  road(132, 140, 150, 140);
  road(26, 126, 26, 190, T.DIRT);   // west trail to Terrell
  road(10, 168, 100, 168, T.DIRT);  // Terrell Rd
  road(72, 126, 72, 168, T.DIRT);
  road(100, 168, 100, 176, T.DIRT); // Mountain Island Lake path
  road(186, 40, 186, 64, T.DIRT);   // watchtower paths
  road(186, 130, 186, 146, T.DIRT);
  road(16, 168, 16, 184, T.DIRT);

  // --- Cowans Ford Dam: concrete wall across the channel's south end ---
  for (let z = 112; z < W; z++) for (let x = 112; x < W; x++) {
    const along = x + z - 252;
    const across = x - z;
    if (Math.abs(along) <= 1.5 && Math.abs(across) <= 16) set(x, z, T.DAM);
    else if (along > 1.5 && along < 7 && Math.abs(across) <= 14 && get(x, z) === T.WATER) set(x, z, T.SAND);
  }
  // connect dam ends to trails
  road(118, 126, 126, 126, T.DIRT);

  // --- pier (dock into basin toward island) ---
  let dockStart = 86;
  for (let x = 86; x > 70; x--) { if (get(x, 62) === T.WATER) { dockStart = x; break; } }
  for (let x = dockStart + 1; x >= dockStart - 2; x--) { set(x, 61, T.DOCK); set(x, 62, T.DOCK); }
  const pier = { x: dockStart - 2, z: 61 };
  road(86, 61, dockStart + 1, 61, T.DIRT);
  // island dock (east side of island facing pier)
  let idx = 74;
  for (let x = 74; x < 86; x++) { if (get(x, 62) === T.WATER) { idx = x; break; } }
  for (let x = idx - 1; x <= idx; x++) { set(x, 61, T.DOCK); set(x, 62, T.DOCK); }
  const isleDock = { x: idx - 1, z: 61.5 };

  // --- edges are solid ---
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const t = get(x, z);
    if (t === T.WATER) solid[I(x, z)] = 1;
    if (x === 0 || z === 0 || x === W - 1 || z === W - 1) solid[I(x, z)] = 1;
  }

  // --- buildings (footprints) ---
  const buildings = [];
  const B = (o) => {
    buildings.push(o);
    for (let z = o.z; z < o.z + o.d; z++) for (let x = o.x; x < o.x + o.w; x++) { set(x, z, T.FLOOR); solid[I(x, z)] = 1; }
  };
  // Aldersprings Lane - north side (fronts face the lane)
  B({ id: 'eli_house', x: 88, z: 33, w: 6, d: 5, h: 2.4, wall: '#d9c7a1', roof: '#b4413a', label: "Eli's House" });
  B({ id: 'vea_house', x: 96, z: 33, w: 6, d: 5, h: 2.4, wall: '#f2d2dc', roof: '#8a5a9e', label: "Vea's House" });
  B({ id: 'rack_house', x: 104, z: 33, w: 6, d: 5, h: 2.2, wall: '#a9c7d8', roof: '#3f5f8a', label: "Rack's House" });
  B({ id: 'roby_house', x: 112, z: 32, w: 7, d: 6, h: 2.6, wall: '#cfd8a8', roof: '#4e6b3a', label: "Roby & Squid's" });
  B({ id: 'sinder_house', x: 122, z: 33, w: 6, d: 5, h: 2.6, wall: '#6f6a62', roof: '#2d2a33', label: "Sinder's House" });
  // south side generic houses
  B({ id: 'h1', x: 89, z: 44, w: 5, d: 5, h: 2.2, wall: '#e6dcc8', roof: '#7a4b33' });
  B({ id: 'h2', x: 103, z: 44, w: 5, d: 5, h: 2.2, wall: '#c8d8c0', roof: '#6b3b3b' });
  B({ id: 'h3', x: 126, z: 44, w: 5, d: 4, h: 2.2, wall: '#d8c0a8', roof: '#3b4b6b' });
  // Mooresville
  B({ id: 'factory', x: 89, z: 9, w: 9, d: 6, h: 3.4, wall: '#5d6b78', roof: '#2e3a46', kind: 'factory', label: 'Volt Valentine Scooters' });
  B({ id: 'flats', x: 110, z: 8, w: 6, d: 5, h: 5.2, wall: '#9b8c7c', roof: '#5a5048', kind: 'flats', label: 'The Estate' });
  B({ id: 'flats2', x: 117, z: 8, w: 5, d: 5, h: 4.4, wall: '#8c7f73', roof: '#4d443d', kind: 'flats' });
  B({ id: 'shop1', x: 103, z: 11, w: 4, d: 4, h: 2.2, wall: '#c96f4a', roof: '#3a2f2a', label: 'Lakeside Snacks' });
  B({ id: 'm1', x: 80, z: 11, w: 5, d: 4, h: 2.6, wall: '#b8a68a', roof: '#5b3d2d' });
  B({ id: 'm2', x: 104, z: 21, w: 5, d: 4, h: 2.4, wall: '#a8b8c8', roof: '#4b3b5b' });
  B({ id: 'm3', x: 112, z: 21, w: 6, d: 4, h: 2.4, wall: '#d8b8a0', roof: '#6b4b2b' });
  B({ id: 'townhall', x: 121, z: 21, w: 6, d: 5, h: 3.0, wall: '#e8e2d0', roof: '#33465c', label: 'Lake Norman Civic Hall' });
  // Cornelius / Davidson
  B({ id: 'c1', x: 127, z: 72, w: 5, d: 4, h: 2.4, wall: '#c9b79c', roof: '#5a3a2a' });
  B({ id: 'c2', x: 127, z: 80, w: 5, d: 4, h: 2.4, wall: '#b9c9ac', roof: '#3a4a5a' });
  B({ id: 'c3', x: 127, z: 88, w: 5, d: 4, h: 2.6, wall: '#d6c6e0', roof: '#4a2a5a' });
  // Denver
  B({ id: 'd1', x: 30, z: 84, w: 5, d: 4, h: 2.3, wall: '#c8b090', roof: '#6a3a2a' });
  B({ id: 'd2', x: 30, z: 92, w: 5, d: 4, h: 2.3, wall: '#a0b0a0', roof: '#2a3a4a' });

  // Davidson
  B({ id: 'dh1', x: 155, z: 22, w: 5, d: 4, h: 2.3, wall: '#e0d0b8', roof: '#6a3a2a' });
  B({ id: 'dh2', x: 172, z: 22, w: 5, d: 4, h: 2.3, wall: '#c0d0e0', roof: '#3a3a5a' });
  B({ id: 'dh3', x: 180, z: 30, w: 5, d: 4, h: 2.3, wall: '#d8c8d8', roof: '#5a2a3a' });
  B({ id: 'dh4', x: 155, z: 32, w: 5, d: 4, h: 2.3, wall: '#c8d8b0', roof: '#4a5a2a' });
  B({ id: 'college1', x: 159, z: 46, w: 8, d: 5, h: 3.2, wall: '#a04a36', roof: '#2e2e36', label: 'Davidson College' });
  B({ id: 'college2', x: 172, z: 46, w: 8, d: 5, h: 3.2, wall: '#a85a40', roof: '#2e2e36' });
  B({ id: 'chapel', x: 166, z: 54, w: 6, d: 5, h: 3.2, wall: '#e8e0d0', roof: '#3a4a5a', kind: 'church' });
  // Goon warehouse
  B({ id: 'warehouse', x: 172, z: 91, w: 12, d: 7, h: 3.8, wall: '#6a6a72', roof: '#3a3a40', kind: 'warehouse', label: 'Goon Warehouse' });
  // Birkdale Village (fronts face the plaza)
  B({ id: 'b1', x: 155, z: 119, w: 6, d: 5, h: 2.6, wall: '#c8a078', roof: '#5a3a2a' });
  B({ id: 'nf_shop', x: 163, z: 119, w: 6, d: 5, h: 2.6, wall: '#8a5a9e', roof: '#2a2a3a', label: "Ninefired's Bargains" });
  B({ id: 'comedy', x: 171, z: 119, w: 7, d: 5, h: 2.8, wall: '#3a2a4a', roof: '#1a1a2a', label: 'Birkdale Comedy Cellar' });
  B({ id: 'b4', x: 180, z: 119, w: 6, d: 5, h: 2.6, wall: '#a8c8b8', roof: '#3a5a4a' });
  // Huntersville
  B({ id: 'hv1', x: 155, z: 135, w: 5, d: 4, h: 2.3, wall: '#d8c0a0', roof: '#6a4a2a' });
  B({ id: 'hv2', x: 162, z: 135, w: 5, d: 4, h: 2.3, wall: '#b8c8d8', roof: '#3a4a6a' });
  B({ id: 'hv3', x: 175, z: 135, w: 5, d: 4, h: 2.3, wall: '#e0d8c0', roof: '#5a2a2a' });
  B({ id: 'hv4', x: 183, z: 135, w: 5, d: 4, h: 2.3, wall: '#c8d8c0', roof: '#2a4a3a' });
  // Terrell
  B({ id: 't1', x: 30, z: 160, w: 5, d: 4, h: 2.3, wall: '#c8b090', roof: '#5a3a2a' });
  B({ id: 't2', x: 38, z: 160, w: 5, d: 4, h: 2.3, wall: '#b0b8a0', roof: '#3a3a3a' });
  B({ id: 't3', x: 46, z: 160, w: 5, d: 4, h: 2.3, wall: '#d0c0b0', roof: '#4a2a3a' });
  B({ id: 'church', x: 58, z: 175, w: 5, d: 7, h: 3.0, wall: '#d8d0c0', roof: '#4a3a3a', kind: 'church', label: 'Old Terrell Church' });
  // Dogcore Festival: fenced arena, gate on the north side, stage at the south end
  B({ id: 'stage', x: 153, z: 169, w: 6, d: 18, h: 1.2, wall: '#2a1a3a', roof: '#ff4fd8', kind: 'stage' });
  const festival = { x0: 152, z0: 160, x1: 188, z1: 194, gate: [[169, 160], [170, 160]], cx: 168, cz: 178, shive: { x: 161, z: 178 }, bouncer: { x: 170, z: 157.5 } };
  for (let x = festival.x0; x <= festival.x1; x++) for (const z of [festival.z0, festival.z1]) solid[I(x, z)] = 1;
  for (let z = festival.z0; z <= festival.z1; z++) for (const x of [festival.x0, festival.x1]) solid[I(x, z)] = 1;
  const towers = [{ x: 186, z: 64 }, { x: 190, z: 146 }, { x: 16, z: 184 }];
  for (const tw of towers) solid[I(tw.x, tw.z)] = 1;

  // Shive's Spire (solid core on island)
  const spire = { x: ISLE.x - 1, z: ISLE.z - 3 };
  for (let z = spire.z - 1; z <= spire.z + 1; z++) for (let x = spire.x - 1; x <= spire.x + 1; x++) solid[I(x, z)] = 1;

  // --- decorations & trees ---
  const reserved = new Uint8Array(W * W);
  const reserve = (x, z, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inb(x + dx, z + dz)) reserved[I(x + dx, z + dz)] = 1; };

  const LOCS = [
    { id: 'aldersprings', name: 'Aldersprings Lane', x: 106, z: 40, r: 21 },
    { id: 'mooresville', name: 'Mooresville', x: 100, z: 16, r: 14 },
    { id: 'factory', name: 'Volt Valentine Scooters', x: 93, z: 16, r: 5, map: false },
    { id: 'estate', name: 'The Estate', x: 115, z: 15, r: 5, map: false },
    { id: 'outpost', name: "FlowingFox's Outpost", x: 119, z: 62, r: 8 },
    { id: 'pier', name: "Rivergrain's Jokestar Pier", x: 84, z: 61, r: 6 },
    { id: 'scrapyard', name: 'Mooresville Scrapyard', x: 72, z: 15, r: 7 },
    { id: 'doghouse', name: 'Doghouse Camp', x: 101, z: 80, r: 7 },
    { id: 'statepark', name: 'Lake Norman State Park', x: 40, z: 6, r: 12 },
    { id: 'denver', name: 'Denver', x: 22, z: 60, r: 18 },
    { id: 'denvercamp', name: 'Denver Goon Camp', x: 22, z: 47, r: 6, map: false },
    { id: 'meadows', name: 'Davidson Meadows', x: 126, z: 64, r: 10 },
    { id: 'cornelius', name: 'Cornelius', x: 124, z: 82, r: 10 },
    { id: 'sherrills', name: "Sherrills Ford", x: 80, z: 108, r: 12 },
    { id: 'dam', name: 'Cowans Ford Dam', x: 126, z: 125, r: 8 },
    { id: 'island', name: "Shive's Island", x: 68, z: 68, r: 10 },
    { id: 'nbridge', name: 'Brawley Bridge', x: 40, z: 41, r: 6, map: false },
    { id: 'sbridge', name: 'NC-73 Bridge', x: 99, z: 101, r: 6, map: false },
    { id: 'southwoods', name: 'Catawba Woods', x: 45, z: 120, r: 14 },
    { id: 'davidson', name: 'Davidson', x: 172, z: 28, r: 16 },
    { id: 'college', name: 'Davidson College', x: 170, z: 51, r: 8 },
    { id: 'ramsey', name: 'Ramsey Creek Park', x: 143, z: 86, r: 8 },
    { id: 'warehouse', name: 'Goon Warehouse', x: 178, z: 104, r: 9 },
    { id: 'birkdale', name: 'Birkdale Village', x: 171, z: 127, r: 12 },
    { id: 'huntersville', name: 'Huntersville', x: 172, z: 141, r: 12 },
    { id: 'festival', name: 'Dogcore Festival', x: 170, z: 172, r: 16 },
    { id: 'river', name: 'Catawba River', x: 135, z: 142, r: 8 },
    { id: 'mil', name: 'Mountain Island Lake', x: 106, z: 178, r: 14 },
    { id: 'terrell', name: 'Terrell', x: 40, z: 164, r: 12 },
    { id: 'church', name: 'Old Terrell Church', x: 60, z: 180, r: 7 },
  ];

  // reserve key areas from trees
  [[91, 39, 3], [100, 16, 6], [119, 62, 8], [84, 61, 4], [101, 80, 7], [72, 15, 7], [22, 47, 6], [40, 6, 3],
   [12, 62, 5], [132, 110, 5], [126, 126, 3], [68, 68, 7], [124, 64, 4],
   [144, 86, 5], [178, 104, 7], [171, 127, 6], [170, 157, 4], [60, 182, 7], [138, 66, 3], [176, 56, 3],
   [186, 64, 3], [190, 146, 3], [16, 184, 3], [140, 93, 3], [98, 180, 3]].forEach(([x, z, r]) => reserve(x, z, r));
  for (const b of buildings) reserve(b.x + (b.w >> 1), b.z + (b.d >> 1), (Math.max(b.w, b.d) >> 1) + 1);

  const trees = [], rocks = [], flowers = [], bushes = [];
  for (let z = 1; z < W - 1; z++) for (let x = 1; x < W - 1; x++) {
    const t = get(x, z);
    if (reserved[I(x, z)] || solid[I(x, z)]) continue;
    // keep 1 tile clear around roads
    let nearRoad = false;
    for (let dz = -1; dz <= 1 && !nearRoad; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = get(x + dx, z + dz);
      if (n === T.ROAD || n === T.DIRT || n === T.BRIDGE || n === T.DOCK || n === T.PAVE || n === T.FLOOR || n === T.DAM) { nearRoad = true; break; }
    }
    const h = U.hash(x * 7 + 3, z * 13 + 1);
    if (t === T.FOREST && !nearRoad && h < 0.42) { trees.push({ x, z, kind: h < 0.3 ? 'pine' : 'oak', s: 0.85 + U.hash(x, z + 99) * 0.35 }); solid[I(x, z)] = 1; }
    else if (t === T.GRASS && !nearRoad && h < 0.035) { trees.push({ x, z, kind: h < 0.02 ? 'oak' : 'pine', s: 0.8 + U.hash(x, z + 99) * 0.3 }); solid[I(x, z)] = 1; }
    else if ((t === T.GRASS || t === T.FOREST) && !nearRoad && h > 0.985) { rocks.push({ x, z, s: 0.5 + U.hash(z, x) * 0.4 }); solid[I(x, z)] = 1; }
    else if (t === T.MEADOW && h < 0.25) flowers.push({ x, z, c: Math.floor(U.hash(x + 5, z + 8) * 5) });
    else if ((t === T.GRASS || t === T.FOREST) && h > 0.93 && !nearRoad) bushes.push({ x, z });
    else if (t === T.ISLAND && h < 0.06) flowers.push({ x, z, c: 5 });
  }
  // nothing grows inside the festival
  for (let i = trees.length - 1; i >= 0; i--) { const t = trees[i]; if (t.x > festival.x0 && t.x < festival.x1 && t.z > festival.z0 && t.z < festival.z1) { solid[I(t.x, t.z)] = 0; trees.splice(i, 1); } }
  // gate starts closed
  for (const [gx, gz] of festival.gate) solid[I(gx, gz)] = 1;

  return { W, tiles, solid, lakeVal, buildings, trees, rocks, flowers, bushes, LOCS, pier, isleDock, spire, ISLE, BASIN, MIL, festival, towers };
}

if (typeof module !== 'undefined') module.exports = { genWorld, T, MAPW };
