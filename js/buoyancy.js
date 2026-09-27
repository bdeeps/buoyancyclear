// Shared parts for BuoyancyClear: densities of real materials and fluids, water and air density
// from temperature, brine density from salt, chart boards, arrows, tanks of water, a person,
// and phone/reel framing helpers.
// Scenes are built in metres of "display" space: +x right, +y up, +z towards the viewer.
import { THREE, M, box, beam, sphere, arrow, clamp } from './kit.js';

// ---------------------------------------------------------------- constants
export const G0 = 9.81;                        // m/s², standard gravity (9.806 65 by definition)
export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

// Densities at about 20 °C in kg/m³. Sources: CRC Handbook of Chemistry and Physics; Engineering
// ToolBox "Densities of solids" and "Liquids densities"; USGS "Water density".
//  cork 240 (bottle cork 0.12–0.24), pine wood 500 (dry softwood 0.35–0.60, air-dry teak ~0.65),
//  ice 917 (916.7 at 0 °C), aluminium 2,700, iron 7,870, gold 19,300 (19.32).
export const MATS = {
  cork: { name: 'Cork', rho: 240, col: 0xc49a6c, rough: 0.95 },
  wood: { name: 'Pine wood', rho: 500, col: 0xd8a868, rough: 0.8 },
  ice: { name: 'Ice', rho: 917, col: 0xd8f1ff, rough: 0.1, clear: true },
  water: { name: 'Water (in a thin bag)', short: 'Water', rho: 1000, col: 0x5fb4ff, rough: 0.1, clear: true },
  alu: { name: 'Aluminium', rho: 2700, col: 0xc9ced6, metal: true },
  iron: { name: 'Iron', rho: 7870, col: 0x8d949e, metal: true },
  gold: { name: 'Gold', rho: 19300, col: 0xf2c24b, metal: true },
};
export const MAT_ORDER = ['cork', 'wood', 'ice', 'water', 'alu', 'iron', 'gold'];

// Fluids. Sunflower oil ~920; fresh water 1,000; sea water 1,025 (average surface, salinity 35 g/kg,
// NOAA / Wikipedia "Seawater"); Dead Sea about 1,240 (Wikipedia "Dead Sea"); mercury 13,534 at 25 °C (CRC).
export const FLUIDS = {
  oil: { name: 'Cooking oil', rho: 920, col: 0xf2c94c, op: 0.45 },
  fresh: { name: 'Fresh water', rho: 1000, col: 0x3d9be9, op: 0.3 },
  sea: { name: 'Sea water', rho: 1025, col: 0x2f86c8, op: 0.34 },
  dead: { name: 'Dead Sea', rho: 1240, col: 0x4fb3b0, op: 0.38 },
  mercury: { name: 'Mercury', rho: 13534, col: 0xc7ccd4, op: 0.75, metal: true },
};

// Water density against temperature, 0–40 °C (Tanaka et al. 2001, Metrologia 38: 301, the CIPM formula).
// Peaks at 3.98 °C with 999.97 kg/m³.
export function rhoWater(t) {
  const a1 = -3.983035, a2 = 301.797, a3 = 522528.9, a4 = 69.34881, a5 = 999.97495;
  return a5 * (1 - ((t + a1) ** 2 * (t + a2)) / (a3 * (t + a4)));
}
// Above 40 °C use a smooth fit to the IAPWS table (60 °C 983.2, 80 °C 971.8, 100 °C 958.4).
export function rhoWaterHot(t) {
  if (t <= 40) return rhoWater(t);
  return 992.2 - 0.4 * (t - 40) - 0.0027 * (t - 40) ** 2;
}
export const RHO_ICE = 916.7;

// Ideal-gas density: ρ = p M ÷ (R T). Dry air M = 0.028 965 kg/mol, helium 0.004 003.
// At sea level and 20 °C this gives 1.204 kg/m³ for air and 0.166 for helium.
export const R_GAS = 8.314462, P0 = 101325, M_AIR = 0.028965, M_HE = 0.004003;
export const rhoGas = (tC, Mmol = M_AIR, p = P0) => (p * Mmol) / (R_GAS * (tC + 273.15));

// Salt water at 20 °C from mass percent NaCl w (0–26%): a quadratic fit to the CRC Handbook
// "Concentrative properties of aqueous solutions" table (10% → 1,070.7, 20% → 1,147.8, 26% → 1,197.2).
export const brine = (w) => 998.2 + 7.0 * w + 0.023 * w * w;
// grams of salt stirred into 100 mL of water → mass percent
export const saltPct = (g) => (100 * g) / (100 + g);

