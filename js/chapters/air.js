// Chapter 3: buoyancy in air and in hot water. Three scenes:
// 1. A hot-air (or helium) balloon. Envelope 2,800 m³ (a typical 4-person balloon, about 90,000 ft³),
//    envelope 110 kg, basket, burners and fuel 190 kg, passengers 75 kg each.
//    Lift = V × (ρ_outside − ρ_inside) with ρ = p M ÷ (R T) and equal pressure inside and out.
//    For hot air that is ρ_out × V × (1 − T_out ÷ T_in). Nylon envelopes are kept below about 120 °C.
//    Air thins with height, roughly ρ ∝ e^(−h/H) with H ≈ 8.4 km, so the balloon climbs until
//    lift = load: h = H ln(ρ₀ V (1 − T_out/T_in) ÷ m). (Isothermal atmosphere; real air also cools
//    with height, so this is a rough guide.)
// 2. A 15-litre geyser tank with a 2 kW element at the bottom (see WaterHeaterClear). 20 layers.
//    Heating warms the bottom layer; any layer warmer than the one above it is lighter, so the two
//    mix (convective adjustment). Opening the tap pushes cold 20 °C water in at the bottom and draws
//    from the top. Water density from Tanaka et al. (2001) / IAPWS: 998.2 kg/m³ at 20 °C, 983.2 at 60 °C.
//    Sped up 60 times.
// 3. A 4 m × 3 m room with a split AC blowing 16 °C air, walls and people heating the air towards
//    32 °C. Air parcels follow one big circulation cell when the AC is mounted high, or a shallow
//    cell near the floor when it is mounted low, where warm air stays floating under the ceiling.
//    The board bins the parcels by height to draw the temperature profile. Illustrative flow pattern.
import { THREE, M, box, beam, sphere, clamp, approach, canvasTexture } from '../kit.js';
import {
  G0, rhoGas, M_AIR, M_HE, rhoWaterHot, board, panelBg, title, axes, dot, line, text, COL, HEX, force,
  fitNarrow, pickView, reelBoards, inReel, focusSwitch, dots, rng, makePerson,
} from '../buoyancy.js';

// ---------------------------------------------------------------- balloon physics
const CRX = 2.4;
export const BAL = { V: 2800, env: 110, gear: 190, person: 75, H: 8400 };
export function balloon(s) {
  const rhoOut = rhoGas(s.tout), rhoIn = s.gas === 'helium' ? rhoGas(s.tout, M_HE) : rhoGas(s.tin);
  const liftKg = BAL.V * (rhoOut - rhoIn);                        // kg of lift at ground level
  const load = BAL.env + BAL.gear + s.people * BAL.person;
  const h = liftKg > load ? BAL.H * Math.log(liftKg / load) : 0;
  return { rhoOut, rhoIn, liftKg, load, net: liftKg - load, h, perM3: rhoOut - rhoIn };
}
// ---------------------------------------------------------------- geyser tank
const N = 20, TANK_L = 15, P_EL = 2000, C_W = 4186, T_IN = 20, SPEED = 60, FLOW = 6 / 60;   // L/s
function makeTankSim(T0) {
  const T = new Float32Array(N).fill(T0);
  const mix = () => { for (let pass = 0; pass < N; pass++) { let any = false; for (let i = 0; i < N - 1; i++) { if (rhoWaterHot(T[i]) < rhoWaterHot(T[i + 1]) - 1e-4) { const m = (T[i] + T[i + 1]) / 2; T[i] = m; T[i + 1] = m; any = true; } } if (!any) break; } };
  return {
    T,
    step(dt, heat, tap) {
      const h = dt * SPEED, mL = TANK_L / N;
      if (heat) { T[0] = Math.min(99, T[0] + (P_EL * h) / (mL * C_W)); T[1] = Math.min(99, T[1] + (0.3 * P_EL * h) / (mL * C_W)); }
      if (tap) {                                                     // plug flow: shift up by the volume drawn
        let dv = FLOW * h;
        while (dv > 0) { const k = Math.min(1, dv / mL); for (let i = N - 1; i > 0; i--) T[i] = T[i] * (1 - k) + T[i - 1] * k; T[0] = T[0] * (1 - k) + T_IN * k; dv -= mL; }
      }
      mix();
    },
    reset(t) { T.fill(t); },
  };
}
export const tempHex = (t) => { const k = clamp((t - 15) / 55, 0, 1); const c = new THREE.Color().setHSL(0.6 - 0.6 * k, 0.85, 0.55); return c.getHex(); };
const RC0 = new THREE.Color(0x3b82f6), RC1 = new THREE.Color(0xff7a3d);
const roomHex = (t) => RC0.clone().lerp(RC1, clamp((t - 16) / 16, 0, 1)).getHex();
const cssT = (t) => '#' + tempHex(t).toString(16).padStart(6, '0');

