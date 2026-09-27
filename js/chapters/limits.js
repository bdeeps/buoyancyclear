// Chapter 5: surprises, limits and myths. Four scenes:
// 1. A lake in winter. Water is densest at 3.98 °C (999.97 kg/m³, Tanaka et al. 2001); ice is
//    916.7 kg/m³. While the surface is above 4 °C, cooled surface water sinks and the lake mixes.
//    Below 4 °C the cold water is lighter and stays on top, so ice forms at the top and the bottom
//    stays near 4 °C (Hope, Trans. R. Soc. Edinburgh, 1805). The profile is a simple illustration.
// 2. The Dead Sea: surface water about 1.24 g/cm³ (Wikipedia, "Dead Sea"). A 60 kg swimmer with 20% fat
//    and a normal breath averages 1.006 g/cm³ (Siri model, see chapter 4), so about 19% rides above.
// 3. Neutral-buoyancy training. NASA's Neutral Buoyancy Laboratory at the Sonny Carter Training Facility,
//    Houston: 62 × 31 m and 12 m deep, 6.2 million US gallons (23.5 million litres) (NASA / Space Center
//    Houston). Suited astronaut modelled as 200 kg displacing 0.215 m³ (0.93 g/cm³), trimmed with lead
//    (11.34 g/cm³): neutral at about 16.5 kg of lead. Drag makes the motion slow; values illustrative.
// 4. Myths: a 390 kg pine log (4 m × 0.5 m, 0.5 g/cm³) floats while a 5 g iron nail sinks; and a boat's
//    draft does not depend on how deep the water is, as long as it is deeper than the draft.
import { THREE, M, box, beam, sphere, clamp, approach } from '../kit.js';
import {
  G0, rhoWater, RHO_ICE, board, panelBg, title, axes, dot, line, text, COL, HEX, force, fitNarrow, pickView,
  reelBoards, inReel, focusSwitch, tank, liquid, gcc, pct, makeSwimmer, makePerson, makeFish, fmtN,
} from '../buoyancy.js';
import { body } from './around.js';
import { tempHex } from './air.js';

// ---------------------------------------------------------------- lake profile
const NL = 16;
export function lakeProfile(airT) {
  const T = new Float32Array(NL);                                 // index 0 = bottom
  let ice = 0;
  if (airT >= 4) T.fill(airT);
  else {
    const top = Math.max(0, airT);
    for (let i = 0; i < NL; i++) { const z = i / (NL - 1); T[i] = z < 0.55 ? 4 : 4 + (top - 4) * ((z - 0.55) / 0.45); }
    if (airT < 0) ice = Math.min(0.35, 0.025 * -airT);
  }
  return { T, ice };
}
// Colour for lake water: pale at 0 °C, deep blue at the 4 °C maximum density, teal when warm.
const C0 = new THREE.Color(0xcdeeff), C4 = new THREE.Color(0x1f5fd6), C20 = new THREE.Color(0x3fb58a);
export const lakeHex = (t) => (t <= 4 ? C0.clone().lerp(C4, clamp(t / 4, 0, 1)) : C4.clone().lerp(C20, clamp((t - 4) / 16, 0, 1))).getHex();
// ---------------------------------------------------------------- astronaut
const AST = { m: 200, V: 0.215 };
export const astroNet = (lead) => (1000 * (AST.V + lead / 11340) - (AST.m + lead)) * G0;   // N, + means up

const DX = 40, AX = 80, MX = 120;
const VIEWS = {
  lake: { pos: [0.6, 1.9, 7.8], target: [0.3, 1.2, 0], cx: 0.3 },
  deadsea: { pos: [DX + 0.2, 1.7, 5.6], target: [DX + 0.1, 1.15, 0], cx: DX + 0.4 },
  astro: { pos: [AX - 0.6, 1.7, 7.2], target: [AX - 1.0, 1.25, 0], cx: AX },
  myths: { pos: [MX - 0.2, 1.7, 5.8], target: [MX - 0.6, 0.85, 0], cx: MX },
};

