/* horoscope.js — the voice of the Atlas-that-legally-isn't-an-Atlas.
 * Deterministic per (date, chart): the same person gets the same prophecy all
 * day, and a new one at midnight. Star paragraphs are earnest; the satellite
 * paragraph is where the modern sky gets a word in.
 * Browser global: Oracle_ ; node: module.exports. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Oracle_ = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const ORDINALS = [null, '1st', '2nd', '3rd', '4th', '5th', '6th', '7th',
    '8th', '9th', '10th', '11th', '12th'];
  const HOUSE_THEMES = [null,
    'self and appearances', 'possessions and value', 'communication',
    'home and roots', 'pleasure and creation', 'routine and duty',
    'partnerships', 'transformation and other people’s money',
    'far horizons', 'ambition and reputation', 'community', 'secrets'];

  /* ---------- seeded RNG ---------- */
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(dateKey, chart) {
    const seed = hashStr(dateKey + '|' + chart.sunSign + '|' + chart.ascSign + '|' +
      Math.round(chart.asc * 10));
    return mulberry32(seed);
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function pickN(rng, arr, n) {
    const copy = arr.slice(); const out = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    return out;
  }

  /* ---------- transit analysis (real astronomy in, prophecy out) ---------- */
  function analyseTransits(natal, transits, norm180) {
    const t = {};
    t.moonSign = SIGNS[transits.moonSign];
    t.moonHouseNatal = null;
    const mars = transits.planets.find(p => p.name === 'Mars');
    const saturn = transits.planets.find(p => p.name === 'Saturn');
    const venus = transits.planets.find(p => p.name === 'Venus');
    const jupiter = transits.planets.find(p => p.name === 'Jupiter');
    const mercury = transits.planets.find(p => p.name === 'Mercury');
    t.antagonistSign = SIGNS[mars.sign];
    t.hardSign = SIGNS[saturn.sign];
    t.allySign = SIGNS[venus.sign];
    t.luckySign = SIGNS[jupiter.sign];
    t.mercuryRx = mercury.retrograde;
    t.retroCount = transits.planets.filter(p => p.retrograde).length;
    // closest transit aspect to the natal Sun
    const natalSun = natal.planets[0].lon;
    let best = null;
    for (const p of transits.planets.slice(2)) {
      for (const [angle, name] of [[0, 'conjoins'], [180, 'opposes'], [90, 'squares'], [120, 'trines']]) {
        const orb = Math.abs(norm180(p.lon - natalSun - angle));
        if (orb < 4 && (!best || orb < best.orb)) best = { planet: p.name, aspect: name, orb };
      }
    }
    t.sunAspect = best;
    return t;
  }

  /* ---------- fragment pools ---------- */
  const OPENERS = [
    'The wind is wild, and the seas are stormy as darkness clouds your night — but every storm is merely weather with ambition.',
    'Your fate balances on a knife’s edge today, which at least means it has excellent posture.',
    'Power blossoms in your life like a spring flower reaching towards a bright blue sky.',
    'Today marks the start of a new chapter, and the stars have already read ahead.',
    'Though it may seem that you are lost in the dark at times, remember what is dear to your heart and you will always find a way back to yourself.',
    'The heavens turn slowly, but they are turning towards you.',
    'Fortune favours those who follow their own path, provided they occasionally look up from it.',
    'A quiet tide is moving beneath the surface of your day; do not mistake calm for permission.',
    'The stars are feeling talkative this morning, and most of what they say concerns you.',
    'Destiny has left the door ajar today. Whether that is an invitation or a draught is yours to decide.',
  ];

  const MOON_LINES = [
    'With the Moon drifting through {moonSign}, your instincts run {moonAdj} — trust them, but count your change.',
    'The Moon keeps her counsel in {moonSign} today, lending your heart a distinctly {moonAdj} weather.',
    'A {moonSign} Moon stirs the tides of your mood; let them rise, but hold the shoreline.',
  ];
  const MOON_ADJ = {
    Aries: 'headlong', Taurus: 'stubborn', Gemini: 'quicksilver', Cancer: 'tender',
    Leo: 'theatrical', Virgo: 'exacting', Libra: 'diplomatic', Scorpio: 'undertowed',
    Sagittarius: 'far-flung', Capricorn: 'flinty', Aquarius: 'contrary', Pisces: 'porous',
  };

  const CLASH_LINES = [
    'You may come to blows with a {antagonistSign} today, but take heart — if you travel the road of least resistance, you can avoid a collision altogether.',
    'A {antagonistSign} will test your patience before the day is out. Yours is not the sword that must be drawn first.',
    'Beware a {antagonistSign} with an opinion and nowhere to put it.',
    'Your fate may tangle with that of a {antagonistSign} between the boughs of destiny. Tread the rocky path with caution, or at least sensible shoes.',
  ];
  const ALLY_LINES = [
    'An unexpected alliance with a {allySign} may fall into your lap today — an adversary turned friend, if you can open your heart to such a path.',
    'If you can find it in you to trust in an unlikely ally — look to a {allySign} — then many truths may be revealed to you.',
    'A {allySign} carries a small kindness with your name on it. Accept it; the stars dislike waste.',
    'Seek peace in the company of those you trust above all, and count a {luckySign} among them before sundown.',
  ];
  const COUNSEL_LINES = [
    'Remember, the sun always shines brightest after a storm.',
    'It may seem like a lot to take in, but you’re doing better than you think.',
    'Whatever stance you choose today will set the dice rolling — be sure each decision is one you want to stick with.',
    'The stars are feeling vexed with you, but their moods are brief and their memory, mercifully, poor.',
    'Success is not impossible; it is merely being coy.',
    'If you open your mind to the possibility of change, you might be pleasantly surprised.',
    'Beware the chime of the morning bell, and do not answer messages sent before your coffee.',
  ];
  const ASPECT_LINES = {
    conjoins: '{planet} {aspect} your Sun today — expect its agenda to feel suspiciously like your own.',
    opposes: '{planet} {aspect} your Sun today; someone across the table holds a mirror, and it is not entirely flattering.',
    squares: '{planet} {aspect} your Sun today, grinding sparks from your resolve. Sparks, remember, are how fires begin.',
    trines: '{planet} {aspect} your Sun today, and for once the machinery of heaven runs on schedule in your favour.',
  };
  const MERCURY_RX_LINES = [
    'Mercury is in retrograde, so read everything twice, including this.',
    'Mercury retreats across the sky; forgive the misunderstandings, and back up the things you love.',
  ];

  /* ---------- satellite paragraph ---------- */
  const SAT_INTROS = [
    'Meanwhile, in low Earth orbit, the modern sky has opinions of its own.',
    'The old stars have spoken. The new ones, regrettably, also have notifications.',
    'And a word on the younger heavens — the ones your grandmother’s astrologer never had to file paperwork on.',
    'The classical sky concludes its business. The orbital sky clears its throat.',
    'Above the clouds but below the myths, the hardware weighs in.',
  ];

  const SAT_HOUSE_LINES = {
    crowd: [
      '{label} is transiting your {houseOrd} house of {houseTheme} — as are its four hundred nearest siblings, so whatever influence it carries arrives in bulk.',
      '{label} crosses your {houseOrd} house today. So do a great many of its colleagues; expect your {houseTheme} to feel mildly congested.',
    ],
    busy: [
      '{label} passes through your {houseOrd} house of {houseTheme}, travelling at 28,000 km/h — a reminder that even the overworked complete sixteen sunrises a day.',
      '{label} drifts through your {houseOrd} house; six professionals live aboard it, and not one of them is worried about your {houseTheme}. Perhaps you needn’t be either.',
    ],
    wise: [
      '{label} regards your {houseOrd} house of {houseTheme} from a respectful distance, as it has regarded everything since 1990: patiently, and in extraordinary detail.',
      '{label} turns its ancient mirror towards your {houseOrd} house. It has photographed the birth of galaxies; your {houseTheme} does not intimidate it.',
    ],
    rising: [
      '{label} ascends through your {houseOrd} house of {houseTheme}, young and gleaming and absolutely certain it will not end up like the others.',
    ],
    precise: [
      '{label} occupies your {houseOrd} house of {houseTheme} and knows your position to within three metres. It offers no judgement, only coordinates.',
      '{label} triangulates your {houseOrd} house today. You cannot get lost, though you remain free to feel that way.',
    ],
    'faded-glam': [
      '{label} slips through your {houseOrd} house of {houseTheme}. It used to flare across the night for admirers; now it works quietly, like the rest of us.',
    ],
    ghost: [
      '{label} haunts your {houseOrd} house of {houseTheme}. It has not answered a call since 2012, and honestly, same.',
      '{label} drifts silent through your {houseOrd} house — eight tonnes of unresolved communication. Consider replying to that message.',
    ],
    ancient: [
      '{label} creaks through your {houseOrd} house of {houseTheme}. In orbit since 1958, silent since 1964, and still it shows up — there is a lesson in that.',
    ],
    weather: [
      '{label} sweeps your {houseOrd} house of {houseTheme} and forecasts scattered feelings, clearing towards evening.',
    ],
    mystery: [
      '{label} crosses your {houseOrd} house of {houseTheme}, unidentified but unmistakably present.',
    ],
  };

  const SAT_HORIZON_LINES = [
    'It is above your horizon as you read this, which the ancients would have found significant and the engineers find routine.',
    'At this very moment it rides {elev}° above your horizon — look up, wave, log the interaction.',
  ];

  const SAT_CODAS = [
    'The satellites, unlike the stars, accept feedback. They simply do not read it.',
    'None of this was foretold by the ancients, who lacked both the technology and the nerve.',
    'Your ephemeris now includes moving parts. Plan accordingly.',
    'The stars incline; the constellations bill monthly.',
    'Interpret these transits as you see fit — the hardware certainly will not stop you.',
  ];

  function fill(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : '{' + k + '}'));
  }

  /* ---------- main ---------- */
  function generate({ natal, transits, satellites, dateKey, norm180 }) {
    const rng = makeRng(dateKey, natal);
    const t = analyseTransits(natal, transits, norm180);

    const paras = [];

    // paragraph 1: fate weather + moon
    let p1 = pick(rng, OPENERS);
    p1 += ' ' + fill(pick(rng, MOON_LINES), { moonSign: t.moonSign, moonAdj: MOON_ADJ[t.moonSign] });
    paras.push(p1);

    // paragraph 2: real transit to natal sun (if any) + clash/ally + counsel
    const bits = [];
    if (t.sunAspect) {
      bits.push(fill(ASPECT_LINES[t.sunAspect.aspect],
        { planet: t.sunAspect.planet, aspect: t.sunAspect.aspect }));
    }
    if (rng() < 0.85) bits.push(fill(pick(rng, CLASH_LINES), t));
    if (rng() < 0.85) bits.push(fill(pick(rng, ALLY_LINES), t));
    if (t.mercuryRx) bits.push(pick(rng, MERCURY_RX_LINES));
    bits.push(pick(rng, COUNSEL_LINES));
    paras.push(bits.join(' '));

    // paragraph 3: the satellites
    const satBits = [pick(rng, SAT_INTROS)];
    const chosen = pickN(rng, satellites, Math.min(2, satellites.length));
    for (const s of chosen) {
      const pool = SAT_HOUSE_LINES[s.vibe] || SAT_HOUSE_LINES.mystery;
      let line = fill(pick(rng, pool), {
        label: s.label.charAt(0).toUpperCase() + s.label.slice(1),
        houseOrd: ORDINALS[s.house], houseTheme: HOUSE_THEMES[s.house],
      });
      if (s.aboveHorizon && rng() < 0.5) {
        line += ' ' + fill(pick(rng, SAT_HORIZON_LINES), { elev: Math.round(s.elevation) });
      }
      satBits.push(line);
    }
    if (rng() < 0.8) satBits.push(pick(rng, SAT_CODAS));
    paras.push(satBits.join(' '));

    return {
      greeting: `Good Morning, ${natal.sunSignName}.`,
      tagline: 'The stars have spoken about your day!',
      paragraphs: paras,
      satellitesUsed: chosen,
      transitNotes: t,
    };
  }

  return { generate, HOUSE_THEMES, ORDINALS };
});
