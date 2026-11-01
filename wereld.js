/* =====================================================================
   De Nieuwe Vaart — 3D-wereld van ons terrein (homepage)
   Troephuis "Onveranderd" aan de Vadedoplas in de Munnikenpolder.
   Maten: kadaster (pand 26 x 35 m) en de plattegrond van vadedo.nl/gebouw.
   Scrollen = camera vliegt over het terrein, van middag naar nacht.
   Klik op de zeilende boot: overstag. Klik op steiger/eiland/troephuis: naar die pagina.
   Testen: ?tijd=0..1, ?seizoen=zomer|winter
   Coördinaten: meters, x = oost (rechts op de satellietfoto), z = zuid (naar de weg), y = omhoog.
   Midden van het troephuis = (0, 0, 0).
   ===================================================================== */
import * as THREE from './vendor/three.module.min.js';

const html = document.documentElement;
const houder = document.getElementById('wereld');
const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const klein = Math.min(innerWidth, innerHeight) < 700;
const zoekParam = (n) => new URLSearchParams(location.search).get(n);

/* ---------- Hulpjes ---------- */
const klem = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const glad = (a, b, x) => { const t = klem((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const kleur = (h) => new THREE.Color(h);
const zaad = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const reeks = (l) => l.map(([t, c]) => [t, kleur(c)]);
const opTijd = (r, t, uit = new THREE.Color()) => {
  if (t <= r[0][0]) return uit.copy(r[0][1]);
  for (let i = 1; i < r.length; i++) if (t <= r[i][0]) return uit.copy(r[i - 1][1]).lerp(r[i][1], (t - r[i - 1][0]) / (r[i][0] - r[i - 1][0]));
  return uit.copy(r[r.length - 1][1]);
};

/* ---------- Seizoen en tijd ---------- */
const maand = new Date().getMonth();
let winter = zoekParam('seizoen') === 'winter'; // altijd zomer: boten in de haven
const debugCam = zoekParam('cam') ? zoekParam('cam').split(',').map(Number) : null;
const vastTijd = zoekParam('tijd') !== null ? klem(parseFloat(zoekParam('tijd')), 0, 1) : null;
const tijdVolgensKlok = (d) => {
  const dag = (d - new Date(d.getFullYear(), 0, 0)) / 864e5;
  const g = Math.cos(2 * Math.PI * (dag - 172) / 365);
  const zt = d.getTimezoneOffset() < new Date(d.getFullYear(), 0, 1).getTimezoneOffset() ? 1 : 0;
  const onder = 18.78 + 2.27 * g + zt, op = 6.53 - 2.25 * g + zt;
  const u = d.getHours() + d.getMinutes() / 60;
  if (u >= onder - 2.5 && u < onder) return lerp(.25, .6, glad(onder - 2.5, onder, u));
  if (u >= onder && u < onder + 1.4) return lerp(.6, 1, (u - onder) / 1.4);
  if (u >= onder + 1.4 || u < op - 1) return 1;
  if (u < op + .5) return lerp(1, .6, (u - (op - 1)) / 1.5);
  if (u < op + 2) return lerp(.6, .1, (u - (op + .5)) / 1.5);
  return u > 12 ? lerp(0, .25, glad(12, onder - 2.5, u)) : .1 * (1 - glad(op + 2, 12, u));
};
const klokStart = Math.min(tijdVolgensKlok(new Date()), .45);

/* ---------- Kleuren over de dag ---------- */
const K = {
  luchtBoven: reeks([[0, '#5E9DD6'], [.38, '#6C9FD3'], [.6, '#4A4C93'], [.72, '#2A2160'], [.84, '#121133'], [1, '#05061A']]),
  horizon: reeks([[0, '#E8EEF2'], [.38, '#F8E2CC'], [.6, '#FFAE78'], [.72, '#D9707A'], [.84, '#4F2D5C'], [1, '#141432']]),
  zon: reeks([[0, '#FFF6E0'], [.38, '#FFE2B0'], [.6, '#FF9F60'], [.7, '#E8603C'], [1, '#E8603C']]),
  hemel: reeks([[0, '#CFE3F5'], [.38, '#F3DCC8'], [.6, '#C98AA0'], [.72, '#5A4377'], [.84, '#3A3A70'], [1, '#2E3462']]),
  grondLicht: reeks([[0, '#6F7F4E'], [.6, '#5A4A48'], [1, '#20223C']]),
  waterDiep: reeks([[0, '#1F3E4E'], [.38, '#22414F'], [.6, '#3A3866'], [.72, '#241E48'], [.84, '#0E0D26'], [1, '#05061A']]),
  waterLicht: reeks([[0, '#4F7484'], [.38, '#6A808A'], [.6, '#E19A86'], [.72, '#94597C'], [.84, '#3A2A55'], [1, '#1E1D40']])
};

/* =====================================================================
   Renderer, scène, camera
   ===================================================================== */
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) {
  // geen 3D mogelijk: terug naar het platte decor
  html.classList.remove('wereld-3d');
  const s = document.createElement('script'); s.src = 'scene.js?2d'; document.body.appendChild(s);
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, klein ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // fotografisch contrast
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = !klein;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
houder.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE8EEF2, 260, 1500);
const camera = new THREE.PerspectiveCamera(klein ? 55 : 45, innerWidth / innerHeight, .1, 3000);
camera.position.set(160, 130, 200);

const zon = new THREE.DirectionalLight(0xffffff, 2.4);
zon.castShadow = !klein;
zon.shadow.mapSize.set(klein ? 1024 : 4096, klein ? 1024 : 4096);
zon.shadow.radius = 3;
Object.assign(zon.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 600 });
zon.shadow.bias = -.0004;
zon.shadow.normalBias = .04;
scene.add(zon, zon.target);
const hemel = new THREE.HemisphereLight(0xCFE3F5, 0x6F7F4E, 1.2);
scene.add(hemel);

/* ---------- Materialen ---------- */
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, metalness: 0, flatShading: false, ...extra });
const M = {
  gras: mat('#6E9A45', { flatShading: false }),
  grasDonker: mat('#5F7F44'),
  zand: mat('#D9C9A0', { flatShading: false }),
  tegels: mat('#B9B6AE', { flatShading: false }),
  asfalt: mat('#6B6A69', { flatShading: false }),
  pad: mat('#B8A88A', { flatShading: false }),
  hout: mat('#8A6A4A'),
  houtDonker: mat('#5E4A38'),
  steigerHout: mat('#7D6E5E'),
  wit: mat('#F4F2EE'),
  donkerblauw: mat('#1F2B4E'),
  mast: mat('#B07A3A'),
  beton: mat('#A7A49C'),
  loods: mat('#24302C', { roughness: .6 }),
  roldeur: mat('#E8E6E0', { roughness: .5 }),
  zonnepaneel: mat('#1B2440', { roughness: .3, metalness: .3 }),
  dak: mat('#A9ADAE', { roughness: .7 }),
  dakDonker: mat('#7E8384', { roughness: .7 }),
  koepel: mat('#F1F4F6', { roughness: .2, transparent: true, opacity: .9 }),
  glas: new THREE.MeshStandardMaterial({ color: '#3A4A55', roughness: .1, metalness: .2, emissive: '#FFC27A', emissiveIntensity: 0 }),
  raamGlas: new THREE.MeshStandardMaterial({ color: '#36444E', roughness: .1, metalness: .2, emissive: '#FFC27A', emissiveIntensity: 0 }),
  vloer: mat('#9A9690', { flatShading: false }),
  binnenwand: mat('#E4E1DA'),
  grijsWand: mat('#6E7174'),
  rozeWand: mat('#E9A7C3'),
  bank: mat('#5B5D61'),
  kussen: mat('#4A4C50'),
  tafel: mat('#7A3B22', { roughness: .5 }),
  zwart: mat('#151515', { roughness: .3 }),
  oranje: mat('#E8541E'),
  kraan: mat('#22304A', { roughness: .5 }),
  tent: mat('#E9DCC8'),
  tentRoze: mat('#D9A3C2'),
  vuur: new THREE.MeshBasicMaterial({ color: '#FFB35A' }),
  riet: mat('#7F8A4A'),
  eendLijf: mat('#8A6B4E'),
  eendKop: mat('#2F6B48'),
  snavel: mat('#E8B23A'),
  koplamp: new THREE.MeshBasicMaterial({ color: '#FFF2C8' }),
  achterlicht: new THREE.MeshBasicMaterial({ color: '#FF3B2F' })
};
/* ---------- Textuur voor een echtere uitstraling (gras, tegels, bladeren) ---------- */
const ruisTextuur = (grootte, teken, herhaal = 1) => {
  const c = document.createElement('canvas'); c.width = c.height = grootte;
  const x = c.getContext('2d'); teken(x, grootte, zaad(grootte + 3));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(herhaal, herhaal); t.anisotropy = 4; return t;
};
// gras: lichte en donkere vlekken en sprietjes (grijswaarden, de kleur komt van het materiaal)
M.gras.map = ruisTextuur(512, (x, g, r) => {
  x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 90; i++) { const v = 170 + r() * 80; x.fillStyle = `rgba(${v},${v},${v},.35)`; x.beginPath(); x.arc(r() * g, r() * g, 20 + r() * 70, 0, 7); x.fill(); }
  for (let i = 0; i < 9000; i++) { const v = 130 + r() * 125; x.strokeStyle = `rgba(${v},${v},${v},.55)`; x.lineWidth = 1; const a = r() * g, b = r() * g; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - .5) * 3, b - 2 - r() * 4); x.stroke(); }
}, 1 / 14);
M.grasDonker.map = M.gras.map;
// betontegels van het plein (ca. 1 x 1 m)
M.tegels.map = ruisTextuur(256, (x, g, r) => {
  x.fillStyle = '#d8d6d0'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 2600; i++) { const v = 180 + r() * 70; x.fillStyle = `rgba(${v},${v},${v - 4},.5)`; x.fillRect(r() * g, r() * g, 2, 2); }
  for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(90,90,80,${.04 + r() * .05})`; x.beginPath(); x.arc(r() * g, r() * g, 10 + r() * 40, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(70,68,62,.55)'; x.lineWidth = 3;
  for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * g / 2, 0); x.lineTo(i * g / 2, g); x.stroke(); x.beginPath(); x.moveTo(0, i * g / 2); x.lineTo(g, i * g / 2); x.stroke(); }
});
M.tegels.color.set('#C9C6BE');
// bladerdak: gevlekt, zodat bomen niet als ballen ogen
const bladTex = ruisTextuur(256, (x, g, r) => {
  x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 1400; i++) { const v = 90 + r() * 165; x.fillStyle = `rgba(${v},${v},${v},.8)`; x.beginPath(); x.ellipse(r() * g, r() * g, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 7); x.fill(); }
}, 3);
/* ---------- Echte materialen: hout, beton, stof, verf (textuur per meter) ---------- */
const meterTex = (grootte, teken, perMeter = 1) => { const t = ruisTextuur(grootte, teken, perMeter); return t; };
const houtTex = meterTex(512, (x, g, r) => {
  x.fillStyle = '#d6b48a'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 220; i++) { // nerven in de lengte
    const y = r() * g, a = .05 + r() * .12, d = r() < .5 ? '90,55,25' : '255,235,200';
    x.strokeStyle = `rgba(${d},${a})`; x.lineWidth = .6 + r() * 2.2; x.beginPath(); x.moveTo(0, y);
    for (let k = 0; k <= g; k += 32) x.lineTo(k, y + Math.sin(k * .02 + i) * (1 + r() * 3)); x.stroke();
  }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(90,50,20,.35)'; x.beginPath(); x.ellipse(r() * g, r() * g, 5 + r() * 6, 3 + r() * 3, 0, 0, 7); x.fill(); } // kwasten
}, 1);
const betonTex = meterTex(512, (x, g, r) => {
  x.fillStyle = '#c4c2bd'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 160; i++) { const v = 150 + r() * 80; x.fillStyle = `rgba(${v},${v},${v - 3},.18)`; x.beginPath(); x.arc(r() * g, r() * g, 10 + r() * 60, 0, 7); x.fill(); }
  for (let i = 0; i < 9000; i++) { const v = 120 + r() * 120; x.fillStyle = `rgba(${v},${v},${v},.35)`; x.fillRect(r() * g, r() * g, 1.5, 1.5); }
  for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(70,65,60,${.06 + r() * .1})`; x.beginPath(); x.ellipse(r() * g, r() * g, 8 + r() * 40, 5 + r() * 25, r() * 3, 0, 7); x.fill(); } // vlekken
  const verf = ['#7fd3b0', '#e57fae', '#f2d16b', '#ffffff'];
  for (let i = 0; i < 40; i++) { x.fillStyle = verf[i % 4]; x.globalAlpha = .5; x.beginPath(); x.arc(r() * g, r() * g, 1 + r() * 3, 0, 7); x.fill(); } // verfspatten
  x.globalAlpha = 1;
}, .4);
const stofTex = meterTex(256, (x, g, r) => {
  x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, g, g);
  for (let yy = 0; yy < g; yy += 2) { x.fillStyle = `rgba(0,0,0,${.03 + r() * .05})`; x.fillRect(0, yy, g, 1); }
  for (let xx = 0; xx < g; xx += 2) { x.fillStyle = `rgba(255,255,255,${.02 + r() * .04})`; x.fillRect(xx, 0, 1, g); }
  for (let i = 0; i < 3000; i++) { const v = 150 + r() * 100; x.fillStyle = `rgba(${v},${v},${v},.3)`; x.fillRect(r() * g, r() * g, 1, 1); }
}, 3);
const verfTex = meterTex(256, (x, g, r) => {
  x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, g, g);
  for (let i = 0; i < 5000; i++) { const v = 205 + r() * 50; x.fillStyle = `rgba(${v},${v},${v},.4)`; x.fillRect(r() * g, r() * g, 2, 2); }
  for (let yy = 0; yy < g; yy += 64) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, yy, g, 2); } // voegen van de gasbetonblokken
  for (let yy = 0; yy < g; yy += 64) for (let xx = (yy / 64) % 2 * 64; xx < g; xx += 128) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(xx, yy, 2, 64); }
}, .8);
const echt = (m, tex, bump = .002, perMeter = true) => { m.map = tex; m.bumpMap = tex; m.bumpScale = bump; m.userData.meter = perMeter; m.needsUpdate = true; return m; };
echt(M.hout, houtTex); M.hout.color.set('#B58A5C');
echt(M.tafel, houtTex); M.tafel.color.set('#C9A577'); M.tafel.roughness = .55;
echt(M.vloer, betonTex, .003); M.vloer.color.set('#9C9A95');
echt(M.bank, stofTex, .004); M.bank.color.set('#8A8B8D');
echt(M.kussen, stofTex, .004); M.kussen.color.set('#7E8083');
echt(M.grijsWand, verfTex, .002); M.grijsWand.color.set('#8C9196');
echt(M.rozeWand, verfTex, .002); M.rozeWand.color.set('#F0B2C6');
echt(M.binnenwand, verfTex, .002);
echt(M.steigerHout, houtTex, .004); M.steigerHout.color.set('#8C7A66');
const winterKleuren = () => {
  M.gras.color.set(winter ? '#8A9562' : '#7C9E4C');
  M.grasDonker.color.set(winter ? '#6E7650' : '#66844A');
};
winterKleuren();

