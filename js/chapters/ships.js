// Chapter 2: ships and boats. Three scenes:
// 1. A steel cargo ship, 120 m × 20 m × 11 m deep, block coefficient C_b = 0.75, lightship 4,000 t.
//    Displacement Δ = ρ × L × B × T × C_b, so draft T = Δ ÷ (ρ L B C_b). The summer load line is set at
//    T_S = 8.0 m (Δ = 14,760 t in sea water). Load-line marks follow the International Convention on
//    Load Lines (1966): T = S + T_S/48, W = S − T_S/48, fresh-water allowance FWA = Δ ÷ (4 × TPC) mm
//    with TPC = ρ L B C_b ÷ 100 tonnes per cm, here 200 mm; F = S + FWA, TF = T + FWA.
//    The whole hull, sealed to the deck, can displace ρ L B D C_b = 20,295 t in sea water: load more
//    and it sinks. Steel is 7.85 g/cm³, yet the ship's average density (mass ÷ enclosed volume) stays
//    below the water's because most of the hull is air.
// 2. The same 50 g of modelling clay (about 1.8 g/cm³) as a lump, as a bowl (half-ellipsoid 8 cm
//    across and 3 cm deep) and a lotus-leaf boat (20 × 8 × 2.5 cm, 6 g). Load them with 5 g coins.
//    A bowl-shaped hull whose bottom is h deep displaces V(h) = π a c h² (3b − h) ÷ (3b²).
// 3. Archimedes' crown (Vitruvius, De Architectura IX, preface; Galileo, La Bilancetta, 1586):
//    1 kg of gold alloyed with silver (10.49 g/cm³) balanced against 1 kg of pure gold (19.32 g/cm³),
//    then both dunked in water. The alloy is bigger, so it is pushed up harder and its side rises.
import { THREE, M, box, beam, sphere, torus, clamp, approach } from '../kit.js';
import {
  G0, board, panelBg, title, text, dot, COL, HEX, force, fitNarrow, pickView, reelBoards, inReel, liquid, tank,
  gcc, fmtN, fmtKg, pct, rng, focusSwitch,
} from '../buoyancy.js';

// ---------------------------------------------------------------- ship model
export const SHIP = { L: 120, B: 20, D: 11, Cb: 0.75, light: 4000, TS: 8.0 };
const RHO = { sea: 1025, fresh: 1000 };
const K = 0.05;                                          // display units per metre for the ship
export function shipState(cargo, water) {
  const rho = RHO[water], A = SHIP.L * SHIP.B * SHIP.Cb;
  const disp = SHIP.light + cargo;                       // tonnes
  const T = (disp * 1000) / (rho * A);                   // draft, m
  const cap = (rho * A * SHIP.D) / 1000;                 // tonnes the sealed hull can hold up
  const TPC = (1025 * A) / 100 / 1000;                   // t per cm in sea water
  const dS = (1025 * A * SHIP.TS) / 1000;                // displacement at the summer mark
  const FWA = dS / (4 * TPC) / 1000;                     // m
  const marks = { S: SHIP.TS, T: SHIP.TS * (1 + 1 / 48), W: SHIP.TS * (1 - 1 / 48), F: SHIP.TS + FWA, TF: SHIP.TS * (1 + 1 / 48) + FWA };
  const avg = (disp * 1000) / (A * SHIP.D);               // kg/m³ over the whole enclosed hull
  return { rho, disp, T, cap, sinks: disp > cap, marks, FWA, TPC, avg, free: SHIP.D - T, dS };
}
// Draft limit for the water you are in: summer mark in sea water, fresh-water mark in fresh.
const limitFor = (st, water) => (water === 'sea' ? st.marks.S : st.marks.F);

