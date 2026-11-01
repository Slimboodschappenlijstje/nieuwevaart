/* =====================================================================
   De Nieuwe Vaart — het waterdecor achter de site.
   Een lelievlet (1798) zeilt over de plas, met een eilandje met tentjes
   op de achtergrond. Van middag tot nacht: op de homepage via het scrollen,
   op de andere pagina's volgens de echte tijd in Leiderdorp.
   Klik op de boot en hij gaat overstag.
   Testen: voeg ?tijd=0.8 aan de adresbalk toe (0 = middag, 1 = nacht).
   ===================================================================== */
(function () {
  'use strict';

  var doek = document.getElementById('decor');
  if (!doek || !doek.getContext) return;
  if (document.documentElement.classList.contains('wereld-3d')) return; // de 3D-wereld neemt het over
  var html = document.documentElement;
  var ctx = doek.getContext('2d');
  var modus = doek.getAttribute('data-modus') || 'klok'; // 'scroll' of 'klok'
  var rustig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hulpjes ---------- */
  var klem = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var glad = function (a, b, x) { var t = klem((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var hex = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  var meng = function (a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  var css = function (c, a) {
    var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return a === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  };
  // Vaste willekeur, zodat het decor er elke keer hetzelfde uitziet
  var zaad = function (s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  // Kleurverloop over de dag: [tijd, kleur]
  var reeks = function (lijst) { return lijst.map(function (p) { return [p[0], hex(p[1])]; }); };
  var kleurOp = function (r, t) {
    if (t <= r[0][0]) return r[0][1];
    for (var i = 1; i < r.length; i++) {
      if (t <= r[i][0]) return meng(r[i - 1][1], r[i][1], (t - r[i - 1][0]) / (r[i][0] - r[i - 1][0]));
    }
    return r[r.length - 1][1];
  };
  var K = {
    luchtBoven: reeks([[0, '#8EC3E6'], [.38, '#7DB0DC'], [.6, '#4B4B8F'], [.72, '#2A2160'], [.84, '#141235'], [1, '#060717']]),
    luchtMidden: reeks([[0, '#BFDDF0'], [.38, '#BCD2E6'], [.6, '#B0709A'], [.72, '#6E3D78'], [.84, '#2C1C4E'], [1, '#0F0E2A']]),
    horizon: reeks([[0, '#F7EAF0'], [.38, '#FCE3D2'], [.6, '#FFB27A'], [.72, '#E07A6E'], [.84, '#6A3560'], [1, '#231A42']]),
    waterBoven: reeks([[0, '#A9CCDD'], [.38, '#B9C9D3'], [.6, '#E2A38E'], [.72, '#9A5C7E'], [.84, '#3A2850'], [1, '#1B1936']]),
    waterOnder: reeks([[0, '#3F7697'], [.38, '#3C6787'], [.6, '#3A3F6E'], [.72, '#231F4A'], [.84, '#0F0E28'], [1, '#05061A']]),
    golf: reeks([[0, '#E8F3F8'], [.38, '#F3EEE6'], [.6, '#FFD2B0'], [.72, '#C88AA6'], [.84, '#5A4A7A'], [1, '#3A3866']]),
    oever: reeks([[0, '#A8BBB0'], [.38, '#A4AE9E'], [.6, '#7A5A72'], [.72, '#4A3358'], [.84, '#2A1F40'], [1, '#15122A']]),
    grond: reeks([[0, '#7FA367'], [.38, '#86996A'], [.6, '#5A4256'], [.72, '#352A4C'], [.84, '#1F1935'], [1, '#110E20']]),
    boomDonker: reeks([[0, '#3D6A48'], [.38, '#41603E'], [.6, '#3A2C46'], [.72, '#281F3D'], [.84, '#17132B'], [1, '#0C0A19']]),
    boomLicht: reeks([[0, '#6FA164'], [.38, '#7E9E5E'], [.6, '#6E4A5E'], [.72, '#3B2D51'], [.84, '#221B38'], [1, '#141128']]),
    wolk: reeks([[0, '#FFFFFF'], [.38, '#FFF4EA'], [.6, '#FFC6A8'], [.72, '#B86A88'], [.84, '#3C2A55'], [1, '#1C1936']]),
    zon: reeks([[0, '#FFFBEA'], [.38, '#FFE7B0'], [.6, '#FF9A55'], [.7, '#F0603C'], [1, '#F0603C']]),
    riet: reeks([[0, '#6F7D52'], [.38, '#77774A'], [.6, '#4A3446'], [.72, '#2A2036'], [.84, '#16112A'], [1, '#0B0918']])
  };
  var NACHTTINT = hex('#1B1633'), AVONDTINT = hex('#FF9F6E');

  /* ---------- De lelievlet (zelfde tekening als het oude logo-plaatje) ---------- */
  var P = function (d) { return new Path2D(d); };
  var BOOT = {
    schaduw: P('M178 500c8 8 20 13 36 14h190c18-1 30-6 36-14Z'),
    want: P('M352 132 445 447M352 134 318 466'),
    grootzeil: P('M349 172 217 101Q186 270 190 441l159-4Z'),
    naden: P('M204 186 349 198M198 237 349 248M194 288 349 297M191 339 349 346M190 390 349 394'),
    lelie: P('M20 0c7 9 8 20 0 31C12 20 13 9 20 0ZM17 31C9 32 1 28 1 19c0-7 6-10 11-7-4 2-4 9 1 11 2 2 4 5 4 8ZM23 31c8 1 16-3 16-12 0-7-6-10-11-7 4 2 4 9-1 11-2 2-4 5-4 8ZM9 31h22v4H9ZM17 35l3 11 3-11ZM11 35c0 5 3 7 5 6-2-2-2-4-1-6ZM29 35c0 5-3 7-5 6 2-2 2-4 1-6Z'),
    fok: P('M355 188 441 443Q410 441 384 432Q376 308 355 188Z'),
    gaffel: P('M352 170 214 97'),
    mast: P('M352 128V474'),
    giek: P('M352 440 184 446'),
    wimpel: P('M352 130 320 137l32 7Z'),
    romp: P('M168 462c82 12 192 10 280-16-1 19-4 38-8 54H178c-4-12-8-25-10-38Z'),
    berghout: P('M173 470c79 11 187 9 272-15')
  };
  var BOOT_MIDDEN = 308, BOOT_WATERLIJN = 498, BOOT_HOOGTE = 380;

  /* ---------- Toestand ---------- */
  var W = 0, H = 0, dpr = 1, horizon = 0;
  var tijd = 0;             // 0 = middag, 1 = nacht
  var klokStart = 0;
  var sterren = [], wolken = [], golven = [], eenden = [], meeuwen = [];
  var boot = { x: null, richting: 1, wend: 0, wendVan: 1, schaal: 1, kaart: null };
  var vorigeScroll = window.scrollY || 0;
  var klok = 0, laatste = 0, draait = false;
  var vastTijd = null;
  (function () {
    var m = /[?&]tijd=([0-9.]+)/.exec(location.search);
    if (m) vastTijd = klem(parseFloat(m[1]), 0, 1);
  })();

  /* ---------- Tijd van de dag in Leiderdorp (benadering, ruim goed genoeg) ---------- */
  var tijdVolgensKlok = function (d) {
    var start = new Date(d.getFullYear(), 0, 0);
    var dag = (d - start) / 864e5;
    var golfJaar = Math.cos(2 * Math.PI * (dag - 172) / 365);
    var zomertijd = d.getTimezoneOffset() < new Date(d.getFullYear(), 0, 1).getTimezoneOffset() ? 1 : 0;
    var onder = 18.78 + 2.27 * golfJaar + zomertijd; // zonsondergang (dec 16.30, juni 22.05)
    var op = 6.53 - 2.25 * golfJaar + zomertijd;      // zonsopkomst (dec 8.47, juni 5.18)
    var u = d.getHours() + d.getMinutes() / 60;
    if (u >= onder - 2.5 && u < onder) return lerp(.25, .6, glad(onder - 2.5, onder, u));
    if (u >= onder && u < onder + 1.4) return lerp(.6, 1, (u - onder) / 1.4);
    if (u >= onder + 1.4 || u < op - 1) return 1;
    if (u < op + .5) return lerp(1, .6, (u - (op - 1)) / 1.5);
    if (u < op + 2) return lerp(.6, .1, (u - (op + .5)) / 1.5);
    return u > 12 ? lerp(0, .25, glad(12, onder - 2.5, u)) : .1 * (1 - glad(op + 2, 12, u));
  };

  /* ---------- Opbouw ---------- */
  var bouw = function () {
    var r = zaad(1798);
    sterren = [];
    for (var i = 0; i < 170; i++) sterren.push({ x: r(), y: Math.pow(r(), 1.4) * .95, r: r() < .08 ? 1.5 : .5 + r() * .8, f: r() * 6.28, s: .6 + r() * 1.6 });
    wolken = [];
    for (i = 0; i < 5; i++) {
      var w = { x: r(), y: .12 + r() * .3, s: .45 + r() * .55, v: .004 + r() * .006, bollen: [] };
      var n = 4 + Math.floor(r() * 3);
      for (var j = 0; j < n; j++) w.bollen.push({ dx: (j - n / 2) * 34 + r() * 14, dy: -r() * 22 * Math.sin(Math.PI * (j + .5) / n), r: 22 + r() * 18 * Math.sin(Math.PI * (j + .5) / n) });
      wolken.push(w);
    }
    golven = [];
    for (i = 0; i < 46; i++) golven.push({ d: Math.pow(r(), .8), x: r(), l: .5 + r(), f: r() * 6.28 });
    eenden = [
      { x: .16, d: .62, v: .008, f: 0 },
      { x: .21, d: .66, v: .008, f: 1.2 },
      { x: .25, d: .6, v: .008, f: 2.3 }
    ];
    meeuwen = [];
    for (i = 0; i < 4; i++) meeuwen.push({ x: r(), y: .14 + r() * .18, s: .6 + r() * .5, v: .012 + r() * .01, f: r() * 6.28 });
  };

  var maat = function () {
    var rect = doek.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    doek.width = Math.round(W * dpr); doek.height = Math.round(H * dpr);
    horizon = H * (W < H ? .6 : .58);
    var bootHoogte = Math.min(H * .4, W * .66, 420);
    boot.schaal = bootHoogte / BOOT_HOOGTE;
    var g = grenzen();
    if (boot.x === null) boot.x = lerp(g[0], g[1], modus === 'scroll' ? .25 : .55);
    boot.x = klem(boot.x, g[0], g[1]);
    teken();
  };
  var grenzen = function () {
    var half = 150 * boot.schaal;
    if (W >= 1000 && modus === 'scroll') return [W * .54 + half * .4, W - half - W * .04];
    return [half + W * .04, W - half - W * .04];
  };

  /* ---------- Tekenen ---------- */
  var tekenLucht = function (t) {
    var g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, css(kleurOp(K.luchtBoven, t)));
    g.addColorStop(.62, css(kleurOp(K.luchtMidden, t)));
    g.addColorStop(1, css(kleurOp(K.horizon, t)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon + 2);

    // sterren
    var sa = glad(.7, .95, t);
    if (sa > 0) {
      for (var i = 0; i < sterren.length; i++) {
        var s = sterren[i];
        var fl = rustig ? 1 : .65 + .35 * Math.sin(klok * s.s + s.f);
        ctx.fillStyle = 'rgba(255,248,240,' + (sa * fl * (s.y < .8 ? 1 : 1.6 - s.y * .75)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(s.x * W, s.y * horizon * .92, s.r, 0, 6.283); ctx.fill();
      }
    }
  };

  var zonPlek = function (t) {
    var z = klem(t / .66, 0, 1);
    return { x: W * lerp(.66, .8, z), y: lerp(H * .12, horizon + 6, Math.pow(z, 1.35)), r: Math.max(18, Math.min(W, H) * .045) };
  };
  var maanPlek = function (t) {
    var m = glad(.68, 1, t);
    return { x: W * lerp(.12, .2, m), y: lerp(horizon + 20, H * .16, Math.sqrt(m)), r: Math.max(14, Math.min(W, H) * .03), a: glad(.68, .8, t) };
  };

  var tekenZon = function (t) {
    var z = zonPlek(t);
    if (t < .7) {
      var kz = kleurOp(K.zon, t);
      var gloed = ctx.createRadialGradient(z.x, z.y, z.r * .5, z.x, z.y, z.r * (t < .45 ? 7 : 10));
      gloed.addColorStop(0, css(kz, .55 * (1 - glad(.62, .7, t))));
      gloed.addColorStop(1, css(kz, 0));
      ctx.fillStyle = gloed; ctx.fillRect(0, 0, W, horizon);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
      ctx.fillStyle = css(kz);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };
  var tekenMaan = function (t) {
    var m = maanPlek(t);
    if (m.a > 0) {
      var mg = ctx.createRadialGradient(m.x, m.y, m.r * .6, m.x, m.y, m.r * 6);
      mg.addColorStop(0, 'rgba(240,232,255,' + (.22 * m.a) + ')');
      mg.addColorStop(1, 'rgba(240,232,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, horizon);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
      ctx.fillStyle = 'rgba(250,246,236,' + m.a + ')';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
      // zachte vlekjes op de maan
      ctx.fillStyle = 'rgba(205,198,214,' + (.45 * m.a) + ')';
      ctx.beginPath(); ctx.arc(m.x - m.r * .3, m.y - m.r * .15, m.r * .22, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + m.r * .25, m.y + m.r * .3, m.r * .14, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + m.r * .35, m.y - m.r * .35, m.r * .09, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };

  var tekenWolken = function (t) {
    var k = kleurOp(K.wolk, t);
    var a = lerp(.78, .2, glad(.6, 1, t));
    var schaal = Math.min(1, W / 1300) + .2;
    for (var i = 0; i < wolken.length; i++) {
      var w = wolken[i];
      var x = ((w.x + klok * w.v * .1) % 1.3) * (W + 400) - 200;
      var y = w.y * horizon;
      var s = w.s * schaal;
      var wg = ctx.createLinearGradient(0, y - 50 * s, 0, y + 16 * s);
      wg.addColorStop(0, css(k, a));
      wg.addColorStop(1, css(meng(k, kleurOp(K.horizon, t), .5), a * .55));
      ctx.fillStyle = wg;
      ctx.beginPath();
      for (var j = 0; j < w.bollen.length; j++) {
        var b = w.bollen[j];
        ctx.moveTo(x + b.dx * s + b.r * s, y + b.dy * s);
        ctx.arc(x + b.dx * s, y + b.dy * s, b.r * s, 0, 6.283);
      }
      // platte onderkant
      var bx0 = x + w.bollen[0].dx * s, bx1 = x + w.bollen[w.bollen.length - 1].dx * s;
      ctx.rect(bx0, y - 4 * s, bx1 - bx0, 20 * s);
      ctx.fill();
    }
  };

  var tekenMeeuwen = function (t) {
    var a = 1 - glad(.5, .66, t);
    if (a <= 0) return;
    ctx.strokeStyle = 'rgba(70,60,80,' + (.55 * a) + ')';
    ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < meeuwen.length; i++) {
      var m = meeuwen[i];
      var x = ((m.x + klok * m.v * .1) % 1.2) * (W + 200) - 100;
      var y = m.y * horizon + Math.sin(klok * .7 + m.f) * 6;
      var s = 9 * m.s * Math.min(1.3, W / 900 + .4);
      var vl = Math.sin(klok * 4 + m.f) * .35;
      ctx.beginPath();
      ctx.moveTo(x - s, y - s * (.15 + vl));
      ctx.quadraticCurveTo(x - s * .45, y - s * (.55 + vl * .5), x, y);
      ctx.quadraticCurveTo(x + s * .45, y - s * (.55 + vl * .5), x + s, y - s * (.15 + vl));
      ctx.stroke();
    }
  };

  // Verre oever met een molen
  var tekenOever = function (t, spiegel) {
    var k = kleurOp(K.oever, t);
    var h = H * .02;
    ctx.fillStyle = css(k);
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (var x = 0; x <= W + 20; x += 20) {
      var y = horizon - h * (.35 + .25 * Math.sin(x * .013) + .2 * Math.sin(x * .037 + 1) + .2 * Math.sin(x * .071 + 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
    if (spiegel) return;
    // molen
    var mx = W * .88, mh = H * .07, my = horizon - h * .4;
    ctx.fillStyle = css(meng(k, [40, 30, 50], .18));
    ctx.beginPath();
    ctx.moveTo(mx - mh * .14, my); ctx.lineTo(mx - mh * .08, my - mh * .72); ctx.lineTo(mx + mh * .08, my - mh * .72); ctx.lineTo(mx + mh * .14, my); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(mx, my - mh * .72, mh * .09, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1.2, mh * .035); ctx.lineCap = 'round';
    var hoek = rustig ? .5 : klok * .25;
    for (var i = 0; i < 4; i++) {
      var a = hoek + i * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(mx, my - mh * .74); ctx.lineTo(mx + Math.cos(a) * mh * .55, my - mh * .74 + Math.sin(a) * mh * .55); ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, mh * .08); ctx.globalAlpha = .45;
    for (i = 0; i < 4; i++) {
      a = hoek + i * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * mh * .2, my - mh * .74 + Math.sin(a) * mh * .2); ctx.lineTo(mx + Math.cos(a) * mh * .52, my - mh * .74 + Math.sin(a) * mh * .52); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // Het eilandje met bomen, twee tentjes, een vlag en 's avonds een kampvuur
  var eiland = function () {
    var breed = Math.min(W * (W < 700 ? .62 : .4), 560);
    var mid = W * (W < 700 ? .34 : .3);
    return { mid: mid, breed: breed, x0: mid - breed / 2, x1: mid + breed / 2, h: Math.min(H * .12, breed * .26) };
  };
  var BOMEN = [
    // [positie over het eiland 0..1, hoogte 0..1, breedte, soort]
    [.08, .42, .14, 'rond'], [.17, .62, .16, 'rond'], [.27, .95, .1, 'populier'], [.33, .78, .15, 'rond'],
    [.4, .55, .14, 'rond'], [.72, .7, .15, 'rond'], [.8, 1, .1, 'populier'], [.86, .66, .15, 'rond'], [.94, .4, .12, 'rond']
  ];
  var tekenEiland = function (t, spiegel) {
    var e = eiland();
    var donker = kleurOp(K.boomDonker, t), licht = kleurOp(K.boomLicht, t), grond = kleurOp(K.grond, t);
    var zonKant = t < .7 ? 1 : -1; // licht van rechts (zon), 's nachts van links (maan)
    var oeverY = horizon;
    // grond
    ctx.fillStyle = css(grond);
    ctx.beginPath();
    ctx.moveTo(e.x0 - e.breed * .04, oeverY + 1);
    ctx.bezierCurveTo(e.x0 + e.breed * .1, oeverY - e.h * .2, e.x0 + e.breed * .3, oeverY - e.h * .24, e.mid, oeverY - e.h * .22);
    ctx.bezierCurveTo(e.x1 - e.breed * .3, oeverY - e.h * .24, e.x1 - e.breed * .1, oeverY - e.h * .2, e.x1 + e.breed * .04, oeverY + 1);
    ctx.closePath(); ctx.fill();

    // bomen
    for (var i = 0; i < BOMEN.length; i++) {
      var b = BOMEN[i];
      var bx = e.x0 + b[0] * e.breed, bh = b[1] * e.h, bw = b[2] * e.breed;
      var voet = oeverY - e.h * .16 * Math.sin(Math.PI * b[0]) - 1;
      var wieg = rustig || spiegel ? 0 : Math.sin(klok * .9 + i) * bw * .015;
      ctx.fillStyle = css(meng(donker, grond, .25));
      ctx.fillRect(bx - bw * .035, voet - bh * .35, bw * .07, bh * .35 + 2);
      if (b[3] === 'populier') {
        ctx.fillStyle = css(donker);
        ctx.beginPath(); ctx.ellipse(bx + wieg, voet - bh * .55, bw * .3, bh * .48, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = css(licht);
        ctx.beginPath(); ctx.ellipse(bx + wieg + zonKant * bw * .1, voet - bh * .6, bw * .15, bh * .38, 0, 0, 6.283); ctx.fill();
      } else {
        ctx.fillStyle = css(donker);
        ctx.beginPath();
        ctx.arc(bx - bw * .22 + wieg, voet - bh * .45, bw * .3, 0, 6.283);
        ctx.arc(bx + bw * .22 + wieg, voet - bh * .47, bw * .29, 0, 6.283);
        ctx.arc(bx + wieg, voet - bh * .72, bw * .34, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = css(licht);
        ctx.beginPath();
        ctx.arc(bx + zonKant * bw * .14 + wieg, voet - bh * .78, bw * .2, 0, 6.283);
        ctx.arc(bx + zonKant * bw * .3 + wieg, voet - bh * .55, bw * .14, 0, 6.283);
        ctx.fill();
      }
    }

    // open plek met tentjes en vlag
    var plek = e.x0 + e.breed * .56, grondY = oeverY - e.h * .2;
    var th = e.h * .2;
    var tenten = [[-th * 1.5, '#D9A3C2'], [th * .4, '#E9DCC8']];
    for (i = 0; i < tenten.length; i++) {
      var tx = plek + tenten[i][0];
      var tk = meng(hex(tenten[i][1]), NACHTTINT, glad(.55, 1, t) * .82);
      ctx.fillStyle = css(tk);
      ctx.beginPath(); ctx.moveTo(tx - th * .75, grondY + 1); ctx.lineTo(tx, grondY - th); ctx.lineTo(tx + th * .75, grondY + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = css(meng(tk, [20, 10, 30], .35));
      ctx.beginPath(); ctx.moveTo(tx - th * .16, grondY + 1); ctx.lineTo(tx, grondY - th * .62); ctx.lineTo(tx + th * .16, grondY + 1); ctx.closePath(); ctx.fill();
    }
    // vlaggenmast
    var vx = plek + th * 1.7;
    ctx.strokeStyle = css(meng(hex('#EDE6EA'), NACHTTINT, glad(.55, 1, t) * .8));
    ctx.lineWidth = Math.max(1, e.h * .012);
    ctx.beginPath(); ctx.moveTo(vx, grondY + 1); ctx.lineTo(vx, grondY - e.h * .62); ctx.stroke();
    var wap = rustig || spiegel ? 0 : Math.sin(klok * 3) * e.h * .012;
    ctx.fillStyle = css(meng(hex('#C2286F'), NACHTTINT, glad(.55, 1, t) * .6));
    ctx.beginPath();
    ctx.moveTo(vx, grondY - e.h * .62);
    ctx.quadraticCurveTo(vx + e.h * .1, grondY - e.h * .6 + wap, vx + e.h * .2, grondY - e.h * .57 + wap);
    ctx.lineTo(vx + e.h * .2, grondY - e.h * .47 + wap);
    ctx.quadraticCurveTo(vx + e.h * .1, grondY - e.h * .5 - wap, vx, grondY - e.h * .51);
    ctx.closePath(); ctx.fill();

    // kampvuur
    var vuur = glad(.66, .82, t);
    if (vuur > 0) {
      var fx = plek - th * .55, fy = grondY - 1;
      var fl = rustig ? 1 : .8 + .2 * Math.sin(klok * 11) * Math.sin(klok * 7.3 + 1);
      var r = e.h * (spiegel ? .5 : .42) * fl;
      var g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, 'rgba(255,190,110,' + (.75 * vuur) + ')');
      g.addColorStop(.35, 'rgba(255,120,60,' + (.28 * vuur) + ')');
      g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,140,' + vuur + ')';
      ctx.beginPath(); ctx.moveTo(fx - th * .14, fy); ctx.quadraticCurveTo(fx - th * .1, fy - th * .3 * fl, fx, fy - th * .48 * fl); ctx.quadraticCurveTo(fx + th * .1, fy - th * .3 * fl, fx + th * .14, fy); ctx.closePath(); ctx.fill();
    }
  };

  var tekenWater = function (t) {
    var g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, css(kleurOp(K.waterBoven, t)));
    g.addColorStop(1, css(kleurOp(K.waterOnder, t)));
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, W, H - horizon);
  };

  // Spiegelbeeld van oever en eiland in het water
  var tekenSpiegeling = function (t) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
    ctx.globalAlpha = .22;
    ctx.translate(0, horizon * 2);
    ctx.scale(1, -1);
    ctx.translate(0, horizon);
    ctx.scale(1, .55);
    ctx.translate(0, -horizon);
    tekenOever(t, true);
    tekenEiland(t, true);
    ctx.restore();
    // waas over de spiegeling
    var g = ctx.createLinearGradient(0, horizon, 0, horizon + H * .12);
    g.addColorStop(0, css(kleurOp(K.waterBoven, t), .0));
    g.addColorStop(1, css(kleurOp(K.waterBoven, t), .35));
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H * .12);
  };

  // Glinstering van zon of maan op het water
  var tekenGlinstering = function (x, kleur, sterkte, breed) {
    if (sterkte <= 0) return;
    var r = zaad(7);
    for (var i = 0; i < 26; i++) {
      var d = i / 26;
      var y = horizon + 3 + Math.pow(d, 1.5) * (H - horizon) * .9;
      var w = (8 + d * 70) * breed * (.4 + r());
      var a = sterkte * (1 - d * .7) * (rustig ? .7 : .45 + .55 * Math.abs(Math.sin(klok * 1.8 + i * 1.7)));
      ctx.fillStyle = css(kleur, a.toFixed(3));
      ctx.fillRect(x - w / 2 + (r() - .5) * w * .6, y, w, 1.2 + d * 2.2);
    }
  };

  var tekenGolven = function (t) {
    var k = kleurOp(K.golf, t);
    ctx.lineCap = 'round';
    for (var i = 0; i < golven.length; i++) {
      var gv = golven[i];
      var y = horizon + 8 + gv.d * (H - horizon - 10);
      var schaal = .3 + gv.d * 1.4;
      var len = 26 * gv.l * schaal;
      var x = ((gv.x * (W + 200) + (rustig ? 0 : klok * 6 * schaal)) % (W + 200)) - 100;
      ctx.strokeStyle = css(k, (.18 + gv.d * .3) * (.6 + .4 * Math.sin(klok * .8 + gv.f)));
      ctx.lineWidth = .8 + gv.d * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 4, y - 2 * schaal, x + len / 2, y);
      ctx.quadraticCurveTo(x + len * .75, y + 2 * schaal, x + len, y);
      ctx.stroke();
    }
  };

  var tekenEenden = function (t) {
    var donker = glad(.55, 1, t);
    var lijf = css(meng(hex('#8A6B4E'), NACHTTINT, donker * .85));
    var kop = css(meng(hex('#2F6B48'), NACHTTINT, donker * .85));
    var snavel = css(meng(hex('#E8B23A'), NACHTTINT, donker * .85));
    var kraag = css(meng(hex('#FFFFFF'), NACHTTINT, donker * .85));
    var spoor = css(kleurOp(K.golf, t), .45);
    for (var i = 0; i < eenden.length; i++) {
      var e = eenden[i];
      var x = ((e.x + klok * e.v * .1) % 1.15) * (W + 120) - 60;
      var y = horizon + e.d * (H - horizon) + Math.sin(klok * 1.6 + e.f) * 1.2;
      var s = Math.max(.75, Math.min(1.3, W / 1000)) * (e.d + .3);
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      // spoor in het water
      ctx.strokeStyle = spoor; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-34, 6); ctx.moveTo(-10, 3); ctx.lineTo(-30, 0); ctx.stroke();
      ctx.fillStyle = lijf;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-14, -9, -2, -8); ctx.quadraticCurveTo(8, -7, 10, 0); ctx.quadraticCurveTo(0, 3, -14, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -1); ctx.lineTo(-18, -6); ctx.lineTo(-11, -5); ctx.fill();
      ctx.fillStyle = kraag; ctx.fillRect(4, -9.5, 4.5, 1.6);
      ctx.fillStyle = kop;
      ctx.beginPath(); ctx.arc(7, -12.5, 4.6, 0, 6.283); ctx.fill();
      ctx.fillRect(4.6, -12, 4, 4);
      ctx.fillStyle = snavel;
      ctx.beginPath(); ctx.moveTo(11, -13); ctx.quadraticCurveTo(16, -12.5, 16, -11); ctx.lineTo(11, -10.6); ctx.fill();
      if (donker < .9) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8.4, -13.6, .8, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  };

  var tekenRiet = function (t, links) {
    var k = kleurOp(K.riet, t);
    var s = Math.min(1.25, Math.max(.6, H / 800));
    var bx = links ? -10 : W + 10, by = H + 4, kant = links ? 1 : -1;
    var halmen = links ? [[10, 120, .12], [24, 160, .2], [40, 104, .3], [58, 140, .1]] : [[12, 130, -.1], [28, 180, .05], [44, 150, -.2], [60, 200, -.05], [78, 120, -.25], [96, 165, -.12], [112, 110, -.3]];
    ctx.strokeStyle = css(k); ctx.lineCap = 'round';
    for (var i = 0; i < halmen.length; i++) {
      var h = halmen[i];
      var x = bx + kant * h[0] * s, top = by - h[1] * s;
      var buig = (h[2] + (rustig ? 0 : Math.sin(klok * 1.1 + i) * .05)) * h[1] * s;
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x, top + h[1] * s * .4, x + buig, top); ctx.stroke();
      if (i % 2 === 0) {
        // lisdodde
        ctx.save(); ctx.translate(x + buig * .98, top + 14 * s); ctx.rotate(Math.atan2(buig, h[1] * s) * .6);
        ctx.fillStyle = css(meng(k, hex('#5A3A28'), .55));
        ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * s, 12 * s, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    }
    // smalle bladeren
    ctx.fillStyle = css(meng(k, [0, 0, 0], .1));
    for (i = 0; i < 4; i++) {
      var lx = bx + kant * (6 + i * 22) * s, lh = (70 + i * 18) * s;
      var lb = kant * (24 + i * 6) * s + (rustig ? 0 : Math.sin(klok * 1.3 + i * 2) * 4);
      ctx.beginPath(); ctx.moveTo(lx - 3 * s, by); ctx.quadraticCurveTo(lx, by - lh * .6, lx + lb, by - lh); ctx.quadraticCurveTo(lx + 4 * s, by - lh * .55, lx + 4 * s, by); ctx.fill();
    }
  };

  /* ---------- De boot ---------- */
  var tekenBoot = function (t) {
    var s = boot.schaal;
    var wy = horizon + (H - horizon) * .52;
    var deining = rustig ? 0 : Math.sin(klok * 1.25) * 2.4 * s;
    var helling = rustig ? 0 : Math.sin(klok * .9) * .018;
    // overstag: draai van de ene naar de andere kant
    var sx = boot.richting, hel = 0;
    if (boot.wend > 0) {
      var w = 1 - boot.wend; // 0 → 1
      var e = w < .5 ? 2 * w * w : 1 - Math.pow(-2 * w + 2, 2) / 2;
      sx = boot.wendVan * Math.cos(Math.PI * e);
      if (Math.abs(sx) < .06) sx = sx < 0 ? -.06 : .06;
      hel = Math.sin(Math.PI * e) * .06;
    }
    var donker = glad(.5, 1, t) * .72;
    var avond = Math.max(0, 1 - Math.abs(t - .6) / .14) * .28;
    var kl = function (h) { return css(meng(meng(hex(h), AVONDTINT, avond), NACHTTINT, donker)); };

    boot.kaart = { x0: boot.x - 150 * s, x1: boot.x + 150 * s, y0: wy - BOOT_HOOGTE * s, y1: wy + 14 * s };

    // spiegelbeeld van de boot (vaag)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, wy, W, H - wy); ctx.clip();
    ctx.globalAlpha = .16;
    ctx.translate(boot.x, wy + deining);
    ctx.scale(sx * s, -s * .55);
    ctx.translate(-BOOT_MIDDEN, -BOOT_WATERLIJN);
    ctx.fillStyle = kl('#F4EEF2'); ctx.fill(BOOT.grootzeil); ctx.fill(BOOT.fok);
    ctx.fillStyle = kl('#4F1440'); ctx.fill(BOOT.romp);
    ctx.restore();

    ctx.save();
    ctx.translate(boot.x, wy + deining);
    ctx.rotate(helling * sx + hel);
    ctx.scale(sx * s, s);
    ctx.translate(-BOOT_MIDDEN, -BOOT_WATERLIJN);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    ctx.fillStyle = css(kleurOp(K.waterOnder, t), .5); ctx.fill(BOOT.schaduw);
    ctx.strokeStyle = kl('#A6849A'); ctx.lineWidth = 1.4; ctx.stroke(BOOT.want);
    // zeilen
    ctx.fillStyle = kl('#FFFFFF'); ctx.strokeStyle = kl('#4F1440'); ctx.lineWidth = 2.5;
    ctx.fill(BOOT.grootzeil); ctx.stroke(BOOT.grootzeil);
    ctx.strokeStyle = kl('#EED6E3'); ctx.lineWidth = 1.5; ctx.stroke(BOOT.naden);
    ctx.save(); ctx.translate(250, 196); ctx.scale(1.15, 1.15); ctx.fillStyle = kl('#C2286F'); ctx.fill(BOOT.lelie); ctx.restore();
    // zeilnummer altijd leesbaar
    ctx.save(); ctx.translate(273, 316); if (sx < 0) ctx.scale(-1, 1);
    ctx.fillStyle = kl('#4F1440'); ctx.font = '600 34px Montserrat, "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (Math.abs(sx) > .25) ctx.fillText('1798', 0, 0);
    ctx.restore();
    ctx.fillStyle = kl('#FFFFFF'); ctx.strokeStyle = kl('#4F1440'); ctx.lineWidth = 2.5;
    ctx.fill(BOOT.fok); ctx.stroke(BOOT.fok);
    ctx.lineWidth = 5; ctx.stroke(BOOT.gaffel);
    // mast en giek
    ctx.lineWidth = 6; ctx.stroke(BOOT.mast);
    ctx.lineWidth = 5; ctx.stroke(BOOT.giek);
    ctx.fillStyle = kl('#C2286F'); ctx.fill(BOOT.wimpel);
    // romp
    ctx.fillStyle = kl('#4F1440'); ctx.fill(BOOT.romp);
    ctx.strokeStyle = kl('#FFFFFF'); ctx.lineWidth = 3; ctx.globalAlpha = .9; ctx.stroke(BOOT.berghout); ctx.globalAlpha = 1;
    ctx.restore();

    // boeggolfje
    ctx.save();
    ctx.translate(boot.x, wy + deining);
    ctx.scale(sx < 0 ? -1 : 1, 1);
    ctx.strokeStyle = css(kleurOp(K.golf, t), .7); ctx.lineWidth = 1.6 * Math.max(.8, s); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(140 * s, 6 * s); ctx.quadraticCurveTo(160 * s, 2 * s, 176 * s, 9 * s);
    ctx.moveTo(-150 * s, 10 * s); ctx.quadraticCurveTo(-180 * s, 14 * s, -214 * s, 10 * s);
    ctx.stroke();
    ctx.restore();

    // lichten: toplicht in de mast en boordlicht voorop (bakboord rood, stuurboord groen)
    var aan = glad(.6, .72, t);
    if (aan > 0) {
      var punt = function (px, py) {
        var dx = (px - BOOT_MIDDEN) * s * sx, dy = (py - BOOT_WATERLIJN) * s;
        var a = helling * sx + hel;
        return { x: boot.x + dx * Math.cos(a) - dy * Math.sin(a), y: wy + deining + dx * Math.sin(a) + dy * Math.cos(a) };
      };
      var top = punt(352, 122);
      var boord = punt(437, 455);
      var zij = sx >= 0 ? [255, 70, 70] : [70, 230, 120]; // naar rechts varen = je ziet bakboord (rood)
      var lamp = function (p, k, r) {
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, css(k, .9 * aan)); g.addColorStop(.18, css(k, .45 * aan)); g.addColorStop(1, css(k, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
        ctx.fillStyle = css([255, 255, 255], aan); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.6, 3.2 * s), 0, 6.283); ctx.fill();
        // weerkaatsing in het water
        for (var i = 0; i < 9; i++) {
          var y = wy + 16 * s + i * 7 * s;
          var w = (10 - i) * 1.6 * s * (rustig ? 1 : .7 + .3 * Math.sin(klok * 3 + i * 1.4));
          ctx.fillStyle = css(k, (.38 - i * .035) * aan);
          ctx.fillRect(p.x - w / 2, y, w, 1.6 * Math.max(1, s));
        }
      };
      lamp(top, [255, 244, 220], 46 * s + 16);
      if (Math.abs(sx) > .3) lamp(boord, zij, 30 * s + 10);
    }
  };

  var teken = function () {
    var t = tijd;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    tekenLucht(t);
    tekenZon(t);
    tekenWolken(t);
    tekenMaan(t);
    tekenMeeuwen(t);
    tekenOever(t, false);
    tekenEiland(t, false);
    tekenWater(t);
    tekenSpiegeling(t);
    var z = zonPlek(t);
    if (t < .7) tekenGlinstering(z.x, kleurOp(K.zon, t), .55 * (1 - glad(.62, .7, t)), 1);
    var m = maanPlek(t);
    if (m.a > 0) tekenGlinstering(m.x, [245, 240, 255], .4 * m.a, .7);
    tekenGolven(t);
    tekenEenden(t);
    tekenBoot(t);
    tekenRiet(t, false);
    if (W > 700) tekenRiet(t, true);
  };

  /* ---------- Tijd en beweging ---------- */
  var berekenTijd = function () {
    if (vastTijd !== null) return vastTijd;
    if (modus !== 'scroll') return klokStart;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = klem((window.scrollY || 0) / max, 0, 1);
    return lerp(klokStart, 1, glad(0, 1, p) * .15 + p * .85);
  };

  var zetTijd = function () {
    tijd = berekenTijd();
    html.style.setProperty('--nacht', tijd.toFixed(3));
    html.classList.toggle('is-avond', tijd > .55 && tijd <= .72);
    html.classList.toggle('is-nacht', tijd > .72);
  };

  var wend = function () {
    if (boot.wend > 0) return;
    boot.wendVan = boot.richting;
    boot.richting = -boot.richting;
    boot.wend = 1;
    start();
  };

  var stap = function (dt, scrollDelta) {
    var g = grenzen();
    var v = (rustig ? 0 : 10) + Math.abs(scrollDelta) * .35 / Math.max(dt, .016);
    if (boot.wend > 0) {
      boot.wend = Math.max(0, boot.wend - dt / 1.6);
      v *= .2;
    }
    v = Math.min(v, 260);
    boot.x += boot.richting * v * dt;
    if (boot.x > g[1] && boot.richting > 0) { boot.x = g[1]; wend(); }
    if (boot.x < g[0] && boot.richting < 0) { boot.x = g[0]; wend(); }
  };

  var frame = function (nu) {
    if (!draait) return;
    var dt = laatste ? Math.min(.05, (nu - laatste) / 1000) : .016;
    laatste = nu;
    if (!rustig) klok += dt;
    var sy = window.scrollY || 0;
    var delta = sy - vorigeScroll; vorigeScroll = sy;
    zetTijd();
    stap(dt, delta);
    teken();
    if (rustig && boot.wend <= 0) { draait = false; return; }
    requestAnimationFrame(frame);
  };
  var start = function () {
    if (draait || html.classList.contains('eenvoudig') || document.hidden) return;
    draait = true; laatste = 0;
    requestAnimationFrame(frame);
  };
  var stop = function () { draait = false; };

  /* ---------- Starten ---------- */
  klokStart = modus === 'scroll' ? Math.min(tijdVolgensKlok(new Date()), .62) : tijdVolgensKlok(new Date());
  bouw();
  zetTijd();
  maat();

  window.addEventListener('resize', function () { maat(); });
  window.addEventListener('scroll', function () {
    if (rustig) { zetTijd(); teken(); start(); }
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(teken);
  setInterval(function () { if (modus !== 'scroll' && vastTijd === null) klokStart = tijdVolgensKlok(new Date()); }, 60000);

  // Klik op de boot: overstag! (klikken op tekst, knoppen of links tellen niet)
  var opBoot = function (e) {
    var k = boot.kaart;
    if (!k || html.classList.contains('eenvoudig')) return false;
    if (e.target.closest && e.target.closest('a,button,input,select,textarea,label,summary,details,.blad,.kop,.voet,.hoofdstukken,.paginakop__tekst')) return false;
    var r = doek.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    return x > k.x0 && x < k.x1 && y > k.y0 && y < k.y1;
  };
  document.addEventListener('click', function (e) { if (opBoot(e)) wend(); });
  document.addEventListener('mousemove', function (e) { document.body.classList.toggle('boot-hover', opBoot(e)); }, { passive: true });

  // Voor de knop "Eenvoudige weergave"
  window.NVDecor = { start: function () { maat(); start(); }, stop: stop, wend: wend };
  start();
})();
