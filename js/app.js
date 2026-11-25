/* app.js — wiring: form → place autocomplete → timezone → charts → oracle → DOM. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SIGNS = Chart_.SIGNS, GLYPHS = Chart_.SIGN_GLYPHS;
  const esc = (s) => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  function gazetteerMatches(q) {
    const key = q.toLowerCase().trim();
    if (!key) return [];
    return Object.keys(CITIES)
      .filter(c => c.startsWith(key))
      .slice(0, 6)
      .map(c => ({
        label: c.replace(/\b\w/g, m => m.toUpperCase()),
        detail: 'built-in atlas', offline: true,
        lat: CITIES[c][0], lon: CITIES[c][1],
      }));
  }

  /* ---------- place autocomplete ---------- */
  const AC = { timer: null, items: [], index: -1, chosen: null, seq: 0 };

  async function searchPlaces(q) {
    // explicit "lat, lon"
    const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      return [{ label: `${(+m[1]).toFixed(4)}, ${(+m[2]).toFixed(4)}`, detail: 'coordinates',
        lat: +m[1], lon: +m[2] }];
    }
    try {
      const r = await fetch(
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=' +
        encodeURIComponent(q), { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const js = await r.json();
        if (js.length) {
          return js.map(p => {
            const bits = p.display_name.split(',').map(s => s.trim());
            return {
              label: bits[0],
              detail: bits.slice(1).filter(Boolean).slice(-2).join(', '),
              lat: +p.lat, lon: +p.lon,
            };
          });
        }
      }
    } catch (e) { /* offline — fall through to the built-in atlas */ }
    return gazetteerMatches(q);
  }

  function renderSuggestions(items) {
    const box = $('place-suggest');
    AC.items = items; AC.index = -1;
    if (!items.length) { closeSuggestions(); return; }
    box.innerHTML = items.map((it, i) =>
      `<li role="option" id="place-opt-${i}" data-i="${i}" aria-selected="false">` +
      `<span class="sg-name">${esc(it.label)}</span>` +
      (it.detail ? `<span class="sg-detail">${esc(it.detail)}</span>` : '') + '</li>').join('');
    box.hidden = false;
    $('in-place').setAttribute('aria-expanded', 'true');
  }

  function closeSuggestions() {
    const box = $('place-suggest');
    box.hidden = true; box.innerHTML = '';
    AC.items = []; AC.index = -1;
    $('in-place').setAttribute('aria-expanded', 'false');
    $('in-place').removeAttribute('aria-activedescendant');
  }

  function highlight(i) {
    const box = $('place-suggest');
    Array.from(box.children).forEach((li, k) => {
      const on = k === i;
      li.classList.toggle('active', on);
      li.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    AC.index = i;
    if (i >= 0) {
      $('in-place').setAttribute('aria-activedescendant', 'place-opt-' + i);
      box.children[i].scrollIntoView({ block: 'nearest' });
    }
  }

  function choosePlace(i) {
    const it = AC.items[i];
    if (!it) return;
    AC.chosen = it;
    $('in-place').value = (it.detail && !it.offline && it.detail !== 'coordinates')
      ? `${it.label}, ${it.detail}` : it.label;
    $('place-confirm').textContent =
      `✓ ${it.label} — ${it.lat.toFixed(3)}°, ${it.lon.toFixed(3)}°`;
    $('place-confirm').hidden = false;
    closeSuggestions();
  }

  function wirePlaceInput() {
    const input = $('in-place');
    input.addEventListener('input', () => {
      AC.chosen = null;
      $('place-confirm').hidden = true;
      clearTimeout(AC.timer);
      const q = input.value.trim();
      if (q.length < 2) { closeSuggestions(); return; }
      // show the offline atlas instantly, then refine with Nominatim
      const quick = gazetteerMatches(q);
      if (quick.length) renderSuggestions(quick);
      AC.timer = setTimeout(async () => {
        const seq = ++AC.seq;
        const items = await searchPlaces(q);
        if (seq === AC.seq && input.value.trim() === q) renderSuggestions(items);
      }, 350);
    });

    input.addEventListener('keydown', (e) => {
      if ($('place-suggest').hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(AC.index + 1, AC.items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(AC.index - 1, 0)); }
      else if (e.key === 'Enter') {
        if (AC.index >= 0) { e.preventDefault(); choosePlace(AC.index); }
      } else if (e.key === 'Escape') { closeSuggestions(); }
    });

    $('place-suggest').addEventListener('mousedown', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) { e.preventDefault(); choosePlace(+li.dataset.i); }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.place-field')) closeSuggestions();
    });
  }

  /** Resolve whatever is in the form into coordinates. */
  async function resolvePlace() {
    const manualLat = parseFloat($('in-lat').value), manualLon = parseFloat($('in-lon').value);
    if (!isNaN(manualLat) && !isNaN(manualLon)) {
      return { lat: manualLat, lon: manualLon, label: 'manual coordinates' };
    }
    if (AC.chosen) return AC.chosen;
    const q = $('in-place').value.trim();
    if (!q) return null;
    const hits = await searchPlaces(q);
    return hits.length ? hits[0] : null;
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
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, 216), [x2, y2] = pt(i * 30, 252);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4b46a55" stroke-width="1"/>`;
      const [gx, gy] = pt(i * 30 + 15, 234);
      s += `<text x="${gx}" y="${gy}" fill="#d4b46a" font-size="19" text-anchor="middle" dominant-baseline="central">${GLYPHS[i]}︎</text>`;
    }
    for (let d = 0; d < 360; d += 10) {
      const [x1, y1] = pt(d, 216), [x2, y2] = pt(d, d % 30 === 0 ? 216 : 210);
      if (d % 30 !== 0) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4b46a33" stroke-width="1"/>`;
    }
    for (let h = 1; h <= 12; h++) {
      const strong = h === 1 || h === 4 || h === 7 || h === 10;
      const [x1, y1] = pt(chart.cusps[h], 120), [x2, y2] = pt(chart.cusps[h], 216);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strong ? '#d4b46a99' : '#d4b46a44'}" stroke-width="${strong ? 1.6 : 1}"/>`;
      const mid = chart.cusps[h] + Chart_.norm360(chart.cusps[h === 12 ? 1 : h + 1] - chart.cusps[h]) / 2;
      const [nx, ny] = pt(mid, 134);
      s += `<text x="${nx}" y="${ny}" fill="#6a6478" font-size="11" text-anchor="middle" dominant-baseline="central">${h}</text>`;
    }
    const [ax, ay] = pt(chart.asc, 264);
    const [mx, my] = pt(chart.mc, 264);
    s += `<text x="${ax}" y="${ay}" fill="#e8e4d8" font-size="12" text-anchor="middle" dominant-baseline="central" font-family="monospace">ASC</text>`;
    s += `<text x="${mx}" y="${my}" fill="#e8e4d8" font-size="12" text-anchor="middle" dominant-baseline="central" font-family="monospace">MC</text>`;
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

  /* ---------- expandable tables ---------- */
  function detailRow(id, cols, html) {
    return `<tr class="detail-row" id="${id}" hidden><td colspan="${cols}">${html}</td></tr>`;
  }

  function planetDetail(p) {
    const x = Lex_.explainPlacement(p);
    return `<div class="detail">
      <h4>${esc(x.headline)}</h4>
      <p class="detail-q">${esc(x.question)}</p>
      <dl>
        <dt>The planet</dt><dd>${esc(x.what)}</dd>
        <dt>The sign</dt><dd>${esc(x.how)}</dd>
        <dt>The house</dt><dd>${esc(x.where)} ${esc(Lex_.HOUSES[p.house].long)}</dd>
        ${x.retro ? `<dt>Retrograde</dt><dd>${esc(x.retro)}</dd>` : ''}
      </dl>
      <p class="detail-sum">${esc(x.together)}</p>
      <p class="detail-facts">${esc(x.facts.element)} · ${esc(x.facts.modality)} · ${esc(x.facts.ruler)} · orbit: ${esc(x.facts.cycle)}</p>
    </div>`;
  }

  function satelliteDetail(sat) {
    const r = Lore_.readSatellite(sat);
    return `<div class="detail sat-detail">
      <h4>${esc(r.headline)}</h4>
      <p class="detail-q">${esc(r.archetype)}${r.strong ? ' · strong placement' : ''}</p>
      <p>${esc(r.core)}</p>
      <p>${esc(r.inflect)}</p>
      <p class="detail-shadow">${esc(r.shadow)}</p>
      <dl>
        <dt>The name</dt><dd>${esc(r.namesake)}</dd>
        <dt>Why it means that</dt><dd>${esc(r.derivation)}</dd>
      </dl>
      <p class="detail-facts">${esc(r.formal)} · ${esc(r.launched)} · ${esc(r.horizon)}</p>
    </div>`;
  }

  function fillTables(chart, sats, satMeta) {
    // planets
    const pb = $('tbl-planets').querySelector('tbody');
    pb.innerHTML = chart.planets.map((p, i) => {
      const did = 'pd-' + i;
      return `<tr class="expandable" tabindex="0" role="button" aria-expanded="false" aria-controls="${did}" data-target="${did}">
        <td class="glyph">${p.glyph}︎</td><td>${p.name}</td>
        <td>${p.signGlyph}︎ ${p.signName}</td><td>${p.degree}</td><td>${p.house}</td>
        <td>${p.retrograde ? '<span class="rx">retrograde</span>' : ''}</td>
        <td class="chev" aria-hidden="true">›</td></tr>` +
        detailRow(did, 7, planetDetail(p));
    }).join('');

    // angles
    const ab = $('tbl-angles').querySelector('tbody');
    const angles = [
      { key: 'asc', name: 'Ascendant', lon: chart.asc, sign: chart.ascSign },
      { key: 'mc', name: 'Midheaven', lon: chart.mc, sign: chart.mcSign },
    ];
    ab.innerHTML = angles.map((a, i) => {
      const did = 'ad-' + i;
      const x = Lex_.explainAngle(a.key, a.sign);
      const html = `<div class="detail"><h4>${esc(x.headline)}</h4>
        <dl><dt>What it is</dt><dd>${esc(x.what)}</dd>
        <dt>In your chart</dt><dd>${esc(x.how)}</dd></dl>
        <p class="detail-sum">${esc(x.together)}</p></div>`;
      return `<tr class="expandable" tabindex="0" role="button" aria-expanded="false" aria-controls="${did}" data-target="${did}">
        <td class="glyph">${a.key === 'asc' ? 'ASC' : 'MC'}</td><td>${a.name}</td>
        <td>${GLYPHS[a.sign]}︎ ${SIGNS[a.sign]}</td><td>${Chart_.fmtDegree(a.lon)}</td>
        <td class="chev" aria-hidden="true">›</td></tr>` + detailRow(did, 5, html);
    }).join('');

    // satellites
    const sb = $('tbl-sats').querySelector('tbody');
    sb.innerHTML = sats.map((sat, i) => {
      const did = 'sd-' + i;
      const lore = Lore_.LORE[sat.key] || Lore_.LORE.unknown;
      return `<tr class="expandable" tabindex="0" role="button" aria-expanded="false" aria-controls="${did}" data-target="${did}">
        <td class="glyph">🛰</td><td>${esc(sat.name)}</td>
        <td class="sat-arch">${esc(lore.archetype)}</td>
        <td>${GLYPHS[sat.sign]}︎ ${SIGNS[sat.sign]}</td>
        <td>${sat.house} — ${esc(Lex_.HOUSES[sat.house].title)}</td>
        <td class="chev" aria-hidden="true">›</td></tr>` +
        detailRow(did, 6, satelliteDetail(sat));
    }).join('');

    $('data-note').textContent = satMeta.source === 'live'
      ? 'Satellite orbits: live element sets from CelesTrak.'
      : 'Satellite orbits: bundled element sets (offline mode) — positions are approximate until the app can reach CelesTrak.';
  }

  function toggleRow(tr) {
    const det = document.getElementById(tr.dataset.target);
    if (!det) return;
    const open = !det.hidden;
    det.hidden = open;
    tr.setAttribute('aria-expanded', open ? 'false' : 'true');
    tr.classList.toggle('open', !open);
  }

  function wireExpanders() {
    document.addEventListener('click', (e) => {
      const tr = e.target.closest('tr.expandable');
      if (tr) toggleRow(tr);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tr = e.target.closest && e.target.closest('tr.expandable');
      if (tr) { e.preventDefault(); toggleRow(tr); }
    });
  }

  /* ---------- the houses primer ---------- */
  function fillPrimer() {
    $('houses-primer').innerHTML = Lex_.HOUSES.slice(1).map((h, i) =>
      `<details class="primer-item"><summary><span class="primer-n">${i + 1}</span> ${esc(h.title)}</summary>
       <p>${esc(h.long)}</p></details>`).join('');
    $('method-note').textContent = Lore_.METHOD_NOTE;
    $('method-caveat').textContent = Lore_.CAVEAT;
  }

  /* ---------- main flow ---------- */
  async function consult(ev) {
    ev.preventDefault();
    const btn = $('btn-consult'), status = $('form-status');
    btn.disabled = true;
    status.classList.remove('err');

    try {
      status.textContent = 'Locating your beginnings…';
      const place = await resolvePlace();
      if (!place) {
        status.textContent = 'Pick a place from the list, or enter coordinates under "Enter coordinates manually".';
        status.classList.add('err');
        btn.disabled = false;
        return;
      }
      const { lat, lon } = place;

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

      $('msg-date').textContent = now.toLocaleDateString(undefined,
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      $('msg-greeting').textContent = msg.greeting;
      $('msg-tagline').textContent = msg.tagline;
      $('msg-body').innerHTML = msg.paragraphs.map((p, i) =>
        `<p${i === msg.paragraphs.length - 1 ? ' class="sat-para"' : ''}>${esc(p)}</p>`).join('');
      const placeLabel = (place.detail && !place.offline && place.detail !== 'coordinates')
        ? `${place.label}, ${place.detail}` : place.label;
      $('chart-for').textContent =
        `${placeLabel} · ${lat.toFixed(2)}°, ${lon.toFixed(2)}° · ` +
        `${$('in-date').value} ${$('in-time').value} · ${zone} · ${natal.houseSystem} houses`;
      drawWheel(natal, sats);
      fillTables(natal, sats, satMeta);
      fillPrimer();

      $('reading').classList.remove('hidden');
      $('form-card').classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      status.textContent = '';

      try {
        localStorage.setItem('starscope-birth', JSON.stringify({
          date: $('in-date').value, time: $('in-time').value,
          place: $('in-place').value, lat, lon,
          label: place.label, detail: place.detail,
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
    wirePlaceInput();
    wireExpanders();
    try {
      const saved = JSON.parse(localStorage.getItem('starscope-birth'));
      if (saved) {
        $('in-date').value = saved.date; $('in-time').value = saved.time;
        $('in-place').value = saved.place;
        if (typeof saved.lat === 'number') {
          AC.chosen = { lat: saved.lat, lon: saved.lon, label: saved.label || saved.place, detail: saved.detail };
          $('place-confirm').textContent =
            `✓ ${AC.chosen.label} — ${saved.lat.toFixed(3)}°, ${saved.lon.toFixed(3)}°`;
          $('place-confirm').hidden = false;
        }
      }
    } catch (e) {}
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  });
})();