// ---------------------------------------------------------------- clay and leaf
const CLAY = { m: 50, rho: 1.8, coin: 5 };               // grams, g/cm³
const FORMS = {
  lump: { name: 'Clay lump', mass: 50 },
  bowl: { name: 'Clay bowl', mass: 50, a: 4, b: 3, c: 4 },
  leaf: { name: 'Lotus-leaf boat', mass: 6, a: 10, b: 2.5, c: 4 },
};
const capV = (f, h) => (Math.PI * f.a * f.c * h * h * (3 * f.b - h)) / (3 * f.b * f.b);   // cm³, h = depth from the bottom
function floatForm(form, coins) {
  const f = FORMS[form], m = f.mass + coins * CLAY.coin;
  if (form === 'lump') { const V = CLAY.m / CLAY.rho; return { m, V, sinks: true, h: 0, frac: 1, cap: V }; }
  const full = capV(f, f.b);
  if (m > full) return { m, V: full, sinks: true, h: f.b, frac: 1, cap: full };
  let lo = 0, hi = f.b; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (capV(f, mid) < m) lo = mid; else hi = mid; }
  return { m, V: m, sinks: false, h: lo, frac: lo / f.b, cap: full };
}

// ---------------------------------------------------------------- crown
const AU = 19.32, AG = 10.49;
export function crown(purity) {
  const w = purity / 100, m = 1000;                                  // grams
  const Vc = m * (w / AU + (1 - w) / AG), Vg = m / AU;               // cm³
  const Fc = Vc * 1e-6 * 1000 * G0, Fg = Vg * 1e-6 * 1000 * G0;       // buoyancy, N
  return { rho: m / Vc, Vc, Vg, Fc, Fg, dF: Fc - Fg, dm: Vc - Vg };
}

const CX = 40, AX = 80;
const VIEWS = {
  ship: { pos: [0.9, 0.95, 8.2], target: [0.6, 0.4, 0], cx: 0 },
  clay: { pos: [CX - 0.4, 2.2, 4.3], target: [CX - 0.6, 0.85, 0], cx: CX },
  crown: { pos: [AX - 0.5, 1.9, 4.8], target: [AX - 0.7, 1.35, 0], cx: AX },
};