/* ---------- Teksten op hout, bordjes en vloer (canvas-texturen) ---------- */
const tekstTextuur = (tekst, opties = {}) => {
  const { b = 1024, h = 256, achter = null, kleur: kl = '#1F2B4E', font = '600 120px Montserrat, Arial, sans-serif', rand = null, schuin = false } = opties;
  const c = document.createElement('canvas'); c.width = b; c.height = h;
  const x = c.getContext('2d');
  if (achter) { x.fillStyle = achter; x.fillRect(0, 0, b, h); }
  if (rand) { x.strokeStyle = rand; x.lineWidth = h * .06; x.strokeRect(h * .05, h * .05, b - h * .1, h - h * .1); }
  x.fillStyle = kl; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (schuin) { x.font = 'italic 400 ' + font.split(' ').slice(-3).join(' '); }
  x.fillText(tekst, b / 2, h / 2 + h * .03);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
};
const plankTextuur = (basis = '#7B746B', lijn = 'rgba(0,0,0,.28)', licht = 'rgba(255,255,255,.06)') => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = basis; x.fillRect(0, 0, 256, 256);
  const r = zaad(5);
  for (let y = 0; y < 256; y += 16) {
    x.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${(r() * .06).toFixed(3)})`; x.fillRect(0, y, 256, 16);
    x.fillStyle = lijn; x.fillRect(0, y + 15, 256, 1.5);
    x.fillStyle = licht; x.fillRect(0, y + 1, 256, 1);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const gevelTex = plankTextuur();
const gevel = new THREE.MeshStandardMaterial({ map: gevelTex, bumpMap: gevelTex, bumpScale: .02, roughness: .95 });
const loodsTex = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#24302C'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 8) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(i, 0, 2, 128); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
M.loods.map = loodsTex;

/* =====================================================================
   Lucht, sterren, maan
   ===================================================================== */
const luchtMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { boven: { value: kleur('#5E9DD6') }, horizon: { value: kleur('#E8EEF2') }, zonRichting: { value: new THREE.Vector3(0, 1, 0) }, zonKleur: { value: kleur('#FFF6E0') }, zonSterkte: { value: 1 } },
  vertexShader: 'varying vec3 vR; void main(){ vR = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 boven; uniform vec3 horizon; uniform vec3 zonRichting; uniform vec3 zonKleur; uniform float zonSterkte; varying vec3 vR;
    void main(){ float h = max(vR.y, 0.); vec3 c = mix(horizon, boven, pow(h, .55));
      if (vR.y < 0.) c = horizon;
      float z = max(dot(normalize(vR), normalize(zonRichting)), 0.);
      c += zonKleur * (pow(z, 900.) * 3. + pow(z, 18.) * .35) * zonSterkte;
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const lucht = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), luchtMat);
scene.add(lucht);
// omgevingslicht: de hemel (en een groene grond) als lichtbron, zodat alles zacht en echt belicht wordt
const pmrem = new THREE.PMREMGenerator(renderer);
const omgeving = new THREE.Scene();
const omgLucht = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), luchtMat); omgeving.add(omgLucht);
const omgGrond = new THREE.Mesh(new THREE.CircleGeometry(90, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4E5E38' })); omgGrond.position.y = -2; omgeving.add(omgGrond);
let omgRT = null, omgTijd = -1;
const maakOmgeving = (t) => {
  if (Math.abs(t - omgTijd) < .04) return;
  omgTijd = t;
  omgGrond.material.color.set(t > .7 ? '#14162A' : '#4E5E38');
  const oud = omgRT; omgRT = pmrem.fromScene(omgeving, .02, .1, 200);
  scene.environment = omgRT.texture; if (oud) oud.dispose();
};

const sterren = (() => {
  const r = zaad(1798), n = 1400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, h = Math.pow(r(), .7) * .95 + .03;
    const rr = Math.sqrt(1 - h * h);
    p.set([Math.cos(a) * rr * 1400, h * 1400, Math.sin(a) * rr * 1400], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: '#FFF8F0', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const s = new THREE.Points(g, m); scene.add(s); return s;
})();
const maan = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, 'rgba(240,235,255,.5)'); g.addColorStop(1, 'rgba(240,235,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#FBF7EC'; x.beginPath(); x.arc(128, 128, 34, 0, 7); x.fill();
  x.fillStyle = 'rgba(200,195,215,.5)';
  [[-10, -6, 8], [9, 10, 6], [12, -12, 4]].forEach(([a, b, r]) => { x.beginPath(); x.arc(128 + a, 128 + b, r, 0, 7); x.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: false, depthWrite: false }));
  s.scale.set(220, 220, 1); scene.add(s); return s;
})();
const gloedTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const gloed = (k, maat) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gloedTex, color: k, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  s.scale.set(maat, maat, 1); return s;
};

/* =====================================================================
   Land en water
   Vorm van de plas en eilanden overgenomen van de satellietfoto.
   ===================================================================== */
const PLAS = [[-185, -240], [-40, -244], [120, -246], [230, -232], [280, -190], [285, -90], [250, -62], [150, -52], [80, -47], [30, -43], [-10, -41], [-37, -38], [-38, -10], [-37.5, 12], [-36.3, 13], [-36.3, 22.5], [-43, 22.5], [-44, 13.5], [-60, 13], [-110, 9], [-150, 7], [-186, 5], [-186, -134], [-150, -137], [-149, -159], [-186, -162]];
const VIJVER = [[-192, 22], [-150, 20], [-110, 24], [-112, 37], [-160, 39], [-192, 36]];
const RIVIER = [[-700, -300], [700, -306], [700, -276], [-700, -272]];
const EILAND_STRAND = [[-157, -214], [-130, -231], [-95, -233], [-66, -224], [-54, -200], [-57, -168], [-74, -144], [-104, -137], [-136, -142], [-153, -160], [-160, -188]];
const EILAND_BOS = [[-166, -78], [-138, -92], [-104, -95], [-74, -88], [-56, -70], [-51, -44], [-57, -20], [-78, -9], [-112, -8], [-140, -13], [-160, -30], [-170, -54]];

const vormVan = (punten) => { const s = new THREE.Shape(); punten.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; };
const landStuk = (shape, hoogte, materiaal, bevel = 1.2) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: hoogte, bevelEnabled: true, bevelThickness: .6, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  // bovenkant van het land ligt op 0,2 m (water op -0,35 m)
  const m = new THREE.Mesh(g, materiaal); m.position.y = .2 - hoogte - .6; m.receiveShadow = true; return m;
};
// vasteland = groot vlak met gaten voor plas, vijver en rivier
{
  const vasteland = vormVan([[-1400, -1400], [1400, -1400], [1400, 1400], [-1400, 1400]]);
  [PLAS, VIJVER, RIVIER].forEach((p) => vasteland.holes.push(vormVan(p)));
  scene.add(landStuk(vasteland, 1.25, M.gras, 2.2));
  scene.add(landStuk(vormVan(EILAND_STRAND), 1.05, M.gras, 2));
  scene.add(landStuk(vormVan(EILAND_BOS), 1.05, M.gras, 2));
  // zandstrand op het eiland met strand
  const strand = landStuk(vormVan([[-118, -226], [-90, -229], [-66, -221], [-58, -199], [-61, -170], [-76, -149], [-100, -146], [-112, -170], [-116, -200]]), 1.05, M.zand, 1.5);
  strand.position.y += .04; scene.add(strand);
}
// water
const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    tijd: { value: 0 }, diep: { value: kleur('#2E5A70') }, licht: { value: kleur('#7FA9BE') }, lucht: { value: kleur('#E8EEF2') },
    zonRichting: { value: new THREE.Vector3(0, 1, 0) }, zonKleur: { value: kleur('#ffffff') }, glans: { value: 1 }, boven: { value: luchtMat.uniforms.boven.value },
    fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 }
  },
  fog: true,
  vertexShader: `varying vec3 vW;
    #include <fog_pars_vertex>
    void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `uniform float tijd; uniform vec3 diep; uniform vec3 licht; uniform vec3 lucht; uniform vec3 zonRichting; uniform vec3 zonKleur; uniform float glans; uniform vec3 boven; varying vec3 vW;
    #include <fog_pars_fragment>
    float golf(vec2 p){ return sin(p.x*.35 + tijd*1.1) * .5 + sin(p.y*.42 - tijd*.9 + p.x*.12) * .35 + sin((p.x+p.y)*.9 + tijd*1.7)*.15
      + sin(p.x*2.3 - p.y*1.7 + tijd*2.3)*.06 + sin(p.y*3.1 + p.x*.7 - tijd*2.9)*.05; }
    void main(){
      vec2 p = vW.xz;
      float e = .6;
      vec3 n = normalize(vec3(-(golf(p+vec2(e,0.))-golf(p-vec2(e,0.)))*.22, 1., -(golf(p+vec2(0.,e))-golf(p-vec2(0.,e)))*.22));
      vec3 v = normalize(cameraPosition - vW);
      float fres = pow(1. - max(dot(n, v), 0.), 3.);
      vec3 c = mix(diep, licht, .35 + .25*golf(p*.25));
      vec3 r = reflect(-v, n);
      vec3 spiegel = mix(lucht, boven, clamp(r.y * 2.2, 0., 1.));
      c = mix(c, spiegel, clamp(.08 + fres * .75, 0., .8));
      float s = pow(max(dot(r, normalize(zonRichting)), 0.), 220.);
      c += zonKleur * s * 2.2 * glans;
      float rim = smoothstep(.985, 1., sin(p.x*.8 + p.y*.25 + tijd*.8)*sin(p.y*.6 - tijd*.5));
      c += lucht * rim * .06;
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800, 1, 1).rotateX(-Math.PI / 2), waterMat);
water.position.y = -.35;
scene.add(water);

/* ---------- Paden, wegen, pleinen ---------- */
const vlak = (b, d, materiaal, x, z, y = .27, draai = 0) => {
  const geo = new THREE.PlaneGeometry(b, d).rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * b / 2, uv.getY(i) * d / 2);
  const m = new THREE.Mesh(geo, materiaal);
  m.position.set(x, y, z); m.rotation.y = draai; m.receiveShadow = true; scene.add(m); return m;
};
const lijnPad = (punten, breed, materiaal, y = .28) => {
  for (let i = 0; i < punten.length - 1; i++) {
    const [ax, az] = punten[i], [bx, bz] = punten[i + 1];
    const l = Math.hypot(bx - ax, bz - az);
    vlak(breed, l + breed * .9, materiaal, (ax + bx) / 2, (az + bz) / 2, y, Math.atan2(bx - ax, bz - az));
  }
};
// plein met betontegels rond het troephuis
vlak(30, 37, M.tegels, -25, -6.5);
vlak(26, 21, M.tegels, -23, 22.5);
vlak(46, 18, M.tegels, -3, 26.5);
vlak(8, 40, M.tegels, 17, 4);
// toegangsweg en dijkpaden
lijnPad([[8, 35], [12, 46], [24, 56], [28, 90], [30, 140]], 5, M.asfalt);
lijnPad([[-190, 30], [-120, 44], [-40, 52], [24, 56], [120, 60], [400, 64]], 3.2, M.pad, .3);
lijnPad([[-200, 250], [-196, 60], [-196, -150], [-205, -260]], 3.2, M.pad, .3);
lijnPad([[-196, -150], [-160, -150]], 2.2, M.steigerHout, .5);
// snelweg A4 in de verte, met auto's
vlak(2000, 26, M.asfalt, 0, 150, .3);
for (const z of [143, 157]) vlak(2000, .4, M.wit, 0, z, .32);
// sportbaan ten oosten
{
  const baan = new THREE.Mesh(new THREE.RingGeometry(26, 33, 48).rotateX(-Math.PI / 2), M.pad);
  baan.scale.set(1.6, 1, 1); baan.position.set(115, .3, 20); baan.receiveShadow = true; scene.add(baan);
}
// polder: sloten en weilanden in de verte
{
  const r = zaad(42);
  for (let i = 0; i < 26; i++) {
    const x = -900 + i * 70 + r() * 20;
    vlak(2.2, 900, M.donkerblauw, x, r() < .5 ? -760 : 560, .05).material = new THREE.MeshStandardMaterial({ color: '#4C6E7E', roughness: .3 });
  }
}

/* =====================================================================
   Het troephuis "Onveranderd"
   Plattegrond (noord boven): links Stam, Vaart, Kleine Vaart, Meisjes (nu De Nieuwe Vaart),
   Wilde Vaart; midden de hal; rechts Bakboord, Stuurboord, Kabouters, Bevers, Keuken/Berging.
   ===================================================================== */
const gebouw = new THREE.Group();
scene.add(gebouw);
const B = 26, L = 35, WAND = 4.2;
const doos = (b, h, d, materiaal, x, y, z, ouder = gebouw, schaduw = true) => {
  const geo = new THREE.BoxGeometry(b, h, d);
  if (materiaal.userData && materiaal.userData.meter) {
    // textuur in meters: elk vlak krijgt zijn echte maten
    const uv = geo.attributes.uv, maat = [[d, h], [d, h], [b, d], [b, d], [b, h], [b, h]];
    for (let i = 0; i < uv.count; i++) { const [mu, mv] = maat[Math.floor(i / 4)]; uv.setXY(i, uv.getX(i) * mu, uv.getY(i) * mv); }
  }
  const m = new THREE.Mesh(geo, materiaal);
  m.position.set(x, y, z); m.castShadow = schaduw; m.receiveShadow = true; ouder.add(m); return m;
};
// buitenmuren (met planken)
{
  const zijTex = gevelTex.clone(); zijTex.needsUpdate = true; zijTex.repeat.set(L / 3, WAND / 3);
  const kopTex = gevelTex.clone(); kopTex.needsUpdate = true; kopTex.repeat.set(B / 3, WAND / 3);
  const zij = new THREE.MeshStandardMaterial({ map: zijTex, bumpMap: zijTex, bumpScale: .02, roughness: .95 });
  const kop = new THREE.MeshStandardMaterial({ map: kopTex, bumpMap: kopTex, bumpScale: .02, roughness: .95 });
  doos(.35, WAND, L, zij, -B / 2, WAND / 2, 0);
  doos(.35, WAND, L, zij, B / 2, WAND / 2, 0);
  doos(B, WAND, .35, kop, 0, WAND / 2, -L / 2);
  doos(B, WAND, .35, kop, 0, WAND / 2, L / 2);
  // ramen: per lokaal een strook bovenin, wit kozijn
  for (const kant of [-1, 1]) for (let i = 0; i < 5; i++) {
    const z = -L / 2 + 3.5 + i * 7;
    for (let j = -1; j <= 1; j++) {
      doos(.12, 1.1, 1.25, M.raamGlas, kant * (B / 2 + .19), 3.05, z + j * 1.4, gebouw, false);
      doos(.14, 1.3, .12, M.wit, kant * (B / 2 + .2), 3.05, z + j * 1.4 - .68, gebouw, false);
    }
    doos(.14, .12, 4.3, M.wit, kant * (B / 2 + .2), 2.45, z, gebouw, false);
    doos(.14, .12, 4.3, M.wit, kant * (B / 2 + .2), 3.65, z, gebouw, false);
    doos(.14, 1.3, .12, M.wit, kant * (B / 2 + .2), 3.05, z + 2.1, gebouw, false);
  }
  // buitendeur van ons lokaal (doorgang onder de zolder)
  doos(.12, 2.1, 1.05, mat('#6A4E36'), -B / 2 - .2, 1.35, 7 - 3.42 + 1, gebouw, false);
  // voordeur (zuid) en achterdeur (noord): glazen deuren met witte kozijnen
  for (const kant of [1, -1]) {
    const zz = kant * (L / 2 + .2);
    doos(5.2, 2.6, .12, M.glas, 0, 1.3, zz, gebouw, false);
    for (const x of [-2.6, -1.2, 0, 1.2, 2.6]) doos(.14, 2.7, .16, M.wit, x, 1.35, zz);
    for (const y of [.02, 2.62]) doos(5.3, .14, .16, M.wit, 0, y, zz);
    for (const x of [-1.9, 1.9]) for (const y of [.6, 1.2, 1.8]) doos(1.3, .1, .15, M.wit, x, y, zz, gebouw, false);
    // luifel
    doos(7.5, .28, 1.6, M.wit, 0, 3.2, kant * (L / 2 + .8));
  }
  // bordje "Onveranderd" boven de voordeur
  const bord = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .55), new THREE.MeshStandardMaterial({ map: tekstTextuur('⚜ ONVERANDERD ⚜', { b: 1024, h: 176, achter: '#B9652A', kleur: '#1F2B4E', font: '700 108px Montserrat, Arial, sans-serif' }), roughness: .6 }));
  bord.position.set(0, 2.85, L / 2 + .3); gebouw.add(bord);
  const pl = new THREE.PointLight('#FFD2A0', 0, 22, 1.5); pl.position.set(0, 3, L / 2 + 2); gebouw.add(pl); gebouw.userData.portiek = pl;
}
// binnen: vloer, wanden tussen de lokalen en namen op de vloer
const binnen = new THREE.Group(); gebouw.add(binnen);
{
  doos(B - .4, .1, L - .4, M.vloer, 0, .32, 0, binnen, false);
  const H = 3.3;
  // lange wanden van de hal
  doos(.15, H, L - 7.6, M.binnenwand, -3, H / 2 + .3, 3.4, binnen);
  doos(.15, H, L - 7.6, M.binnenwand, 3, H / 2 + .3, 3.4, binnen);
  // tussenwanden links en rechts
  for (let i = 1; i < 5; i++) {
    const z = -L / 2 + i * 7;
    doos(10, H, .15, M.binnenwand, -8, H / 2 + .3, z, binnen);
    doos(10, H, .15, M.binnenwand, 8, H / 2 + .3, z, binnen);
  }
  // toiletten en douches bovenin het midden
  doos(6, H, .15, M.binnenwand, 0, H / 2 + .3, -10.5, binnen);
  doos(3.6, H, 4, M.binnenwand, -1.2, H / 2 + .3, -15, binnen);
}

/* ---------- Ons lokaal: De Nieuwe Vaart (vroeger het meisjeslokaal) ---------- */
const lokaal = new THREE.Group(); binnen.add(lokaal);
const plafond = new THREE.Mesh(new THREE.BoxGeometry(9.8, .04, 6.8), new THREE.MeshStandardMaterial({ color: '#E8E6E1', roughness: .95 }));
const LX = -8, LZ = 7; // midden van het lokaal (10 x 7 m)
{
  const H = 3.3;
  // Indeling (noord = kleine z). Vanuit de hal (oost) kijk je naar het water (west):
  // links (zuid) de bankenhoek met tv, rechts (noord) de riemen en fokken,
  // achterin langs de waterkant de zolder met slaapbanken in U-vorm.
  const W = -B / 2 + .2, ZN = LZ - 3.42, ZZ = LZ + 3.42, ZOLDER = 2.2, ZR = W + 3; // ZR = rand van de zolder
  doos(9.6, H, .1, M.grijsWand, LX, H / 2 + .3, ZZ, lokaal, false);
  doos(9.6, H - 1.3, .1, M.rozeWand, LX, (H - 1.3) / 2 + 1.6, ZN, lokaal, false); // rechtermuur: roze met zwart onderin
  doos(9.6, 1.3, .1, mat('#26272A'), LX, .95, ZN, lokaal, false);
  doos(.1, ZOLDER, 6.7, M.grijsWand, W + .05, ZOLDER / 2 + .3, LZ, lokaal, false);
  doos(.1, H - ZOLDER + .3, 6.7, mat('#B8265F'), W + .05, (H + ZOLDER + .3) / 2 + .15, LZ, lokaal, false); // zolder: donkerroze
  doos(.06, H, 2.6, M.rozeWand, -3.12, H / 2 + .3, LZ + 2, lokaal, false); // roze muur bij de bankenhoek
  doos(.06, H, 2.6, M.rozeWand, -3.12, H / 2 + .3, LZ - 2, lokaal, false);
  doos(9.6, .04, 6.7, M.vloer, LX, .38, LZ, lokaal, false);
  // ramen op zolderhoogte in de buitenmuur
  const raamBinnen = mat('#CFE0E8', { roughness: .2, emissive: '#9FC3D6', emissiveIntensity: .35 });
  for (let j = -1; j <= 1; j++) doos(.04, 1.1, 1.25, raamBinnen, W + .12, 3.05, LZ + j * 1.4, lokaal, false);
  /* bankenhoek links (zuidoost): L-bank, tafel in het midden, tv aan de muur, radio in de hoek */
  const bank = (b, d, x, z) => { doos(b, .45, d, M.bank, x, .62, z, lokaal); doos(b, .2, d * .9, M.kussen, x, .95, z, lokaal); };
  const rug = (b, d, x, z) => doos(b, .55, d, M.kussen, x, 1.2, z, lokaal);
  // lange grijze bank tegen de roze muur bij de ingang (zit met je gezicht naar de zolder), met een chaise aan het eind
  bank(1, 3.9, -3.7, ZZ - 2.2); rug(.28, 3.9, -3.3, ZZ - 2.2);
  bank(1.7, .95, -4.85, ZZ - 3.65);
  doos(.3, .55, .95, M.kussen, -3.45, 1.15, ZZ - .5, lokaal); // armleuning bij de tv-muur
  doos(1.1, .45, 1.1, M.tafel, -5.6, .6, ZZ - 1.9, lokaal);
  doos(1.3, .06, 1.25, M.zwart, -5.6, 1.85, ZZ - .07, lokaal, false); // tv
  doos(1.5, .5, .4, M.hout, -5.6, .55, ZZ - .25, lokaal); // kastje onder de tv
  doos(.45, .3, .25, mat('#2F3B3A'), -4.75, .95, ZZ - .25, lokaal); // radio in de hoek
  const bordje = (tekst, b, h, achter, kl, x, y, z, font) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshStandardMaterial({ map: tekstTextuur(tekst, { achter, kleur: kl, b: 1024, h: Math.round(1024 * h / b), font }), roughness: .5 }));
    p.position.set(x, y, z); p.rotation.y = Math.PI; lokaal.add(p); return p;
  };
  doos(3.6, .05, .3, M.hout, -5.6, 2.62, ZZ - .17, lokaal, false); // plank met bordjes
  bordje('Nieuwevaart', 1.1, .24, '#1F4FA8', '#ffffff', -5.4, 2.8, ZZ - .1, '600 150px Arial, sans-serif');
  bordje('ALPHA', .9, .26, '#F2B8C6', '#C2286F', -6.6, 3.05, ZZ - .06, '800 170px Arial, sans-serif');
  bordje('Kippenweg', .95, .22, '#2E8A4A', '#ffffff', -4.2, 2.82, ZZ - .06, '700 150px Arial, sans-serif');
  // poster: "gevuurd door vlieken" met 755, 1063, 1766, 1798
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d'); x.fillStyle = '#5A3A78'; x.fillRect(0, 0, 1024, 512);
    x.fillStyle = '#E9E2F2'; x.font = 'italic 60px Georgia, serif'; x.textAlign = 'center'; x.fillText('gevuurd door vlieken', 512, 80);
    [['755', 190, 300], ['1063', 410, 360], ['1766', 620, 250], ['1798', 840, 330]].forEach(([t, cx, cy]) => {
      x.fillStyle = '#6FCFD4'; x.beginPath(); x.arc(cx, cy, 95, 0, 7); x.fill();
      x.fillStyle = '#1F2B4E'; x.font = '700 54px Arial'; x.fillText(t, cx, cy + 18);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshStandardMaterial({ map: t, roughness: .6 }));
    p.position.set(-4.1, 3.3, ZZ - .07); p.rotation.y = Math.PI; lokaal.add(p);
  }

  /* rechtermuur (noord, roze met zwart): roeren en zwaarden onderin, riemen en fokken */
  const roerMat = mat('#8A5A48', { roughness: .8 });
  [[-4.2, .9, .8], [-5.2, .7, .65], [-6.1, 1, .75], [-7, .8, .7]].forEach(([x, b, h], i) => {
    const roer = doos(b, h, .05, roerMat, x, .3 + h / 2, ZN + .22, lokaal, false); roer.rotation.x = -.12;
    doos(.06, 1.1, .06, mat('#3E5E8A'), x - b * .25, .9 + h * .4, ZN + .14, lokaal, false); // helmstok
  });
  const riemMat = mat('#C49A5A', { roughness: .6 });
  for (let i = 0; i < 10; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 3.3, 6), riemMat);
    r.position.set(-7.7 - i * .15, 1.95, ZN + .16 + (i % 2) * .08); r.rotation.z = .06 * (i % 3 - 1); lokaal.add(r);
    doos(.14, .6, .04, riemMat, -7.7 - i * .15, .62, ZN + .16 + (i % 2) * .08, lokaal, false);
  }
  const fokMat = new THREE.MeshStandardMaterial({ color: '#EDE8DC', side: THREE.DoubleSide, roughness: .95 });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .7, 0, 0, .15, -2.3, 0, .7, 0, 0, .55, -2.2, 0, .15, -2.3, 0], 3)); g.computeVertexNormals();
    const f = new THREE.Mesh(g, fokMat); f.position.set(-5.6 + i * .5, 3.5, ZN + .3 + i * .05); lokaal.add(f);
  }

  /* zolder langs de waterkant, met smalle slaapbanken in U-vorm */
  doos(3, .15, 6.75, M.hout, W + 1.5, ZOLDER, LZ, lokaal);
  for (let i = 0; i < 5; i++) doos(.1, ZOLDER - .3, .1, M.hout, ZR, (ZOLDER + .3) / 2, LZ - 3.2 + i * 1.6, lokaal);
  doos(.06, .06, 5.6, M.hout, ZR, ZOLDER + .95, LZ - .55, lokaal, false); // reling (open bij de trap)
  for (let i = 0; i < 40; i++) doos(.025, .9, .07, M.hout, ZR, ZOLDER + .5, LZ - 3.3 + i * .14, lokaal, false);
  doos(.04, .22, 6.7, M.hout, ZR + .02, ZOLDER - .02, LZ, lokaal, false); // boeiboord van de zolder
  const matras = mat('#55585C');
  const zbank = (b, d, x, z) => { doos(b, .4, d, mat('#2E2F33'), x, ZOLDER + .28, z, lokaal); doos(b * .96, .16, d * .98, matras, x, ZOLDER + .56, z, lokaal); };
  zbank(.7, 6.5, W + .4, LZ);                 // lange bank onder de ramen
  zbank(.7, 5.1, ZR - .42, LZ - .65);         // lange bank langs de reling
  zbank(1.4, .7, W + 1.45, ZN + .4);          // dwars aan de noordkant: de U is dicht
  doos(.06, .7, 6.5, matras, W + .1, ZOLDER + .95, LZ, lokaal, false); // rugkussens tegen de muur
  // reddingsvesten: een hele rij hangt aan de voorkant van de zolder, zoals op de foto's
  const r = zaad(9), vestKleur = [mat('#E8541E'), mat('#D9461C'), mat('#F06A2A'), mat('#C93F1E')];
  for (let i = 0; i < 26; i++) {
    const z = LZ - 3.15 + i * .215 + r() * .05;
    const v = doos(.2, .58 + r() * .12, .34, vestKleur[i % 4], ZR + .15 + r() * .05, ZOLDER + .55 + r() * .12, z, lokaal, false);
    v.rotation.x = r() * .3 - .15; v.rotation.z = r() * .15;
    doos(.21, .04, .35, mat('#1E2230'), 0, -.12, 0, v, false); doos(.21, .04, .35, mat('#1E2230'), 0, .1, 0, v, false); // bandjes
    // en een tweede rij onder de zoldervloer
    if (i % 2 === 0) { const o = doos(.12, .5, .34, vestKleur[(i + 1) % 4], ZR - .25, ZOLDER - .35, z + .05, lokaal, false); o.rotation.x = r() * .3 - .15; }
  }

  /* onder de zolder (zoals op de foto's): links vakken onder de trap, midden de klushoek achter
     osb-platen met roze vlekken, grijze kluisjes, rechts de nooduitgang met kast */
  const osbTex = ruisTextuur(256, (x, g, r) => {
    x.fillStyle = '#c9a46a'; x.fillRect(0, 0, g, g);
    for (let i = 0; i < 900; i++) { const v = r(); x.fillStyle = v < .5 ? `rgba(120,80,35,${.2 + r() * .3})` : `rgba(240,210,150,${.2 + r() * .3})`; x.save(); x.translate(r() * g, r() * g); x.rotate(r() * 3); x.fillRect(-6, -2, 6 + r() * 14, 3 + r() * 4); x.restore(); }
    x.fillStyle = 'rgba(230,90,160,.35)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(r() * g, r() * g, 20 + r() * 30, 10 + r() * 50, r() * 3, 0, 7); x.fill(); }
  }, 1);
  const osb = echt(mat('#D9B98A'), osbTex, .004);
  const kluisMat = mat('#BFC2C2', { roughness: .45, metalness: .35 });
  const kluis = (x, z, b = .6) => {
    doos(.55, 1.85, b, kluisMat, x, 1.25, z, lokaal);
    doos(.02, 1.7, .01, M.zwart, x + .28, 1.25, z, lokaal, false); // deurnaad
    for (let k = 0; k < 4; k++) doos(.01, .03, b * .5, mat('#6F7373'), x + .28, 1.9 + k * .06, z, lokaal, false); // luchtsleuven
  };
  // vakken onder de trap (zuidkant)
  const kastMat = echt(mat('#EDEBE6'), houtTex, .001), vakMat = mat('#4A4844');
  doos(2.9, 1.7, .45, kastMat, W + 1.5, 1.2, ZZ - .28, lokaal);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) doos(.6, .45, .02, vakMat, W + .5 + i * .68, .6 + j * .55, ZZ - .52, lokaal, false);
  // spullen in de vakken: blauwe tas, kratten, emmer
  doos(.6, .3, .35, mat('#2A4FA0'), W + .55, .6, ZZ - .3, lokaal); doos(.5, .3, .35, mat('#C8302C'), W + 1.25, 1.15, ZZ - .3, lokaal);
  // klushoek: osb-wanden, twee kasten, werkbank, gereedschap
  const kZ0 = LZ - 1.4, kZ1 = LZ + 1.7;
  doos(.06, ZOLDER - .3, kZ1 - kZ0 - .9, osb, ZR - .1, (ZOLDER + .3) / 2, (kZ0 + kZ1) / 2 - .45, lokaal);
  doos(3, ZOLDER - .3, .06, osb, W + 1.5, (ZOLDER + .3) / 2, kZ0, lokaal);
  doos(3, ZOLDER - .3, .06, osb, W + 1.5, (ZOLDER + .3) / 2, kZ1, lokaal);
  kluis(W + .35, LZ - .85); kluis(W + .35, LZ - .2);
  doos(.75, .06, 1.6, M.hout, W + 2.1, 1.0, LZ + .9, lokaal); // werkbank
  for (const dz of [-.7, .7]) doos(.06, .7, .06, M.hout, W + 2.4, .65, LZ + .9 + dz, lokaal, false);
  doos(.04, .9, 1.4, mat('#E9E7E1'), W + .08, 1.5, LZ + .9, lokaal, false); // gaatjesbord
  for (let i = 0; i < 6; i++) doos(.05, .25 + (i % 3) * .1, .04, i % 2 ? M.zwart : mat('#E3B21C'), W + .14, 1.5, LZ + .4 + i * .2, lokaal, false);
  // grijze kluisjes en jassen aan de voorkant van de klushoek
  kluis(ZR - .45, LZ + 1.35, .5); kluis(ZR - .45, LZ + .85, .5);
  for (let i = 0; i < 3; i++) doos(.12, .8, .35, [mat('#1E1F24'), mat('#2B3B6B'), mat('#30343A')][i], ZR - .2, 1.5, LZ - .9 + i * .3, lokaal, false);
  // nooduitgang (noordkant) met groen bordje en een kast
  doos(.08, 2.1, 1.1, mat('#A8B4BC', { roughness: .2, metalness: .3 }), W - .08, 1.35, ZN + 1, lokaal, false);
  doos(.06, .14, .4, new THREE.MeshBasicMaterial({ color: '#19B25A' }), W + .06, 2.55, ZN + 1, lokaal, false);
  doos(1.4, 1.85, .5, kastMat, W + 1.4, 1.25, kZ0 - .3, lokaal);
  doos(.6, .45, .1, mat('#E9E6E0'), W + 2.2, .55, ZN + .25, lokaal); // radiator
  // de ladder tegen de rechtermuur
  for (const dx of [0, .42]) doos(.05, 2.6, .05, mat('#C9CCCC', { metalness: .5, roughness: .4 }), -9.7 + dx, 1.6, ZN + .35, lokaal, false);
  for (let i = 0; i < 8; i++) doos(.42, .03, .05, mat('#C9CCCC', { metalness: .5, roughness: .4 }), -9.49, .55 + i * .3, ZN + .35, lokaal, false);

  // trap naar de zolder, links langs de muur met de tv
  const treden = 9, tredeH = (ZOLDER - .3) / treden, tredeD = .27;
  for (let i = 0; i < treden; i++) doos(tredeD + .03, .06, .85, M.hout, ZR + .15 + (treden - i) * tredeD, .3 + (i + 1) * tredeH, ZZ - .55, lokaal, false);
  const lengte = Math.hypot(treden * tredeD, ZOLDER - .3), hoek = Math.atan2(ZOLDER - .3, treden * tredeD);
  for (const dz of [-.1, -1]) { const b = doos(lengte, .2, .05, M.hout, ZR + .15 + treden * tredeD / 2, .3 + (ZOLDER - .3) / 2, ZZ + dz, lokaal, false); b.rotation.z = -hoek; }
  const leun = doos(lengte, .06, .06, M.hout, ZR + .15 + treden * tredeD / 2, .3 + (ZOLDER - .3) / 2 + .9, ZZ - 1.03, lokaal, false); leun.rotation.z = -hoek;
  /* aankleding zoals op de foto's: vlag, banners, whiteboard, kast, klok, kapstok, balken met tl-lampen */
  const doek = (teken, b, h, x, y, z, ry, w = 512) => {
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * h / b);
    teken(c.getContext('2d'), c.width, c.height);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshStandardMaterial({ map: t, roughness: .95, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; lokaal.add(m); return m;
  };
  // blauwe vlag met het roze kompas van de Nieuwe Vaart (zuidmuur, rechts van de tv)
  doek((x, w, h) => {
    x.fillStyle = '#2F3FB0'; x.fillRect(0, 0, w, h);
    x.translate(w / 2, h / 2); x.fillStyle = '#E58BC8';
    for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); x.beginPath(); x.moveTo(0, -h * .42 * (i % 2 ? .6 : 1)); x.lineTo(h * .06, 0); x.lineTo(-h * .06, 0); x.fill(); }
    x.strokeStyle = '#E58BC8'; x.lineWidth = h * .035; x.beginPath(); x.arc(0, 0, h * .24, 0, 7); x.stroke();
    x.fillStyle = '#F2EDF6'; x.font = `600 ${h * .05}px Arial`; x.textAlign = 'center'; x.fillText('VAN DER DOES LIETHORP', 0, -h * .3); x.fillText('NIEUWE VAART', 0, h * .34);
  }, 1.9, 1.25, -8.1, 2.15, ZZ - .06, Math.PI);
  // banner "Wat de Fakkel" met olympische ringen, boven de tv
  doek((x, w, h) => {
    x.fillStyle = '#F4F1EA'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#C22C7A'; x.font = `700 ${h * .2}px "Comic Sans MS", Arial`; x.textAlign = 'center'; x.fillText('WAT DE FAKKEL', w / 2, h * .26);
    ['#2F6FD6', '#111', '#D8352E', '#E8B92C', '#2E9A4A'].forEach((k, i) => { x.strokeStyle = k; x.lineWidth = h * .035; x.beginPath(); x.arc(w * (.3 + i * .1), h * (i % 2 ? .66 : .55), h * .13, 0, 7); x.stroke(); });
    for (let i = 0; i < 9; i++) { x.fillStyle = ['#D8352E', '#2E9A4A', '#E8B92C'][i % 3]; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, h * .03, 0, 7); x.fill(); }
  }, 1.7, .95, -7.6, 3.25, ZZ - .06, Math.PI);
  // banners op de roze muur bij de ingang
  const banner = (tekst, achter, kleur2, b, h, z, y) => doek((x, w, hh) => {
    x.fillStyle = achter; x.fillRect(0, 0, w, hh); x.strokeStyle = kleur2; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, hh - 20);
    x.fillStyle = kleur2; x.textAlign = 'center'; x.font = `700 ${Math.min(hh * .22, w / tekst.split('|')[0].length * 1.5)}px Georgia, serif`;
    tekst.split('|').forEach((t, i, a) => x.fillText(t, w / 2, hh * (.5 + (i - (a.length - 1) / 2) * .28) + hh * .07));
  }, b, h, -3.06, y, z, -Math.PI / 2);
  banner('FESTIVEEN|2020', '#3E7FC8', '#F5D24A', 1.1, .95, ZZ - 2.1, 2.75);
  banner('ZOMERKAMP|STIEROP', '#E9A7C3', '#3A1E2E', 1.4, .8, ZZ - 3.3, 2.65);
  banner('DIE BONDEN', '#7A1E2A', '#F0D9A0', .8, 1.1, ZZ - 1.05, 2.8);
  // whiteboard achter de bank, wit kastje in de hoek
  doos(.05, 1.1, 2.4, mat('#F7F7F4', { roughness: .25 }), -3.25, 1.75, ZZ - 2.4, lokaal, false);
  doos(.06, 1.2, 2.5, mat('#9AA0A6', { metalness: .4, roughness: .4 }), -3.22, 1.75, ZZ - 2.4, lokaal, false);
  doos(.4, 1.5, .8, mat('#F4F3EF'), -3.4, 1.05, ZN + .5, lokaal);
  // klok, kapstok met jassen naast de tv, tweede schermpje
  const klok = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .04, 24).rotateX(Math.PI / 2), mat('#F2F2EE'));
  klok.position.set(-3.75, 2.6, ZZ - .08); lokaal.add(klok);
  doos(1.1, .05, .06, M.hout, -4.0, 2.2, ZZ - .1, lokaal, false);
  [['#141414'], ['#E6A23C'], ['#6BC2E8'], ['#1E2A54'], ['#F2E14A']].forEach(([k], i) => doos(.2, .9, .12, mat(k), -4.45 + i * .22, 1.72, ZZ - .16, lokaal, false));
  doos(.7, .45, .05, M.zwart, -6.8, 1.85, ZZ - .07, lokaal, false);
  doos(1.36, .82, .03, mat('#3A3A3A', { metalness: .6, roughness: .3 }), -5.6, 1.85, ZZ - .1, lokaal, false); // rand om de tv
  // teal kussens op de bank
  [[-3.75, ZZ - 1], [-3.75, ZZ - 2.4], [-4.6, ZZ - 3.65]].forEach(([x, z]) => doos(.55, .45, .2, echt(mat('#4F8A86'), stofTex, .004), x, 1.25, z, lokaal).rotation.y = Math.PI / 2 * (z < ZZ - 3 ? 0 : 1));
  // plafond: houten balken met tl-armaturen (je ziet ze als het dak open is)
  const balkMat = echt(mat('#A7835C'), houtTex, .003);
  for (let i = 0; i < 4; i++) doos(9.8, .32, .16, balkMat, LX, H + .1, LZ - 2.7 + i * 1.8, lokaal);
  plafond.position.set(LX, H + .3, LZ); lokaal.add(plafond);
  const tl = new THREE.MeshStandardMaterial({ color: '#F4F6F8', emissive: '#FFFFFF', emissiveIntensity: .6 });
  for (const [x, z] of [[-5, LZ - 1.8], [-5, LZ + 1.8], [-8, LZ], [-11.3, LZ + .5]]) { doos(1.5, .08, .25, tl, x, H - .05, z, lokaal, false); }
  // lichtslingers en schilderijtjes op de zolder
  for (let i = 0; i < 7; i++) doos(.04, .45, .55, [mat('#5A8FD0'), mat('#E58BC8'), mat('#F2D16B'), mat('#6FB57A')][i % 4], W + .1, ZOLDER + 1.75, LZ - 2.9 + i * .95, lokaal, false);
  const slinger = new THREE.MeshBasicMaterial({ color: '#FFE7A8' });
  for (let i = 0; i < 40; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), slinger); l.position.set(W + .12, ZOLDER + 2.05 - Math.abs(Math.sin(i * .5)) * .15, LZ - 3.2 + i * .16); lokaal.add(l); }
  // rood zeil over een deel van de zolder en de gouden reddingsboei-schijf aan de reling
  const schijf = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .05, 24).rotateZ(Math.PI / 2), mat('#C9A14A', { metalness: .6, roughness: .35 }));
  schijf.position.set(ZR + .08, ZOLDER + .6, LZ - 2.6); lokaal.add(schijf);
  // touwen opgerold aan een plank op de rechtermuur
  doos(1.4, .3, .04, M.hout, -5.3, 2.75, ZN + .1, lokaal, false);
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.13, .035, 6, 14), mat('#2A2420')); t.position.set(-5.8 + i * .33, 2.4, ZN + .15); t.scale.y = 1.6; lokaal.add(t); }

  // lamp in het lokaal (zichtbaar als het donker wordt)
  const lamp = new THREE.PointLight('#FFD9A8', 0, 14, 1.6); lamp.position.set(LX, 3.1, LZ); lokaal.add(lamp);
  lokaal.userData.lamp = lamp;
  // bordje boven de deur in de hal
  const deurbord = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .45), new THREE.MeshStandardMaterial({ map: tekstTextuur('De Nieuwe Vaart', { achter: '#4F1440', kleur: '#ffffff', b: 1024, h: 192, font: 'italic 400 120px "Instrument Serif", Georgia, serif' }) }));
  deurbord.position.set(-2.9, 2.75, LZ - 2); deurbord.rotation.y = Math.PI / 2; lokaal.add(deurbord);
}

/* ---------- Het dak: vlinderdak met lichtkoepels in het midden ---------- */
const dak = new THREE.Group(); gebouw.add(dak);
{
  const helft = (kant) => {
    // dakvlak loopt van de goot (4.3 m, midden) omhoog naar de buitenkant (5.4 m)
    const g = new THREE.BufferGeometry();
    const x0 = kant * 3, x1 = kant * (B / 2 + .6), y0 = 4.35, y1 = 5.35, z0 = -L / 2 - .6, z1 = L / 2 + .6;
    const v = new Float32Array([x0, y0, z0, x1, y1, z0, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y0, z1]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.dak); m.material = M.dak.clone(); m.material.side = THREE.DoubleSide; m.castShadow = true; m.receiveShadow = true; dak.add(m);
    // witte boeiboord
    const bb = doos(.2, .45, L + 1.3, M.wit, x1, y1 - .1, 0, dak);
    for (const z of [z0, z1]) {
      const l = Math.hypot(x1 - x0, y1 - y0);
      const kb = doos(l, .4, .2, M.wit, (x0 + x1) / 2, (y0 + y1) / 2 - .1, z, dak);
      kb.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    }
    return bb;
  };
  helft(-1); helft(1);
  doos(6, .25, L + 1.2, M.dakDonker, 0, 4.25, 0, dak);
  for (const z of [-11, 0, 11]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.4, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.koepel);
    k.position.set(0, 4.35, z); k.rotation.y = Math.PI / 2; k.scale.set(1, .6, 1); dak.add(k);
  }
  // muurtjes onder het dak (driehoekjes boven de kopgevels)
  for (const kant of [-1, 1]) for (const z of [-L / 2, L / 2]) {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([kant * 3, WAND, z, kant * (B / 2), WAND, z, kant * (B / 2), 5.3, z]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, gevel); m.material = gevel.clone(); m.material.side = THREE.DoubleSide; gebouw.add(m);
  }
}
// Het kadaster zegt: het pand staat iets gedraaid; op de satellietfoto loopt de hal van de plas naar de weg.

/* ---------- De loods (donkergroen, witte roldeuren, zonnepanelen) ---------- */
{
  const loods = new THREE.Group(); loods.position.set(-17.5, 0, 25); scene.add(loods);
  const t = loodsTex.clone(); t.needsUpdate = true; t.repeat.set(6, 1.5);
  const wand = new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: .03, roughness: .55, metalness: .25 });
  doos(24, 4.8, 10, wand, 0, 2.4, 0, loods);
  // zadeldak
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([-12.3, 4.8, -5.3, 12.3, 4.8, -5.3, 12.3, 6.4, 0, -12.3, 4.8, -5.3, 12.3, 6.4, 0, -12.3, 6.4, 0,
    -12.3, 6.4, 0, 12.3, 6.4, 0, 12.3, 4.8, 5.3, -12.3, 6.4, 0, 12.3, 4.8, 5.3, -12.3, 4.8, 5.3]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals();
  const d = new THREE.Mesh(g, M.loods.clone()); d.material.side = THREE.DoubleSide; d.material.map = null; d.material.color.set('#2C3833'); d.castShadow = true; loods.add(d);
  for (const kant of [-1, 1]) {
    const gv = new THREE.BufferGeometry();
    gv.setAttribute('position', new THREE.BufferAttribute(new Float32Array([kant * 12, 4.8, -5, kant * 12, 4.8, 5, kant * 12, 6.4, 0]), 3)); gv.computeVertexNormals();
    const m = new THREE.Mesh(gv, wand.clone()); m.material.side = THREE.DoubleSide; loods.add(m);
  }
  for (const x of [-6, 5]) {
    const p = doos(7.5, .1, 4.4, M.zonnepaneel, x, 5.65, -2.6, loods, false); p.rotation.x = Math.atan2(1.6, 5.3);
  }
  for (const x of [-7, 4]) doos(4, 3.6, .1, M.roldeur, x, 1.8, -5.05, loods, false);
}

/* ---------- Steiger, kraan, mast, toren, omgekeerde bootjes ---------- */
{
  // steiger langs de kade, palen in het water
  vlak(2.4, 40, M.steigerHout, -39.2, -7, .55);
  for (let z = -26; z <= 12; z += 3) for (const x of [-40.4, -38]) doos(.25, 2.2, .25, M.houtDonker, x, -.4, z, scene);
  // zwenkkraan
  doos(.45, 5.2, .45, M.kraan, -35, 2.6, 19, scene);
  doos(4.2, .4, .3, M.kraan, -36.9, 5, 19, scene);
  doos(1.4, .1, 1.4, M.kraan, -35, .35, 19, scene);
  // insteekhaventje onder de kraan, met houten beschoeiing
  doos(.25, .9, 9.6, M.steigerHout, -36.2, -.1, 17.8, scene);
  doos(7, .9, .25, M.steigerHout, -39.6, -.1, 22.6, scene);
  doos(.25, .9, 9, M.steigerHout, -43.6, -.1, 18, scene);
  const takel = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 3.2, 5), M.zwart); takel.position.set(-38.6, 3.4, 19); scene.add(takel);
  // seinmast met ra
  doos(.18, 11, .18, M.donkerblauw, -22, 5.5, -16, scene);
  const ra = doos(4, .1, .1, M.donkerblauw, -22, 8.2, -16, scene); ra.rotation.z = .18;
  // houten uitkijktoren met trap en picknicktafel
  const toren = new THREE.Group(); toren.position.set(-27, 0, -33); scene.add(toren);
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) doos(.3, 5.2, .3, M.houtDonker, x, 2.6, z, toren);
  doos(3.8, .2, 3.8, M.houtDonker, 0, 3, 0, toren);
  for (const [x, z, b, d] of [[0, -1.8, 3.8, .08], [0, 1.8, 3.8, .08], [-1.8, 0, .08, 3.8]]) doos(b, .9, d, M.houtDonker, x, 3.5, z, toren, false);
  for (let i = 0; i < 10; i++) doos(1, .08, .3, M.houtDonker, 2.4, .3 + i * .28, 1.4 - i * .3, toren, false);
  doos(2.2, .08, .8, M.hout, 1, .85, 4, toren); doos(2.2, .08, .3, M.hout, 1, .5, 3.3, toren); doos(2.2, .08, .3, M.hout, 1, .5, 4.7, toren);
  // vlonderpad
  lijnPad([[-33, -30], [-36, -27], [-37.5, -24]], 1.6, M.steigerHout, .45);
  // omgekeerde bootjes op het gras en een stapel boomstammen
  for (const [x, z, a] of [[-29, -10, .3], [-26, -4, -.2]]) {
    const romp = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2C4C8A', { flatShading: false }));
    romp.scale.set(2.2, .45, .75); romp.position.set(x, .3, z); romp.rotation.y = a; romp.castShadow = true; scene.add(romp);
  }
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.25, .28, 3.2, 8).rotateZ(Math.PI / 2), mat('#8A7A66'));
    s.position.set(-32 + i * .7, .5, -14 + (i % 2) * .5); s.rotation.y = 1.2; s.castShadow = true; scene.add(s);
  }
  // bankjes
  for (const [x, z, a] of [[-24, -20, 0], [-14, 22 - 12, 1.57]]) { const b = doos(1.8, .1, .5, M.hout, x, .7, z, scene); b.rotation.y = a; }
  // bunker (oude, met gras begroeid)
  const bunker = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 5), M.beton); bunker.position.set(34, 1.1, 12); bunker.castShadow = true; scene.add(bunker);
  const bdak = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.grasDonker); bdak.scale.set(1, .35, .9); bdak.position.set(34, 2.1, 12); scene.add(bdak);
}

/* =====================================================================
   Lelievletten
   ===================================================================== */
const rompGeometrie = (() => {
  // lengte 6 m langs x (achter -3, voor +3), breedte ~2 m
  const ringen = 22, punten = 9;
  const pos = [], kl = [], idx = [];
  const wit = kleur('#F4F2EE'), blauw = kleur('#1F2B4E'), onder = kleur('#16213D');
  for (let i = 0; i <= ringen; i++) {
    const u = i / ringen, x = -3 + u * 6;
    const breed = (u < .1 ? .78 + u * 1.6 : Math.sin(Math.PI * Math.min(1, (u - .02) / 1.02)) * .98 + (u < .5 ? .05 : 0)) * (u > .97 ? .15 : 1);
    const zeeg = .62 + Math.pow(u, 3) * .45 + (u < .08 ? (.08 - u) * 1.2 : 0);
    const diepte = .55 * (u > .85 ? 1 - (u - .85) * 3 : 1);
    // dwarsdoorsnede van bakboord naar stuurboord
    const doorsnede = [[-1, 1], [-1, .9], [-.96, .55], [-.88, .25], [-.6, .04], [0, 0], [.6, .04], [.88, .25], [.96, .55], [1, .9], [1, 1]].slice(0, punten + 2);
    doorsnede.forEach(([s, h], j) => {
      const y = -diepte + h * (zeeg + diepte);
      pos.push(x, y, s * breed);
      const c = h >= .9 ? blauw : h > .2 ? wit : onder;
      kl.push(c.r, c.g, c.b);
    });
  }
  const n = 11;
  for (let i = 0; i < ringen; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = a + n;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(kl, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
})();
const rompMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, side: THREE.DoubleSide });
const binnenMat = mat('#E9E4DA');

const maakVlet = (metZeil = false, nummer = '') => {
  const g = new THREE.Group();
  const romp = new THREE.Mesh(rompGeometrie, rompMat); romp.castShadow = true; g.add(romp);
  const bodem = new THREE.Mesh(new THREE.BoxGeometry(4.6, .05, 1.2), M.steigerHout); bodem.position.set(.2, -.2, 0); g.add(bodem);
  for (const x of [-1.6, 0, 1.4]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.28, .05, 1.8), M.hout); d.position.set(x, .35, 0); g.add(d); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 7.2, 8), M.mast); mast.position.set(1.15, 3.4, 0); mast.castShadow = true; g.add(mast);
  g.userData.mast = mast;
  if (metZeil) {
    // grootzeil met gaffel, en fok; draait als één tuig om de mast
    const tuig = new THREE.Group(); tuig.position.set(1.15, 0, 0); g.add(tuig);
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const x = c.getContext('2d'); x.fillStyle = '#FBF8F2'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(194,40,111,.18)'; x.lineWidth = 3;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 85); x.lineTo(512, i * 85 + 20); x.stroke(); }
    const lelie = new Path2D('M20 0c7 9 8 20 0 31C12 20 13 9 20 0ZM17 31C9 32 1 28 1 19c0-7 6-10 11-7-4 2-4 9 1 11 2 2 4 5 4 8ZM23 31c8 1 16-3 16-12 0-7-6-10-11-7 4 2 4 9-1 11-2 2-4 5-4 8ZM9 31h22v4H9ZM17 35l3 11 3-11ZM11 35c0 5 3 7 5 6-2-2-2-4-1-6ZM29 35c0 5-3 7-5 6 2-2 2-4 1-6Z');
    x.save(); x.translate(200, 110); x.scale(2.6, 2.6); x.fillStyle = '#C2286F'; x.fill(lelie); x.restore();
    x.fillStyle = '#4F1440'; x.font = '700 92px Montserrat, Arial, sans-serif'; x.textAlign = 'center'; x.fillText(nummer, 250, 330);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const zeilMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .8 });
    // grootzeil: hals (mast, laag), schoothoek (giek), piek (gaffel), klauw (mast hoog)
    const zg = new THREE.BufferGeometry();
    const hals = [0, .9, 0], schoot = [-4.2, .95, 0], piek = [-4.0, 6.6, 0], klauw = [0, 5.0, 0];
    zg.setAttribute('position', new THREE.Float32BufferAttribute([...hals, ...schoot, ...piek, ...hals, ...piek, ...klauw], 3));
    zg.setAttribute('uv', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, .75], 2));
    zg.computeVertexNormals();
    const zeil = new THREE.Mesh(zg, zeilMat); zeil.castShadow = true; tuig.add(zeil);
    const spier = (a, b, dikte) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(dikte, dikte, va.distanceTo(vb), 6), M.mast);
      m.position.copy(va).add(vb).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      tuig.add(m);
    };
    spier(hals, schoot, .05); spier(klauw, piek, .045);
    // fok
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute([.15, 5.3, 0, 1.75, .75, 0, -.25, .9, 0], 3)); fg.computeVertexNormals();
    const fok = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: '#FBF8F2', side: THREE.DoubleSide, roughness: .8 })); fok.castShadow = true;
    const fokTuig = new THREE.Group(); fokTuig.position.set(1.15, 0, 0); fokTuig.add(fok); g.add(fokTuig);
    // wimpel
    const w = new THREE.Mesh(new THREE.ConeGeometry(.12, .9, 4).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#C2286F' }));
    w.position.set(.75, 7, 0); g.add(w);
    g.userData.tuig = tuig; g.userData.fokTuig = fokTuig;
    // toplicht en boordlichten
    const top = gloed('#FFF4DC', 3.2); top.position.set(1.15, 7.15, 0); g.add(top);
    const rood = gloed('#FF4040', 1.8); rood.position.set(2.7, .9, -.45); g.add(rood);
    const groen = gloed('#40E080', 1.8); groen.position.set(2.7, .9, .45); g.add(groen);
    const toplamp = new THREE.PointLight('#FFF0D0', 0, 30, 1.8); toplamp.position.set(1.15, 7, 0); g.add(toplamp);
    g.userData.lichten = { top, rood, groen, toplamp };
  }
  return g;
};

// vloot aan de steiger (zomer) of op de kant (winter)
const vloot = new THREE.Group(); scene.add(vloot);
const legVloot = () => {
  vloot.clear();
  const n = 18;
  for (let i = 0; i < n; i++) {
    const b = maakVlet();
    if (!winter) {
      b.position.set(-43.6, 0, -24 + i * 2.05);
      b.rotation.y = Math.PI; b.rotation.x = (i % 3 - 1) * .01;
      b.userData.basisZ = b.position.z;
    } else {
      // op bokken op het plein, mast eruit
      b.position.set(-33 + (i % 3) * 3.4, 1.1, -10 + Math.floor(i / 3) * 6.5);
      b.rotation.y = Math.PI / 2;
      b.userData.mast.visible = false;
      const bok1 = new THREE.Mesh(new THREE.BoxGeometry(2, .7, .3), M.houtDonker); bok1.position.set(-1.5, -.75, 0); bok1.rotation.y = Math.PI / 2; b.add(bok1);
      const bok2 = bok1.clone(); bok2.position.x = 1.5; b.add(bok2);
    }
    b.userData.fase = i * .7;
    vloot.add(b);
  }
};
legVloot();

// de zeilende vlet met nummer 1798
const zeiler = maakVlet(true, '1798');
scene.add(zeiler);
const vaart = { hoek: 2.2, richting: 1, wend: 0, zijde: 1, doelZijde: 1 };
const VAARBAAN = { x: 60, z: -140, rx: 105, rz: 58 };

/* =====================================================================
   Bomen, riet, tentjes, kampvuur, eenden, auto's
   ===================================================================== */
const bomen = (() => {
  const plekken = [];
  const r = zaad(2005);
  const wolk = (cx, cz, rx, rz, n, soort, schaal = 1) => {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      plekken.push({ x: cx + Math.cos(a) * rx * d, z: cz + Math.sin(a) * rz * d, s: (.75 + r() * .6) * schaal, soort });
    }
  };
  const langs = (punten, n, afstand, soort, schaal = 1) => {
    for (let i = 0; i < n; i++) {
      const k = Math.floor(r() * punten.length), a = punten[k], b = punten[(k + 1) % punten.length], t = r();
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      // iets naar binnen (richting midden)
      const mx = punten.reduce((s, p) => s + p[0], 0) / punten.length, mz = punten.reduce((s, p) => s + p[1], 0) / punten.length;
      const l = Math.hypot(mx - x, mz - z) || 1;
      const d = afstand * (.5 + r());
      plekken.push({ x: x + (mx - x) / l * d, z: z + (mz - z) / l * d, s: (.7 + r() * .6) * schaal, soort });
    }
  };
  // rond het troephuis: wilgen aan de waterkant (noord) en een rij langs de oostkant
  wolk(0, -30, 34, 7, 34, 'wilg');
  wolk(-30, -26, 6, 6, 8, 'wilg');
  for (let z = -15; z <= 30; z += 5.5) plekken.push({ x: 21 + r() * 2, z, s: .8 + r() * .3, soort: 'boom' });
  wolk(-38, 40, 14, 4, 10, 'struik', .9);
  wolk(40, 44, 14, 4, 10, 'struik', .9);
  wolk(30, -10, 8, 18, 14, 'wilg');
  wolk(40, 40, 8, 12, 10, 'boom');
  // eilanden
  langs(EILAND_BOS, 120, 7, 'wilg');
  wolk(-110, -50, 14, 12, 12, 'struik', .8);
  langs(EILAND_STRAND.slice(0, 7), 46, 6, 'wilg');
  langs(EILAND_STRAND.slice(6), 16, 5, 'struik');
  // jonge populieren op het eiland met strand (zoals op de foto)
  for (let i = 0; i < 6; i++) plekken.push({ x: -150 + i * 6, z: -196 + r() * 3, s: .9, soort: 'populier' });
  // noordoever en verte
  wolk(60, -262, 200, 6, 60, 'wilg');
  wolk(-260, -60, 30, 180, 60, 'boom');
  wolk(260, 30, 60, 30, 26, 'boom');
  for (let i = 0; i < 40; i++) plekken.push({ x: -800 + r() * 1600, z: -500 - r() * 300, s: 1 + r() * .8, soort: r() < .5 ? 'boom' : 'populier' });
  for (let i = 0; i < 40; i++) plekken.push({ x: -800 + r() * 1600, z: 200 + r() * 200, s: 1 + r() * .8, soort: 'boom' });
  return plekken;
})();
const bosGroep = new THREE.Group(); scene.add(bosGroep);
const zetBomen = () => {
  bosGroep.clear();
  const kruinGeo = new THREE.IcosahedronGeometry(1, 2);
  {
    // bobbelig maken: elke hoek een eigen afstand, zelfde punt = zelfde waarde (geen gaten)
    const pos = kruinGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const f = 1 + .16 * Math.sin(v.x * 7.1 + v.y * 3.3) * Math.cos(v.z * 6.7 - v.y * 2.1) + .08 * Math.sin(v.x * 17 + v.z * 13);
      v.multiplyScalar(f); pos.setXYZ(i, v.x, v.y * .92, v.z);
    }
    kruinGeo.computeVertexNormals();
  }
  const stamGeo = new THREE.CylinderGeometry(.18, .28, 1, 6);
  const tel = bomen.length;
  const kruinen = new THREE.InstancedMesh(kruinGeo, new THREE.MeshStandardMaterial({ roughness: .95, flatShading: false, map: bladTex }), tel * 5);
  const stammen = new THREE.InstancedMesh(stamGeo, mat('#5A4A3C'), tel);
  kruinen.castShadow = stammen.castShadow = true; kruinen.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const r = zaad(77);
  const kl = winter
    ? { wilg: ['#8C8A6A', '#7E7A5E', '#9A9474'], boom: ['#7A6A58', '#6E5E4E', '#8A7A62'], struik: ['#6F6A52', '#7C735A'], populier: ['#7E7464', '#8A806C'] }
    : { wilg: ['#8FA86A', '#7C9A5C', '#9DB27A'], boom: ['#4C6E36', '#5A7C40', '#43642F', '#66823F'], struik: ['#58773E', '#65844A'], populier: ['#5C7E42', '#6E8C4E'] };
  let k = 0;
  bomen.forEach((b, i) => {
    const h = (b.soort === 'populier' ? 9 : b.soort === 'wilg' ? 7 : b.soort === 'struik' ? 2.2 : 8) * b.s;
    p.set(b.x, h * .25, b.z); s.set(1, h * .5, 1);
    stammen.setMatrixAt(i, m4.compose(p, q.identity(), s));
    const delen = b.soort === 'struik' ? 2 : b.soort === 'populier' ? 3 : 5;
    for (let j = 0; j < 5; j++) {
      if (j >= delen) { s.set(0, 0, 0); kruinen.setMatrixAt(k++, m4.compose(p, q, s)); continue; }
      const rr = (b.soort === 'populier' ? 1.2 : b.soort === 'struik' ? 1.3 : 2.1) * b.s * (1 - j * .1);
      p.set(b.x + (r() - .5) * rr * 1.3, h * (b.soort === 'populier' ? .5 + j * .2 : .55 + j * .09 + r() * .08), b.z + (r() - .5) * rr * 1.3);
      s.set(rr, rr * (b.soort === 'populier' ? 2.6 : b.soort === 'wilg' ? .85 : .9), rr);
      q.setFromEuler(new THREE.Euler(r(), r(), r()));
      kruinen.setMatrixAt(k, m4.compose(p, q, s));
      const lijst = kl[b.soort]; c.set(lijst[Math.floor(r() * lijst.length)]);
      kruinen.setColorAt(k++, c);
    }
  });
  kruinen.count = k;
  bosGroep.add(kruinen, stammen);
};
zetBomen();

// riet langs de oevers
{
  const r = zaad(31), n = klein ? 900 : 1800;
  const riet = new THREE.InstancedMesh(new THREE.ConeGeometry(.1, 1.7, 3), M.riet, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const oevers = [PLAS, EILAND_BOS, EILAND_STRAND];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const o = oevers[Math.floor(r() * oevers.length)];
    const j = Math.floor(r() * o.length), a = o[j], b = o[(j + 1) % o.length], t = r();
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (x > -42 && x < -34 && z > -30 && z < 16) continue; // niet voor de steiger
    p.set(x + (r() - .5) * 3, .3, z + (r() - .5) * 3);
    s.set(1, .7 + r() * .9, 1);
    q.setFromEuler(new THREE.Euler((r() - .5) * .3, r() * 3, (r() - .5) * .3));
    riet.setMatrixAt(k++, m4.compose(p, q, s));
  }
  riet.count = k;
  scene.add(riet);
}

// tentjes en kampvuur op het bos-eiland
const kampvuur = new THREE.Group(); scene.add(kampvuur);
{
  const tent = (x, z, a, m) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.9, 4), m);
    t.position.set(x, 1.15, z); t.rotation.y = a + Math.PI / 4; t.scale.set(1, 1, 1.5); t.castShadow = true; scene.add(t);
  };
  tent(-114, -55, .2, M.tent); tent(-106, -58, -.3, M.tentRoze); tent(-117, -46, .5, M.tent);
  kampvuur.position.set(-108, .35, -48);
  for (let i = 0; i < 6; i++) { const h = doos(.12, .12, 1.2, M.houtDonker, 0, .1, 0, kampvuur, false); h.rotation.y = i; }
  const vlam = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.2, 7), M.vuur); vlam.position.y = .65; kampvuur.add(vlam);
  const licht = new THREE.PointLight('#FF8A3C', 0, 26, 1.6); licht.position.y = 1.4; kampvuur.add(licht);
  const g = gloed('#FF9A4A', 7); g.position.y = 1; kampvuur.add(g);
  kampvuur.userData = { vlam, licht, g };
}

// eenden
const eenden = [];
{
  const maakEend = () => {
    const e = new THREE.Group();
    const lijf = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), M.eendLijf); lijf.scale.set(1.5, .7, .9); e.add(lijf);
    const kop = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), M.eendKop); kop.position.set(.26, .2, 0); e.add(kop);
    const bek = new THREE.Mesh(new THREE.ConeGeometry(.04, .14, 5).rotateZ(-Math.PI / 2), M.snavel); bek.position.set(.4, .18, 0); e.add(bek);
    e.scale.setScalar(1.6);
    return e;
  };
  [[-55, -15, 6, 0], [-55, -15, 6, .5], [-55, -15, 6, 1], [-80, -120, 9, 0], [-80, -120, 9, .6], [10, -70, 7, 2]].forEach(([x, z, r, f]) => {
    const e = maakEend(); e.userData = { x, z, r, f }; scene.add(e); eenden.push(e);
  });
}

// auto's op de snelweg
const autos = [];
{
  const r = zaad(4);
  for (let i = 0; i < 14; i++) {
    const a = new THREE.Group();
    const kleurAuto = ['#B8BCC2', '#2B3A55', '#8A1F2A', '#E6E6E6', '#3A3A3A'][i % 5];
    doos(4.2, 1.1, 1.8, mat(kleurAuto, { roughness: .4 }), 0, .8, 0, a, false);
    doos(2.4, .7, 1.6, mat('#2A3440', { roughness: .2 }), -.2, 1.6, 0, a, false);
    const rijbaan = i % 2;
    const voor = doos(.1, .25, 1.4, M.koplamp, rijbaan ? -2.12 : 2.12, .9, 0, a, false);
    const achter = doos(.1, .25, 1.4, M.achterlicht, rijbaan ? 2.12 : -2.12, .9, 0, a, false);
    a.position.set(-900 + r() * 1800, .3, rijbaan ? 146 : 154);
    a.userData = { v: (rijbaan ? -1 : 1) * (26 + r() * 8), voor, achter };
    scene.add(a); autos.push(a);
  }
}

/* =====================================================================
   Camera-vlucht: elk [data-camera]-blok op de pagina is een standpunt
   ===================================================================== */
const STANDPUNTEN = {
  intro:     { pos: [150, 105, 175], kijk: [-55, 0, -70] },
  plas:      { pos: [40, 42, 60], kijk: [-95, 0, -95] },
  steiger:   { pos: [-66, 4.6, 24], kijk: [-41, 1.2, -12] },
  zaterdag:  { pos: [-70, 30, 70], kijk: [-10, 0, 0] },
  troephuis: { pos: [6, 3.6, 52], kijk: [-1, 3, 15] },
  dak:       { pos: [-2, 22, 26], kijk: [-6, 0, 4] },
  lokaal:    { pos: [-3.5, 2.2, 4.4], kijk: [-12, 1.9, 7.6] }, // op ooghoogte bij de deur, zoals de foto
  uit:       { pos: [-30, 26, 40], kijk: [-30, 0, -40] },
  nacht:     { pos: [-48, 7, -44], kijk: [40, 4, -130] }
};
if (klein) {
  STANDPUNTEN.intro = { pos: [120, 120, 230], kijk: [-50, 0, -60] };
  STANDPUNTEN.lokaal = { pos: [-3.5, 2.3, 4.2], kijk: [-12, 1.8, 8] };
  STANDPUNTEN.troephuis = { pos: [5, 7, 74], kijk: [-1, 2.5, 12] };
}
let ankers = [];
const meetAnkers = () => {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  ankers = Array.from(document.querySelectorAll('[data-camera]')).map((el) => {
    const r = el.getBoundingClientRect();
    const midden = r.top + scrollY + r.height / 2 - innerHeight / 2;
    return { s: klem(midden, 0, max), naam: el.getAttribute('data-camera') };
  }).filter((a) => STANDPUNTEN[a.naam]).sort((a, b) => a.s - b.s);
  if (ankers.length) { ankers[0].s = 0; }
};
const camPos = new THREE.Vector3(), camKijk = new THREE.Vector3(), doelPos = new THREE.Vector3(), doelKijk = new THREE.Vector3();
const opScroll = () => {
  const y = scrollY;
  if (!ankers.length) return { i: 0, f: 0 };
  let i = 0;
  while (i < ankers.length - 1 && y >= ankers[i + 1].s) i++;
  if (i >= ankers.length - 1) return { i: ankers.length - 1, f: 0 };
  const f = (y - ankers[i].s) / Math.max(1, ankers[i + 1].s - ankers[i].s);
  return { i, f };
};
const hermite = (a, b, t) => { const e = t * t * (3 - 2 * t); return a + (b - a) * e; };
const berekenDoel = () => {
  const { i, f } = opScroll();
  const A = STANDPUNTEN[ankers[i].naam], Bp = STANDPUNTEN[(ankers[i + 1] || ankers[i]).naam];
  // boogje: halverwege iets hoger, zodat de camera niet door dingen heen vliegt
  const boog = Math.sin(Math.PI * f) * Math.min(18, new THREE.Vector3(...A.pos).distanceTo(new THREE.Vector3(...Bp.pos)) * .18);
  const binnenIn = (A === STANDPUNTEN.lokaal || Bp === STANDPUNTEN.lokaal) ? 0 : 1;
  doelPos.set(hermite(A.pos[0], Bp.pos[0], f), hermite(A.pos[1], Bp.pos[1], f) + boog * binnenIn, hermite(A.pos[2], Bp.pos[2], f));
  doelKijk.set(hermite(A.kijk[0], Bp.kijk[0], f), hermite(A.kijk[1], Bp.kijk[1], f), hermite(A.kijk[2], Bp.kijk[2], f));
  return { i, f, a: ankers[i].naam, b: (ankers[i + 1] || ankers[i]).naam };
};
// hoe ver staat het dak open (0 = dicht, 1 = open)
const dakOpen = (stand) => {
  const w = (n) => (stand.a === n ? 1 - stand.f : 0) + (stand.b === n ? stand.f : 0);
  const basis = klem(w('lokaal') * 1.2 + w('dak') * .9 + (stand.a === 'lokaal' && stand.b === 'uit' ? 1 - glad(.4, 1, stand.f) : 0), 0, 1);
  // staat de camera binnen op ooghoogte, dan is het dak gewoon dicht (zoals echt)
  const bijLokaal = stand.a === 'lokaal' || stand.b === 'lokaal';
  return bijLokaal ? basis * klem((camPos.y - 3.3) / 3, 0, 1) : basis;
};

/* =====================================================================
   Tijd van de dag toepassen
   ===================================================================== */
const tmp = new THREE.Color(), tmp2 = new THREE.Color(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
let tijd = 0;
const portiek = gebouw.userData.portiek;
const zetTijd = (t) => {
  tijd = t;
  const zonHoek = lerp(.95, -.12, glad(0, .7, t)); // hoogte van de zon
  const zonAz = lerp(-.4, -1.05, t); // van zuid naar west
  const zd = new THREE.Vector3(Math.cos(zonHoek) * Math.sin(zonAz), Math.sin(zonHoek), Math.cos(zonHoek) * Math.cos(zonAz)).normalize();
  zon.position.copy(zd).multiplyScalar(300); zon.target.position.set(0, 0, 0);
  const dag = 1 - glad(.55, .78, t);
  zon.intensity = 3.4 * dag + .7 * glad(.8, 1, t);
  opTijd(K.zon, t, zon.color);
  if (t > .78) zon.color.lerp(kleur('#9AA8D8'), glad(.78, .95, t));
  // maan staat in het oosten
  const md = new THREE.Vector3(.55, lerp(-.05, .42, glad(.66, 1, t)), -.8).normalize();
  if (t > .8) { zon.position.copy(md).multiplyScalar(300); }
  hemel.intensity = lerp(.45, .9, glad(.5, 1, t));
  scene.environmentIntensity = lerp(.55, .2, glad(.55, .85, t));
  opTijd(K.hemel, t, hemel.color); opTijd(K.grondLicht, t, hemel.groundColor);
  opTijd(K.luchtBoven, t, luchtMat.uniforms.boven.value);
  opTijd(K.horizon, t, luchtMat.uniforms.horizon.value);
  luchtMat.uniforms.zonRichting.value.copy(zd);
  opTijd(K.zon, t, luchtMat.uniforms.zonKleur.value);
  luchtMat.uniforms.zonSterkte.value = 1 - glad(.66, .76, t);
  maakOmgeving(t);
  scene.fog.color.copy(luchtMat.uniforms.horizon.value);
  sterren.material.opacity = glad(.72, .95, t);
  maan.position.copy(md).multiplyScalar(1200);
  maan.material.opacity = glad(.66, .8, t);
  // water
  opTijd(K.waterDiep, t, waterMat.uniforms.diep.value);
  opTijd(K.waterLicht, t, waterMat.uniforms.licht.value);
  waterMat.uniforms.lucht.value.copy(luchtMat.uniforms.horizon.value);
  waterMat.uniforms.zonRichting.value.copy(t > .8 ? md : zd);
  waterMat.uniforms.zonKleur.value.copy(t > .8 ? tmp.set('#C9C8E8') : luchtMat.uniforms.zonKleur.value);
  waterMat.uniforms.glans.value = t > .8 ? glad(.8, 1, t) * .15 : 1 - glad(.6, .72, t);
  // lampen aan in de schemering
  const aan = glad(.6, .74, t);
  M.raamGlas.emissiveIntensity = aan * 1.4; M.glas.emissiveIntensity = aan * 1.1;
  lokaal.userData.lamp.intensity = 14 + aan * 30;
  portiek.intensity = aan * 40;
  const L1 = zeiler.userData.lichten;
  L1.top.material.opacity = aan; L1.rood.material.opacity = aan; L1.groen.material.opacity = aan; L1.toplamp.intensity = aan * 6;
  kampvuur.userData.licht.intensity = aan * 30; kampvuur.userData.g.material.opacity = aan * .9; kampvuur.userData.vlam.visible = aan > .05;
  for (const a of autos) { a.userData.voor.material.color.set(aan > .3 ? '#FFF6D0' : '#D8D4C8'); }
  renderer.toneMappingExposure = lerp(.95, 1.2, glad(.6, 1, t));
  html.style.setProperty('--nacht', t.toFixed(3));
  html.classList.toggle('is-avond', t > .55 && t <= .72);
  html.classList.toggle('is-nacht', t > .72);
};

/* Klikken op de achtergrond doet niets meer (op verzoek). */
const wend = () => { if (vaart.wend > 0) return; vaart.wend = 1; vaart.richting *= -1; vaart.doelZijde *= -1; geluid.wend(); };

/* =====================================================================
   Geluid (alleen als je het aanzet): water en wind
   ===================================================================== */
const geluid = (() => {
  let ctx = null, hoofd = null;
  const ruis = (c, sec = 3) => {
    const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    let laatst = 0;
    for (let i = 0; i < d.length; i++) { laatst = (laatst + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = laatst * 3.5; }
    const s = c.createBufferSource(); s.buffer = b; s.loop = true; return s;
  };
  return {
    aan() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        hoofd = ctx.createGain(); hoofd.gain.value = 0; hoofd.connect(ctx.destination);
        // kabbelend water
        const w = ruis(ctx), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        const wg = ctx.createGain(); wg.gain.value = .55;
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .23; lg.gain.value = .3; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
        w.connect(lp); lp.connect(wg); wg.connect(hoofd); w.start();
        // wind door het riet
        const r = ruis(ctx, 5), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
        const rg = ctx.createGain(); rg.gain.value = .12;
        const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = .07; lg2.gain.value = .08; lfo2.connect(lg2); lg2.connect(rg.gain); lfo2.start();
        r.connect(bp); bp.connect(rg); rg.connect(hoofd); r.start();
      }
      ctx.resume(); hoofd.gain.setTargetAtTime(.5, ctx.currentTime, .6);
    },
    uit() { if (ctx) hoofd.gain.setTargetAtTime(0, ctx.currentTime, .3); },
    wend() {
      if (!ctx || hoofd.gain.value < .05) return;
      // klapperend zeil
      const s = ruis(ctx, 1), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(.8, ctx.currentTime + .05); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .9);
      s.connect(f); f.connect(g); g.connect(hoofd); s.start(); s.stop(ctx.currentTime + 1);
    },
    get speelt() { return !!ctx && hoofd.gain.value > .05; }
  };
})();

/* =====================================================================
   Knoppen: geluid en seizoen
   ===================================================================== */
const knoppen = document.createElement('div'); knoppen.className = 'wereld-knoppen';
const geluidKnop = document.createElement('button'); geluidKnop.type = 'button'; geluidKnop.className = 'wereld-knop';
const seizoenKnop = document.createElement('button'); seizoenKnop.type = 'button'; seizoenKnop.className = 'wereld-knop';
let geluidAan = false;
const toonKnoppen = () => {
  geluidKnop.textContent = geluidAan ? 'Geluid uit' : 'Geluid aan';
  geluidKnop.setAttribute('aria-pressed', String(geluidAan));
  seizoenKnop.textContent = winter ? 'Zomer' : 'Winter';
  seizoenKnop.setAttribute('aria-label', winter ? 'Laat de zomer zien (boten in het water)' : 'Laat de winter zien (boten op de kant)');
};
geluidKnop.addEventListener('click', () => { geluidAan = !geluidAan; geluidAan ? geluid.aan() : geluid.uit(); toonKnoppen(); });
seizoenKnop.addEventListener('click', () => { winter = !winter; winterKleuren(); legVloot(); zetBomen(); toonKnoppen(); });
knoppen.append(geluidKnop); document.body.appendChild(knoppen); toonKnoppen();

/* =====================================================================
   Startscherm "Kom aan boord"
   ===================================================================== */
const aanboord = document.querySelector('.aanboord');
const sluitAanboord = (metGeluid) => {
  if (!aanboord) return;
  aanboord.classList.add('is-weg');
  setTimeout(() => aanboord.remove(), 900);
  try { sessionStorage.setItem('nv-aan-boord', '1'); } catch (e) { /* geen opslag */ }
  if (metGeluid) { geluidAan = true; geluid.aan(); toonKnoppen(); }
};
if (aanboord) {
  let gezien = false;
  try { gezien = sessionStorage.getItem('nv-aan-boord') === '1'; } catch (e) { /* geen opslag */ }
  if (gezien || html.classList.contains('eenvoudig')) aanboord.remove();
  else {
    const pct = aanboord.querySelector('.aanboord__pct');
    let n = 0;
    const tik = setInterval(() => { n = Math.min(100, n + 7 + Math.random() * 12); if (pct) pct.textContent = Math.round(n) + '%'; if (n >= 100) { clearInterval(tik); aanboord.classList.add('is-klaar'); } }, 70);
    aanboord.querySelector('[data-aanboord="stil"]').addEventListener('click', () => sluitAanboord(false));
    aanboord.querySelector('[data-aanboord="geluid"]').addEventListener('click', () => sluitAanboord(true));
  }
}

/* =====================================================================
   Animatie
   ===================================================================== */
let klok = 0, laatste = 0, draait = false, eerste = true;
const frame = (nu) => {
  if (!draait) return;
  const dt = laatste ? Math.min(.05, (nu - laatste) / 1000) : .016; laatste = nu;
  if (!rustig) klok += dt;

  // tijd van de dag volgt het scrollen
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const p = klem(scrollY / max, 0, 1);
  zetTijd(vastTijd !== null ? vastTijd : (p < .72 ? lerp(klokStart, .6, glad(0, .72, p) * .4 + p / .72 * .6) : lerp(.6, 1, glad(.72, .97, p))));

  // camera
  const stand = berekenDoel();
  if (winter && (stand.a === 'nacht' || stand.b === 'nacht')) {
    const w = stand.a === 'nacht' ? 1 : glad(0, .45, stand.f);
    doelPos.lerp(tmpV.set(-72, 7, -66), w); doelKijk.lerp(tmpV2.set(-6, 2.5, 0), w);
  }
  // laatste hoofdstuk: de camera vaart mee met de 1798 (in de zomer)
  if (!winter && (stand.a === 'nacht' || stand.b === 'nacht')) {
    const w = stand.a === 'nacht' ? 1 : glad(0, .45, stand.f);
    const bp = zeiler.position;
    const ry = zeiler.rotation.y, vooruit = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry)), zij = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
    // camera altijd aan de kant van het open water (binnenkant van de vaarbaan), nooit in de bomen
    if (zij.x * (VAARBAAN.x - bp.x) + zij.z * (VAARBAAN.z - bp.z) < 0) zij.negate();
    const volg = bp.clone().addScaledVector(vooruit, -11).addScaledVector(zij, 13).add(new THREE.Vector3(0, 5, 0));
    doelPos.lerp(volg, w); doelKijk.lerp(bp.clone().add(new THREE.Vector3(0, .8, 0)), w);
  }
  if (!rustig) {
    doelPos.x += Math.sin(klok * .11) * .25 * (stand.a === 'intro' ? 4 : 1); // heel rustig ademen, geen schommelen
  }
  if (eerste) { camPos.copy(doelPos); camKijk.copy(doelKijk); eerste = false; }
  const k = rustig ? 1 : 1 - Math.pow(.0015, dt);
  camPos.lerp(doelPos, k); camKijk.lerp(doelKijk, k);
  camera.position.copy(camPos); camera.lookAt(camKijk);
  if (debugCam) { camera.position.set(debugCam[0], debugCam[1], debugCam[2]); camera.lookAt(debugCam[3], debugCam[4], debugCam[5]); }

  // dak open boven ons lokaal
  const open = dakOpen(stand);
  dak.position.y = open * 14; dak.visible = open < .98; plafond.visible = open < .02;
  dak.children.forEach((c) => { if (c.material) { c.material.transparent = open > 0; c.material.opacity = 1 - open; } });

  // water
  waterMat.uniforms.tijd.value = klok;
  waterMat.uniforms.fogColor.value.copy(scene.fog.color); waterMat.uniforms.fogNear.value = scene.fog.near; waterMat.uniforms.fogFar.value = scene.fog.far;

  // vloot deint zachtjes
  if (!winter) vloot.children.forEach((b) => { b.position.y = Math.sin(klok * 1.1 + b.userData.fase) * .05; b.rotation.x = Math.sin(klok * .9 + b.userData.fase) * .015; });

  // zeilende vlet: rondje over de plas, overstag bij de keerpunten of als je klikt
  zeiler.visible = !winter;
  if (!winter) {
    const v = vaart;
    const snel = rustig ? 0 : .035 * (v.wend > 0 ? .35 : 1);
    v.hoek += snel * dt * v.richting;
    if (v.wend > 0) v.wend = Math.max(0, v.wend - dt / 2.2);
    v.zijde += (v.doelZijde - v.zijde) * Math.min(1, dt * 1.6);
    const x = VAARBAAN.x + Math.cos(v.hoek) * VAARBAAN.rx, z = VAARBAAN.z + Math.sin(v.hoek) * VAARBAAN.rz;
    const dx = -Math.sin(v.hoek) * VAARBAAN.rx * v.richting, dz = Math.cos(v.hoek) * VAARBAAN.rz * v.richting;
    let koers = Math.atan2(-dz, dx);
    if (v.wend > 0) koers += Math.PI * (v.wend); // draai rond tijdens het wenden
    zeiler.position.set(x, Math.sin(klok * 1.3) * .08, z);
    zeiler.rotation.set(Math.sin(klok * 1.1) * .03, koers, -.08 * v.zijde);
    zeiler.userData.tuig.rotation.y = .45 * v.zijde;
    zeiler.userData.fokTuig.rotation.y = .3 * v.zijde;
  }

  // kampvuur flakkert
  if (kampvuur.userData.vlam.visible) { const f = .85 + Math.sin(klok * 13) * .1 + Math.sin(klok * 7.7) * .08; kampvuur.userData.vlam.scale.set(f, f * 1.1, f); kampvuur.userData.licht.intensity *= f; }
  // eenden zwemmen rondjes
  eenden.forEach((e) => { const d = e.userData, a = klok * .12 + d.f; e.position.set(d.x + Math.cos(a) * d.r, .02 + Math.sin(klok * 2 + d.f) * .02, d.z + Math.sin(a) * d.r); e.rotation.y = -a - Math.PI; });
  // auto's
  autos.forEach((a) => { a.position.x += a.userData.v * dt; if (a.position.x > 900) a.position.x = -900; if (a.position.x < -900) a.position.x = 900; });

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
const start = () => { if (draait || html.classList.contains('eenvoudig') || document.hidden) return; draait = true; laatste = 0; requestAnimationFrame(frame); };
const stop = () => { draait = false; };

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); meetAnkers(); });
addEventListener('load', meetAnkers);
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
if (document.fonts) document.fonts.ready.then(meetAnkers);
new ResizeObserver(meetAnkers).observe(document.body);
meetAnkers();
window.NVDecor = { start, stop, wend };
if (zoekParam("debug") !== null) window.__nv = { camera, zeiler, vaart, scene, ankers: () => ankers, opScroll };
html.classList.add('wereld-klaar');
start();
