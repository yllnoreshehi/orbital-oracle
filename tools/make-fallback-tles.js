/* Generates data/tle-fallback.js — approximate orbital elements used only when
 * live Celestrak data is unreachable. Orbits (inclination, altitude/mean motion)
 * are realistic per satellite; the along-track position at any given date is
 * approximate. The app labels these as cached data. Refresh anytime with:
 *   npm run refresh-tles   (fetches live TLEs from Celestrak into the same file)
 */
const fs = require('fs');
const path = require('path');

function tleChecksum(line) {
  let sum = 0;
  for (const ch of line) {
    if (ch >= '0' && ch <= '9') sum += +ch;
    else if (ch === '-') sum += 1;
  }
  return sum % 10;
}

function pad(v, w) { return String(v).padStart(w, ' '); }
function padz(v, w) { return String(v).padStart(w, '0'); }

// Epoch: 2025-01-01 00:00 UTC → year 25, day 001.00000000
function makeTLE({ name, catnr, incl, raan, ecc, argp, ma, mm }) {
  const l1base = `1 ${padz(catnr, 5)}U 00000A   25001.00000000  .00000000  00000-0  00000-0 0  999`;
  const l1 = l1base + tleChecksum(l1base);
  const eccStr = padz(Math.round(ecc * 1e7), 7);
  const l2base =
    `2 ${padz(catnr, 5)} ` +
    `${pad(incl.toFixed(4), 8)} ${pad(raan.toFixed(4), 8)} ${eccStr} ` +
    `${pad(argp.toFixed(4), 8)} ${pad(ma.toFixed(4), 8)} ${pad(mm.toFixed(8), 11)}    1`;
  const l2 = l2base + tleChecksum(l2base);
  return { name, l1, l2 };
}

const sats = [
  { name: 'ISS (ZARYA)', catnr: 25544, incl: 51.6400, raan: 210.0, ecc: 0.0006, argp: 90.0, ma: 30.0, mm: 15.50000000 },
  { name: 'HST', catnr: 20580, incl: 28.4700, raan: 120.0, ecc: 0.0002, argp: 60.0, ma: 300.0, mm: 15.09000000 },
  { name: 'CSS (TIANHE)', catnr: 48274, incl: 41.4700, raan: 300.0, ecc: 0.0005, argp: 180.0, ma: 200.0, mm: 15.60000000 },
  { name: 'STARLINK-3042', catnr: 49751, incl: 53.0500, raan: 40.0, ecc: 0.0001, argp: 90.0, ma: 120.0, mm: 15.06000000 },
  { name: 'NAVSTAR 81 (USA 319)', catnr: 45854, incl: 55.0000, raan: 80.0, ecc: 0.0020, argp: 200.0, ma: 10.0, mm: 2.00570000 },
  { name: 'IRIDIUM 140', catnr: 43252, incl: 86.4000, raan: 150.0, ecc: 0.0002, argp: 90.0, ma: 250.0, mm: 14.34000000 },
  { name: 'ENVISAT', catnr: 27386, incl: 98.2400, raan: 260.0, ecc: 0.0001, argp: 90.0, ma: 60.0, mm: 14.38000000 },
  { name: 'VANGUARD 1', catnr: 5, incl: 34.2500, raan: 190.0, ecc: 0.1846, argp: 50.0, ma: 310.0, mm: 10.85000000 },
  { name: 'NOAA 19', catnr: 33591, incl: 99.0400, raan: 20.0, ecc: 0.0014, argp: 100.0, ma: 260.0, mm: 14.13000000 },
];

const tles = sats.map(makeTLE);
const out =
`/* Fallback orbital elements (epoch 2025-01-01, approximate along-track position).
 * Used only when live Celestrak data is unreachable. See tools/make-fallback-tles.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TLE_FALLBACK = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return ${JSON.stringify(tles, null, 2)};
});
`;
fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'data', 'tle-fallback.js'), out);
console.log('wrote data/tle-fallback.js with', tles.length, 'satellites');