// ---------------------------------------------------------------- formatting
export const gcc = (rho, d = 2) => (rho / 1000).toFixed(rho >= 10000 ? 1 : d) + ' g/cm³';
export const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));
export function fmtN(F) {
  const a = Math.abs(F);
  if (a >= 1e6) return (F / 1e6).toFixed(1) + ' MN';
  if (a >= 1e4) return (F / 1e3).toFixed(a >= 1e5 ? 0 : 1) + ' kN';
  if (a >= 100) return Math.round(F).toLocaleString('en-IN') + ' N';
  if (a >= 10) return F.toFixed(1) + ' N';
  if (a >= 0.1) return F.toFixed(2) + ' N';
  return F.toFixed(3) + ' N';
}
export function fmtKg(m) {
  if (m >= 1000) return (m / 1000).toFixed(m >= 1e4 ? 0 : 1) + ' t';
  if (m >= 10) return m.toFixed(0) + ' kg';
  if (m >= 1) return m.toFixed(2) + ' kg';
  if (m >= 0.01) return Math.round(m * 1000) + ' g';
  return (m * 1000).toFixed(1) + ' g';
}
export function fmtL(v) {                      // cubic metres → mL or L
  if (v >= 1e-3) return (v * 1000).toFixed(v >= 1e-2 ? 1 : 2) + ' L';
  return (v * 1e6).toFixed(v >= 1e-5 ? 0 : 1) + ' mL';
}
export const pct = (k, d = 0) => (k * 100).toFixed(d) + '%';

// ---------------------------------------------------------------- boards
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function title(g, text, sub = '') {
  g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', logX = false }) {
  const X = logX ? (x) => x0 + ((Math.log10(x) - xMin) / (xMax - xMin)) * (x1 - x0) : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function text(g, s, x, y, col = 'rgba(255,255,255,.75)', font = '18px sans-serif') { g.fillStyle = col; g.font = font; g.fillText(s, x, y); }
export const COL = { up: '#5ce1a9', down: '#ff7a59', water: '#6cc4ff', hot: '#ffb547', cool: '#8ef0ff', red: '#ff5a8a', gold: '#f2c24b', soft: 'rgba(255,255,255,.55)' };
export const HEX = { up: 0x5ce1a9, down: 0xff7a59, water: 0x6cc4ff, hot: 0xffb547, cool: 0x8ef0ff, red: 0xff5a8a };
export const cssHex = (n) => '#' + n.toString(16).padStart(6, '0');

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.2 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
export function pickView(stage, v) {
  if (v.cx === undefined || stage.host.clientWidth >= 560 || inReel()) return v;
  const dx = v.cx - v.target[0];
  return { pos: [v.pos[0] + dx, v.pos[1], v.pos[2]], target: [v.cx, v.target[1], v.target[2]] };
}
export function reelBoards(list) {
  const r = inReel();
  list.forEach(([b, pos, scale = 1]) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), r: b.mesh.rotation.y, s: b.mesh.scale.x };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); b.mesh.rotation.y = 0; }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); b.mesh.rotation.y = b.home.r; }
  });
}
// Switch between the "focus" groups of a chapter and fly the camera.
export function focusSwitch(stage, groups, views) {
  let cur = '';
  return (f, force = false) => {
    if (f === cur && !force) return false;
    cur = f;
    for (const k in groups) groups[k].visible = k === f;
    if (!inReel()) { const v = pickView(stage, views[f]); stage.setView(v.pos, v.target, 1.0); }
    return true;
  };
}

// ---------------------------------------------------------------- arrows
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function force(color, r = 0.035, head = 0.2) {
  const a = arrow(color, 1, head, r);
  a.renderOrder = 10;
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-12) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.03) a.visible = false;
  };
  return a;
}

// ---------------------------------------------------------------- water and tanks
export const waterMat = (col = 0x3d9be9, op = 0.3) => new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: op, roughness: 0.08, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
// A block of liquid with its bottom at y = 0. setLevel(h) sets the depth; setFluid(col, op) its look.
export function liquid(w, d, col, op) {
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
  const mat = waterMat(col, op);
  const m = new THREE.Mesh(g, mat); m.scale.set(w, 0.001, d); m.renderOrder = 2;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  surf.rotation.x = -Math.PI / 2; surf.scale.set(w, d, 1); surf.renderOrder = 3;
  const grp = new THREE.Group(); grp.add(m, surf);
  grp.setLevel = (h) => { m.scale.y = Math.max(0.001, h); surf.position.y = h; };
  grp.setFluid = (col, op) => { mat.color.setHex(col); mat.opacity = op; };
  grp.body = m; grp.surf = surf;
  return grp;
}
// An open glass tank w × h × d with its floor at y = 0, holding a liquid.
export function tank(w, h, d, { col = 0x3d9be9, op = 0.3, level = h * 0.7, wall = 0.02 } = {}) {
  const g = new THREE.Group();
  const glass = M.clear(0xd8ecff, 0.12, { roughness: 0.05 });
  const floor = box(w + wall * 2, wall, d + wall * 2, M.clear(0xd8ecff, 0.3)); floor.position.y = -wall / 2; g.add(floor);
  for (const [px, pz, sx, sz] of [[-(w + wall) / 2, 0, wall, d + wall * 2], [(w + wall) / 2, 0, wall, d + wall * 2], [0, -(d + wall) / 2, w, wall], [0, (d + wall) / 2, w, wall]]) {
    const p = box(sx, h, sz, glass); p.position.set(px, h / 2, pz); p.castShadow = false; g.add(p);
  }
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + wall * 2, h, d + wall * 2)), new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45 }));
  edge.position.y = h / 2; g.add(edge);
  const liq = liquid(w, d, col, op); liq.setLevel(level); g.add(liq);
  g.liq = liq;
  return g;
}

