/* satellites.js — the modern additions to your birth chart.
 * Fetches live TLEs from Celestrak (with bundled fallback), propagates with
 * satellite.js, and places each satellite on the tropical zodiac + natal houses.
 * Browser global: Sats_ ; node: module.exports. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('satellite.js'), require('../data/tle-fallback.js'));
  } else {
    root.Sats_ = factory(root.satellite, root.TLE_FALLBACK);
  }
})(typeof self !== 'undefined' ? self : this, function (satellite, TLE_FALLBACK) {
  'use strict';

  const DEG = Math.PI / 180;
  const norm360 = (x) => ((x % 360) + 360) % 360;

  /* The cast. Personality notes feed the horoscope generator. */
  const ROSTER = [
    { match: /^STARLINK/, key: 'starlink', label: 'Starlink',
      persona: 'one of several thousand identical omens', vibe: 'crowd' },
    { match: /^ISS/, key: 'iss', label: 'the ISS',
      persona: 'the only celestial body with a HR department', vibe: 'busy' },
    { match: /^HST$|HUBBLE/, key: 'hubble', label: 'Hubble',
      persona: 'elderly, far-sighted, has seen things', vibe: 'wise' },
    { match: /^CSS|TIANHE|TIANGONG/, key: 'tiangong', label: 'Tiangong',
      persona: 'the ambitious newcomer', vibe: 'rising' },
    { match: /NAVSTAR|GPS/, key: 'gps', label: 'a GPS satellite',
      persona: 'knows exactly where you are, spiritually and otherwise', vibe: 'precise' },
    { match: /IRIDIUM/, key: 'iridium', label: 'an Iridium satellite',
      persona: 'used to flare dramatically, now keeps it professional', vibe: 'faded-glam' },
    { match: /ENVISAT/, key: 'envisat', label: 'Envisat',
      persona: 'has not answered a single call since 2012', vibe: 'ghost' },
    { match: /VANGUARD 1/, key: 'vanguard', label: 'Vanguard 1',
      persona: 'in orbit since 1958, silent since 1964, still influencing your week', vibe: 'ancient' },
    { match: /NOAA/, key: 'noaa', label: 'a NOAA weather satellite',
      persona: 'forecasts everything except its own obsolescence', vibe: 'weather' },
  ];

  const CATNRS = [25544, 20580, 48274, 49751, 45854, 43252, 27386, 5, 33591];

  function parseTleEpoch(l1) {
    // cols 19-32: YYDDD.DDDDDDDD
    const yy = parseInt(l1.substring(18, 20), 10);
    const doy = parseFloat(l1.substring(20, 32));
    const year = yy < 57 ? 2000 + yy : 1900 + yy;
    const d = new Date(Date.UTC(year, 0, 1));
    d.setUTCDate(d.getUTCDate() + Math.floor(doy) - 1);
    return d;
  }

  function personaFor(name) {
    for (const r of ROSTER) if (r.match.test(name)) return r;
    return { key: 'unknown', label: name, persona: 'unidentified but definitely watching', vibe: 'mystery' };
  }

  /* TEME position (km) → geocentric tropical ecliptic longitude. */
  function eclipticLonOf(posEci, epsDeg) {
    const e = epsDeg * DEG;
    const x = posEci.x;
    const y = posEci.y * Math.cos(e) + posEci.z * Math.sin(e);
    return norm360(Math.atan2(y, x) / DEG);
  }

  function positionSatellite(tle, when, epsDeg, observer) {
    const satrec = satellite.twoline2satrec(tle.l1, tle.l2);
    const pv = satellite.propagate(satrec, when);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    const lon = eclipticLonOf(pv.position, epsDeg);
    const out = {
      name: tle.name,
      ...personaFor(tle.name),
      lon,
      epoch: parseTleEpoch(tle.l1),
    };
    if (observer) {
      try {
        const gmst = satellite.gstime(when);
        const ecf = satellite.eciToEcf(pv.position, gmst);
        const look = satellite.ecfToLookAngles({
          latitude: observer.lat * DEG,
          longitude: observer.lon * DEG,
          height: 0,
        }, ecf);
        out.elevation = look.elevation / DEG; // deg above observer's horizon
        out.aboveHorizon = out.elevation > 0;
      } catch (e) { /* flavor only */ }
    }
    return out;
  }

  /* Fetch live TLEs for the roster from Celestrak. Uses localStorage cache
   * (12h) when available. Falls back to bundled elements. */
  async function loadTLEs() {
    const CACHE_KEY = 'starscope-tles-v1';
    const CACHE_MS = 12 * 3600 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.at < CACHE_MS && cached.tles.length) {
        return { tles: cached.tles, source: 'live', fetchedAt: new Date(cached.at) };
      }
    } catch (e) { /* no storage — fine */ }

    if (typeof fetch === 'function') {
      try {
        const results = await Promise.allSettled(CATNRS.map(async (id) => {
          const r = await fetch(
            `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=tle`,
            { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
          if (!r.ok) throw new Error('http ' + r.status);
          const text = await r.text();
          const lines = text.trim().split(/\r?\n/);
          if (lines.length < 3 || !lines[1].startsWith('1 ')) throw new Error('bad tle');
          return { name: lines[0].trim(), l1: lines[1], l2: lines[2] };
        }));
        const tles = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (tles.length >= 3) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), tles })); } catch (e) {}
          return { tles, source: 'live', fetchedAt: new Date() };
        }
      } catch (e) { /* fall through */ }
    }
    return { tles: TLE_FALLBACK, source: 'fallback', fetchedAt: null };
  }

  /* Main entry: place the roster on the chart for `when` (Date).
   * chart: output of Chart_.computeChart (for eps + natal cusps). */
  function placeSatellites(tles, when, chart, houseOf) {
    const placed = [];
    for (const tle of tles) {
      const p = positionSatellite(tle, when, chart.eps, { lat: chart.lat, lon: chart.lon });
      if (!p) continue;
      p.sign = Math.floor(p.lon / 30);
      p.house = houseOf(p.lon, chart.cusps);
      placed.push(p);
    }
    return placed;
  }

  return { loadTLEs, placeSatellites, positionSatellite, ROSTER, CATNRS };
});
