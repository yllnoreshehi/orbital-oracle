/* lore.js — what the satellites MEAN.
 *
 * There is no astrological tradition for artificial satellites. There is,
 * however, a documented method for giving meaning to newly discovered bodies,
 * and astrologers have used it for two centuries: the meaning is derived from
 * the NAME the object was given, and from the story attached to it. Ceres
 * signifies nurture because Ceres is Demeter, who lost a daughter and starved
 * the world in grief. Chiron — found in 1977, named for the centaur healer who
 * could cure anyone but himself — became the "wounded healer". The meaning
 * follows from the namesake, not from observation.
 *
 * Satellites have names, missions, and fates that are frankly more mythic than
 * some asteroids'. So each object below is read the same way: its archetype is
 * derived from documented history — what it was called, what it was built for,
 * and what became of it. The derivation is shown in the app, so the reader can
 * judge the reasoning rather than take it on faith.
 *
 * Requires interpretations.js (house domains).
 * Browser global: Lore_ ; node: module.exports.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./interpretations.js'));
  } else { root.Lore_ = factory(root.Lex_); }
})(typeof self !== 'undefined' ? self : this, function (Lex) {
  'use strict';

  const METHOD_NOTE =
    'No astrologer has a system for satellites. But astrology does have a method for ' +
    'new bodies: when astronomers name something, astrologers read the name. Ceres means ' +
    'nurture because Ceres is Demeter, who lost her daughter and starved the world in grief. ' +
    'Chiron, found in 1977 and named for the centaur who could heal anyone but himself, became ' +
    'the "wounded healer" — the meaning derived from the myth, not from observation. ' +
    'Every object below is read that way, from its real name, real mission and real fate. ' +
    'Each one shows its derivation, so you can argue with the reasoning.';

  const CAVEAT =
    'Worth knowing: even asteroid astrology is minority practice — most astrologers use the ' +
    'ten classical bodies and stop. Satellite astrology is practised by nobody at all, unless ' +
    'you count a 2023 art installation by Zhanyi Chen, who built satellite natal charts to ask ' +
    'what we are doing to the sky. This app is the second thing of its kind, and the first one ' +
    'that will tell you where Envisat is.';

  /* ---------- the bodies ---------- */
  const LORE = {
    iss: {
      label: 'the ISS', formal: 'ISS (ZARYA)',
      launched: '1998 · crewed without a break since November 2000',
      archetype: 'The Negotiated Peace',
      namesake:
        'Its first module is called Zarya — Russian for "dawn". It was built by a country that ' +
        'had spent forty years racing the country it was launched to dock with.',
      derivation:
        'A station assembled by former rivals, kept alive only because several governments keep ' +
        'choosing to. Continuously inhabited for a quarter of a century — the longest unbroken ' +
        'human presence anywhere off Earth — and it works solely because the crews rotate before ' +
        'anyone burns out. Read it as cooperation that must be actively maintained.',
      signifies:
        'what you can only accomplish with other people, and the truces that make it possible. ' +
        'Also the wisdom of rotating out before exhaustion',
      shadow: 'dependency dressed as partnership; a structure that falls if one party walks away',
      affinity: [6, 10], // Libra, Aquarius
      verb: 'passes through',
    },
    hubble: {
      label: 'Hubble', formal: 'HST',
      launched: '1990 · repaired in orbit, 1993',
      archetype: 'The Corrected Vision',
      namesake:
        'Named for Edwin Hubble, who proved the universe is bigger than we thought and then ' +
        'proved it is getting bigger still.',
      derivation:
        'Launched with a mirror ground to the wrong shape — perfectly, precisely wrong. For three ' +
        'years the most expensive telescope ever built returned blurred pictures and public ' +
        'humiliation. Astronauts fitted it with corrective optics in 1993; it went on to become ' +
        'the most productive observatory in history. A flaw admitted and corrected in public.',
      signifies:
        'the place where your sight was distorted from the start, and what becomes possible once ' +
        'you admit it and accept the repair',
      shadow: 'shame about the original flaw; refusing the correction because it would be seen',
      affinity: [11, 5], // Pisces, Virgo
      verb: 'turns its mirror toward',
    },
    tiangong: {
      label: 'Tiangong', formal: 'CSS (TIANHE)',
      launched: 'core module 2021 · completed 2022',
      archetype: 'The Door You Built Yourself',
      namesake:
        'Tiangong means "Heavenly Palace"; the core module, Tianhe, means "Harmony of the Heavens". ' +
        'Modest naming was not the objective.',
      derivation:
        'China was excluded from the ISS by a 2011 US law barring NASA from bilateral cooperation. ' +
        'So it built its own station — smaller, newer, entirely sovereign — and finished it in ' +
        'under two years. Read it as what gets constructed after a refusal.',
      signifies:
        'what you build after being shut out, and the particular competence that grows from ' +
        'having no choice but to do it alone',
      shadow: 'isolation rebranded as independence; a point proved to people who stopped watching',
      affinity: [9, 0], // Capricorn, Aries
      verb: 'rises through',
    },
    starlink: {
      label: 'Starlink', formal: 'STARLINK',
      launched: 'first batch 2019 · now the majority of all active satellites',
      archetype: 'The Multitude',
      namesake:
        'A name with no mythology at all — a product name, applied identically to thousands of ' +
        'identical units. That absence is itself the meaning.',
      derivation:
        'No individual Starlink matters; the constellation does. Astronomers object that it streaks ' +
        'every long exposure, and they are right, and it is also genuinely how remote places got ' +
        'online. The first celestial body that arrives in bulk.',
      signifies:
        'where quantity has quietly replaced quality in your life — the service that is also the ' +
        'noise, the being-connected-everywhere while being seen nowhere in particular',
      shadow: 'congestion; anonymity; attention spread so wide it stops landing anywhere',
      affinity: [2, 10], // Gemini, Aquarius
      verb: 'crosses',
    },
    gps: {
      label: 'a GPS satellite', formal: 'NAVSTAR',
      launched: 'constellation operational since 1995',
      archetype: 'The Indifferent Witness',
      namesake:
        'NAVSTAR — "navigation star". A star that tells you where you are and declines to say ' +
        'where you should go.',
      derivation:
        'Built by a military, given to everyone, free at the point of use. Its clocks run measurably ' +
        'faster than yours — relativity, corrected for daily, or your maps would drift kilometres ' +
        'off by evening. It knows your position to within three metres and has no view whatsoever ' +
        'on what you do there.',
      signifies:
        'knowing exactly where you are without knowing why you are there — facts delivered without ' +
        'comfort, and the difference between a location and a direction',
      shadow: 'measuring instead of deciding; mistaking precision for meaning',
      affinity: [5, 8], // Virgo, Sagittarius
      verb: 'fixes its coordinates on',
    },
    iridium: {
      label: 'an Iridium satellite', formal: 'IRIDIUM',
      launched: '1997 · bankrupt 1999 · replaced 2017–2019',
      archetype: 'The Faded Flare',
      namesake:
        'Named for iridium, element 77, because the original design called for 77 satellites. ' +
        'The final constellation had 66. The name stayed; the plan did not.',
      derivation:
        'The first generation had three flat, polished antennas that caught the sun and threw it ' +
        'down as a flare brighter than Venus — the one spectacle in orbit people set alarms for. ' +
        'The company went bankrupt within two years of launching, was bought for roughly a cent on ' +
        'the dollar, and survived. The replacements work better and do not flare at all.',
      signifies:
        'a brilliance you were once known for and have since retired — the dramatic version of ' +
        'yourself that went quietly professional, and the ruin that turned out to be survivable',
      shadow: 'nostalgia for your own spectacle; suspecting the competent years are the lesser ones',
      affinity: [4, 9], // Leo, Capricorn
      verb: 'slips through',
    },
    envisat: {
      label: 'Envisat', formal: 'ENVISAT',
      launched: '2002 · silent since 8 April 2012',
      archetype: 'The Unanswered Message',
      namesake:
        '"Environmental satellite" — eight tonnes of instruments built to watch the Earth take ' +
        'care of itself.',
      derivation:
        'Europe\'s largest civilian Earth-observation satellite stopped responding one day in April ' +
        '2012, with no warning and no cause ever established. It cannot be contacted, repaired or ' +
        'removed, and it will keep orbiting for roughly 150 years — one of the most serious ' +
        'collision risks up there. A conversation that ended mid-sentence and cannot be reopened.',
      signifies:
        'communication that stopped without closure — something large and unfinished still ' +
        'circling your life, too heavy to ignore and impossible to reach',
      shadow: 'haunting; the risk that it collides with whatever happens to be passing',
      affinity: [7, 11], // Scorpio, Pisces
      verb: 'haunts',
    },
    vanguard: {
      label: 'Vanguard 1', formal: 'VANGUARD 1',
      launched: '17 March 1958 · transmitting until 1964',
      archetype: 'The Ancestor',
      namesake:
        'Vanguard: the front of the advance. Khrushchev reportedly called it "the grapefruit ' +
        'satellite". It is about that size.',
      derivation:
        'The fourth object ever put in orbit and the first powered by solar cells. It has been ' +
        'up there since 1958 — the oldest human-made object still circling the Earth — and has ' +
        'been silent since 1964, which means it has spent sixty years doing nothing at all, ' +
        'faithfully. Everything launched before it has long since fallen.',
      signifies:
        'the oldest thing you still carry — an inheritance or a habit that outlived its purpose ' +
        'decades ago and is still, silently, in orbit around you',
      shadow: 'obsolescence you have declined to deorbit; loyalty to a function that ended',
      affinity: [9, 3], // Capricorn, Cancer
      verb: 'creaks through',
    },
    noaa: {
      label: 'a NOAA weather satellite', formal: 'NOAA 19',
      launched: 'dropped 2003 · repaired · launched 2009 · still working',
      archetype: 'The Dropped Thing That Flew Anyway',
      namesake:
        'A weather satellite: an object whose entire job is to tell other people what is coming.',
      derivation:
        'In 2003 it was being turned on its side in a clean room when it fell to the floor. A team ' +
        'had quietly borrowed the twenty-four bolts holding it to the cart, and nobody checked. ' +
        'The damage ran to about $135 million. NASA\'s report faulted the process, not just the ' +
        'technicians. It was rebuilt, launched six years late, and has worked ever since.',
      signifies:
        'the expensive, avoidable accident you recovered from — and the irony of forecasting for ' +
        'everyone else while unable to predict your own dropped things',
      shadow: 'bracing for the repeat; checking the bolts long after anyone else would have stopped',
      affinity: [3, 5], // Cancer, Virgo
      verb: 'sweeps across',
    },
    unknown: {
      label: 'an unidentified object', formal: 'UNKNOWN',
      launched: 'unknown',
      archetype: 'The Unlisted Guest',
      namesake: 'No name on our roster matched this one.',
      derivation: 'Something is up there, in a known orbit, that this app has no story for.',
      signifies: 'an influence you have not yet identified, behaving regularly nonetheless',
      shadow: 'assuming the unexamined thing is harmless',
      affinity: [], verb: 'crosses',
    },
  };

  /* ---------- reading composition ---------- */

  const AFFINITY_LINE = [
    'This is its strongest placement — {label} works unusually well in {sign}.',
    '{sign} suits it: the archetype and the sign want the same thing.',
  ];

  /** Compose a full reading for one satellite placement. */
  function readSatellite(sat) {
    const lore = LORE[sat.key] || LORE.unknown;
    const house = Lex.HOUSES[sat.house];
    const sign = Lex.SIGNS[sat.sign];
    const strong = lore.affinity.indexOf(sat.sign) !== -1;

    const headline = `${cap(lore.label)} in ${sign.name}, ${house.name}`;
    const core =
      `${lore.archetype}. ${cap(lore.signifies)} — currently sitting in ${house.name}, ` +
      `which governs ${house.domain}.`;
    const inflect =
      `In ${sign.name} it operates ${sign.style}.` +
      (strong ? ' ' + AFFINITY_LINE[sat.house % 2].replace('{label}', lore.label).replace('{sign}', sign.name) : '');
    const shadowLine = `Difficult expression: ${lore.shadow}.`;
    const horizon = sat.aboveHorizon
      ? `It is above your horizon as you read this, ${Math.round(sat.elevation)}° up.`
      : 'It is below your horizon right now — on the other side of the world, still in the chart.';

    return {
      headline, archetype: lore.archetype, core, inflect,
      shadow: shadowLine, horizon,
      namesake: lore.namesake, derivation: lore.derivation,
      launched: lore.launched, formal: lore.formal, strong,
    };
  }

  /** One or two sentences for the daily message's satellite paragraph. */
  function dailyLine(sat, rng) {
    const lore = LORE[sat.key] || LORE.unknown;
    const house = Lex.HOUSES[sat.house];
    const sign = Lex.SIGNS[sat.sign];
    const strong = lore.affinity.indexOf(sat.sign) !== -1;

    const openers = [
      `${cap(lore.label)} ${lore.verb} ${house.name} today — ${lore.archetype.toLowerCase()}, ` +
        `landing in ${house.domain}.`,
      `${cap(lore.label)} sits in ${house.name}: ${lore.signifies}, applied to ${house.domain}.`,
      `${cap(lore.label)} — ${lore.archetype.toLowerCase()} — ${lore.verb} ${house.name}, ` +
        `where it bears on ${house.domain}.`,
    ];
    let line = openers[Math.floor(rng() * openers.length)];
    if (strong && rng() < 0.7) {
      line += ` In ${sign.name} it is at full strength.`;
    } else if (rng() < 0.45) {
      line += ` ${cap(sign.name)} has it working ${sign.style}.`;
    }
    if (rng() < 0.3) line += ` Watch for the shadow of it: ${lore.shadow}.`;
    return line;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  return { LORE, readSatellite, dailyLine, METHOD_NOTE, CAVEAT };
});
