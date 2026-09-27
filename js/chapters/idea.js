// Chapter 1: density ρ = m ÷ V and Archimedes' principle F = ρ_fluid × V_submerged × g.
// Scene (display scale S = 6 units per real metre):
//  - Seven same-size blocks (cork, pine, ice, water in a thin bag, aluminium, iron, gold) on little
//    kitchen scales at the back: same volume, very different mass. Densities in buoyancy.js (CRC).
//  - A brim-full "eureka" overflow can, 40 × 30 × 30 cm, with a spout. The chosen block hangs from a
//    spring balance and is lowered in. The water it pushes aside spills into a beaker on a scale.
//    Spilled volume = submerged volume, and its weight = the buoyant force (Archimedes, On Floating
//    Bodies, Book I, Prop. 5–7, c. 250 BCE).
//  - The spring balance reads W − F_b. A block less dense than the fluid floats when
//    F_b = W, i.e. with a fraction ρ_obj ÷ ρ_fluid of its volume under the surface; the string goes slack.
//  - Board: a "density ladder" on a log axis with the chosen fluid's line.
import { THREE, M, box, beam, sphere, clamp, approach, canvasTexture } from '../kit.js';
import {
  G0, MATS, MAT_ORDER, FLUIDS, board, panelBg, title, text, dot, COL, HEX, force, fitNarrow, pickView,
  reelBoards, inReel, tank, liquid, gcc, fmtN, fmtKg, fmtL, pct,
} from '../buoyancy.js';

const S = 6;                                   // display units per metre
const TW = 0.4 * S, TH = 0.3 * S, TD = 0.3 * S, LEVEL = 0.26 * S, FLOOR = 0.3;
const BEAK = { x: 2.2, r: 0.09 * S, h: 0.2 * S, y: 0.3 };
const TX = 0.9;                                 // the can, balance and beaker sit here
const VIEW = { pos: [0.1, 2.0, 7.2], target: [0.0, 1.75, 0], cx: 1.4 };
const alen = (F) => clamp(0.22 + 0.2 * Math.log10(Math.max(F, 1e-3) / 0.01), 0.08, 1.2);

export function matMaterial(k) {
  const m = MATS[k];
  if (m.metal) return M.metal(m.col, { roughness: k === 'gold' ? 0.22 : 0.4 });
  if (m.clear) return M.clear(m.col, 0.62, { roughness: 0.05, depthWrite: true });
  return M.matte(m.col, { roughness: m.rough });
}
// Where a block of side a (m) sits: returns submerged depth, V_sub, whether it floats, slack string.
export function hang(mat, fluid, a, lowerK) {
  const rho = MATS[mat].rho, rf = FLUIDS[fluid].rho;
  const V = a ** 3, m = rho * V, W = m * G0;
  const top = LEVEL / S + 0.05, bot = 0.004;       // block bottom height (m) above tank floor
  let yb = top + (bot - top) * lowerK;
  let d = clamp(LEVEL / S - yb, 0, a);
  const floats = rho < rf, deq = a * rho / rf;
  let slack = false;
  if (floats && d > deq) { d = deq; yb = LEVEL / S - deq; slack = true; }
  const Vsub = a * a * d, Fb = rf * Vsub * G0;
  return { rho, rf, V, m, W, yb, d, Vsub, Fb, scale: Math.max(0, W - Fb), floats, slack, deq };
}

