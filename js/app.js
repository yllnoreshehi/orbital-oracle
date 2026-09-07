/* app.js — wiring: form → geocode → timezone → charts → oracle → DOM. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SIGNS = Chart_.SIGNS, GLYPHS = Chart_.SIGN_GLYPHS;

  /* ---------- built-in gazetteer (offline fallback for geocoding) ---------- */
  const CITIES = {
    'zurich': [47.3769, 8.5417], 'zürich': [47.3769, 8.5417],
    'geneva': [46.2044, 6.1432], 'genève': [46.2044, 6.1432], 'genf': [46.2044, 6.1432],
    'basel': [47.5596, 7.5886], 'bern': [46.9480, 7.4474],
    'fribourg': [46.8065, 7.1620], 'freiburg': [46.8065, 7.1620],
    'lausanne': [46.5197, 6.6323], 'lugano': [46.0037, 8.9511],
    'luzern': [47.0502, 8.3093], 'lucerne': [47.0502, 8.3093],
    'st. gallen': [47.4245, 9.3767], 'winterthur': [47.5000, 8.7241],
    'london': [51.5074, -0.1278], 'paris': [48.8566, 2.3522],
    'berlin': [52.5200, 13.4050], 'munich': [48.1351, 11.5820], 'münchen': [48.1351, 11.5820],
    'vienna': [48.2082, 16.3738], 'wien': [48.2082, 16.3738],
    'rome': [41.9028, 12.4964], 'milan': [45.4642, 9.1900], 'madrid': [40.4168, -3.7038],
    'amsterdam': [52.3676, 4.9041], 'brussels': [50.8503, 4.3517],
    'copenhagen': [55.6761, 12.5683], 'stockholm': [59.3293, 18.0686],
    'oslo': [59.9139, 10.7522], 'helsinki': [60.1699, 24.9384],
    'lisbon': [38.7223, -9.1393], 'athens': [37.9838, 23.7275],
    'prague': [50.0755, 14.4378], 'warsaw': [52.2297, 21.0122],
    'budapest': [47.4979, 19.0402], 'dublin': [53.3498, -6.2603],
    'istanbul': [41.0082, 28.9784], 'moscow': [55.7558, 37.6173],
    'new york': [40.7128, -74.0060], 'los angeles': [34.0522, -118.2437],
    'chicago': [41.8781, -87.6298], 'san francisco': [37.7749, -122.4194],
    'toronto': [43.6532, -79.3832], 'vancouver': [49.2827, -123.1207],
    'mexico city': [19.4326, -99.1332], 'sao paulo': [-23.5505, -46.6333],
    'buenos aires': [-34.6037, -58.3816], 'lima': [-12.0464, -77.0428],
    'cairo': [30.0444, 31.2357], 'lagos': [6.5244, 3.3792],
    'nairobi': [-1.2921, 36.8219], 'johannesburg': [-26.2041, 28.0473],
    'dubai': [25.2048, 55.2708], 'mumbai': [19.0760, 72.8777],
    'delhi': [28.7041, 77.1025], 'bangkok': [13.7563, 100.5018],
    'singapore': [1.3521, 103.8198], 'hong kong': [22.3193, 114.1694],
    'shanghai': [31.2304, 121.4737], 'beijing': [39.9042, 116.4074],
    'tokyo': [35.6762, 139.6503], 'seoul': [37.5665, 126.9780],
    'sydney': [-33.8688, 151.2093], 'melbourne': [-37.8136, 144.9631],
    'auckland': [-36.8485, 174.7633], 'pristina': [42.6629, 21.1655],
    'tirana': [41.3275, 19.8187], 'skopje': [41.9973, 21.4280],
  };

  async function geocode(place) {
    // 1) "lat, lon" typed directly
    const m = place.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) return { lat: +m[1], lon: +m[2], label: 'coordinates' };
    // 2) Nominatim (OpenStreetMap)
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
        encodeURIComponent(place), { headers: { 'Accept': 'application/json' } });
      if (r.ok) {
        const js = await r.json();
        if (js.length) return { lat: +js[0].lat, lon: +js[0].lon, label: js[0].display_name.split(',').slice(0, 2).join(',') };
      }
    } catch (e) { /* offline — try gazetteer */ }
    // 3) built-in list
    const key = place.toLowerCase().split(',')[0].trim();
    if (CITIES[key]) return { lat: CITIES[key][0], lon: CITIES[key][1], label: place + ' (built-in atlas)' };
    return null;
  }

  /* ---------- local birth time + IANA zone → UTC Date ---------- */
  function tzOffsetMin(ts, zone) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p = Object.fromEntries(dtf.formatToParts(new Date(ts)).map(x => [x.type, x.value]));
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return (asUTC - ts) / 60000;
  }
  function zonedToUtc(dateStr, timeStr, zone) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const wall = Date.UTC(y, mo - 1, d, hh, mm);
    let guess = wall;
    for (let i = 0; i < 3; i++) {
      const next = wall - tzOffsetMin(guess, zone) * 60000;
      if (next === guess) break;
      guess = next;
    }
    return new Date(guess);
  }

  /* ---------- chart wheel ---------- */
  function drawWheel(chart, sats) {
    const cx = 300, cy = 300;
    const asc = chart.asc;
    const pt = (lonDeg, r) => {
      const th = (180 + (lonDeg - asc)) * Math.PI / 180;
      return [cx + r * Math.cos(th), cy - r * Math.sin(th)];
    };
    let s = '<svg viewBox="0 0 600 600" role="img" aria-label="Natal chart wheel">';
    s += '<circle cx="300" cy="300" r="252" fill="none" stroke="#d4b46a44" stroke-width="1"/>';
    s += '<circle cx="300" cy="300" r="216" fill="none" stroke="#d4b46a44" stroke-width="1"/>';
    s += '<circle cx="300" cy="300" r="120" fill="none" stroke="#d4b46a22" stroke-width="1"/>';
    // sign boundaries + glyphs
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, 216), [x2, y2] = pt(i * 30, 252);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4b46a55" stroke-width="1"/>`;
      const [gx, gy] = pt(i * 30 + 15, 234);
      s += `<text x="${gx}" y="${gy}" fill="#d4b46a" font-size="19" text-anchor="middle" dominant-baseline="central">${GLYPHS[i]}︎</text>`;
    }
    // degree ticks
    for (let d = 0; d < 360; d += 10) {
      const [x1, y1] = pt(d, 216), [x2, y2] = pt(d, d % 30 === 0 ? 216 : 210);
      if (d % 30 !== 0) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4b46a33" stroke-width="1"/>`;
    }
    // house cusps
    for (let h = 1; h <= 12; h++) {
      const strong = h === 1 || h === 4 || h === 7 || h === 10;
      const [x1, y1] = pt(chart.cusps[h], 120), [x2, y2] = pt(chart.cusps[h], 216);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strong ? '#d4b46a99' : '#d4b46a44'}" stroke-width="${strong ? 1.6 : 1}"/>`;
      const mid = chart.cusps[h] + Chart_.norm360(chart.cusps[h === 12 ? 1 : h + 1] - chart.cusps[h]) / 2;
      const [nx, ny] = pt(mid, 134);
      s += `<text x="${nx}" y="${ny}" fill="#6a6478" font-size="11" text-anchor="middle" dominant-baseline="central">${h}</text>`;
    }
    // ASC / MC labels
    const [ax, ay] = pt(chart.asc, 264);
    const [mx, my] = pt(chart.mc, 264);
    s += `<text x="${ax}" y="${ay}" fill="#e8e4d8" font-size="12" text-anchor="middle" dominant-baseline="central" font-family="monospace">ASC</text>`;
    s += `<text x="${mx}" y="${my}" fill="#e8e4d8" font-size="12" text-anchor="middle" dominant-baseline="central" font-family="monospace">MC</text>`;
    // planets (spread near-conjunct glyphs onto two radii)
    const sorted = chart.planets.slice().sort((a, b) => a.lon - b.lon);
    let lastLon = -99, flip = false;
    for (const p of sorted) {
      flip = (Chart_.norm360(p.lon - lastLon) < 9) ? !flip : false;
      lastLon = p.lon;
      const r = flip ? 158 : 186;
      const [x, y] = pt(p.lon, r);
      s += `<g><title>${p.name} — ${p.signName} ${p.degree}, house ${p.house}${p.retrograde ? ' (retrograde)' : ''}</title>` +
        `<text x="${x}" y="${y}" fill="#e8e4d8" font-size="21" text-anchor="middle" dominant-baseline="central">${p.glyph}︎</text>` +
        (p.retrograde ? `<text x="${x + 11}" y="${y + 9}" fill="#d88" font-size="9" text-anchor="middle">R</text>` : '') + '</g>';
      const [tx, ty] = pt(p.lon, 208);
      s += `<circle cx="${tx}" cy="${ty}" r="1.8" fill="#e8e4d8"/>`;
    }
    // satellites — the outer heresy ring
    let lastSatLon = -99; flip = false;
    const satsSorted = sats.slice().sort((a, b) => a.lon - b.lon);
    for (const sat of satsSorted) {
      flip = (Chart_.norm360(sat.lon - lastSatLon) < 10) ? !flip : false;
      lastSatLon = sat.lon;
      const [x, y] = pt(sat.lon, flip ? 292 : 268);
      s += `<g><title>${sat.name} — ${SIGNS[sat.sign]}, natal house ${sat.house}</title>` +
        `<text x="${x}" y="${y}" font-size="13" text-anchor="middle" dominant-baseline="central">🛰</text></g>`;
    }
    s += '</svg>';
    $('wheel').innerHTML = s;
  }

  /* ---------- tables ---------- */
  function fillTables(chart, sats, satMeta) {
    const pb = $('tbl-planets').querySelector('tbody');
    pb.innerHTML = chart.planets.map(p =>
      `<tr><td class="glyph">${p.glyph}︎</td><td>${p.name}</td>` +
      `<td>${p.signGlyph}︎ ${p.signName}</td><td>${p.degree}</td><td>${p.house}</td>` +
      `<td>${p.retrograde ? '<span class="rx">retrograde</span>' : ''}</td></tr>`).join('');
    const sb = $('tbl-sats').querySelector('tbody');
    sb.innerHTML = sats.map(sat =>
      `<tr><td class="glyph">🛰</td><td>${sat.name}</td>` +
      `<td>${GLYPHS[sat.sign]}︎ ${SIGNS[sat.sign]}</td><td>${sat.house} — ${Oracle_.HOUSE_THEMES[sat.house]}</td>` +
      `<td>${sat.aboveHorizon ? '↑ above your horizon' : 'below horizon'}</td></tr>`).join('');
    $('data-note').textContent = satMeta.source === 'live'
      ? 'Satellite orbits: live element sets from CelesTrak.'
      : 'Satellite orbits: bundled element sets (offline mode) — positions are approximate until the app can reach CelesTrak.';
  }

  /* ---------- main flow ---------- */
  async function consult(ev) {
    ev.preventDefault();
    const btn = $('btn-consult'), status = $('form-status');
    btn.disabled = true;
    status.classList.remove('err');

    try {
      status.textContent = 'Locating your beginnings…';
      let lat = parseFloat($('in-lat').value), lon = parseFloat($('in-lon').value);
      let placeLabel = $('in-place').value.trim();
      if (isNaN(lat) || isNaN(lon)) {
        const g = await geocode(placeLabel);
        if (!g) {
          status.textContent = 'Could not find that place — try "City, Country", or enter coordinates manually below.';
          status.classList.add('err');
          btn.disabled = false;
          return;
        }
        lat = g.lat; lon = g.lon;
      }

      status.textContent = 'Consulting the ephemeris…';
      const zone = (typeof tzlookup === 'function') ? tzlookup(lat, lon) : 'UTC';
      const utc = zonedToUtc($('in-date').value, $('in-time').value, zone);
      const natal = Chart_.computeChart(utc, lat, lon);
      const now = new Date();
      const transits = Chart_.computeChart(now, lat, lon);

      status.textContent = 'Polling the satellites…';
      const satMeta = await Sats_.loadTLEs();
      const sats = Sats_.placeSatellites(satMeta.tles, now, natal, Chart_.houseOf);

      const msg = Oracle_.generate({
        natal, transits, satellites: sats,
        dateKey: now.toISOString().slice(0, 10),
        norm180: Chart_.norm180,
      });

      // render
      $('msg-date').textContent = now.toLocaleDateString(undefined,
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      $('msg-greeting').textContent = msg.greeting;
      $('msg-tagline').textContent = msg.tagline;
      $('msg-body').innerHTML = msg.paragraphs.map((p, i) =>
        `<p${i === msg.paragraphs.length - 1 ? ' class="sat-para"' : ''}>${p}</p>`).join('');
      drawWheel(natal, sats);
      fillTables(natal, sats, satMeta);

      $('reading').classList.remove('hidden');
      $('form-card').classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      status.textContent = '';

      try {
        localStorage.setItem('starscope-birth', JSON.stringify({
          date: $('in-date').value, time: $('in-time').value,
          place: placeLabel, lat, lon,
        }));
      } catch (e) {}
    } catch (err) {
      console.error(err);
      status.textContent = 'The heavens are unresponsive: ' + err.message;
      status.classList.add('err');
    }
    btn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('birth-form').addEventListener('submit', consult);
    $('btn-share').addEventListener('click', () => Share_.fromReading());
    $('btn-again').addEventListener('click', () => {
      $('reading').classList.add('hidden');
      $('form-card').classList.remove('hidden');
    });
    try {
      const saved = JSON.parse(localStorage.getItem('starscope-birth'));
      if (saved) {
        $('in-date').value = saved.date; $('in-time').value = saved.time;
        $('in-place').value = saved.place;
      }
    } catch (e) {}
  });
})();
