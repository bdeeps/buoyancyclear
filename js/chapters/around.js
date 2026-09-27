// Chapter 4: density and buoyancy around us. Four scenes:
// 1. Swimming. Body density from the two-compartment model of Siri (1961): fat 0.900 g/cm³,
//    fat-free mass 1.100 g/cm³, so 1/ρ_tissue = f/0.900 + (1 − f)/1.100. Add the air in the lungs:
//    residual volume about 1.2 L after a full breath out, about 2.5 L at a normal relaxed breath
//    (functional residual capacity), about 6 L after a full breath in (total lung capacity; see
//    LungsClear), plus ~0.1 L of gut gas. Most adults come out between about 0.98 and 1.05 g/cm³.
// 2. Fish and submarine. A bony fish's tissue is about 1.07–1.08 g/cm³ (Alexander, "Physical aspects
//    of swimbladder function", Biol. Rev. 1966), so it needs a gas-filled swim bladder of about 7% of
//    its volume to hover in fresh water and about 5% in the sea. The submarine uses the Kalvari
//    (Scorpène) class figures: 1,615 t surfaced, 1,775 t submerged (Indian Navy / Wikipedia). Its
//    hull encloses 1,775 ÷ 1.025 = 1,732 m³; filling the ballast tanks with 160 t of sea water makes
//    it exactly as dense as the sea.
// 3. The egg test. A fresh hen's egg is about 1.08–1.09 g/cm³. Through the shell's pores it slowly
//    loses water and its air cell grows, so an old egg stands up and then floats (approximate values).
//    Salt water from buoyancy.js: brine(w) fitted to the CRC table.
// 4. Layers in a jar: honey 1.42, water 1.00, sunflower oil 0.92 g/cm³. A floating object at an
//    interface sits with a fraction k = (ρ_obj − ρ_upper) ÷ (ρ_lower − ρ_upper) in the lower liquid.
import { THREE, M, box, beam, sphere, clamp, approach } from '../kit.js';
import {
  G0, brine, saltPct, board, panelBg, title, text, dot, COL, HEX, force, fitNarrow, pickView, reelBoards, inReel,
  focusSwitch, tank, liquid, gcc, pct, makeSwimmer, makeFish, rng,
} from '../buoyancy.js';

// ---------------------------------------------------------------- swimmer
export const LUNG = { out: 1.2, normal: 2.5, in: 6.0 };
export function body(fatPct, breath, mass = 60) {
  const f = fatPct / 100, rt = 1 / (f / 0.9 + (1 - f) / 1.1);             // g/cm³
  const Vt = mass / rt, Va = LUNG[breath] + 0.1;                           // litres
  return { rt, Vt, Va, rho: mass / (Vt + Va), mass };
}
const WATERS = { pool: 1.0, sea: 1.025 };
// ---------------------------------------------------------------- submarine and fish
export const SUB = { dry: 1615, sub: 1775, V: 1775 / 1.025, ballast: 175 };
export const subMass = (fill) => SUB.dry + (fill / 100) * SUB.ballast;
const FISH_T = 1.076;
export const fishRho = (b) => FISH_T * (1 - b / 100);
// ---------------------------------------------------------------- egg
const EGG = { fresh: { name: 'Fresh egg', rho: 1.085 }, old: { name: 'Three-week-old egg', rho: 1.04 }, stale: { name: 'Very old egg', rho: 0.99 } };
// ---------------------------------------------------------------- jar
const LIQ = [{ name: 'Honey', rho: 1.42, col: 0xd98e04, op: 0.8 }, { name: 'Water', rho: 1.0, col: 0x3d9be9, op: 0.35 }, { name: 'Sunflower oil', rho: 0.92, col: 0xf2d04b, op: 0.5 }];
const OBJS = [
  { name: 'Cork', rho: 0.24, col: 0xc49a6c },
  { name: 'Plastic bead (HDPE)', rho: 0.95, col: 0xff5a8a },
  { name: 'LEGO-style brick (ABS)', rho: 1.05, col: 0x2b6cd9 },
  { name: 'Steel nut', rho: 7.85, col: 0x9aa3ad },
];
// Where an object settles in the jar: which interface and how far into the lower liquid.
function settle(rho) {
  const L = [...LIQ].reverse();                                    // top to bottom: oil, water, honey
  if (rho < L[0].rho) return { layer: -1, k: rho / L[0].rho };     // floats on top
  for (let i = 0; i < L.length - 1; i++) if (rho < L[i + 1].rho) return { layer: i, k: (rho - L[i].rho) / (L[i + 1].rho - L[i].rho) };
  return { layer: 3, k: 1 };                                       // sinks to the bottom
}