export default {
  id: 'idea',
  short: 'Density and floating',
  title: 'Density decides what floats',
  subtitle: 'Same size, very different mass. The water pushes up with the weight of what you push aside.',
  view: VIEW,
  learn: `<p>Pick up a cork and an iron block of the same size. The iron is about 33 times heavier. That difference is <b>density</b>: how much mass is packed into each bit of space.</p>
    <p><b>ρ = m ÷ V</b></p>
    <p>ρ (the Greek letter rho) is density, m is <b>mass</b> and V is <b>volume</b>. The SI unit is <b>kg/m³</b>; in the kitchen we use <b>g/cm³</b>. Water is 1 g/cm³, which is 1,000 kg/m³: one litre has a mass of one kilogram. To measure a density, weigh the object, find its volume (with a ruler, or by how much water it pushes aside) and divide.</p>
    <p>Now lower a block into water. The water it pushes aside wants its place back, so it <b>pushes up</b>. Archimedes worked out how hard, over 2,200 years ago: the <b>buoyant force equals the weight of the fluid pushed aside</b>.</p>
    <p><b>F = ρ<sub>fluid</sub> × V<sub>submerged</sub> × g</b></p>
    <p>The upward push comes from <b>pressure</b>: water pushes harder on the bottom of the block, which is deeper, than on its top (see PressureClear). So:</p>
    <p>If the object is <b>less dense</b> than the fluid, it sinks only until it has pushed aside its own weight of fluid, then it <b>floats</b>. The fraction under the surface is <b>ρ<sub>object</sub> ÷ ρ<sub>fluid</sub></b>. Ice is 0.917 g/cm³, so about <b>92%</b> of an ice cube, or of an iceberg in fresh water, hides below the surface.</p>
    <p>If it is <b>denser</b>, even a fully sunk block can't push aside enough, so it sinks. It still feels lighter: the spring balance reads less underwater. Weight itself is gravity's pull (see GravityClear), and Newton's laws say the block settles where the forces balance (NewtonClear).</p>
    <p class="tip"><b>Try it:</b> lower the iron block and watch the spring balance drop as the beaker fills. Then switch the fluid to mercury: iron floats! Finally lower the ice and read the fraction under.</p>`,
  terms: [
    { t: 'Density (ρ)', d: 'Mass divided by volume. Units kg/m³ or g/cm³. Water is 1,000 kg/m³ = 1 g/cm³.' },
    { t: 'Volume', d: 'How much space something takes up. A 10 cm cube is 1,000 cm³, one litre.' },
    { t: 'Buoyant force', d: 'The upward push of a fluid on anything in it. It equals the weight of the fluid pushed aside.' },
    { t: 'Archimedes’ principle', d: 'F = ρ_fluid × V_submerged × g: a body in a fluid is pushed up by the weight of the fluid it displaces.' },
    { t: 'Displacement', d: 'The fluid an object pushes out of the way. An overflow (eureka) can collects it so you can measure it.' },
    { t: 'Apparent weight', d: 'What a spring balance reads underwater: the real weight minus the buoyant force.' },
    { t: 'Relative density', d: 'Density compared with water. Iron’s is 7.87, so it is 7.87 times as dense as water.' },
  ],
  defaults: { mat: 'iron', fluid: 'fresh', size: 10, lower: 0 },
  controls: [
    { key: 'mat', type: 'seg', label: 'Block', options: MAT_ORDER.map((k) => ({ v: k, label: MATS[k].short || MATS[k].name.replace(' wood', '') })) },
    { key: 'fluid', type: 'seg', label: 'Fluid in the can', options: ['oil', 'fresh', 'sea', 'dead', 'mercury'].map((k) => ({ v: k, label: { oil: 'Oil', fresh: 'Water', sea: 'Sea', dead: 'Dead Sea', mercury: 'Mercury' }[k] })) },
    { key: 'size', type: 'range', label: 'Block size (each side)', min: 2, max: 15, step: 0.5, ends: ['2 cm', '15 cm'], fmt: (v) => v.toFixed(1) + ' cm' },
    { key: 'lower', type: 'range', label: 'Lower it on the string', min: 0, max: 1, step: 0.01, ends: ['in the air', 'to the bottom'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'go', type: 'buttons', label: 'Try these', items: [
      { label: 'Lower it all the way', act: (s) => { s.lower = 1; } },
      { label: 'Lift it out', act: (s) => { s.lower = 0; } },
      { label: 'Ice in water', act: (s) => Object.assign(s, { mat: 'ice', fluid: 'fresh', lower: 1 }) },
      { label: 'Iron on mercury', act: (s) => Object.assign(s, { mat: 'iron', fluid: 'mercury', lower: 1 }) },
    ] },
  ],
  quiz: [
    { q: 'A 2 kg stone has a volume of 800 cm³. What is its density?', options: ['0.4 g/cm³', '1.6 g/cm³', '2.5 g/cm³', '1,600 g/cm³'], answer: 2, why: 'ρ = m ÷ V = 2,000 g ÷ 800 cm³ = 2.5 g/cm³. It is denser than water, so it sinks.' },
    { q: 'A block that weighs 30 N in air reads 20 N on a spring balance when fully under water. What is the buoyant force?', options: ['10 N', '20 N', '30 N', '50 N'], answer: 0, why: 'The balance reads weight minus buoyant force: 30 − F = 20, so F = 10 N. That is also the weight of the water the block pushed aside (about 1 litre).' },
    { q: 'Ice has a density of 0.92 g/cm³. Floating in fresh water, how much of an ice cube is under the surface?', options: ['8%', '50%', '92%', 'All of it'], answer: 2, why: 'A floating object sinks until it pushes aside its own weight of water. The fraction under is ρ_ice ÷ ρ_water = 0.92, so 92% is hidden.' },
  ],
  reel: [
    { ms: 5600, caption: 'Lower an iron block into water: the scale reads less, by the weight of the water pushed aside.', set: { mat: 'iron', fluid: 'fresh', size: 12, lower: 0 }, anim: { lower: [0, 1] }, view: { pos: [0.96, 2.29, 3.90], target: [0.9, 2.1, 0] }, spin: 0 },
    { ms: 5200, caption: 'Ice is 0.92 g/cm³, so it floats with 92% hidden below the surface, like an iceberg.', set: { mat: 'ice', fluid: 'fresh', size: 12, lower: 0 }, anim: { lower: [0, 1] }, view: { pos: [0.96, 2.10, 3.51], target: [0.9, 1.9, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);

    // ---------------------------------------------------------------- bench
    const bench = box(8.4, 0.3, 3.0, M.matte(0x3a3f4b)); bench.position.set(-0.3, 0.15, -0.1); root.add(bench);

    // ---------------------------------------------------------------- the row of seven blocks
    // Each sits on a little kitchen scale whose display (a canvas texture) shows its name and mass.
    const SHELF = { z: 0.75, y: 0.3, cube: 0.3 };
    const rowBlocks = [], pads = [];
    MAT_ORDER.forEach((k, i) => {
      const x = -3.7 + i * 0.46;
      const pad = box(0.42, 0.07, 0.42, M.plastic(0xe8ecf2)); pad.position.set(x, SHELF.y + 0.035, SHELF.z); root.add(pad);
      const b = box(SHELF.cube, SHELF.cube, SHELF.cube, matMaterial(k)); b.position.set(x, SHELF.y + 0.07 + SHELF.cube / 2, SHELF.z); root.add(b); rowBlocks.push(b);
      const lcd = canvasTexture(256, 112, (g, w, h, txt = ['', '', false]) => {
        g.fillStyle = txt[2] ? '#ffb547' : '#1c2a22'; g.fillRect(0, 0, w, h);
        g.fillStyle = txt[2] ? '#07080c' : '#9dffb0'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText(txt[0], w / 2, 44);
        g.font = 'bold 40px monospace'; g.fillText(txt[1], w / 2, 94);
      });
      const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.18), new THREE.MeshBasicMaterial({ map: lcd.tex, toneMapped: false }));
      disp.position.set(x, SHELF.y + 0.1, SHELF.z + 0.23); disp.rotation.x = -0.35; root.add(disp);
      pads.push(lcd);
    });
    const lRow = stage.label('Same size, different mass', [-2.3, 1.02, SHELF.z], root, 'hot'); lRow.element.style.setProperty('--c', COL.cool);

    const gT = new THREE.Group(); gT.position.x = TX; root.add(gT);
    // ---------------------------------------------------------------- overflow can, spout, beaker
    const can = tank(TW, TH, TD, { level: LEVEL, col: FLUIDS.fresh.col, op: FLUIDS.fresh.op }); can.position.y = FLOOR; gT.add(can);
    const spout = beam([TW / 2 + 0.02, FLOOR + LEVEL - 0.02, 0], [TW / 2 + 0.42, FLOOR + LEVEL - 0.14, 0], 0.045, M.clear(0xd8ecff, 0.4)); gT.add(spout);
    const stream = beam([0, 1, 0], [0, 0, 0], 0.022, M.clear(0x6cc4ff, 0.55)); gT.add(stream);
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(BEAK.r, BEAK.r, BEAK.h, 40, 1, true), M.clear(0xd8ecff, 0.16)); beaker.position.set(BEAK.x, BEAK.y + 0.1 + BEAK.h / 2, 0); gT.add(beaker);
    const bBase = new THREE.Mesh(new THREE.CircleGeometry(BEAK.r, 40), M.clear(0xd8ecff, 0.3)); bBase.rotation.x = -Math.PI / 2; bBase.position.set(BEAK.x, BEAK.y + 0.101, 0); gT.add(bBase);
    const bWater = new THREE.Mesh(new THREE.CylinderGeometry(BEAK.r - 0.01, BEAK.r - 0.01, 1, 40), M.clear(0x3d9be9, 0.45)); bWater.geometry.translate(0, 0.5, 0); bWater.position.set(BEAK.x, BEAK.y + 0.1, 0); gT.add(bWater);
    const kscale = box(0.8, 0.1, 0.8, M.plastic(0xe8ecf2)); kscale.position.set(BEAK.x, BEAK.y + 0.05, 0); gT.add(kscale);
    const kdisp = box(0.34, 0.06, 0.01, M.glow(0x9dffb0)); kdisp.position.set(BEAK.x, BEAK.y + 0.06, 0.405); gT.add(kdisp);
    const lBeaker = stage.label('', [BEAK.x - 0.2, BEAK.y + BEAK.h + 0.3, 0.2], gT);

    // ---------------------------------------------------------------- gantry and spring balance
    const steel = M.metal(0x8c95a3);
    const TOPY = 3.55;
    gT.add(beam([-1.45, 0.3, -0.7], [-1.45, TOPY, -0.7], 0.04, steel));
    gT.add(beam([-1.45, TOPY, -0.7], [0, TOPY, -0.7], 0.035, steel));
    gT.add(beam([0, TOPY, -0.7], [0, TOPY, 0], 0.035, steel));
    const sbBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.62, 24), M.plastic(0xf1b94a, { roughness: 0.35 })); sbBody.position.set(0, TOPY - 0.36, 0); gT.add(sbBody);
    const sbRod = beam([0, 0, 0], [0, -1, 0], 0.012, M.metal(0xd8dde6)); gT.add(sbRod);
    const sbHook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 20, Math.PI * 1.4), M.metal(0xd8dde6)); gT.add(sbHook);
    const string = beam([0, 1, 0], [0, 0, 0], 0.005, M.matte(0xeeeeee)); gT.add(string);
    const lScale = stage.label('', [0.45, TOPY - 0.3, 0], gT, 'hot'); lScale.element.style.setProperty('--c', COL.hot);

    // ---------------------------------------------------------------- the hanging block
    const blocks = {};
    MAT_ORDER.forEach((k) => { const b = box(1, 1, 1, matMaterial(k)); b.visible = false; gT.add(b); blocks[k] = b; });
    const aW = force(HEX.down, 0.03, 0.12), aB = force(HEX.up, 0.03, 0.12); gT.add(aW, aB);
    const lW = stage.label('', [0, 0, 0], gT), lB = stage.label('', [0, 0, 0], gT, 'hot'); lB.element.style.setProperty('--c', COL.up);
    const lLine = stage.label('', [0, 0, 0], gT);

    // ---------------------------------------------------------------- density ladder board
    let cur = null;
    const ladder = board(root, 2.5, 1.49, 860, 512, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      title(g, 'The density ladder', 'g/cm³, log scale');
      const x0 = 50, x1 = w - 40, lo = -1, hi = Math.log10(30);
      const X = (r) => x0 + ((Math.log10(r / 1000) - lo) / (hi - lo)) * (x1 - x0);
      const yA = 250;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, yA); g.lineTo(x1, yA); g.stroke();
      [0.1, 0.3, 1, 3, 10, 30].forEach((t) => { const x = X(t * 1000); g.beginPath(); g.moveTo(x, yA - 6); g.lineTo(x, yA + 6); g.stroke(); text(g, String(t), x - g.measureText(String(t)).width / 2 - 4, yA + 30, 'rgba(255,255,255,.6)', '18px sans-serif'); });
      const rf = FLUIDS[cur.fluid].rho, xf = X(rf);
      g.fillStyle = 'rgba(92,225,169,.10)'; g.fillRect(x0, 64, xf - x0, yA - 64);
      g.fillStyle = 'rgba(255,122,89,.10)'; g.fillRect(xf, 64, x1 - xf, yA - 64);
      g.strokeStyle = COL.water; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(xf, 58); g.lineTo(xf, yA + 8); g.stroke(); g.setLineDash([]);
      text(g, FLUIDS[cur.fluid].name + ' ' + (rf / 1000).toFixed(rf > 10000 ? 1 : 3), Math.min(xf + 8, x1 - 200), 84, COL.water, 'bold 18px sans-serif');
      text(g, '← floats', xf - 96, 110, COL.up, 'bold 18px sans-serif');
      text(g, 'sinks →', Math.min(xf + 10, x1 - 80), 110, COL.down, 'bold 18px sans-serif');
      MAT_ORDER.forEach((k, i) => {
        const r = MATS[k].rho, x = X(r), y = 150 + (i % 3) * 30, on = k === cur.mat;
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, yA); g.stroke();
        dot(g, x, yA, on ? COL.hot : '#' + MATS[k].col.toString(16).padStart(6, '0'), on ? 11 : 8);
        text(g, MATS[k].short || MATS[k].name.replace(' wood', ''), x - 26, y, on ? COL.hot : 'rgba(255,255,255,.8)', (on ? 'bold ' : '') + '17px sans-serif');
      });
      // fraction under the surface
      const rho = MATS[cur.mat].rho, k = rho / rf;
      const bx = 50, by = 330, bw = w - 100, bh = 40;
      text(g, `${MATS[cur.mat].short || MATS[cur.mat].name}: fraction under the surface = ρ ÷ ρ fluid`, bx, by - 14, '#e8eef8', 'bold 19px sans-serif');
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(bx, by, bw, bh);
      g.fillStyle = k < 1 ? COL.water : COL.down; g.fillRect(bx, by, bw * Math.min(1, k), bh);
      text(g, k < 1 ? `${pct(k, 1)} under, ${pct(1 - k, 1)} above` : 'more than 100%: it sinks', bx + 12, by + 28, '#07080c', 'bold 20px sans-serif');
      text(g, `ρ = ${(rho / 1000).toFixed(3)} ÷ ${(rf / 1000).toFixed(3)} = ${k.toFixed(3)}`, bx, by + 80, 'rgba(255,255,255,.75)', '19px sans-serif');
      text(g, 'Same size blocks: mass = ρ × V', bx, by + 116, 'rgba(255,255,255,.55)', '17px sans-serif');
    }, [2.7, 3.45, -1.0]);
    ladder.mesh.rotation.y = -0.25;

    const st = { y: null, spill: 0, lastSpill: 0, pour: 0 };
    let key = '', fluidNow = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lRow, lLine]);
        reelBoards([[ladder, [0.9, 4.3, -1.4], 0.85]]);
        const a = s.size / 100, h = hang(s.mat, s.fluid, a, s.lower);
        if (s.fluid !== fluidNow) { fluidNow = s.fluid; const f = FLUIDS[s.fluid]; can.liq.setFluid(f.col, f.op); bWater.material.color.setHex(f.col); }
        // smooth motion of the block (display units)
        const yT = FLOOR + h.yb * S;
        st.y = st.y === null ? yT : approach(st.y, yT, 6, dt);
        const aD = a * S;
        MAT_ORDER.forEach((k) => { blocks[k].visible = k === s.mat; });
        const blk = blocks[s.mat]; blk.scale.setScalar(aD); blk.position.set(0, st.y + aD / 2, 0);
        // the depth actually under water now (from the smoothed position)
        const dNow = clamp(LEVEL / S - (st.y - FLOOR) / S, 0, a), VsubNow = a * a * dNow, FbNow = h.rf * VsubNow * G0;
        const slack = h.floats && dNow >= h.deq - 1e-4;
        // spring balance: rod stretches with the reading; slack string when floating
        const reading = slack ? 0 : Math.max(0, h.W - FbNow);
        const ext = 0.04 + 0.22 * clamp(Math.log10(1 + reading) / Math.log10(700), 0, 1);
        const rodTop = TOPY - 0.62, rodBot = rodTop - ext - 0.12;
        sbRod.quaternion.identity(); sbRod.scale.y = rodTop - rodBot; sbRod.position.set(0, (rodTop + rodBot) / 2, 0);
        sbHook.position.set(0, rodBot - 0.03, 0); sbHook.rotation.z = Math.PI * 0.8;
        const topB = st.y + aD, strTop = rodBot - 0.06;
        const sLen = Math.max(0.01, strTop - topB);
        string.quaternion.identity(); string.scale.y = slack ? sLen * 1.05 : sLen; string.position.set(slack ? 0.03 : 0, topB + sLen / 2, 0); string.rotation.z = slack ? 0.06 : 0;
        lScale.element.innerHTML = slack ? 'balance reads <b>0 N</b>: it floats' : `balance reads <b>${fmtN(reading)}</b>`;
        // arrows: weight down from the centre, buoyancy up from the bottom face
        const cy = st.y + aD / 2;
        aW.aim([-aD / 2 - 0.12, cy, 0.2], [0, -1, 0], alen(h.W));
        aB.aim([aD / 2 + 0.12, st.y, 0.2], [0, 1, 0], FbNow > 1e-4 ? alen(FbNow) : 0);
        lW.position.set(-aD / 2 - 0.55, cy - 0.25, 0.2); lW.element.innerHTML = `weight ${fmtN(h.W)}`;
        lB.position.set(aD / 2 + 0.75, st.y + 0.1, 0.2); lB.element.innerHTML = `buoyancy <b>${fmtN(FbNow)}</b>`; lB.visible = FbNow > 1e-4;
        lLine.position.set(-TW / 2 - 0.1, FLOOR + LEVEL, TD / 2); lLine.element.innerHTML = FLUIDS[s.fluid].name; 
        // spilled fluid = submerged volume (the can starts brim-full)
        if (VsubNow > st.spill + 1e-9) st.pour = 0.35;
        st.spill = VsubNow; st.pour = Math.max(0, st.pour - dt);
        const bh = Math.max(0.001, (VsubNow / (Math.PI * (BEAK.r / S) ** 2)) * S);
        bWater.scale.y = bh; bWater.visible = VsubNow > 1e-8;
        const sx0 = TW / 2 + 0.42, sy0 = FLOOR + LEVEL - 0.16, sy1 = BEAK.y + 0.1 + bh;
        stream.visible = st.pour > 0; stream.quaternion.identity(); stream.scale.y = Math.max(0.01, sy0 - sy1); stream.position.set(sx0 + 0.02, (sy0 + sy1) / 2, 0);
        const mSp = h.rf * VsubNow;
        lBeaker.element.innerHTML = VsubNow > 1e-8 ? `spilled <b>${fmtL(VsubNow)}</b> = ${fmtN(mSp * G0)}` : 'beaker: spilled fluid';
        // shelf labels
        const kk = `${s.mat}|${s.fluid}|${s.size}`;
        if (kk !== key) {
          key = kk; cur = { mat: s.mat, fluid: s.fluid }; ladder.redraw();
          MAT_ORDER.forEach((k, i) => {
            const m = MATS[k].rho * a ** 3;
            pads[i].redraw([MATS[k].short || MATS[k].name.replace(' wood', ''), fmtKg(m), k === s.mat]);
            rowBlocks[i].position.y = SHELF.y + 0.07 + SHELF.cube / 2 + (k === s.mat ? 0.1 : 0);
          });
        }
      },
      readout: (s) => {
        const a = s.size / 100, h = hang(s.mat, s.fluid, a, s.lower), name = MATS[s.mat].short || MATS[s.mat].name;
        const verdict = h.floats ? `floats, ${pct(h.rho / h.rf)} under` : h.rho === h.rf ? 'hangs, neither up nor down' : 'sinks';
        return `<div class="big">${name}: ρ = ${gcc(h.rho)}, ${verdict}</div>
          <div class="row"><span>Mass m (${s.size} cm cube)</span><b>${fmtKg(h.m)}</b></div>
          <div class="row"><span>Volume V = ${s.size}³ cm³</span><b>${fmtL(h.V)}</b></div>
          <div class="row"><span>Weight m × g</span><b>${fmtN(h.W)}</b></div>
          <div class="row"><span>Buoyancy ρ<sub>fluid</sub> × V<sub>sub</sub> × g</span><b>${fmtN(h.Fb)}</b></div>
          <div class="row"><span>Spring balance reads</span><b>${h.slack ? '0 N (floating)' : fmtN(h.scale)}</b></div>
          <small>${FLUIDS[s.fluid].name}: ${gcc(h.rf, 3)}. Floats if ρ<sub>object</sub> &lt; ρ<sub>fluid</sub>; the fraction under is ρ<sub>object</sub> ÷ ρ<sub>fluid</sub>.</small>`;
      },
    };
  },
};