// ---------------------------------------------------------------- bodies
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Many small glowing dots. place(i, x, y, z, s) then done(); tint(i, hex) for per-dot colour.
export function dots(n, r, color = 0xffffff, seg = 8, opacity = 0.85) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), c = new THREE.Color(color);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c);
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, hex) => { c.set(hex); mesh.setColorAt(i, c); };
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// A person standing with feet at the origin, facing +x (from GravityClear). pose({ arm, lean }).
export function makePerson({ shirt = 0x3b6fd8, pants = 0x2b3242, skin = 0xc68b64, hair = 0x1b1410, s = 1 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const cloth = M.matte(shirt), jeans = M.matte(pants), sk = M.matte(skin);
  const hipY = 0.92 * s;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * s, 0.38 * s, 6, 14), cloth); torso.position.y = 0.3 * s; torso.scale.z = 1.25; torso.castShadow = true; body.add(torso);
  const head = sphere(0.11 * s, sk, 24); head.position.y = 0.74 * s; body.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.115 * s, 20, 10, 0, TAU, 0, 1.3), M.matte(hair)); hairM.position.copy(head.position); hairM.rotation.z = 0.35; body.add(hairM);
  const limb = (len, r, mat) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - 2 * r, 4, 10), mat); m.position.y = -len / 2; m.castShadow = true; p.add(m); return p; };
  const arms = [-1, 1].map((z) => { const a = limb(0.62 * s, 0.05 * s, cloth); a.position.set(0, 0.52 * s, z * 0.22 * s); body.add(a); const hand = sphere(0.05 * s, sk, 12); hand.position.y = -0.62 * s; a.add(hand); return a; });
  const legs = [-1, 1].map((z) => { const l = limb(0.88 * s, 0.065 * s, jeans); l.position.set(0, hipY, z * 0.1 * s); g.add(l); const shoe = box(0.22 * s, 0.07 * s, 0.1 * s, M.matte(0x1b1d22)); shoe.position.set(0.05 * s, -0.88 * s, 0); l.add(shoe); return l; });
  body.position.y = hipY;
  g.pose = ({ arm = 0, lean = 0, armX = 0 } = {}) => { arms.forEach((a, i) => { a.rotation.z = arm; a.rotation.x = armX * (i ? -1 : 1); }); body.rotation.z = -lean; };
  g.arms = arms; g.legs = legs; g.body = body; g.head = head;
  return g;
}
// A swimmer lying on their back along +x, centre of the body at the origin, about 1.7 m long.
export function makeSwimmer(opts = {}) {
  const p = makePerson({ shirt: 0x2a7be4, pants: 0x1f2a44, ...opts });
  p.pose({ arm: 0, armX: 1.1 });
  p.rotation.z = Math.PI / 2;                 // head points towards −x, face up (+y)
  p.position.set(0.85, 0, 0);
  const g = new THREE.Group(); g.add(p);
  g.person = p;
  return g;
}

// A simple cartoon fish along +x, about L long. bladder is a silvery sac inside that can grow.
export function makeFish(L = 0.6, col = 0xff9f43) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(L / 2, 28, 16), M.plastic(col, { roughness: 0.35, transparent: true, opacity: 0.6, depthWrite: false, depthTest: true }));
  body.scale.set(1, 0.42, 0.24); body.renderOrder = 6; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(L * 0.18, L * 0.3, 3), M.plastic(col, { roughness: 0.4 }));
  tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 0.2); tail.position.x = -L * 0.6; g.add(tail);
  const eye = sphere(L * 0.035, M.matte(0x111111), 10); eye.position.set(L * 0.33, L * 0.04, L * 0.07); g.add(eye);
  const bladder = sphere(1, M.metal(0xe8edf5, { roughness: 0.25, metalness: 0.4 }), 20); bladder.scale.set(L * 0.2, L * 0.08, L * 0.06); bladder.position.set(-L * 0.02, L * 0.05, 0); bladder.renderOrder = 5; g.add(bladder);
  g.bladder = bladder; g.tail = tail; g.L = L;
  return g;
}
export { clamp, THREE, M, box, beam, sphere };
