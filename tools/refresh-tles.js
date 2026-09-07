/* Fetches current TLEs from CelesTrak for the roster and rewrites
 * data/tle-fallback.js so the bundled fallback stays fresh.
 * Usage: npm run refresh-tles  (needs internet access) */
const fs = require('fs');
const path = require('path');

const CATNRS = [25544, 20580, 48274, 49751, 45854, 43252, 27386, 5, 33591];

async function fetchTle(id) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=tle`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for CATNR ${id}`);
  const lines = (await r.text()).trim().split(/\r?\n/);
  if (lines.length < 3 || !lines[1].startsWith('1 ')) throw new Error(`bad TLE for ${id}`);
  return { name: lines[0].trim(), l1: lines[1], l2: lines[2] };
}

(async () => {
  const tles = [];
  for (const id of CATNRS) {
    try {
      const t = await fetchTle(id);
      tles.push(t);
      console.log('✓', t.name);
    } catch (e) {
      console.warn('✗ CATNR', id, '-', e.message);
    }
  }
  if (tles.length < 3) {
    console.error('Too few TLEs fetched — keeping the existing fallback file.');
    process.exit(1);
  }
  const out =
`/* Fallback orbital elements — refreshed ${new Date().toISOString().slice(0, 10)} via tools/refresh-tles.js.
 * Used only when live CelesTrak data is unreachable at runtime. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TLE_FALLBACK = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return ${JSON.stringify(tles, null, 2)};
});
`;
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'tle-fallback.js'), out);
  console.log(`wrote data/tle-fallback.js with ${tles.length} satellites`);
})();