const SX = 40, EX = 80, JX = 120;
const VIEWS = {
  swim: { pos: [0.2, 1.7, 5.6], target: [0.1, 1.15, 0], cx: 0.4 },
  sub: { pos: [SX + 0.1, 2.0, 8.4], target: [SX - 0.4, 0.3, 0], cx: SX },
  egg: { pos: [EX - 0.3, 1.4, 3.6], target: [EX - 0.75, 0.85, 0], cx: EX + 0.2 },
  jar: { pos: [JX - 0.3, 1.6, 4.8], target: [JX - 0.9, 1.15, 0], cx: JX - 0.3 },
};

export default {
  id: 'around',
  short: 'Around us',
  title: 'Swimmers, fish, submarines and eggs',
  subtitle: 'A breath of air, a bag of gas, a tank of sea water or a spoon of salt tips the balance.',
  view: VIEWS.swim,
  learn: `<p>Your body is very close to the density of water. Fat is about <b>0.90 g/cm³</b>, muscle and bone together about <b>1.10</b>, so most people average <b>0.98 to 1.05 g/cm³</b>. The big switch is your <b>lungs</b> (see LungsClear). Breathe all the way in and you add about 6 litres of air: almost everyone floats. Breathe out and you sink slowly. That is why swimming teachers say "take a big breath and lie back".</p>
    <p><b>Fish</b> have a built-in balloon, the <b>swim bladder</b>. Fish flesh is about 1.07 g/cm³, so a bladder of about 7% of the body lets a river fish hover without swimming; sea fish need only about 5% because sea water is denser. <b>Submarines</b> copy the trick with <b>ballast tanks</b>. An Indian Navy Kalvari-class submarine floats at 1,615 tonnes. Let about 160 tonnes of sea water into its tanks and it weighs exactly as much as the sea it displaces, so it can hover. Blow the tanks with compressed air and it rises.</p>
    <p>Try the <b>egg test</b> in your kitchen. A fresh egg sinks in plain water. Stir in salt and the water gets denser, until the egg floats. Old eggs lose water through the shell and grow a bigger air pocket, so they stand on end, then float even in plain water.</p>
    <p>Density also <b>separates mixtures</b>. Oil floats on water, honey sinks under both, and cream (malai) rises to the top of boiled milk because milk fat is lighter than the rest. Grit settles to the bottom of a water tank. In an RO purifier's storage tank a <b>float switch</b> rides up on the water and turns the pump off when the tank is full (see ROClear).</p>
    <p class="tip"><b>Try it:</b> breathe out and watch the swimmer sink, then take the sea. Flood the submarine's tanks to 91%. Add salt to the egg's glass. Shake the jar and watch it sort itself.</p>`,
  terms: [
    { t: 'Swim bladder', d: 'A gas-filled sac inside most bony fish. Changing its size changes the fish’s density.' },
    { t: 'Ballast tank', d: 'A tank in a submarine that is flooded with sea water to dive and blown full of air to surface.' },
    { t: 'Neutral buoyancy', d: 'Being exactly as dense as the fluid around you, so you neither rise nor sink.' },
    { t: 'Lung volume', d: 'How much air is in your lungs: about 1.2 L when you breathe right out, 6 L when you breathe right in.' },
    { t: 'Brine', d: 'Salt water. The more salt, the denser it is, up to about 1.2 g/cm³ when no more will dissolve.' },
    { t: 'Float switch', d: 'A float on a hinge or rod that rises with the water and flips a switch at a set level.' },
  ],
  defaults: { focus: 'swim', fat: 20, breath: 'in', water: 'pool', fill: 60, bladder: 4, salt: 0, egg: 'fresh', shake: 0 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'swim', label: 'Swimmer' }, { v: 'sub', label: 'Fish and sub' }, { v: 'egg', label: 'Egg test' }, { v: 'jar', label: 'Layers' }] },
    { key: 'breath', type: 'seg', label: 'Swimmer: lungs', options: [{ v: 'out', label: 'Breathed out' }, { v: 'normal', label: 'Normal' }, { v: 'in', label: 'Big breath in' }] },
    { key: 'fat', type: 'range', label: 'Swimmer: body fat', min: 8, max: 40, step: 1, ends: ['8%', '40%'], fmt: (v) => v + '%' },
    { key: 'water', type: 'seg', label: 'Swimmer: water', options: [{ v: 'pool', label: 'Pool 1.000' }, { v: 'sea', label: 'Sea 1.025' }] },
    { key: 'fill', type: 'range', label: 'Sub: ballast tanks flooded', min: 0, max: 100, step: 0.5, ends: ['empty', 'full'], fmt: (v) => v.toFixed(1) + '%' },
    { key: 'bladder', type: 'range', label: 'Fish: swim bladder, % of body', min: 0, max: 10, step: 0.1, ends: ['0%', '10%'], fmt: (v) => v.toFixed(1) + '%' },
    { key: 'salt', type: 'range', label: 'Egg: salt stirred into 100 mL', min: 0, max: 35, step: 0.5, ends: ['none', '35 g'], fmt: (v) => v + ' g' },
    { key: 'egg', type: 'seg', label: 'Egg: how old', options: [{ v: 'fresh', label: 'Fresh' }, { v: 'old', label: '3 weeks' }, { v: 'stale', label: 'Very old' }] },
    { key: 'go', type: 'buttons', label: 'Try these', items: [
      { label: 'Hover the sub (91.4%)', act: (s) => { s.focus = 'sub'; s.fill = 91.5; } },
      { label: 'Blow the tanks', act: (s) => { s.focus = 'sub'; s.fill = 0; } },
      { label: 'Shake the jar', act: (s, inst) => { s.focus = 'jar'; inst.shake(); } },
    ] },
  ],
  onChange(s, key) {
    if (['breath', 'fat', 'water'].includes(key)) s.focus = 'swim';
    if (key === 'fill' || key === 'bladder') s.focus = 'sub';
    if (key === 'salt' || key === 'egg') s.focus = 'egg';
  },
  quiz: [
    { q: 'Why do you float more easily after a big breath in?', options: ['Air in your lungs pushes you up like a jet', 'The extra air raises your volume but hardly your mass, so your average density drops', 'Your muscles relax', 'Water pressure falls'], answer: 1, why: 'Six litres of air weigh about 7 g but add 6 litres of volume. Your average density falls below the water’s, so you float.' },
    { q: 'How does a submarine dive?', options: ['It points its nose down and pushes', 'It lets sea water into its ballast tanks until it is as dense as, or denser than, the sea', 'It pumps air in', 'It switches off its engines'], answer: 1, why: 'Flooding the ballast tanks adds mass without changing the hull’s volume, so its average density rises to match or beat the sea’s.' },
    { q: 'A fresh egg sinks in tap water. What makes it float?', options: ['Adding sugar or salt to make the water denser', 'Cooling the water', 'Adding more water', 'Stirring hard'], answer: 0, why: 'Dissolved salt makes the water denser. Once the water is denser than the egg (about 1.08 g/cm³), the egg floats.' },
  ],
  reel: [
    { ms: 5000, caption: 'Take a big breath: six litres of air make your body lighter than water, and you float.', set: { focus: 'swim', fat: 20, water: 'pool', breath: 'out' }, anim: { breath: ['out', 'in'] }, view: { pos: [0.40, 1.05, 3.40], target: [0.4, 0.75, 0] }, spin: 0 },
    { ms: 5200, caption: 'A submarine floods its ballast tanks with 160 tonnes of sea water to dive.', set: { focus: 'sub', fill: 20, bladder: 4.7 }, anim: { fill: [20, 96] }, view: { pos: [SX + 0.6 + 0.00, 0.89, 4.42], target: [SX + 0.6, 0.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const gW = new THREE.Group(), gS = new THREE.Group(), gE = new THREE.Group(), gJ = new THREE.Group();
    gS.position.x = SX; gE.position.x = EX; gJ.position.x = JX; root.add(gW, gS, gE, gJ);
    const show = focusSwitch(stage, { swim: gW, sub: gS, egg: gE, jar: gJ }, VIEWS);

    // ================================================================ swimmer in a pool
    const POOL = { w: 3.0, h: 1.3, d: 1.4, lev: 1.15 };
    const pool = tank(POOL.w, POOL.h, POOL.d, { level: POOL.lev, col: 0x3d9be9, op: 0.28 }); pool.position.set(0.3, 0, 0); gW.add(pool);
    const tiles = box(POOL.w, 0.02, POOL.d, M.matte(0x7fc8e8)); tiles.position.set(0.3, 0.01, 0); gW.add(tiles);
    const swimmer = makeSwimmer({ shirt: 0x2a7be4 }); gW.add(swimmer);
    const lSwim = stage.label('', [0, 0, 0], gW, 'hot'); lSwim.element.style.setProperty('--c', COL.up);
    const lungs = [-1, 1].map((z) => { const l = sphere(1, M.clear(0xff9fb0, 0.6, { depthWrite: true }), 16); l.scale.set(0.09, 0.07, 0.06); l.position.set(-0.45, 0.02, z * 0.08); swimmer.add(l); return l; });
    let curW = null;
    const wBoard = board(gW, 1.9, 1.2, 620, 392, (g, w, h) => {
      panelBg(g, w, h); if (!curW) return;
      title(g, 'Body density', 'g/cm³');
      const x0 = 40, x1 = w - 30, lo = 0.94, hi = 1.07, X = (r) => x0 + ((r - lo) / (hi - lo)) * (x1 - x0), yA = 250;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, yA); g.lineTo(x1, yA); g.stroke();
      [0.95, 1.0, 1.05].forEach((t) => text(g, t.toFixed(2), X(t) - 18, yA + 28, 'rgba(255,255,255,.6)', '17px sans-serif'));
      for (const [k, v] of Object.entries(WATERS)) { g.strokeStyle = COL.water; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(v), 70); g.lineTo(X(v), yA); g.stroke(); g.setLineDash([]); text(g, k === 'pool' ? 'pool' : 'sea', X(v) + 5, 86, COL.water, '16px sans-serif'); }
      ['out', 'normal', 'in'].forEach((b, i) => { const r = body(curW.fat, b).rho, on = b === curW.breath; dot(g, X(r), yA - 40 - i * 45, on ? COL.hot : '#fff', on ? 10 : 7); text(g, { out: 'breathed out', normal: 'normal', in: 'big breath' }[b], X(r) + 14, yA - 34 - i * 45, on ? COL.hot : 'rgba(255,255,255,.7)', (on ? 'bold ' : '') + '16px sans-serif'); });
      text(g, '← floats          sinks →', X(curW.w) - 95, h - 20, 'rgba(255,255,255,.6)', '16px sans-serif');
    }, [1.75, 2.2, -1.0]);
    wBoard.mesh.rotation.y = -0.2;
    const sw = { y: POOL.lev };

    // ================================================================ fish and submarine in the sea
    const SEA = { w: 7, d: 2.4, h: 2.6 };
    const seaT = tank(SEA.w, SEA.h + 0.2, SEA.d, { level: SEA.h, col: 0x2f86c8, op: 0.3 }); seaT.position.y = -1.2; gS.add(seaT);
    const sand = box(SEA.w, 0.04, SEA.d, M.matte(0xc9b27c)); sand.position.y = -1.18; gS.add(sand);
    const sub = new THREE.Group(); gS.add(sub);
    const hullL = 67.5 * 0.055, hullR = 3.1 * 0.055 * 1.3;
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(hullR, hullL - 2 * hullR, 8, 24), M.metal(0x3d434d, { roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false })); hull.renderOrder = 6; hull.rotation.z = Math.PI / 2; sub.add(hull);
    const sail = box(0.45, 0.32, 0.12, M.metal(0x3d434d, { roughness: 0.6, metalness: 0.4 })); sail.position.set(0.5, hullR + 0.14, 0); sub.add(sail);
    const prop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 12), M.metal(0x9a7b3a)); prop.rotation.z = Math.PI / 2; prop.position.x = -hullL / 2 - 0.05; sub.add(prop);
    // cut-away ballast tanks, fore and aft, filling with water
    const tanks = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(sx * hullL * 0.33, 0, hullR * 0.2); sub.add(g);
      const shellT = box(0.55, hullR * 1.4, 0.02, M.clear(0xd8ecff, 0.35)); g.add(shellT);
      const w = box(0.53, 1, 0.03, M.glow(0x2f9bff)); w.renderOrder = 5; w.geometry.translate(0, 0.5, 0); w.position.y = -hullR * 0.7; g.add(w); g.w = w; return g; });
    const lSub = stage.label('', [0, 0, 0], gS, 'hot'); lSub.element.style.setProperty('--c', COL.cool);
    const fish = makeFish(0.6, 0xff9f43); gS.add(fish);
    const lFish = stage.label('', [0, 0, 0], gS, 'hot'); lFish.element.style.setProperty('--c', COL.hot);
    const bubbles = []; for (let i = 0; i < 14; i++) { const b = sphere(0.03, M.clear(0xffffff, 0.6), 8); gS.add(b); bubbles.push(b); }
    const sb = { y: 1.2, v: 0, fy: 0.3, fv: 0, blow: 0 };

    // ================================================================ egg in a glass
    const GL = { r: 0.42, h: 1.25, lev: 1.0 };
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(GL.r, GL.r * 0.92, GL.h, 40, 1, true), M.clear(0xe6f4ff, 0.2)); glass.position.y = GL.h / 2; gE.add(glass);
    const gBase = new THREE.Mesh(new THREE.CylinderGeometry(GL.r * 0.92, GL.r * 0.92, 0.04, 40), M.clear(0xe6f4ff, 0.4)); gBase.position.y = 0.02; gE.add(gBase);
    const gWater = new THREE.Mesh(new THREE.CylinderGeometry(GL.r - 0.01, GL.r * 0.92 - 0.01, GL.lev - 0.04, 40), M.clear(0x9fd4ff, 0.3)); gWater.position.y = 0.04 + (GL.lev - 0.04) / 2; gE.add(gWater);
    const egg = sphere(1, M.matte(0xf3e4cf, { roughness: 0.7 }), 32); egg.scale.set(0.215, 0.285, 0.215); gE.add(egg);
    const saltPile = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 24), M.matte(0xf4f6f8)); saltPile.position.set(0.95, 0.1, 0.2); gE.add(saltPile);
    const spoon = beam([0.7, 0.3, 0.3], [1.35, 0.55, 0.4], 0.02, M.metal(0xc9ced6)); gE.add(spoon);
    const lEgg = stage.label('', [0, 0, 0], gE, 'hot'); lEgg.element.style.setProperty('--c', COL.hot);
    const eg = { y: 0.3, tilt: Math.PI / 2 };
    const counter = box(3.0, 0.1, 1.6, M.matte(0x5b4636)); counter.position.set(0.3, -0.05, 0); gE.add(counter);

    // ================================================================ layered jar
    const JR = 0.45, JH = 2.1, lay = JH / 3.3;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 40, 1, true), M.clear(0xe6f4ff, 0.18)); jar.position.y = JH / 2; gJ.add(jar);
    const jBase = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, 0.04, 40), M.clear(0xe6f4ff, 0.4)); jBase.position.y = 0.02; gJ.add(jBase);
    const liqs = LIQ.map((l, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(JR - 0.01, JR - 0.01, lay, 40), new THREE.MeshStandardMaterial({ color: l.col, transparent: true, opacity: l.op, roughness: 0.2, depthWrite: false })); m.position.y = 0.04 + lay * (i + 0.5); gJ.add(m); return m; });
    const liqLabels = LIQ.map((l, i) => stage.label(`${l.name} ${l.rho.toFixed(2)}`, [JR + 0.55, 0.04 + lay * (i + 0.5), 0], gJ));
    const objs = OBJS.map((o, i) => { const m = i === 2 ? box(0.16, 0.1, 0.16, M.plastic(o.col, { roughness: 0.3 })) : i === 3 ? new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 6), M.metal(o.col)) : sphere(i === 0 ? 0.1 : 0.07, i === 0 ? M.matte(o.col) : M.plastic(o.col, { roughness: 0.3 }), 20); gJ.add(m); return m; });
    const objLabels = OBJS.map((o) => stage.label(`${o.name} ${o.rho.toFixed(2)}`, [0, 0, 0], gJ));
    const jj = { shake: 0, t: 0 };
    const jr = rng(5);
    return {
      shake() { jj.shake = 1; },
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [...liqLabels, lFish]);
        reelBoards([[wBoard, [0.3, 2.6, -1], 0.9]]);
        show(s.focus);

        if (s.focus === 'swim') {
          const b = body(s.fat, s.breath), rw = WATERS[s.water];
          pool.liq.setFluid(s.water === 'sea' ? 0x2f86c8 : 0x3d9be9, s.water === 'sea' ? 0.34 : 0.28);
          const T = 0.26;                                            // body thickness, m
          let yT;
          if (b.rho < rw) yT = POOL.lev + (1 - b.rho / rw - 0.5) * T;       // floating: the part above the surface
          else yT = T / 2 + 0.03;                                         // resting on the bottom
          const speed = b.rho < rw ? 2 : 0.25 + 12 * (b.rho - rw);        // sinks slowly
          sw.y = approach(sw.y, yT, speed, dt);
          swimmer.position.set(0.3, sw.y + (b.rho < rw ? Math.sin(time * 1.4) * 0.008 : 0), 0);
          lungs.forEach((l) => l.scale.set(0.05 + 0.012 * LUNG[s.breath], 0.04 + 0.008 * LUNG[s.breath], 0.035 + 0.006 * LUNG[s.breath]));
          lSwim.position.set(0.3, POOL.lev + 0.45, 0); lSwim.element.innerHTML = b.rho < rw ? `floats, <b>${pct(1 - b.rho / rw, 1)}</b> above water` : 'sinks, slowly';
          lSwim.element.style.setProperty('--c', b.rho < rw ? COL.up : COL.down);
          const kk = `${s.fat}|${s.breath}|${s.water}`; if (!curW || curW.k !== kk) { curW = { k: kk, fat: s.fat, breath: s.breath, w: rw }; wBoard.redraw(); }
        }

        if (s.focus === 'sub') {
          const m = subMass(s.fill), rhoS = 1.025, cap = SUB.V * rhoS;        // tonnes
          const top = SEA.h - 1.2, bot = -1.18 + hullR + 0.02;
          // floating: fraction of hull under = m / cap; hull centre sits accordingly
          if (m < cap) { const k = m / cap, yT = top + hullR - 2 * hullR * k; sb.v = 0; sb.y = approach(sb.y, yT, 1.5, dt); }
          else { const a = clamp((m - cap) / cap, 0, 0.1) * 30; sb.v = approach(sb.v, -Math.sqrt(a) * 0.6, 1, dt); sb.y = Math.max(bot, sb.y + sb.v * dt); }
          sub.position.set(0.6, sb.y, -0.2); sub.rotation.z = Math.sin(time * 0.5) * 0.01;
          tanks.forEach((t) => { t.w.scale.y = Math.max(0.001, hullR * 1.4 * s.fill / 100); });
          lSub.position.set(0.6, Math.min(top + 0.75, sb.y + 0.75), 0.3);
          lSub.element.innerHTML = m < cap - 0.5 ? `sub ${Math.round(m).toLocaleString('en-IN')} t: floats` : m > cap + 0.5 ? `sub ${Math.round(m).toLocaleString('en-IN')} t: dives` : 'sub: hovers, neutral';
          // fish
          const rf = fishRho(s.bladder), dF = rf - rhoS;
          sb.fv = approach(sb.fv, clamp(-dF * 25, -0.5, 0.5), 1.5, dt);
          sb.fy = clamp(sb.fy + sb.fv * dt, -1.0, top - 0.15);
          fish.position.set(-2.4 + Math.sin(time * 0.4) * 0.25, sb.fy, 0.5); fish.rotation.y = Math.cos(time * 0.4) > 0 ? 0 : Math.PI;
          fish.tail.rotation.y = Math.sin(time * 8) * 0.4;
          const bs = Math.cbrt(Math.max(0.02, s.bladder) / 5); fish.bladder.scale.set(0.12 * bs, 0.05 * bs, 0.036 * bs);
          lFish.position.set(fish.position.x, sb.fy + 0.35, 0.5); lFish.element.innerHTML = `fish ${rf.toFixed(3)} g/cm³: ${Math.abs(dF) < 0.002 ? 'hovers' : dF < 0 ? 'rises' : 'sinks'}`;
          // bubbles from the tanks when they are being blown (fill low while sub below the surface)
          sb.blow = approach(sb.blow, s.fill < 50 && sb.y < top - hullR ? 1 : 0, 3, dt);
          bubbles.forEach((b, i) => { const ph = (time * 0.6 + i / bubbles.length) % 1; b.visible = sb.blow > 0.1; b.position.set(0.6 + (i % 2 ? 1 : -1) * hullL * 0.33 + Math.sin(i * 3 + time) * 0.1, sb.y + ph * (top - sb.y), 0); });
        }

        if (s.focus === 'egg') {
          const w = saltPct(s.salt), rb = brine(w) / 1000, re = EGG[s.egg].rho;
          gWater.material.color.setHex(s.salt > 0 ? 0xbfe3ff : 0x9fd4ff);
          saltPile.scale.setScalar(Math.max(0.05, 1 - s.salt / 40));
          let yT, tT;
          const halfL = 0.285, halfW = 0.215;
          if (re > rb) { tT = s.egg === 'fresh' ? Math.PI / 2 : s.egg === 'old' ? 0.35 : 0; yT = 0.04 + (tT > 1 ? halfW : halfL * 0.96); }
          else { const k = re / rb; tT = s.egg === 'stale' ? 0.1 : Math.PI / 2 * 0.3; yT = GL.lev + (0.5 - k) * 2 * halfW; }
          eg.y = approach(eg.y, yT, 2.5, dt); eg.tilt = approach(eg.tilt, tT, 2.5, dt);
          egg.position.set(0, eg.y, 0); egg.rotation.z = eg.tilt;
          lEgg.position.set(0.85, GL.h + 0.15, 0); lEgg.element.innerHTML = re > rb ? `${EGG[s.egg].name} sinks` : `${EGG[s.egg].name} floats`;
        }

        if (s.focus === 'jar') {
          jj.shake = Math.max(0, jj.shake - dt * 0.22);
          const k = jj.shake;
          const mixCol = new THREE.Color(0xc9a24a);
          liqs.forEach((m, i) => { m.material.color.setHex(LIQ[i].col).lerp(mixCol, k); m.material.opacity = LIQ[i].op * (1 - k) + 0.6 * k; });
          OBJS.forEach((o, i) => {
            const st = settle(o.rho), m = objs[i], hh = i === 0 ? 0.1 : i === 2 ? 0.05 : 0.04;
            let y;
            if (st.layer === -1) y = 0.04 + lay * 3 + (1 - 2 * st.k) * hh;
            else if (st.layer === 3) y = 0.04 + hh;
            else y = 0.04 + lay * (2 - st.layer) + (1 - 2 * st.k) * hh;
            const x = -0.22 + i * 0.15, jit = k * 0.5;
            m.position.set(x + Math.sin(time * 9 + i) * jit * 0.2, clamp(y + Math.sin(time * 7 + i * 2) * jit, 0.06, JH - 0.2), (i % 2 ? 0.12 : -0.12));
            objLabels[i].position.set(i === 0 ? JR + 0.55 : -JR - 0.75 - (i % 2) * 0.1, i === 0 ? y + 0.2 : y, 0); objLabels[i].visible = k < 0.2 && stage.host.clientWidth >= 560;
          });
        }
      },
      readout: (s) => {
        if (s.focus === 'sub') {
          const m = subMass(s.fill), cap = SUB.V * 1.025, rf = fishRho(s.bladder);
          return `<div class="big">Submarine ${m < cap - 0.5 ? 'floats' : m > cap + 0.5 ? 'dives' : 'hovers'}: ${Math.round(m).toLocaleString('en-IN')} t</div>
            <div class="row"><span>Hull volume (Kalvari class)</span><b>${Math.round(SUB.V).toLocaleString('en-IN')} m³</b></div>
            <div class="row"><span>Sea water it can displace</span><b>${Math.round(cap).toLocaleString('en-IN')} t</b></div>
            <div class="row"><span>Water in the ballast tanks</span><b>${Math.round(m - SUB.dry)} t</b></div>
            <div class="row"><span>Fish with a ${s.bladder.toFixed(1)}% bladder</span><b>${rf.toFixed(3)} g/cm³</b></div>
            <small>Sea water 1.025 g/cm³. Fish flesh about 1.076: it hovers in the sea with a 4.7% bladder, in a river with about 7%.</small>`;
        }
        if (s.focus === 'egg') {
          const w = saltPct(s.salt), rb = brine(w) / 1000, re = EGG[s.egg].rho;
          return `<div class="big">${EGG[s.egg].name} ${re > rb ? 'sinks' : 'floats'}</div>
            <div class="row"><span>Salt in the water</span><b>${w.toFixed(1)}% by mass</b></div>
            <div class="row"><span>Water density</span><b>${rb.toFixed(3)} g/cm³</b></div>
            <div class="row"><span>Egg density (roughly)</span><b>${re.toFixed(3)} g/cm³</b></div>
            <small>A fresh egg floats once you stir in about 13 g of salt per 100 mL of water. Egg values are typical, not exact.</small>`;
        }
        if (s.focus === 'jar') {
          return `<div class="big">Lightest on top, densest at the bottom</div>
            ${LIQ.slice().reverse().map((l) => `<div class="row"><span>${l.name}</span><b>${l.rho.toFixed(2)} g/cm³</b></div>`).join('')}
            <div class="row"><span>Bead 0.95 between oil and water</span><b>${pct(settle(0.95).k)} in the water</b></div>
            <small>An object floats where the liquid above is lighter and the liquid below is denser than it is.</small>`;
        }
        const b = body(s.fat, s.breath), rw = WATERS[s.water];
        return `<div class="big">Body ${b.rho.toFixed(3)} g/cm³: ${b.rho < rw ? 'floats' : 'sinks'}</div>
          <div class="row"><span>Tissue at ${s.fat}% fat (Siri model)</span><b>${b.rt.toFixed(3)} g/cm³</b></div>
          <div class="row"><span>Tissue volume, 60 kg person</span><b>${b.Vt.toFixed(1)} L</b></div>
          <div class="row"><span>Air in lungs and gut</span><b>${b.Va.toFixed(1)} L</b></div>
          <div class="row"><span>Water: ${s.water === 'sea' ? 'sea' : 'pool'}</span><b>${rw.toFixed(3)} g/cm³</b></div>
          <small>ρ = mass ÷ (tissue volume + air). Fat 0.90, lean tissue 1.10 g/cm³.</small>`;
      },
    };
  },
};
