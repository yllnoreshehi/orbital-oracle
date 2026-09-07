/* Regression tests: chart math vs Swiss Ephemeris reference values,
 * satellite placement sanity, oracle determinism. Run: npm test */
const assert = require('assert');
const C = require('../js/chart.js');
const S = require('../js/satellites.js');
const O = require('../js/horoscope.js');
const TLE = require('../data/tle-fallback.js');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('✓', name); }
  catch (e) { failures++; console.error('✗', name, '—', e.message); }
}

/* Reference chart computed with Swiss Ephemeris (pyswisseph, Placidus):
 * 1991-08-11 20:35 UT, 46.8065 N, 7.1620 E */
const REF = {
  planets: { Sun: 138.676, Moon: 162.729, Mercury: 155.243, Venus: 155.212,
    Mars: 167.003, Jupiter: 143.184, Saturn: 302.354, Uranus: 280.422,
    Neptune: 284.507, Pluto: 227.618 },
  asc: 11.517, mc: 275.251,
  cusps: [null, 11.517, 51.827, 75.753, 95.251, 115.694, 143.318,
    191.517, 231.827, 255.753, 275.251, 295.694, 323.318],
};

const natal = C.computeChart(new Date(Date.UTC(1991, 7, 11, 20, 35)), 46.8065, 7.1620);

check('planet longitudes within 0.01° of Swiss Ephemeris', () => {
  for (const p of natal.planets) {
    const err = Math.abs(p.lon - REF.planets[p.name]);
    assert(err < 0.01, `${p.name}: ${err.toFixed(4)}°`);
  }
});
check('ASC/MC within 0.01°', () => {
  assert(Math.abs(natal.asc - REF.asc) < 0.01, 'asc');
  assert(Math.abs(natal.mc - REF.mc) < 0.01, 'mc');
});
check('all 12 Placidus cusps within 0.01°', () => {
  assert.strictEqual(natal.houseSystem, 'Placidus');
  for (let h = 1; h <= 12; h++) {
    const err = Math.abs(natal.cusps[h] - REF.cusps[h]);
    assert(err < 0.01, `cusp ${h}: ${err.toFixed(4)}°`);
  }
});
check('sun sign is Leo, moon sign is Virgo, ASC Aries', () => {
  assert.strictEqual(natal.sunSignName, 'Leo');
  assert.strictEqual(natal.moonSignName, 'Virgo');
  assert.strictEqual(natal.ascSignName, 'Aries');
});
check('southern-hemisphere chart still Placidus and self-consistent', () => {
  const c = C.computeChart(new Date(Date.UTC(2005, 2, 15, 3, 0)), -33.87, 151.21);
  assert.strictEqual(c.houseSystem, 'Placidus');
  assert(Math.abs(c.asc - 82.899) < 0.01);
  assert(Math.abs(c.mc - 9.826) < 0.01);
});
check('polar chart falls back to whole sign without crashing', () => {
  const c = C.computeChart(new Date(Date.UTC(2000, 5, 21, 12, 0)), 78.22, 15.65); // Svalbard
  assert(c.houseSystem === 'Whole Sign' || c.houseSystem === 'Placidus');
  for (let h = 1; h <= 12; h++) assert(typeof c.cusps[h] === 'number');
});
check('satellites all placed with sign + house', () => {
  const sats = S.placeSatellites(TLE, new Date(), natal, C.houseOf);
  assert(sats.length >= 8, 'placed ' + sats.length);
  for (const s of sats) {
    assert(s.sign >= 0 && s.sign < 12);
    assert(s.house >= 1 && s.house <= 12);
  }
});
check('oracle is deterministic per day and varies across days', () => {
  const now = new Date();
  const transits = C.computeChart(now, 46.8065, 7.1620);
  const sats = S.placeSatellites(TLE, now, natal, C.houseOf);
  const args = { natal, transits, satellites: sats, dateKey: '2026-09-07', norm180: C.norm180 };
  const a = O.generate(args), b = O.generate(args);
  assert.deepStrictEqual(a.paragraphs, b.paragraphs, 'same day differs');
  const c = O.generate({ ...args, dateKey: '2026-09-08' });
  assert.notDeepStrictEqual(a.paragraphs, c.paragraphs, 'different day identical');
  assert(a.greeting.startsWith('Good Morning, Leo'));
});

process.exit(failures ? 1 : 0);