export default {
  id: 'ships',
  short: 'Ships and boats',
  title: 'Why a steel ship floats',
  subtitle: 'Shape it right and even steel or clay floats. Load it wrong and it sinks.',
  view: VIEWS.ship,
  learn: `<p>Steel is almost <b>8 times</b> as dense as water, so a steel bolt sinks. A steel ship floats because of its <b>shape</b>. The hull is a huge hollow bowl: it pushes aside a lot of water while the steel itself takes up very little space. What matters is the <b>average density</b> of the whole ship, steel plus the air inside, and that is well below 1 g/cm³.</p>
    <p>As you load cargo, the ship sinks deeper until the water it pushes aside weighs as much as ship plus cargo. That is its <b>displacement</b>. How deep the bottom sits is the <b>draft</b>. Load too much and there is too little hull left above the water, the <b>freeboard</b>, to ride out waves.</p>
    <p>In 1876 a British MP, <b>Samuel Plimsoll</b>, got a law passed that made every ship carry a <b>load line</b> mark: a circle with a line through it. Next to it, short lines show how deep it may go in <b>tropical</b>, <b>summer</b> and <b>winter</b> seas, and in <b>fresh water</b>. Sea water (about 1.025 g/cm³) holds a ship up a little more than fresh water (1.000), so the same ship floats about <b>2.5% deeper</b> in a river port like Kolkata than out at sea.</p>
    <p>You can try it with <b>clay</b>. A 50 g lump sinks. Press the same clay into a bowl and it floats, and can even carry coins. A folded <b>lotus leaf</b> works even better: it is light, and its waxy skin keeps water out.</p>
    <p>Archimedes is said to have used the same idea to test a king's <b>crown</b>. Gold is 19.3 g/cm³; silver is 10.5. A crown with silver mixed in is bigger than the same mass of pure gold, so it pushes aside more water.</p>
    <p class="tip"><b>Try it:</b> load the ship until the water reaches the summer mark, then sail it into fresh water. Make the clay into a bowl and add coins until it swamps. Finally dunk the crown and watch the balance tip.</p>`,
  terms: [
    { t: 'Displacement', d: 'The mass of water a floating ship pushes aside. It equals the mass of the ship and everything on it.' },
    { t: 'Draft', d: 'How deep the bottom of the hull sits below the water line.' },
    { t: 'Freeboard', d: 'The height of the hull above the water: a ship’s safety margin against waves.' },
    { t: 'Load line (Plimsoll mark)', d: 'Marks on a ship’s side showing the deepest it may legally float in each season and water.' },
    { t: 'Average density', d: 'Total mass divided by the total volume the object encloses, air spaces included.' },
    { t: 'Fresh-water allowance', d: 'How much deeper a ship floats in fresh water than in sea water at the same load.' },
  ],
  defaults: { focus: 'ship', cargo: 9000, water: 'sea', form: 'bowl', coins: 4, purity: 70, dunk: false },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'ship', label: 'Cargo ship' }, { v: 'clay', label: 'Clay and leaf' }, { v: 'crown', label: 'The crown' }] },
    { key: 'cargo', type: 'range', label: 'Ship: cargo on board', min: 0, max: 17000, step: 100, ends: ['empty', '17,000 t'], fmt: (v) => v.toLocaleString('en-IN') + ' t' },
    { key: 'water', type: 'seg', label: 'Ship: water', options: [{ v: 'sea', label: 'Sea water 1.025' }, { v: 'fresh', label: 'River 1.000' }] },
    { key: 'form', type: 'seg', label: 'Clay: shape', options: [{ v: 'lump', label: 'Lump' }, { v: 'bowl', label: 'Bowl' }, { v: 'leaf', label: 'Lotus leaf' }] },
    { key: 'coins', type: 'range', label: 'Clay: 5 g coins on board', min: 0, max: 40, step: 1, ends: ['0', '40'], fmt: (v) => v + ' coins' },
    { key: 'purity', type: 'range', label: 'Crown: gold in the crown', min: 50, max: 100, step: 1, ends: ['50%', 'pure'], fmt: (v) => v + '% gold' },
    { key: 'dunk', type: 'toggle', label: 'Crown: lower both into water' },
    { key: 'go', type: 'buttons', label: 'Try these', items: [
      { label: 'Load to the summer mark', act: (s) => { s.focus = 'ship'; s.water = 'sea'; s.cargo = 10700; } },
      { label: 'Sail upriver', act: (s) => { s.focus = 'ship'; s.water = 'fresh'; } },
      { label: 'Overload it', act: (s) => { s.focus = 'ship'; s.cargo = 17000; } },
    ] },
  ],
  onChange(s, key) {
    if (key === 'cargo' || key === 'water') s.focus = 'ship';
    if (key === 'form' || key === 'coins') s.focus = 'clay';
    if (key === 'purity' || key === 'dunk') s.focus = 'crown';
  },
  quiz: [
    { q: 'Why does a steel ship float when a steel bolt sinks?', options: ['Ship steel is a lighter kind of steel', 'The hollow hull pushes aside its own weight of water, so its average density is less than water’s', 'The engines hold it up', 'Salt makes steel float'], answer: 1, why: 'The hull encloses a big volume of air. Averaged over that volume, the ship is less dense than water, so it floats once it has pushed aside its own weight.' },
    { q: 'A loaded ship sails from the sea into a freshwater river. What happens?', options: ['It rises a little', 'It sinks a little deeper', 'Nothing changes', 'It tips over'], answer: 1, why: 'Fresh water (1.000) is less dense than sea water (1.025). To push aside the same mass of water, the ship must sink about 2.5% deeper, which is why load lines have a separate fresh-water mark.' },
    { q: 'A 1 kg crown secretly contains silver. Balanced against 1 kg of pure gold and lowered into water, which side rises?', options: ['The pure gold side', 'The crown side', 'Neither: they weigh the same', 'It depends on the depth'], answer: 1, why: 'Silver is less dense, so the crown has a bigger volume, pushes aside more water and is pushed up harder. Its side of the balance rises.' },
  ],
  reel: [
    { ms: 5400, caption: 'A steel ship floats because its hollow hull pushes aside its own weight of water.', set: { focus: 'ship', water: 'sea', cargo: 0 }, anim: { cargo: [0, 10700] }, view: { pos: [1.90, 1.18, 4.42], target: [0.6, 0.4, 0] }, spin: 0.2 },
    { ms: 5000, caption: 'Archimedes’ crown test: silver makes a crown bigger, so water pushes its side up.', set: { focus: 'crown', purity: 70, dunk: false }, act: (s) => { s.dunk = false; }, anim: { dunk: [false, true] }, view: { pos: [AX + 0.00, 1.69, 2.60], target: [AX, 1.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const gS = new THREE.Group(), gC = new THREE.Group(), gA = new THREE.Group();
    gC.position.x = CX; gA.position.x = AX; root.add(gS, gC, gA);
    const show = focusSwitch(stage, { ship: gS, clay: gC, crown: gA }, VIEWS);

    // ================================================================ the ship
    const L = SHIP.L * K, B = SHIP.B * K, D = SHIP.D * K, TSd = SHIP.TS * K;
    const plan = new THREE.Shape();
    plan.moveTo(-L / 2 + 0.12, -B / 2); plan.lineTo(L / 2 - 1.2, -B / 2);
    plan.quadraticCurveTo(L / 2 - 0.1, -B / 2 + 0.05, L / 2, 0);
    plan.quadraticCurveTo(L / 2 - 0.1, B / 2 - 0.05, L / 2 - 1.2, B / 2);
    plan.lineTo(-L / 2 + 0.12, B / 2); plan.quadraticCurveTo(-L / 2, B / 2, -L / 2, B / 2 - 0.12);
    plan.lineTo(-L / 2, -B / 2 + 0.12); plan.quadraticCurveTo(-L / 2, -B / 2, -L / 2 + 0.12, -B / 2);
    const slab = (y0, h, mat) => { const g = new THREE.ExtrudeGeometry(plan, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
    const ship = new THREE.Group(); gS.add(ship);
    ship.add(slab(0, TSd, M.matte(0xa3302a, { roughness: 0.6 })));                  // anti-fouling red below the summer line
    ship.add(slab(TSd, D - TSd, M.matte(0x1d2230, { roughness: 0.5 })));            // black topsides
    const deck = new THREE.Mesh(new THREE.ShapeGeometry(plan), M.matte(0x5b6270)); deck.geometry.rotateX(-Math.PI / 2); deck.position.y = D + 0.002; ship.add(deck);
    const house = box(0.45, 0.55, 0.8, M.matte(0xf2f4f7)); house.position.set(-L / 2 + 0.4, D + 0.275, 0); ship.add(house);
    const bridge = box(0.5, 0.1, 1.0, M.matte(0xf2f4f7)); bridge.position.set(-L / 2 + 0.42, D + 0.6, 0); ship.add(bridge);
    const funnel = box(0.18, 0.28, 0.2, M.matte(0x2b5fb3)); funnel.position.set(-L / 2 + 0.25, D + 0.72, 0); ship.add(funnel);
    // Plimsoll mark painted amidships: a ring and a bar at the summer draft
    const ring = torus(0.07, 0.008, M.glow(0xf2f4f7), 32); ring.position.set(0, TSd, B / 2 + 0.004); ship.add(ring);
    const bar = box(0.2, 0.012, 0.004, M.glow(0xf2f4f7)); bar.position.set(0, TSd, B / 2 + 0.005); ship.add(bar);
    // containers: 13 bays × 7 rows × 3 tiers, filled in order as cargo grows (about 14 t each)
    const SLOTS = 13 * 7 * 3;
    const cont = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.125, 0.118), M.matte(0xffffff, { roughness: 0.6 }), SLOTS);
    cont.castShadow = true; cont.frustumCulled = false; ship.add(cont);
    { const r = rng(7), o = new THREE.Object3D(), pal = [0xd9482b, 0x2b6cd9, 0x38a169, 0xe0a82e, 0x7c8594, 0xb83280], c = new THREE.Color(); let i = 0;
      for (let t = 0; t < 3; t++) for (let bay = 0; bay < 13; bay++) for (let row = 0; row < 7; row++) {
        o.position.set(-L / 2 + 0.95 + bay * 0.31, D + 0.065 + t * 0.127, -0.36 + row * 0.12); o.updateMatrix(); cont.setMatrixAt(i, o.matrix); cont.setColorAt(i, c.set(pal[Math.floor(r() * pal.length)])); i++;
      } }
    const sea = liquid(16, 7, 0x2f86c8, 0.4); sea.position.y = -1.6; sea.setLevel(1.6); sea.surf.material.opacity = 0.1; gS.add(sea);
    const seabed = box(16, 0.05, 7, M.matte(0x2a2f3a)); seabed.position.y = -1.62; gS.add(seabed);
    const lDraft = stage.label('', [0, 0, 0], gS), lFree = stage.label('', [0, 0, 0], gS), lMark = stage.label('load line mark', [0, 0, 0], gS);
    const lSea = stage.label('', [-3.8, 0.12, 2.0], gS, 'hot'); lSea.element.style.setProperty('--c', COL.water);
    const aUp = force(HEX.up, 0.05, 0.2), aDn = force(HEX.down, 0.05, 0.2); gS.add(aUp, aDn);
    let curShip = null;
    const plim = board(gS, 1.9, 1.9, 560, 560, (g, w, h) => {
      panelBg(g, w, h);
      if (!curShip) return;
      const { st, water } = curShip;
      title(g, 'Load line, close up', water === 'sea' ? 'sea water' : 'fresh water');
      // window from 7.4 m to 8.8 m of draft, 1 m = 360 px
      const top = 70, bot = h - 16, ppm = (bot - top) / 1.4, Y = (T) => top + (8.8 - T) * ppm;
      g.fillStyle = '#1d2230'; g.fillRect(0, top, w, bot - top);
      const wl = clamp(Y(st.T), top, bot);
      g.fillStyle = water === 'sea' ? 'rgba(47,134,200,.75)' : 'rgba(61,155,233,.7)'; g.fillRect(0, wl, w, bot - wl);
      g.strokeStyle = '#cfeeff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, wl); g.lineTo(w, wl); g.stroke();
      // the ring and bar
      g.strokeStyle = '#f2f4f7'; g.fillStyle = '#f2f4f7'; g.lineWidth = 7;
      const cx = 150, cy = Y(st.marks.S), R = 0.15 * ppm;
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
      g.fillRect(cx - R - 36, cy - 4, 2 * R + 72, 8);
      // vertical ladder and marks
      const lx = 330; g.fillRect(lx, Y(st.marks.TF) - 4, 8, Y(st.marks.W) - Y(st.marks.TF) + 8);
      [['TF', st.marks.TF, -1], ['F', st.marks.F, -1], ['T', st.marks.T, 1], ['S', st.marks.S, 1], ['W', st.marks.W, 1]].forEach(([n, T, side]) => {
        const y = Y(T); g.fillStyle = '#f2f4f7'; g.fillRect(side < 0 ? lx - 70 : lx, y - 4, 78, 8);
        text(g, n, side < 0 ? lx - 110 : lx + 90, y + 8, '#f2f4f7', 'bold 24px sans-serif');
      });
      const over = st.T - limitFor(st, water);
      text(g, st.sinks ? 'Water over the deck: sinking!' : over > 0.005 ? `${Math.round(over * 1000)} mm too deep` : `${Math.round(-over * 1000)} mm to spare`, 20, h - 30, st.sinks || over > 0.005 ? COL.red : COL.up, 'bold 24px sans-serif');
    }, [3.9, 1.3, -1.0]);
    plim.mesh.rotation.y = -0.35;
    const sh = { y: 0, sinkT: 0 };

    // ================================================================ clay, bowl and leaf
    const tub = tank(2.6, 1.2, 1.5, { level: 0.9, col: 0x3d9be9, op: 0.3 }); tub.position.y = 0; gC.add(tub);
    const standC = box(3.0, 0.1, 1.9, M.matte(0x3a3f4b)); standC.position.y = -0.07; gC.add(standC);
    const clayM = M.matte(0xb5653a, { roughness: 0.85 });
    const SC = 0.1;                                                   // display units per cm
    const lump = sphere(Math.cbrt((3 * CLAY.m / CLAY.rho) / (4 * Math.PI)) * SC, clayM, 28); gC.add(lump);
    const hemi = (mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat); m.castShadow = true; return m; };
    const bowl = hemi(M.matte(0xb5653a, { roughness: 0.85, side: THREE.DoubleSide })); bowl.scale.set(FORMS.bowl.a * SC, FORMS.bowl.b * SC, FORMS.bowl.c * SC); gC.add(bowl);
    const leaf = hemi(M.plastic(0x3f9a4a, { roughness: 0.5, side: THREE.DoubleSide })); leaf.scale.set(FORMS.leaf.a * SC, FORMS.leaf.b * SC, FORMS.leaf.c * SC); gC.add(leaf);
    const vein = box(FORMS.leaf.a * SC * 2, 0.008, 0.01, M.matte(0xbfe3a0)); gC.add(vein);
    const coinG = new THREE.CylinderGeometry(0.1, 0.1, 0.018, 20);
    const coins = new THREE.InstancedMesh(coinG, M.metal(0xd6b25a, { roughness: 0.3 }), 40); coins.castShadow = true; coins.frustumCulled = false; gC.add(coins);
    const lClay = stage.label('', [0, 0, 0], gC, 'hot'); lClay.element.style.setProperty('--c', COL.hot);
    const cl = { y: 0.5, tilt: 0 };

    // ================================================================ the crown balance
    const brass = M.metal(0xc9a24a, { roughness: 0.35 }), dark = M.matte(0x3a3f4b);
    const baseA = box(2.6, 0.08, 1.0, dark); baseA.position.y = 0.04; gA.add(baseA);
    gA.add(beam([0, 0.08, 0], [0, 2.3, 0], 0.04, brass));
    const pivot = new THREE.Group(); pivot.position.y = 2.3; gA.add(pivot);
    pivot.add(beam([-1.0, 0, 0], [1.0, 0, 0], 0.03, brass));
    const pointer = beam([0, 0, 0], [0, 0.35, 0], 0.012, M.glow(0xff5a8a)); pivot.add(pointer);
    const hangs = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.x = sx; pivot.add(g); const str = beam([0, 0, 0], [0, -1, 0], 0.006, M.metal(0xd8dde6)); g.add(str); g.str = str; return g; });
    const goldM = M.metal(0xf2c24b, { roughness: 0.2 });
    // the crown: a band with seven points, sized to its volume (cm³ → display, 1 cm = 0.035)
    const crownG = new THREE.Group(); hangs[0].add(crownG);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 40, 1, true), M.metal(0xe5b94a, { roughness: 0.25, side: THREE.DoubleSide })); crownG.add(band);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const p = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 12), M.metal(0xe5b94a, { roughness: 0.25 })); p.position.set(Math.cos(a) * 0.95, 0.47, Math.sin(a) * 0.95); crownG.add(p); const j = sphere(0.07, M.plastic(i % 2 ? 0xd62d4b : 0x2d7bd6, { roughness: 0.2 }), 10); j.position.set(Math.cos(a) * 1.0, 0.05, Math.sin(a) * 1.0); crownG.add(j); }
    const bar2 = box(1, 1, 1, goldM); hangs[1].add(bar2);
    const beakers = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(sx, 0.08, 0); gA.add(g); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.7, 32, 1, true), M.clear(0xd8ecff, 0.16)); glass.position.y = 0.35; g.add(glass); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.55, 32), M.clear(0x3d9be9, 0.35)); w.position.y = 0.3; g.add(w); return g; });
    const lCr = stage.label('', [0, 0, 0], gA), lGo = stage.label('', [0, 0, 0], gA), lTip = stage.label('', [0, 2.95, 0.3], gA, 'hot');
    lTip.element.style.setProperty('--c', COL.gold);
    const cr = { k: 0, tilt: 0 };

    let kShip = '';
    return {
      dispose() { stage.floor.visible = true; },
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lFree, lMark, lSea]);
        reelBoards([[plim, [0.4, 2.6, -1.2], 1.0]]);
        show(s.focus);
        stage.floor.visible = s.focus !== 'ship';

        if (s.focus === 'ship') {
          const st = shipState(s.cargo, s.water);
          sh.sinkT = st.sinks ? sh.sinkT + dt : 0;
          const yT = st.sinks ? -D - 0.5 - Math.min(1.2, sh.sinkT * 0.3) : -st.T * K;
          sh.y = approach(sh.y, yT, st.sinks ? 1.2 : 4, dt);
          ship.position.y = sh.y + Math.sin(time * 1.3) * 0.006;
          ship.rotation.z = Math.sin(time * 0.9) * 0.006 + (st.sinks ? Math.min(0.25, sh.sinkT * 0.05) : 0);
          cont.count = Math.round(SLOTS * clamp(s.cargo / 12000, 0, 1));
          const f = s.water === 'sea' ? 0x2f86c8 : 0x3d9be9; sea.setFluid(f, s.water === 'sea' ? 0.42 : 0.34);
          lSea.element.innerHTML = s.water === 'sea' ? 'sea water, 1.025 g/cm³' : 'river water, 1.000 g/cm³';
          lDraft.position.set(L / 2 + 0.25, -st.T * K / 2 - 0.1, B / 2); lDraft.element.innerHTML = st.sinks ? 'sinking' : `draft <b>${st.T.toFixed(2)} m</b>`;
          lFree.position.set(L / 2 - 0.2, (D - st.T * K) / 2 * 0 + 0.35, B / 2 + 0.1); lFree.element.innerHTML = `freeboard ${st.sinks ? '0' : st.free.toFixed(2)} m`; lFree.visible = !st.sinks && stage.host.clientWidth >= 560;
          lMark.position.set(0, sh.y + TSd + 0.2, B / 2 + 0.05); lMark.visible = !st.sinks && stage.host.clientWidth >= 560;
          aDn.aim([1.4, sh.y + D + 0.9, 0.9], [0, -1, 0], 0.25 + st.disp / 30000);
          aUp.aim([1.4, sh.y - 0.95, 0.9], [0, 1, 0], st.sinks ? 0.25 + st.cap / 30000 : 0.25 + st.disp / 30000);
          const kk = `${s.cargo}|${s.water}`; if (kk !== kShip) { kShip = kk; curShip = { st, water: s.water }; plim.redraw(); }
        }

        if (s.focus === 'clay') {
          const r = floatForm(s.form, s.coins), f = FORMS[s.form];
          lump.visible = s.form === 'lump'; bowl.visible = s.form === 'bowl'; leaf.visible = s.form === 'leaf'; vein.visible = leaf.visible;
          const LEV = 0.9;
          let yT, tiltT = 0;
          if (s.form === 'lump') yT = lump.geometry.parameters.radius;
          else if (r.sinks) { yT = f.b * SC + 0.005; tiltT = 0.12; }
          else yT = LEV + (f.b - r.h) * SC;                          // rim height above the water = b − h
          cl.y = approach(cl.y, yT, r.sinks ? 2.5 : 6, dt); cl.tilt = approach(cl.tilt, tiltT, 2, dt);
          const bob = r.sinks ? 0 : Math.sin(time * 2) * 0.004;
          lump.position.set(0, cl.y, 0);
          for (const m of [bowl, leaf]) { m.position.set(0, cl.y + bob, 0); m.rotation.z = cl.tilt; }
          vein.position.set(0, cl.y + bob - f.b * SC * (s.form === 'leaf' ? 0.95 : 0), 0);
          // coins stack in the bottom of the boat (or on the tub floor beside the lump)
          const o = new THREE.Object3D(), cw = s.form === 'leaf' ? 5 : 2;
          coins.count = s.coins;
          for (let i = 0; i < s.coins; i++) {
            const col = i % cw, lay = Math.floor(i / cw);
            if (s.form === 'lump') o.position.set(0.55 + (i % 4) * 0.22, 0.01 + Math.floor(i / 4) * 0.02, -0.2);
            else o.position.set((col - (cw - 1) / 2) * 0.22, cl.y + bob - (s.form === 'leaf' ? f.b : f.b) * SC + 0.03 + lay * 0.02, 0);
            o.updateMatrix(); coins.setMatrixAt(i, o.matrix);
          }
          coins.instanceMatrix.needsUpdate = true;
          lClay.position.set(0.6, 1.75, 0);
          lClay.element.innerHTML = r.sinks ? `${f.name}: <b>sinks</b>` : `${f.name}: floats, ${pct(r.frac)} of its depth under`;
        }

        if (s.focus === 'crown') {
          const c = crown(s.purity);
          cr.k = approach(cr.k, s.dunk ? 1 : 0, 3, dt);
          // sizes: 1 cm³ → display volume (0.035)³ scaled up for visibility
          const u = 0.1, Lh = 1.2 + 0.72 * cr.k;                          // string length grows as you lower them
          hangs.forEach((h) => { h.str.scale.y = Lh; h.str.position.y = -Lh / 2; });
          const rc = Math.cbrt(c.Vc / Math.PI) * u;                        // crown size grows with its volume
          crownG.scale.setScalar(rc); crownG.position.y = -Lh - rc * 0.3;
          const sg = Math.cbrt(c.Vg) * u * 0.6; bar2.scale.set(sg * 1.6, sg * 0.8, sg); bar2.position.y = -Lh - sg * 0.4;
          const tiltT = s.dunk ? 0.1 * Math.tanh(c.dF / 0.05) : 0;
          cr.tilt = approach(cr.tilt, tiltT * cr.k, 3, dt);
          pivot.rotation.z = -cr.tilt;                                    // crown side (left) goes up
          hangs.forEach((h) => { h.rotation.z = cr.tilt; });
          const lp = new THREE.Vector3();
          crownG.getWorldPosition(lp); gA.worldToLocal(lp); lCr.position.set(lp.x - 0.2, 1.05, 0.4); lCr.element.innerHTML = `crown ${gcc(c.rho * 1000)}`;
          bar2.getWorldPosition(lp); gA.worldToLocal(lp); lGo.position.set(lp.x + 0.3, 0.95, 0.4); lGo.element.innerHTML = 'pure gold 19.32 g/cm³';
          lTip.element.innerHTML = !s.dunk ? 'in air: 1 kg balances 1 kg' : c.dF > 0.001 ? 'in water: the crown side rises' : 'in water: still balanced, pure gold';
        }
      },
      readout: (s) => {
        if (s.focus === 'clay') {
          const r = floatForm(s.form, s.coins), f = FORMS[s.form];
          return `<div class="big">${f.name}: ${r.sinks ? 'sinks' : 'floats'}</div>
            <div class="row"><span>Mass with ${s.coins} coins</span><b>${r.m} g</b></div>
            <div class="row"><span>Water it can push aside, at most</span><b>${Math.round(r.cap)} cm³ = ${Math.round(r.cap)} g</b></div>
            <div class="row"><span>${r.sinks ? 'Short by' : 'Water pushed aside now'}</span><b>${r.sinks ? Math.round(r.m - r.cap) + ' g' : Math.round(r.V) + ' g'}</b></div>
            <div class="row"><span>Coins it can still carry</span><b>${r.sinks ? 0 : Math.floor((r.cap - r.m) / CLAY.coin)}</b></div>
            <small>${s.form === 'lump' ? 'Solid clay is about 1.8 g/cm³: 50 g takes only 28 cm³ and pushes aside just 28 g of water.' : 'Same stuff, new shape: the hollow pushes aside far more water than the material alone.'}</small>`;
        }
        if (s.focus === 'crown') {
          const c = crown(s.purity);
          return `<div class="big">Crown: ${gcc(c.rho * 1000)}</div>
            <div class="row"><span>Volume of 1 kg crown / pure gold</span><b>${c.Vc.toFixed(1)} / ${c.Vg.toFixed(1)} cm³</b></div>
            <div class="row"><span>Extra water it spills</span><b>${c.dm.toFixed(1)} mL</b></div>
            <div class="row"><span>Buoyancy on crown / gold</span><b>${c.Fc.toFixed(3)} / ${c.Fg.toFixed(3)} N</b></div>
            <div class="row"><span>Unbalanced push in water</span><b>${c.dF.toFixed(3)} N</b></div>
            <small>Gold 19.32 g/cm³, silver 10.49 g/cm³. A few millilitres of overflow are hard to see; a balance in water shows the difference far more clearly.</small>`;
        }
        const st = shipState(s.cargo, s.water), lim = limitFor(st, s.water);
        return `<div class="big">${st.sinks ? 'Overloaded: it sinks' : `Draft ${st.T.toFixed(2)} m, ${st.T > lim + 0.005 ? 'too deep' : 'safe'}`}</div>
          <div class="row"><span>Displacement (ship + cargo)</span><b>${Math.round(st.disp).toLocaleString('en-IN')} t</b></div>
          <div class="row"><span>Draft = Δ ÷ (ρ × L × B × C<sub>b</sub>)</span><b>${st.sinks ? 'no float' : st.T.toFixed(2) + ' m'}</b></div>
          <div class="row"><span>Limit here (${s.water === 'sea' ? 'summer mark S' : 'fresh-water mark F'})</span><b>${lim.toFixed(2)} m</b></div>
          <div class="row"><span>Average density of the ship</span><b>${gcc(st.avg)}</b></div>
          <div class="row"><span>Most the sealed hull can hold up</span><b>${Math.round(st.cap).toLocaleString('en-IN')} t</b></div>
          <small>Steel is 7.85 g/cm³, but most of the hull is air. 120 m × 20 m hull, C<sub>b</sub> 0.75, fresh-water allowance ${Math.round(st.FWA * 1000)} mm.</small>`;
      },
    };
  },
};