export default {
  id: 'limits',
  short: 'Surprises and myths',
  title: 'Ice on top, salty seas, space pools and myths',
  subtitle: 'Water is weird at 4 °C, salt lets you lie on the sea, and heavy things can float.',
  view: VIEWS.lake,
  learn: `<p>Almost everything gets denser as it cools. Water does too, until <b>4 °C</b>. Below that it starts to expand again, and when it freezes it expands by about 9%: ice is only <b>0.917 g/cm³</b>. So a lake cooling in winter first mixes until it is 4 °C all through. After that, the colder water stays on <b>top</b>, ice forms at the surface and floats, and the bottom stays at about 4 °C. Fish survive the winter under the lid of ice. If ice sank, lakes would freeze solid from the bottom up.</p>
    <p>The <b>Dead Sea</b>, between Jordan and Israel, is so salty that its water is about <b>1.24 g/cm³</b>. People float with a fifth of their body out of the water and read a newspaper lying on their back. You can't dive in it; you bob back up.</p>
    <p>Astronauts practise spacewalks underwater. NASA's <b>Neutral Buoyancy Laboratory</b> in Houston is a pool 62 m long and 12 m deep. Divers add small lead weights and foam to each suited astronaut until they neither rise nor sink. It feels like floating in space, but it isn't quite: water drags on every move, and inside the suit you still feel your weight pressing on the shoulders.</p>
    <p><b>Myth: heavy things sink.</b> No: <b>dense</b> things sink. A 390 kg pine log floats while a 5 g nail sinks, because the log is 0.5 g/cm³ and the iron is 7.9. Buoyancy compares densities, not weights.</p>
    <p><b>Myth: a boat floats better in deep water.</b> No: the push depends on how much water the hull pushes aside, not on how much water is underneath. The same boat sits at the same depth in a 2 m canal and in the open ocean, as long as its bottom doesn't touch.</p>
    <p class="tip"><b>Try it:</b> cool the air below 0 °C and watch the ice form on top. Salt the pool up to the Dead Sea. Trim the astronaut until they hover. Then test the myths.</p>`,
  terms: [
    { t: 'Maximum density of water', d: 'Pure water is densest at 3.98 °C, 999.97 kg/m³. Colder water and ice are lighter.' },
    { t: 'Ice', d: 'Frozen water, 0.917 g/cm³: about 9% bigger than the water it came from, so it floats.' },
    { t: 'Turnover', d: 'When a lake’s surface cools to the same density as the water below, the whole lake mixes.' },
    { t: 'Neutral buoyancy', d: 'Weight and buoyant force exactly equal, so an object hovers where it is put.' },
    { t: 'Trim', d: 'Adding small weights or floats to make something exactly neutral, or level.' },
  ],
  defaults: { focus: 'lake', airT: 8, rho: 1.24, lead: 14, myth: 'heavy', depth: 6 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'lake', label: 'Frozen lake' }, { v: 'deadsea', label: 'Dead Sea' }, { v: 'astro', label: 'Space pool' }, { v: 'myths', label: 'Myths' }] },
    { key: 'airT', type: 'range', label: 'Lake: air temperature', min: -15, max: 20, step: 0.5, ends: ['−15 °C', '20 °C'], fmt: (v) => v + ' °C' },
    { key: 'rho', type: 'range', label: 'Salty pool: water density', min: 1.0, max: 1.24, step: 0.005, ends: ['fresh 1.00', 'Dead Sea 1.24'], fmt: (v) => v.toFixed(3) + ' g/cm³' },
    { key: 'lead', type: 'range', label: 'Space pool: lead weights on the suit', min: 0, max: 30, step: 0.5, ends: ['0 kg', '30 kg'], fmt: (v) => v + ' kg' },
    { key: 'myth', type: 'seg', label: 'Myths', options: [{ v: 'heavy', label: 'Heavy things sink?' }, { v: 'deep', label: 'Deep water floats better?' }] },
    { key: 'depth', type: 'range', label: 'Myth: water depth under the boat', min: 0.5, max: 10, step: 0.1, ends: ['0.5 m', '10 m'], fmt: (v) => v.toFixed(1) + ' m' },
    { key: 'go', type: 'buttons', label: 'Try these', items: [
      { label: 'Deep winter (−10 °C)', act: (s) => Object.assign(s, { focus: 'lake', airT: -10 }) },
      { label: 'Trim to neutral', act: (s) => Object.assign(s, { focus: 'astro', lead: 16.5 }) },
    ] },
  ],
  onChange(s, key) {
    if (key === 'airT') s.focus = 'lake';
    if (key === 'rho') s.focus = 'deadsea';
    if (key === 'lead') s.focus = 'astro';
    if (key === 'myth') s.focus = 'myths';
    if (key === 'depth') { s.focus = 'myths'; s.myth = 'deep'; }
  },
  quiz: [
    { q: 'Why do lakes freeze from the top down?', options: ['The Sun heats the bottom', 'Water below 4 °C, and ice, are lighter than 4 °C water, so the coldest water stays on top', 'Ice is denser than water', 'Wind pushes ice up'], answer: 1, why: 'Water is densest at about 4 °C. Colder water and ice float on top of it, so the ice forms on the surface and the bottom stays near 4 °C.' },
    { q: 'A 400 kg log floats and a 5 g nail sinks. Why?', options: ['The log is too big to sink', 'Floating depends on density, not weight: wood is less dense than water and iron is denser', 'Nails are magnetic', 'Logs have air inside only when they are dry'], answer: 1, why: 'Buoyancy compares the object’s density with the water’s. Pine is about 0.5 g/cm³, iron 7.9, water 1.0.' },
    { q: 'A boat floats in 10 m of water. It moves into a 3 m deep canal (its draft is 1.2 m). What happens to its draft?', options: ['It sinks deeper', 'It rises higher', 'It stays the same', 'It runs aground'], answer: 2, why: 'The buoyant force depends only on the volume of water the hull displaces, not on the water below it. Only if the water is shallower than the draft does it touch bottom.' },
  ],
  reel: [
    { ms: 5200, caption: 'Water is densest at 4 °C. Colder water and ice float, so lakes freeze from the top down.', set: { focus: 'lake' }, anim: { airT: [10, -10] }, view: { pos: [0.60, 1.15, 4.16], target: [0.6, 0.7, 0] }, spin: 0 },
    { ms: 4800, caption: 'Myth busted: a 390 kg log floats and a 5 g nail sinks. Density decides, not weight.', set: { focus: 'myths', myth: 'heavy' }, view: { pos: [MX + 0.3 + 0.13, 1.32, 3.64], target: [MX + 0.3, 0.8, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const gL = new THREE.Group(), gD = new THREE.Group(), gA = new THREE.Group(), gM = new THREE.Group();
    gD.position.x = DX; gA.position.x = AX; gM.position.x = MX; root.add(gL, gD, gA, gM);
    const show = focusSwitch(stage, { lake: gL, deadsea: gD, astro: gA, myths: gM }, VIEWS);

    // ================================================================ the lake
    const LW = 5, LD = 1.8, LZ = 1.4;
    const bank = box(LW + 1.2, 0.3, LZ + 0.4, M.matte(0x4a3f33)); bank.position.set(0, -0.15, 0); gL.add(bank);
    for (const sx of [-1, 1]) { const b = box(0.6, LD + 0.3, LZ + 0.4, M.matte(0x4a3f33)); b.position.set(sx * (LW / 2 + 0.3), LD / 2 - 0.15, 0); gL.add(b); }
    const lakeLayers = [];
    for (let i = 0; i < NL; i++) { const m = box(LW, LD / NL + 0.002, LZ, new THREE.MeshStandardMaterial({ color: 0x3355ff, transparent: true, opacity: 0.7, roughness: 0.2, depthWrite: false })); m.position.y = (i + 0.5) * (LD / NL); gL.add(m); lakeLayers.push(m); }
    const iceSlab = box(LW, 1, LZ, M.plastic(0xe6f6ff, { roughness: 0.15, transparent: true, opacity: 0.85 })); gL.add(iceSlab);
    const fishL = makeFish(0.45, 0xd9a13a); gL.add(fishL);
    const snow = []; for (let i = 0; i < 30; i++) { const f = sphere(0.02, M.glow(0xffffff), 6); gL.add(f); snow.push(f); }
    const lSurf = stage.label('', [0, 0, 0], gL, 'hot'), lBottom = stage.label('', [LW / 2 - 0.9, 0.2, LZ / 2], gL, 'hot');
    let curLake = null;
    const lBoard = board(gL, 2.3, 1.45, 700, 440, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Density of water', 'kg/m³');
      const { X, Y } = axes(g, w, h, { xMax: 12, yMin: 999.4, yMax: 1000.05, xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: [999.4, 999.6, 999.8, 1000], xFmt: (v) => v + '°', yFmt: (v) => v.toFixed(1), x0: 96, xLabel: '°C →' });
      const pts = []; for (let t = 0; t <= 12; t += 0.1) pts.push([t, rhoWater(t)]);
      line(g, pts, X, Y, COL.water, 5);
      dot(g, X(3.98), Y(rhoWater(3.98)), COL.hot, 8); text(g, 'densest at 3.98 °C', X(3.98) + 12, Y(rhoWater(3.98)) + 24, COL.hot, 'bold 17px sans-serif');
      text(g, 'ice: 916.7, far off the bottom', X(0.2), h - 72, 'rgba(255,255,255,.6)', '16px sans-serif');
      if (curLake) { const t = curLake.top; dot(g, X(clamp(t, 0, 12)), Y(rhoWater(clamp(t, 0, 12))), '#fff', 7); text(g, 'surface', X(clamp(t, 0, 12)) + 10, Y(rhoWater(clamp(t, 0, 12))) - 10, '#fff', '15px sans-serif'); }
    }, [2.25, 2.5, -1.2]);
    lBoard.mesh.rotation.y = -0.25; lBoard.mesh.scale.setScalar(0.85);

    // ================================================================ the Dead Sea pool
    const POOL = { w: 3.0, h: 1.3, d: 1.4, lev: 1.15 };
    const pool = tank(POOL.w, POOL.h, POOL.d, { level: POOL.lev, col: 0x4fb3b0, op: 0.35 }); gD.add(pool);
    const sandD = box(POOL.w, 0.02, POOL.d, M.matte(0xe0cfa0)); sandD.position.y = 0.01; gD.add(sandD);
    const salt = []; for (let i = 0; i < 12; i++) { const c = box(0.12, 0.08, 0.1, M.plastic(0xf6f8fa, { roughness: 0.3 })); c.position.set(-1.3 + i * 0.23, 0.05, -0.55 + (i % 3) * 0.3); gD.add(c); salt.push(c); }
    const swimmer = makeSwimmer({ shirt: 0xe07a2f }); gD.add(swimmer);
    const paper = box(0.28, 0.005, 0.2, M.matte(0xf2efe6)); gD.add(paper);
    const lDS = stage.label('', [0, 0, 0], gD, 'hot'); lDS.element.style.setProperty('--c', COL.up);
    const ds = { y: POOL.lev };

    // ================================================================ the space pool
    const NB = { w: 3.6, h: 2.8, d: 2.0, lev: 2.65 };
    const nbl = tank(NB.w, NB.h, NB.d, { level: NB.lev, col: 0x2f86c8, op: 0.25 }); gA.add(nbl);
    const nFloor = box(NB.w, 0.02, NB.d, M.matte(0x9fb2c6)); nFloor.position.y = 0.01; gA.add(nFloor);
    // a mock-up of a space-station truss
    const truss = new THREE.Group(); truss.position.set(0.8, 1.3, -0.5); gA.add(truss);
    const tm = M.metal(0xd8dde6, { roughness: 0.4 });
    for (const [y, z] of [[0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [-0.25, -0.25]]) truss.add(beam([-0.8, y, z], [0.8, y, z], 0.025, tm));
    for (let i = 0; i <= 4; i++) { const x = -0.8 + i * 0.4; truss.add(beam([x, 0.25, 0.25], [x, -0.25, -0.25], 0.015, tm)); truss.add(beam([x, -0.25, 0.25], [x, 0.25, -0.25], 0.015, tm)); }
    for (const x of [-0.2, 0.2]) truss.add(beam([x, -0.25, 0], [x, -1.3, 0], 0.03, tm));
    const astro = makePerson({ shirt: 0xf2f4f7, pants: 0xf2f4f7, skin: 0xd8b36a, hair: 0xd8b36a, s: 0.62 }); gA.add(astro);
    const helmet = sphere(0.095, M.plastic(0xf2f4f7, { roughness: 0.3 }), 20); helmet.position.y = 0.46; astro.body.add(helmet);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.097, 16, 10, -0.9, 1.8, 0.9, 0.9), M.plastic(0xd9a441, { roughness: 0.1, metalness: 0.8 })); visor.position.y = 0.46; astro.body.add(visor);
    const pack = box(0.12, 0.3, 0.26, M.plastic(0xe8ecf2)); pack.position.set(-0.14, 0.2, 0); astro.body.add(pack);
    const leadBlocks = [-1, 1].map((z) => { const b = box(0.06, 0.05, 0.05, M.matte(0x4a4f58)); b.position.set(0.08, 0.1, z * 0.13); astro.body.add(b); return b; });
    astro.pose({ arm: 1.1 });
    const aNet = force(HEX.up, 0.03, 0.15); gA.add(aNet);
    const bubblesA = []; for (let i = 0; i < 10; i++) { const b = sphere(0.025, M.clear(0xffffff, 0.6), 8); gA.add(b); bubblesA.push(b); }
    const lAst = stage.label('', [0, 0, 0], gA, 'hot'); lAst.element.style.setProperty('--c', COL.cool);
    const as = { y: 1.2, v: 0 };

    // ================================================================ myths
    const gH = new THREE.Group(), gP = new THREE.Group(); gM.add(gH, gP);
    const mt = tank(4.4, 1.2, 1.4, { level: 0.95, col: 0x3d9be9, op: 0.3 }); gH.add(mt);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 24), M.matte(0x9a6a3c, { roughness: 0.9 })); log.rotation.z = Math.PI / 2; log.castShadow = true; gH.add(log);
    for (const sy of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), M.matte(0xd9b27c)); e.rotation.x = -sy * Math.PI / 2; e.position.y = sy * 1.201; log.add(e); }
    const nail = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), M.metal(0x9aa3ad)); nail.add(shaft); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.005, 12), M.metal(0x9aa3ad)); head.position.y = 0.05; nail.add(head); nail.rotation.z = 1.3; gH.add(nail);
    const lLog = stage.label('pine log <b>390 kg</b>: floats', [0, 0, 0], gH, 'hot'), lNail = stage.label('iron nail <b>5 g</b>: sinks', [1.5, 0.35, 0.5], gH, 'hot');
    lLog.element.style.setProperty('--c', COL.up); lNail.element.style.setProperty('--c', COL.down);
    const nl = { y: 0.95 };
    // the deep-water myth: a channel whose depth you set, 1 m = 0.2 display units
    const CH = { w: 4.4, d: 1.4, k: 0.2, draft: 1.2 };
    const bed = box(CH.w, 0.1, CH.d, M.matte(0x6b5a45)); bed.position.y = -0.05; gP.add(bed);
    const chan = liquid(CH.w, CH.d, 0x2f86c8, 0.32); gP.add(chan);
    const chGlass = tank(CH.w, 2.2, CH.d, { level: 0.001, op: 0 }); chGlass.liq.visible = false; gP.add(chGlass);
    const boat = new THREE.Group(); gP.add(boat);
    const bHull = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 24, 1, false, Math.PI / 2, Math.PI), M.plastic(0x2b6cd9, { roughness: 0.4, side: THREE.DoubleSide })); bHull.rotation.z = Math.PI / 2; bHull.scale.set(1, 1, 0.85); bHull.position.y = 0.28; boat.add(bHull);
    const bDeck = box(1.8, 0.02, 0.48, M.matte(0xd9c7a1)); bDeck.position.y = 0.28; boat.add(bDeck);
    const cabin = box(0.5, 0.3, 0.36, M.plastic(0xf2f4f7)); cabin.position.set(-0.3, 0.44, 0); boat.add(cabin);
    const lBoat = stage.label('', [0, 0, 0], gP, 'hot'); lBoat.element.style.setProperty('--c', COL.hot);
    const bt = { y: 1, tilt: 0 };

    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lBottom, lNail]);
        reelBoards([[lBoard, [0.2, 3.4, -1], 1.0]]);
        show(s.focus);

        if (s.focus === 'lake') {
          const p = lakeProfile(s.airT);
          lakeLayers.forEach((m, i) => { m.material.color.setHex(lakeHex(p.T[i])); });
          iceSlab.visible = p.ice > 0.005; iceSlab.scale.y = Math.max(0.001, p.ice); iceSlab.position.y = LD + p.ice / 2 - p.ice * 0.9;
          fishL.position.set(Math.sin(time * 0.3) * 1.5, 0.3, 0.1); fishL.rotation.y = Math.cos(time * 0.3) > 0 ? 0 : Math.PI; fishL.tail.rotation.y = Math.sin(time * 7) * 0.4;
          snow.forEach((f, i) => { const ph = (time * 0.15 + i / snow.length) % 1; f.visible = s.airT < 0; f.position.set(-2.4 + ((i * 0.618) % 1) * 4.8, LD + 1.4 - ph * 1.4, ((i * 0.37) % 1) * 0.7); });
          const top = p.T[NL - 1];
          lSurf.position.set(0.2, LD + 0.28, LZ / 2); lSurf.element.innerHTML = p.ice > 0.005 ? 'ice on top, 0 °C beneath it' : `surface ${top.toFixed(1)} °C`;
          lSurf.element.style.setProperty('--c', p.ice > 0.005 ? '#e6f6ff' : COL.cool);
          lBottom.element.innerHTML = `bottom ${p.T[0].toFixed(1)} °C`; lBottom.element.style.setProperty('--c', COL.cool);
          if (!curLake || curLake.top !== top) { curLake = { top }; lBoard.redraw(); }
        }

        if (s.focus === 'deadsea') {
          const b = body(20, 'normal'), rw = s.rho, T = 0.26;
          pool.liq.setFluid(new THREE.Color(0x3d9be9).lerp(new THREE.Color(0x4fb3b0), (rw - 1) / 0.24).getHex(), 0.3 + 0.1 * (rw - 1) / 0.24);
          salt.forEach((c, i) => { c.visible = i < Math.round(12 * (rw - 1) / 0.24); });
          const yT = b.rho < rw ? POOL.lev + (1 - b.rho / rw - 0.5) * T : T / 2 + 0.03;
          ds.y = approach(ds.y, yT, b.rho < rw ? 2 : 0.3, dt);
          swimmer.position.set(0, ds.y + (b.rho < rw ? Math.sin(time * 1.3) * 0.006 : 0), 0);
          paper.position.set(-0.35, ds.y + 0.2, 0); paper.rotation.z = 0.6; paper.visible = b.rho / rw < 0.9;
          lDS.position.set(0, POOL.lev + 0.5, 0); lDS.element.innerHTML = b.rho < rw ? `<b>${pct(1 - b.rho / rw)}</b> of the body above water` : 'sinks slowly (normal breath)';
        }

        if (s.focus === 'astro') {
          const F = astroNet(s.lead), vT = Math.sign(F) * Math.sqrt(Math.abs(F)) * 0.035;
          as.v = approach(as.v, vT, 1.2, dt);
          const yMin = 0.02, yMax = NB.lev - 0.95;
          as.y = clamp(as.y + as.v * dt, yMin, yMax);
          if (as.y <= yMin || as.y >= yMax) as.v = 0;
          astro.position.set(0.2, as.y, 0.2); astro.rotation.y = 0.4;
          leadBlocks.forEach((b) => b.scale.setScalar(0.3 + s.lead / 15));
          aNet.aim([-0.5, as.y + 0.5, 0.2], [0, F >= 0 ? 1 : -1, 0], Math.abs(F) < 1 ? 0 : 0.12 + Math.min(0.8, Math.abs(F) / 150));
          aNet.children.forEach((c) => c.material.color.setHex(F >= 0 ? HEX.up : HEX.down));
          bubblesA.forEach((b, i) => { const ph = (time * 0.5 + i / bubblesA.length) % 1; b.position.set(0.2 + Math.sin(i * 2 + time) * 0.06, as.y + 0.55 + ph * (NB.lev - as.y - 0.55), 0.25); b.visible = as.y + 0.55 < NB.lev; });
          lAst.position.set(0.9, Math.min(NB.lev + 0.25, as.y + 1.0), 0.3);
          lAst.element.innerHTML = Math.abs(F) < 2 ? 'neutral: <b>hovers</b>' : F > 0 ? `${fmtN(F)} up: floats up` : `${fmtN(-F)} down: sinks`;
        }

        if (s.focus === 'myths') {
          gH.visible = s.myth === 'heavy'; gP.visible = s.myth === 'deep';
          if (s.myth === 'heavy') {
            log.position.set(-0.6, 0.95 + Math.sin(time * 1.2) * 0.01, 0); log.rotation.x = Math.sin(time * 0.8) * 0.03;   // half under: 0.5 g/cm³
            nl.y = approach(nl.y, 0.02, 0.8, dt); nail.position.set(1.5, nl.y, 0.2);
            lLog.position.set(-0.6, 1.45, 0.3);
          } else {
            const lev = s.depth * CH.k, aground = s.depth < CH.draft;
            chan.setLevel(lev);
            const yT = aground ? 0 : lev - CH.draft * CH.k;
            bt.y = approach(bt.y, yT, 3, dt); bt.tilt = approach(bt.tilt, aground ? 0.06 : 0, 2, dt);
            boat.position.set(0, bt.y + (aground ? 0 : Math.sin(time * 1.4) * 0.006), 0); boat.rotation.z = bt.tilt;
            lBoat.position.set(1.1, Math.max(lev, bt.y + 0.3) + 0.45, 0.4);
            lBoat.element.innerHTML = aground ? 'aground: the bottom holds it up' : 'draft <b>1.2 m</b>, whatever the depth';
          }
        }
      },
      readout: (s) => {
        if (s.focus === 'deadsea') {
          const b = body(20, 'normal');
          return `<div class="big">Water ${s.rho.toFixed(3)} g/cm³: ${b.rho < s.rho ? pct(1 - b.rho / s.rho) + ' above' : 'you sink'}</div>
            <div class="row"><span>Swimmer (20% fat, normal breath)</span><b>${b.rho.toFixed(3)} g/cm³</b></div>
            <div class="row"><span>Fraction under = ρ<sub>body</sub> ÷ ρ<sub>water</sub></span><b>${b.rho < s.rho ? pct(b.rho / s.rho) : '100%'}</b></div>
            <div class="row"><span>Pool / sea / Dead Sea</span><b>1.000 / 1.025 / 1.24</b></div>
            <small>The Dead Sea is about a third salt by mass, nearly ten times saltier than the ocean.</small>`;
        }
        if (s.focus === 'astro') {
          const F = astroNet(s.lead);
          return `<div class="big">${Math.abs(F) < 2 ? 'Neutral: hovers' : F > 0 ? 'Too light: floats up' : 'Too heavy: sinks'}</div>
            <div class="row"><span>Suited astronaut</span><b>200 kg, 0.215 m³</b></div>
            <div class="row"><span>Lead weights added</span><b>${s.lead} kg</b></div>
            <div class="row"><span>Buoyancy − weight</span><b>${F >= 0 ? '+' : '−'}${fmtN(Math.abs(F))}</b></div>
            <div class="row"><span>Neutral at about</span><b>16.5 kg of lead</b></div>
            <small>NASA’s pool: 62 m × 31 m, 12 m deep, 23.5 million litres. Water drag slows every move, unlike space.</small>`;
        }
        if (s.focus === 'myths') {
          if (s.myth === 'deep') return `<div class="big">${s.depth < 1.2 ? 'Aground' : 'Same draft: 1.2 m'}</div>
            <div class="row"><span>Water depth</span><b>${s.depth.toFixed(1)} m</b></div>
            <div class="row"><span>Water the hull pushes aside</span><b>the same at any depth</b></div>
            <small>Buoyancy depends on the volume of water displaced, not on how much water is underneath.</small>`;
          return `<div class="big">Density decides, not weight</div>
            <div class="row"><span>Pine log, 4 m × 0.5 m</span><b>390 kg, 0.50 g/cm³</b></div>
            <div class="row"><span>Iron nail</span><b>5 g, 7.87 g/cm³</b></div>
            <div class="row"><span>Water</span><b>1.00 g/cm³</b></div>
            <small>The log displaces 390 kg of water with only half of itself under the surface.</small>`;
        }
        const p = lakeProfile(s.airT), top = p.T[NL - 1];
        return `<div class="big">${p.ice > 0.005 ? 'Ice on top, 4 °C at the bottom' : s.airT >= 4 ? 'Cooling: the lake mixes' : 'Cold water floats on top'}</div>
          <div class="row"><span>Surface water</span><b>${top.toFixed(1)} °C · ${rhoWater(top).toFixed(2)} kg/m³</b></div>
          <div class="row"><span>Bottom water</span><b>${p.T[0].toFixed(1)} °C · ${rhoWater(p.T[0]).toFixed(2)} kg/m³</b></div>
          <div class="row"><span>Ice</span><b>${RHO_ICE} kg/m³</b></div>
          <small>Water is densest at 3.98 °C. Simple illustration of a lake cooling through winter.</small>`;
      },
    };
  },
};
