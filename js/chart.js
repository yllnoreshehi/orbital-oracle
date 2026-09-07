/* chart.js — natal chart computation on top of astronomy-engine.
 * Tropical zodiac, Placidus houses (whole-sign fallback near polar circles).
 * Works in browser (window.Chart_) and node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('astronomy-engine'));
  } else {
    root.Chart_ = factory(root.Astronomy);
  }
})(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';

  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const PLANETS = [
    { body: 'Sun', glyph: '☉' }, { body: 'Moon', glyph: '☽' },
    { body: 'Mercury', glyph: '☿' }, { body: 'Venus', glyph: '♀' },
    { body: 'Mars', glyph: '♂' }, { body: 'Jupiter', glyph: '♃' },
    { body: 'Saturn', glyph: '♄' }, { body: 'Uranus', glyph: '♅' },
    { body: 'Neptune', glyph: '♆' }, { body: 'Pluto', glyph: '♇' },
  ];

  const DEG = Math.PI / 180;
  const norm360 = (x) => ((x % 360) + 360) % 360;
  const norm180 = (x) => { let y = norm360(x); return y > 180 ? y - 360 : y; };

  function trueObliquity(time) {
    // Mean obliquity (IAU 2006-ish) + principal nutation term. Good to ~1".
    const T = (time.tt) / 36525.0; // tt is days since J2000 in astronomy-engine
    const e0 = 23.43929111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
    const omega = norm360(125.04452 - 1934.136261 * T);
    const dEps = (9.20 * Math.cos(omega * DEG)) / 3600;
    return e0 + dEps;
  }

  // Ecliptic longitude (tropical, of date) of a body at an AstroTime.
  function eclipticLongitude(body, time) {
    if (body === 'Moon') {
      return norm360(A.EclipticGeoMoon(time).lon);
    }
    const vec = A.GeoVector(A.Body[body], time, true);
    return norm360(A.Ecliptic(vec).elon);
  }

  function isRetrograde(body, time) {
    if (body === 'Sun' || body === 'Moon') return false;
    const t2 = time.AddDays(0.5);
    const d = norm180(eclipticLongitude(body, t2) - eclipticLongitude(body, time));
    return d < 0;
  }

  // RA (deg) and declination (deg) of the ecliptic point at longitude lam, given obliquity eps.
  function raDecOfEclipticPoint(lam, eps) {
    const sl = Math.sin(lam * DEG), cl = Math.cos(lam * DEG);
    const se = Math.sin(eps * DEG), ce = Math.cos(eps * DEG);
    const ra = norm360(Math.atan2(sl * ce, cl) / DEG);
    const dec = Math.asin(se * sl) / DEG;
    return { ra, dec };
  }

  function ascendant(ramc, eps, lat) {
    const num = Math.cos(ramc * DEG);
    const den = -(Math.sin(ramc * DEG) * Math.cos(eps * DEG) +
      Math.tan(lat * DEG) * Math.sin(eps * DEG));
    let asc = norm360(Math.atan2(num, den) / DEG);
    return asc;
  }

  function midheaven(ramc, eps) {
    let mc = norm360(Math.atan2(Math.sin(ramc * DEG), Math.cos(ramc * DEG) * Math.cos(eps * DEG)) / DEG);
    return mc;
  }

  /* Placidus: cusp k is the ecliptic point whose hour angle equals a fixed
   * fraction of its own semi-arc. Solved by bracketing + bisection on g(lam). */
  function placidusCusp(ramc, eps, lat, which) {
    // which: 11, 12, 2, 3
    const cfg = {
      11: { frac: 1 / 3, diurnal: true },
      12: { frac: 2 / 3, diurnal: true },
      2: { frac: 1 / 3, diurnal: false },
      3: { frac: 2 / 3, diurnal: false },
    }[which];

    const g = (lam) => {
      const { ra, dec } = raDecOfEclipticPoint(lam, eps);
      const x = Math.tan(lat * DEG) * Math.tan(dec * DEG);
      if (Math.abs(x) >= 1) return null; // circumpolar — Placidus undefined
      const AD = Math.asin(x) / DEG;
      const H = norm180(ramc - ra); // hour angle; negative = east of meridian
      const target = cfg.diurnal
        ? -cfg.frac * (90 + AD)              // between MC and ASC
        : -180 + (1 - cfg.frac) * (90 - AD); // between IC and ASC side, below horizon
      return norm180(H - target);
    };

    // bracket a sign change scanning the plausible quadrant
    const startDeg = { 11: 0, 12: 0, 2: 0, 3: 0 };
    let prevLam = null, prevVal = null;
    for (let i = 0; i <= 720; i++) {
      const lam = norm360(startDeg[which] + i * 0.5);
      const v = g(lam);
      if (v === null) { prevLam = null; prevVal = null; continue; }
      if (prevVal !== null && prevVal * v <= 0 && Math.abs(prevVal - v) < 90) {
        // bisect
        let a = prevLam, b = lam, va = prevVal;
        for (let k = 0; k < 60; k++) {
          const m = a + norm180(b - a) / 2;
          const vm = g(norm360(m));
          if (vm === null) break;
          if (va * vm <= 0) { b = m; } else { a = m; va = vm; }
        }
        const sol = norm360(a + norm180(b - a) / 2);
        // pick the solution in the correct quadrant relative to ASC/MC ordering
        return sol;
      }
      prevLam = lam; prevVal = v;
    }
    return null;
  }

  function houses(ramc, eps, lat) {
    const asc = ascendant(ramc, eps, lat);
    const mc = midheaven(ramc, eps);
    let cusps = new Array(13).fill(null);
    cusps[1] = asc; cusps[10] = mc;
    cusps[4] = norm360(mc + 180); cusps[7] = norm360(asc + 180);
    let system = 'Placidus';
    const solved = {};
    for (const k of [11, 12, 2, 3]) {
      const c = placidusCusp(ramc, eps, lat, k);
      if (c === null) { system = 'Whole Sign'; break; }
      solved[k] = c;
    }
    if (system === 'Placidus') {
      // choose the solutions consistent with zodiacal order MC<11<12<ASC<2<3<IC
      const pick = (raw, lo, hi) => {
        // raw and its antipode both satisfy g≈0 in some cases; choose the one in (lo, hi) going forward
        const cand = [raw, norm360(raw + 180)];
        for (const c of cand) {
          if (norm360(c - lo) < norm360(hi - lo)) return c;
        }
        return raw;
      };
      cusps[11] = pick(solved[11], mc, asc);
      cusps[12] = pick(solved[12], cusps[11], asc);
      cusps[2] = pick(solved[2], asc, cusps[4]);
      cusps[3] = pick(solved[3], cusps[2], cusps[4]);
      cusps[5] = norm360(cusps[11] + 180);
      cusps[6] = norm360(cusps[12] + 180);
      cusps[8] = norm360(cusps[2] + 180);
      cusps[9] = norm360(cusps[3] + 180);
    } else {
      // whole-sign: houses = signs starting at ASC's sign
      const start = Math.floor(asc / 30) * 30;
      for (let i = 1; i <= 12; i++) cusps[i] = norm360(start + (i - 1) * 30);
    }
    return { cusps, asc, mc, system };
  }

  function houseOf(lon, cusps) {
    for (let h = 1; h <= 12; h++) {
      const a = cusps[h], b = cusps[h === 12 ? 1 : h + 1];
      if (norm360(lon - a) < norm360(b - a)) return h;
    }
    return 1;
  }

  function signOf(lon) { return Math.floor(norm360(lon) / 30); }

  function fmtDegree(lon) {
    const inSign = norm360(lon) % 30;
    const d = Math.floor(inSign);
    const m = Math.round((inSign - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′`;
  }

  /* Main entry.
   * utcDate: JS Date in UTC for the birth moment; lat, lon in degrees (east+). */
  function computeChart(utcDate, lat, lon) {
    const time = A.MakeTime(utcDate);
    const eps = trueObliquity(time);
    const gast = A.SiderealTime(time); // hours
    const ramc = norm360(gast * 15 + lon);
    const { cusps, asc, mc, system } = houses(ramc, eps, lat);

    const placements = PLANETS.map((p) => {
      const elon = eclipticLongitude(p.body, time);
      return {
        name: p.body, glyph: p.glyph, lon: elon,
        sign: signOf(elon), signName: SIGNS[signOf(elon)],
        signGlyph: SIGN_GLYPHS[signOf(elon)],
        degree: fmtDegree(elon),
        house: houseOf(elon, cusps),
        retrograde: isRetrograde(p.body, time),
      };
    });

    return {
      time, eps, ramc, lat, lon,
      asc, mc, cusps, houseSystem: system,
      ascSign: signOf(asc), ascSignName: SIGNS[signOf(asc)],
      mcSign: signOf(mc),
      planets: placements,
      sunSign: placements[0].sign, sunSignName: placements[0].signName,
      moonSign: placements[1].sign, moonSignName: placements[1].signName,
    };
  }

  return { computeChart, houseOf, signOf, fmtDegree, SIGNS, SIGN_GLYPHS, PLANETS, norm360, norm180 };
});