// ---------------------------------------------------------------- room airflow
const RW = 4, RH = 3, RD = 3, NP = 360;
// Stream function of one circulation cell filling x ∈ [0, W], y ∈ [y0, y1]; turns so that air
// falls down the AC wall (x = 0), runs along the floor, rises at the far wall and returns up high.
function cellVel(x, y, y0, y1, amp) {
  if (y < y0 || y > y1) return [0, 0];
  const h = y1 - y0, X = Math.PI * x / RW, Y = Math.PI * (y - y0) / h;
  // ψ = amp sin X sin Y ; u = ∂ψ/∂y, v = −∂ψ/∂x
  return [amp * Math.sin(X) * Math.cos(Y) * (Math.PI / h), -amp * Math.cos(X) * Math.sin(Y) * (Math.PI / RW)];
}

const GX = 40, RX = 80;
const VIEWS = {
  balloon: { pos: [0.4, 2.7, 11.2], target: [0.2, 2.6, 0], cx: 2.3 },
  geyser: { pos: [GX - 0.7, 1.9, 5.2], target: [GX - 0.9, 1.35, 0], cx: GX },
  room: { pos: [RX + 1.3, 2.4, 8.2], target: [RX + 1.5, 1.55, 0], cx: RX + 2 },
};

export default {
  id: 'air',
  short: 'Air and heat',
  title: 'Floating on air: balloons, geysers and AC',
  subtitle: 'Warm air and warm water are a little lighter, so they rise. Cold sinks.',
  view: VIEWS.balloon,
  learn: `<p>Air is a fluid too, so Archimedes works in air. Everything around you is pushed up by the weight of the air it displaces. For you that is only about 0.08 kg worth, so you don't notice. For a <b>balloon</b> it is everything.</p>
    <p>Heat air and its molecules spread out, so the same volume holds fewer of them. Air at <b>100 °C</b> is about <b>20% lighter</b> than air at 20 °C. Fill a 2,800 m³ envelope with it and the lighter air inside floats on the heavier air outside, lifting <b>600 kg or more</b>. That is how the Montgolfier brothers flew in <b>1783</b>. Pilots like to fly in cool early mornings: the colder the air outside, the bigger the difference, the more lift.</p>
    <p><b>Helium</b> is lighter still, 0.17 kg/m³ against air's 1.2, so a party balloon floats even when cold.</p>
    <p>Water does the same. Water at 60 °C is <b>1.5% lighter</b> than at 20 °C, so in a <b>geyser</b> the hot water rises and collects at the top, right where the outlet pipe draws from (see WaterHeaterClear). The cold inlet comes in at the bottom.</p>
    <p>And the air in your room: <b>cold air sinks</b>. A split AC is mounted <b>high</b> on the wall so its cold air falls through the whole room and stirs it (see ACClear). Mount it low and the cold air pools on the floor while warm air stays floating under the ceiling. Heaters work best low for the same reason. This rising of warm fluid is <b>convection</b> (HeatClear). Sunshine warms the ground, warm moist air rises in bubbles called <b>thermals</b>, cools as it climbs and makes puffy <b>clouds</b>. Kites and eagles ride those thermals.</p>
    <p class="tip"><b>Try it:</b> turn up the burner until the balloon lifts, then warm the day to 40 °C. Switch the geyser element on, then open the tap. Move the AC low and watch the heat layer form.</p>`,
  terms: [
    { t: 'Convection', d: 'Heat carried by a moving fluid: warm, lighter fluid rises and cooler, denser fluid sinks to take its place.' },
    { t: 'Lift (balloon)', d: 'Weight of the outside air displaced minus the weight of the gas inside: V × (ρ_out − ρ_in).' },
    { t: 'Ideal gas density', d: 'ρ = p M ÷ (R T): at the same pressure, hotter gas and lighter molecules mean lower density.' },
    { t: 'Stratification', d: 'A fluid sorted into layers by density, lightest on top, that do not mix on their own.' },
    { t: 'Thermal', d: 'A rising bubble of sun-warmed air. It cools as it climbs and often builds a cloud on top.' },
  ],
  defaults: { focus: 'balloon', gas: 'hot', tin: 95, tout: 25, people: 2, heat: true, tap: false, ac: 'high' },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'balloon', label: 'Balloon' }, { v: 'geyser', label: 'Geyser tank' }, { v: 'room', label: 'Room and AC' }] },
    { key: 'gas', type: 'seg', label: 'Balloon: fill it with', options: [{ v: 'hot', label: 'Hot air' }, { v: 'helium', label: 'Helium' }] },
    { key: 'tin', type: 'range', label: 'Balloon: air inside', min: 20, max: 120, step: 1, ends: ['20 °C', '120 °C'], fmt: (v) => v + ' °C' },
    { key: 'tout', type: 'range', label: 'Balloon: air outside', min: 0, max: 45, step: 1, ends: ['0 °C', '45 °C'], fmt: (v) => v + ' °C' },
    { key: 'people', type: 'range', label: 'Balloon: passengers (75 kg each)', min: 0, max: 5, step: 1, ends: ['0', '5'], fmt: (v) => v },
    { key: 'heat', type: 'toggle', label: 'Geyser: element on (2 kW)' },
    { key: 'tap', type: 'toggle', label: 'Geyser: hot tap open (6 L/min)' },
    { key: 'ac', type: 'seg', label: 'Room: AC mounted', options: [{ v: 'high', label: 'High on the wall' }, { v: 'low', label: 'Low, near the floor' }] },
    { key: 'go', type: 'buttons', label: 'Try these', items: [
      { label: 'Cool dawn flight', act: (s) => Object.assign(s, { focus: 'balloon', gas: 'hot', tout: 8, tin: 95 }) },
      { label: 'Hot afternoon', act: (s) => Object.assign(s, { focus: 'balloon', gas: 'hot', tout: 40, tin: 95 }) },
      { label: 'Refill geyser cold', act: (s, inst) => { s.focus = 'geyser'; inst.resetTank(20); } },
    ] },
  ],
  onChange(s, key) {
    if (['gas', 'tin', 'tout', 'people'].includes(key)) s.focus = 'balloon';
    if (key === 'heat' || key === 'tap') s.focus = 'geyser';
    if (key === 'ac') s.focus = 'room';
    if (s.tin < s.tout) s.tin = s.tout;
  },
  quiz: [
    { q: 'Why does a hot-air balloon rise?', options: ['Hot air is pulled up by the Sun', 'The hot air inside is less dense than the cooler air it displaces', 'The burner pushes it up like a rocket', 'Warm air has no weight'], answer: 1, why: 'The envelope displaces its own volume of outside air. The warm air inside weighs less than that, so the difference is an upward force.' },
    { q: 'Why do balloon pilots prefer to fly early on cool mornings?', options: ['There is less traffic', 'Cooler outside air is denser, so the same hot air inside gives more lift', 'Helium works better in the morning', 'The burners are more powerful in the cold'], answer: 1, why: 'Lift depends on the difference in density between outside and inside. Cold outside air makes that difference bigger.' },
    { q: 'Why is a split AC usually mounted high on the wall?', options: ['To keep it away from children', 'Cold air is denser and sinks, so from high up it falls through and mixes the whole room', 'Warm air sinks, so the AC catches it', 'It is only for looks'], answer: 1, why: 'Cold air falls. From near the ceiling it tumbles down through the room. Mounted low, the cold air would just pool on the floor.' },
  ],
  reel: [
    { ms: 5200, caption: 'Air at 100 °C is 20% lighter than cool air: 2,800 m³ of it lifts a basket full of people.', set: { focus: 'balloon', gas: 'hot', tout: 15, people: 3 }, anim: { tin: [30, 100] }, view: { pos: [2.73, 3.36, 7.48], target: [2.4, 3.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const gB = new THREE.Group(), gG = new THREE.Group(), gR = new THREE.Group();
    gG.position.x = GX; gR.position.x = RX; root.add(gB, gG, gR);
    const show = focusSwitch(stage, { balloon: gB, geyser: gG, room: gR }, VIEWS);

    // ================================================================ the balloon
    const craft = new THREE.Group(); gB.add(craft);
    const prof = [[0.001, 0], [0.35, 0.05], [0.9, 0.55], [1.35, 1.35], [1.55, 2.1], [1.5, 2.7], [1.25, 3.15], [0.75, 3.45], [0.001, 3.55]].map(([r, y]) => new THREE.Vector2(r, y));
    const stripes = canvasTexture(512, 64, (g, w, h) => { const cols = ['#e63946', '#f4a261', '#2a9d8f', '#f1faee', '#264653', '#e9c46a']; for (let i = 0; i < 16; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * w) / 16, 0, w / 16 + 1, h); } });
    const envMat = new THREE.MeshStandardMaterial({ map: stripes.tex, roughness: 0.55, side: THREE.DoubleSide });
    const env = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), envMat); env.castShadow = true; env.position.y = 1.05; craft.add(env);
    const heGeo = new THREE.SphereGeometry(1.6, 40, 24);
    const heEnv = new THREE.Mesh(heGeo, M.plastic(0xd8dde6, { roughness: 0.25, metalness: 0.5 })); heEnv.position.y = 2.75; heEnv.castShadow = true; craft.add(heEnv);
    const basket = box(0.42, 0.34, 0.42, M.matte(0x8a6139, { roughness: 0.9 })); basket.position.y = 0.17; craft.add(basket);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) craft.add(beam([x, 0.34, z], [x * 1.3, 1.1, z * 1.3], 0.006, M.matte(0x333333)));
    const burner = box(0.16, 0.08, 0.16, M.metal(0x9aa3ad)); burner.position.y = 0.7; craft.add(burner);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 16), M.glow(0xffa64d, { transparent: true, opacity: 0.85 })); flame.position.y = 0.95; craft.add(flame);
    const people = [0, 1, 2, 3, 4].map((i) => { const h = sphere(0.055, M.matte([0xc68b64, 0x8d5a3b, 0xe0b48a, 0xa66b45, 0xd29a6c][i]), 12); h.position.set(-0.13 + (i % 3) * 0.13, 0.4, i < 3 ? -0.08 : 0.1); craft.add(h); return h; });
    const lAlt = stage.label('', [0, 0, 0], gB, 'hot'); lAlt.element.style.setProperty('--c', COL.hot);
    const lIn = stage.label('', [0, 0, 0], gB), lOut = stage.label('', [0.2, 0.35, 1.6], gB);
    const aLift = force(HEX.up, 0.04, 0.2), aLoad = force(HEX.down, 0.04, 0.2); gB.add(aLift, aLoad);
    // a hill and a few trees for scale
    const hill = sphere(1, M.matte(0x2f4a2c), 32); hill.scale.set(6, 0.6, 2.5); hill.position.set(0, -0.4, -5); gB.add(hill);
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 10), M.matte(0x2f5a2c)); t.position.set(-1.2 + i * 0.75, 0.27, -2.4 - (i % 2) * 0.6); gB.add(t); }
    let curB = null;
    const bBoard = board(gB, 3.1, 1.84, 820, 486, (g, w, h) => {
      panelBg(g, w, h);
      if (!curB) return;
      title(g, 'Density of air and helium', 'kg/m³ at sea level');
      const { X, Y } = axes(g, w, h, { xMax: 120, yMax: 1.4, xTicks: [0, 20, 40, 60, 80, 100, 120], yTicks: [0, 0.4, 0.8, 1.2], xFmt: (v) => v + '°', yFmt: (v) => v.toFixed(1), xLabel: 'temperature, °C →', yLabel: 'ρ ↑' });
      const air = [], he = []; for (let t = 0; t <= 120; t += 2) { air.push([t, rhoGas(t)]); he.push([t, rhoGas(t, M_HE)]); }
      line(g, air, X, Y, COL.hot, 5); line(g, he, X, Y, COL.cool, 4, [8, 6]);
      text(g, 'air', X(4), Y(1.3) - 4, COL.hot, 'bold 18px sans-serif'); text(g, 'helium', X(4), Y(0.17) - 10, COL.cool, 'bold 18px sans-serif');
      const b = curB.b;
      dot(g, X(curB.tout), Y(b.rhoOut), '#ffffff', 9); text(g, 'outside', X(curB.tout) + 12, Y(b.rhoOut) - 12, '#fff', '16px sans-serif');
      const tIn = curB.gas === 'helium' ? curB.tout : curB.tin;
      dot(g, X(tIn), Y(b.rhoIn), COL.red, 10); text(g, 'inside', X(tIn) + 12, Y(b.rhoIn) + 26, COL.red, 'bold 16px sans-serif');
      g.strokeStyle = COL.up; g.lineWidth = 3; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(tIn), Y(b.rhoOut)); g.lineTo(X(tIn), Y(b.rhoIn)); g.stroke(); g.setLineDash([]);
      text(g, `lift ${b.perM3.toFixed(3)} kg per m³`, X(tIn) + 12, (Y(b.rhoOut) + Y(b.rhoIn)) / 2, COL.up, 'bold 17px sans-serif');
    }, [-2.6, 1.45, 1.0]);
    bBoard.mesh.rotation.y = 0.3;
    const bal = { alt: 0, tIn: 20 };

    // ================================================================ the geyser tank
    const TKR = 0.75, TKH = 2.25, TK0 = 0.25;                       // display: 30 cm across, 45 cm tall
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(TKR + 0.08, TKR + 0.08, TKH + 0.16, 48, 1, true, Math.PI * 0.1, Math.PI * 1.3), M.plastic(0xf2f4f7, { roughness: 0.4, side: THREE.DoubleSide }));
    shell.position.y = TK0 + TKH / 2; gG.add(shell);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TKR + 0.08, 40, 12, Math.PI * 0.1, Math.PI * 1.3, 0, Math.PI / 2), M.plastic(0xf2f4f7, { roughness: 0.4, side: THREE.DoubleSide })); cap.scale.y = 0.35; cap.position.y = TK0 + TKH + 0.08; gG.add(cap);
    const layers = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(TKR, TKR, TKH / N + 0.002, 40), new THREE.MeshStandardMaterial({ color: 0x3355ff, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }));
      m.position.y = TK0 + (i + 0.5) * (TKH / N); gG.add(m); layers.push(m);
    }
    const element = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 40), M.glow(0xff6a3d)); element.rotation.x = Math.PI / 2; element.position.y = TK0 + 0.15; gG.add(element);
    gG.add(beam([0.2, TK0 + TKH - 0.05, 0.3], [0.2, TK0 + TKH + 0.5, 0.3], 0.04, M.metal(0xc0392b)));        // hot outlet from the top
    gG.add(beam([-0.3, TK0 + 0.12, 0.3], [-0.3, TK0 + TKH + 0.5, 0.3], 0.04, M.metal(0x2e86de)));         // cold inlet dip tube to the bottom
    const lHot = stage.label('hot out (from the top)', [0.6, TK0 + TKH + 0.55, 0.3], gG), lCold = stage.label('cold in (to the bottom)', [-1.15, TK0 + TKH + 0.55, 0.3], gG);
    const lTop = stage.label('', [TKR + 0.35, TK0 + TKH - 0.15, 0.4], gG, 'hot'), lBot = stage.label('', [TKR + 0.35, TK0 + 0.25, 0.4], gG, 'hot');
    const plume = dots(90, 0.022, 0xffd0a0, 6, 0.8); gG.add(plume);
    const sim = makeTankSim(25);
    const pr = rng(3), plumeP = Array.from({ length: 90 }, () => ({ y: pr(), a: pr() * Math.PI * 2, r: pr() * 0.25 }));
    const standG = box(2.2, 0.25, 1.6, M.matte(0x3a3f4b)); standG.position.y = 0.12; gG.add(standG);

    // ================================================================ the room
    const floorR = box(RW, 0.06, RD, M.matte(0x8c7b66)); floorR.position.set(RW / 2, -0.03, 0); gR.add(floorR);
    const backW = box(RW, RH, 0.06, M.matte(0x3b4150)); backW.position.set(RW / 2, RH / 2, -RD / 2); gR.add(backW);
    const sideW = box(0.06, RH, RD, M.matte(0x444b5c)); sideW.position.set(-0.03, RH / 2, 0); gR.add(sideW);
    const acU = new THREE.Group(); gR.add(acU);
    const acBody = box(0.25, 0.32, 1.0, M.plastic(0xf4f6f8, { roughness: 0.3 })); acU.add(acBody);
    const acVent = box(0.02, 0.05, 0.8, M.glow(0x8ef0ff)); acVent.position.set(0.13, -0.1, 0); acU.add(acVent);
    const sofa = box(0.8, 0.45, 1.6, M.matte(0x6b4f9a)); sofa.position.set(2.8, 0.22, -0.3); gR.add(sofa);
    const guest = makePerson({ shirt: 0xe07a2f }); guest.position.set(1.8, 0, 0.5); guest.rotation.y = Math.PI; gR.add(guest);
    const air = dots(NP, 0.035, 0xffffff, 6, 0.9); gR.add(air);
    const ar = rng(11), parcels = Array.from({ length: NP }, () => ({ x: 0.1 + ar() * (RW - 0.2), y: 0.05 + ar() * (RH - 0.1), z: -RD / 2 + 0.2 + ar() * (RD - 0.4), T: 28 + ar() * 3 }));
    const lAC = stage.label('', [0, 0, 0], gR, 'hot'); lAC.element.style.setProperty('--c', COL.cool);
    let prof2 = [];
    const rBoard = board(gR, 1.8, 1.9, 520, 548, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Temperature by height');
      const { X, Y } = axes(g, w, h, { x0: 70, xMin: 14, xMax: 34, yMax: 3, xTicks: [16, 20, 24, 28, 32], yTicks: [0, 1, 2, 3], xFmt: (v) => v + '°', yFmt: (v) => v + ' m', xLabel: '°C →' });
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(X(14), Y(1.8), X(34) - X(14), Y(0.1) - Y(1.8));
      text(g, 'where people are', X(14) + 8, Y(1.8) + 22, 'rgba(255,255,255,.5)', '16px sans-serif');
      line(g, prof2, X, Y, COL.hot, 5);
      prof2.forEach(([t, y]) => dot(g, X(t), Y(y), '#' + roomHex(t).toString(16).padStart(6, '0'), 6));
    }, [RW + 1.05, 1.7, -0.8]);
    rBoard.mesh.rotation.y = -0.3;
    let lastProf = 0;

    return {
      resetTank: (t) => sim.reset(t),
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lOut, lHot, lCold]);
        reelBoards([[bBoard, [2.4, 6.9, -1.5], 1.0], [rBoard, [RX + 2, 4.3, -1], 0.9]]);
        show(s.focus);

        if (s.focus === 'balloon') {
          const b = balloon(s);
          bal.tIn = approach(bal.tIn, s.tin, 1.5, dt);
          const target = b.h, disp = 1.5 * (1 - Math.exp(-target / 1500));
          bal.alt = approach(bal.alt, disp, 0.9, dt);
          craft.position.set(CRX, bal.alt, 0);
          const hot = s.gas === 'hot';
          env.visible = hot; heEnv.visible = !hot; flame.visible = hot && s.tin > s.tout + 5 && (time * 7) % 1 < 0.75;
          flame.scale.y = 0.8 + 0.4 * Math.sin(time * 23);
          people.forEach((p, i) => { p.visible = i < s.people; });
          lAlt.position.set(CRX + 1.1, bal.alt + 0.5, 0); lAlt.element.innerHTML = b.h > 0 ? `climbs to about <b>${b.h > 20000 ? '20+ km' : Math.round(b.h).toLocaleString('en-IN') + ' m'}</b>` : 'stays on the ground';
          lIn.position.set(CRX, bal.alt + 2.6, 1.7); lIn.element.innerHTML = hot ? `inside ${s.tin} °C, ${b.rhoIn.toFixed(3)} kg/m³` : `helium ${b.rhoIn.toFixed(3)} kg/m³`;
          lOut.element.innerHTML = `outside air ${s.tout} °C, ${b.rhoOut.toFixed(3)} kg/m³`;
          aLift.aim([CRX + 1.95, bal.alt + 2.6, 0], [0, 1, 0], 0.3 + Math.min(1.5, b.liftKg / 800));
          aLoad.aim([CRX + 1.95, bal.alt + 2.3, 0], [0, -1, 0], 0.3 + Math.min(1.5, b.load / 800));
          const kk = `${s.gas}|${s.tin}|${s.tout}|${s.people}`;
          if (!curB || curB.k !== kk) { curB = { k: kk, b, tout: s.tout, tin: s.tin, gas: s.gas }; bBoard.redraw(); }
        }

        if (s.focus === 'geyser') {
          sim.step(dt, s.heat, s.tap);
          layers.forEach((m, i) => m.material.color.setHex(tempHex(sim.T[i])));
          element.material.color.setHex(s.heat ? 0xff6a3d : 0x555555);
          // warm plume: dots rise from the element through any water cooler than them
          plumeP.forEach((p, i) => {
            p.y += dt * (s.heat ? 0.35 : 0);
            if (p.y > 1) p.y -= 1;
            const y = TK0 + 0.15 + p.y * (TKH - 0.3), r = p.r * (1 + p.y * 0.8);
            plume.place(i, Math.cos(p.a) * r, y, Math.sin(p.a) * r + 0.2, s.heat ? 1 - p.y * 0.6 : 0.0001);
          });
          plume.done();
          const tT = sim.T[N - 1], tB = sim.T[0];
          lTop.element.innerHTML = `top <b>${tT.toFixed(0)} °C</b> · ${rhoWaterHot(tT).toFixed(1)} kg/m³`; lTop.element.style.setProperty('--c', cssT(tT));
          lBot.element.innerHTML = `bottom <b>${tB.toFixed(0)} °C</b> · ${rhoWaterHot(tB).toFixed(1)} kg/m³`; lBot.element.style.setProperty('--c', cssT(tB));
        }

        if (s.focus === 'room') {
          const high = s.ac === 'high', acY = high ? 2.45 : 0.45;
          acU.position.set(0.13, acY, 0);
          const cellTop = high ? RH : 1.25, amp = 0.55;
          const h = Math.min(dt, 0.05);
          // turbulent mixing inside the circulating air: each parcel drifts towards the cell's mean
          let sum = 0, cnt = 0; for (const p of parcels) if (p.y <= cellTop) { sum += p.T; cnt++; }
          const mean = cnt ? sum / cnt : 30;
          for (let i = 0; i < NP; i++) {
            const p = parcels[i];
            let [u, v] = cellVel(p.x, p.y, 0, cellTop, amp);
            if (!high && p.y > cellTop) { u = 0.05 * Math.sin(time * 0.3 + i); v = 0.01 * Math.cos(time * 0.4 + i); }
            // near the outlet the jet blows cold air out and down
            const dA = Math.hypot(p.x - 0.3, p.y - (acY - 0.1));
            if (dA < 0.6) { p.T = 16; u += 0.4; v -= 0.3; }
            // the room heats every parcel towards 32 °C (walls, sun, people)
            p.T = approach(p.T, 32, 0.02, h);
            if (p.y <= cellTop) p.T = approach(p.T, mean, 0.25, h);
            p.x = clamp(p.x + u * h, 0.05, RW - 0.05); p.y = clamp(p.y + v * h, 0.03, RH - 0.03);
            p.z += Math.sin(time + i) * 0.002;
            air.place(i, p.x, p.y, p.z, 1); air.tint(i, roomHex(p.T));
          }
          air.done();
          lAC.position.set(1.3, acY - 0.35, 0.6); lAC.element.innerHTML = 'AC blows 16 °C air';
          if (time - lastProf > 0.4) {
            lastProf = time;
            const bins = Array.from({ length: 6 }, () => [0, 0]);
            parcels.forEach((p) => { const b = Math.min(5, Math.floor(p.y / 0.5)); bins[b][0] += p.T; bins[b][1]++; });
            prof2 = bins.filter((b) => b[1]).map((b, i) => [b[0] / b[1], (i + 0.5) * 0.5]);
            rBoard.redraw();
          }
        }
      },
      readout: (s) => {
        if (s.focus === 'geyser') {
          const tT = sim.T[N - 1], tB = sim.T[0];
          return `<div class="big">Hot water floats: top ${tT.toFixed(0)} °C</div>
            <div class="row"><span>Top layer density</span><b>${rhoWaterHot(tT).toFixed(1)} kg/m³</b></div>
            <div class="row"><span>Bottom layer density</span><b>${rhoWaterHot(tB).toFixed(1)} kg/m³</b></div>
            <div class="row"><span>Water at 20 °C / 60 °C</span><b>998.2 / 983.2</b></div>
            <div class="row"><span>Element</span><b>${s.heat ? '2 kW, on' : 'off'}</b></div>
            <small>15 L tank, sped up 60×. Warmer water is lighter, so it rises and the tank sorts itself hottest on top.</small>`;
        }
        if (s.focus === 'room') {
          const c = rhoGas(16), w = rhoGas(32);
          return `<div class="big">Cold air sinks: ${((c / w - 1) * 100).toFixed(1)}% denser</div>
            <div class="row"><span>Air at 16 °C (from the AC)</span><b>${c.toFixed(3)} kg/m³</b></div>
            <div class="row"><span>Air at 32 °C (warm room)</span><b>${w.toFixed(3)} kg/m³</b></div>
            <div class="row"><span>AC mounted</span><b>${s.ac === 'high' ? 'high: mixes the room' : 'low: cold pool on the floor'}</b></div>
            <small>Illustrative airflow. The board shows the average temperature of the air dots at each height.</small>`;
        }
        const b = balloon(s);
        return `<div class="big">${b.net > 0 ? `Lift ${Math.round(b.liftKg)} kg: it rises` : `Lift ${Math.round(b.liftKg)} kg: too little`}</div>
          <div class="row"><span>Outside air ρ at ${s.tout} °C</span><b>${b.rhoOut.toFixed(3)} kg/m³</b></div>
          <div class="row"><span>${s.gas === 'hot' ? `Hot air inside at ${s.tin} °C` : 'Helium inside'}</span><b>${b.rhoIn.toFixed(3)} kg/m³</b></div>
          <div class="row"><span>Lift = V × (ρ<sub>out</sub> − ρ<sub>in</sub>), V = 2,800 m³</span><b>${Math.round(b.liftKg).toLocaleString('en-IN')} kg</b></div>
          <div class="row"><span>Balloon, basket, fuel, ${s.people} people</span><b>${b.load} kg</b></div>
          <small>Buoyant force = ${(b.liftKg * G0 / 1000).toFixed(1)} kN. Air thins with height, so it levels off where lift equals load.</small>`;
      },
    };
  },
};
