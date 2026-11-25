/* interpretations.js — the reference layer: what planets, signs and houses
 * actually mean, in plain language, so a reader with no astrology background
 * can understand their own chart.
 *
 * Deliberately written the way astrology is actually taught:
 *   planet = WHAT part of life       (the noun)
 *   sign   = HOW it expresses        (the adverb)
 *   house  = WHERE it plays out      (the setting)
 * A reading composes the three. Nothing here claims astrology is predictive;
 * it describes what practitioners mean by each symbol.
 *
 * Browser global: Lex_ ; node: module.exports.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Lex_ = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- planets: the WHAT ---------- */
  const PLANETS = {
    Sun: {
      glyph: '☉', keyword: 'identity',
      question: 'Who am I becoming?',
      meaning: 'Your core self — vitality, ego, the person you are growing into rather than the one you were born as. The sign it sits in is your "star sign", the one magazines ask for.',
      cycle: 'one year through the whole zodiac',
    },
    Moon: {
      glyph: '☽', keyword: 'inner life',
      question: 'What do I need to feel safe?',
      meaning: 'Emotions, instinct, memory, and what comforts you when nobody is watching. Traditionally the most private placement in the chart — the part of you that reacts before you have decided to.',
      cycle: 'about 28 days — it changes sign every two and a half days',
    },
    Mercury: {
      glyph: '☿', keyword: 'mind',
      question: 'How do I think and say things?',
      meaning: 'Thought, speech, writing, learning, and the particular way your mind sorts information. Never far from your Sun, so it colours how you explain yourself.',
      cycle: 'about 88 days, with three retrograde periods a year',
    },
    Venus: {
      glyph: '♀', keyword: 'attraction',
      question: 'What do I find beautiful, and how do I love?',
      meaning: 'Taste, affection, pleasure, money and the aesthetics you are drawn to. Governs how you relate rather than who you are.',
      cycle: 'about 225 days',
    },
    Mars: {
      glyph: '♂', keyword: 'drive',
      question: 'How do I pursue what I want?',
      meaning: 'Energy, appetite, anger and initiative — the engine. Shows how you fight, and what you are like when you have decided to act.',
      cycle: 'about two years',
    },
    Jupiter: {
      glyph: '♃', keyword: 'expansion',
      question: 'Where am I generous, and where do I overdo it?',
      meaning: 'Growth, luck, belief, travel and excess. Traditionally the "greater benefic" — the easy planet — though its gift is enlargement, which is not always welcome.',
      cycle: 'about 12 years — roughly one year per sign',
    },
    Saturn: {
      glyph: '♄', keyword: 'structure',
      question: 'Where must I do the work?',
      meaning: 'Limits, discipline, time, authority and the areas where life insists you earn things slowly. Unfashionable, and the placement most practitioners find most useful.',
      cycle: 'about 29.5 years — your "Saturn return" lands around 29 and 58',
    },
    Uranus: {
      glyph: '♅', keyword: 'disruption',
      question: 'Where do I break the pattern?',
      meaning: 'Sudden change, invention, rebellion and the refusal to continue as before. Moves slowly, so its sign belongs to your whole generation; the house is what is personal.',
      cycle: 'about 84 years — seven years per sign',
    },
    Neptune: {
      glyph: '♆', keyword: 'dissolution',
      question: 'Where do I lose the edges?',
      meaning: 'Imagination, spirituality, escapism and confusion — where things blur beautifully or deceptively. Also generational by sign.',
      cycle: 'about 165 years',
    },
    Pluto: {
      glyph: '♇', keyword: 'transformation',
      question: 'What has to be destroyed and rebuilt?',
      meaning: 'Power, compulsion, buried things and irreversible change. Demoted by astronomers in 2006; astrologers declined to follow.',
      cycle: 'about 248 years',
    },
  };

  /* ---------- signs: the HOW ---------- */
  const ELEMENTS = {
    Fire: 'initiates, burns through things, acts before analysing',
    Earth: 'builds, verifies, wants results you can touch',
    Air: 'thinks, connects, needs to talk it through',
    Water: 'feels first, absorbs atmosphere, reads the room',
  };
  const MODALITIES = {
    Cardinal: 'starts things',
    Fixed: 'sustains things',
    Mutable: 'adapts things',
  };

  const SIGNS = [
    { name: 'Aries', glyph: '♈', element: 'Fire', modality: 'Cardinal', ruler: 'Mars',
      style: 'directly, impatiently, and first',
      note: 'Starts before the plan is finished. Honest to a fault, bored by deliberation.' },
    { name: 'Taurus', glyph: '♉', element: 'Earth', modality: 'Fixed', ruler: 'Venus',
      style: 'slowly, sensuously, and immovably once decided',
      note: 'Wants comfort, quality and no sudden movements. Changes its mind roughly never.' },
    { name: 'Gemini', glyph: '♊', element: 'Air', modality: 'Mutable', ruler: 'Mercury',
      style: 'quickly, curiously, and in several directions at once',
      note: 'Collects information and people. Gets accused of inconsistency by people who are merely slower.' },
    { name: 'Cancer', glyph: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon',
      style: 'protectively, indirectly, and with a long memory',
      note: 'Approaches sideways, defends fiercely, remembers what was said in 2014.' },
    { name: 'Leo', glyph: '♌', element: 'Fire', modality: 'Fixed', ruler: 'Sun',
      style: 'warmly, generously, and in full view',
      note: 'Needs to be witnessed, not merely appreciated. Loyal, dramatic, allergic to being ignored.' },
    { name: 'Virgo', glyph: '♍', element: 'Earth', modality: 'Mutable', ruler: 'Mercury',
      style: 'precisely, usefully, and with the errors already noted',
      note: 'Improves things compulsively. Mistakes its own high standards for ordinary standards.' },
    { name: 'Libra', glyph: '♎', element: 'Air', modality: 'Cardinal', ruler: 'Venus',
      style: 'diplomatically, aesthetically, and with the other person considered',
      note: 'Weighs everything. Can mistake the avoidance of conflict for peace.' },
    { name: 'Scorpio', glyph: '♏', element: 'Water', modality: 'Fixed', ruler: 'Mars / Pluto',
      style: 'intensely, privately, and all the way down',
      note: 'No interest in the surface of anything. Trusts slowly and completely, or not at all.' },
    { name: 'Sagittarius', glyph: '♐', element: 'Fire', modality: 'Mutable', ruler: 'Jupiter',
      style: 'expansively, bluntly, and with somewhere else in mind',
      note: 'Needs the horizon available. Tactless in the way that is usually, annoyingly, correct.' },
    { name: 'Capricorn', glyph: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn',
      style: 'patiently, strategically, and for the long term',
      note: 'Plays a longer game than the people around it realise. Dry humour as standard.' },
    { name: 'Aquarius', glyph: '♒', element: 'Air', modality: 'Fixed', ruler: 'Saturn / Uranus',
      style: 'unconventionally, systematically, and at a slight distance',
      note: 'Thinks in groups and principles. Surprisingly stubborn for a sign that prizes open-mindedness.' },
    { name: 'Pisces', glyph: '♓', element: 'Water', modality: 'Mutable', ruler: 'Jupiter / Neptune',
      style: 'impressionably, imaginatively, and without firm edges',
      note: 'Absorbs whatever is in the room. Boundaries are the lifelong project.' },
  ];

  /* ---------- houses: the WHERE ---------- */
  const HOUSES = [null,
    { name: 'the 1st house', title: 'Self and appearance',
      domain: 'how you come across, your body, your approach to new rooms',
      long: 'The mask you wear before anyone knows you — appearance, manner, first impressions, and the way you start things. Its cusp is your Ascendant, the single most personal point in the chart.' },
    { name: 'the 2nd house', title: 'Possessions and self-worth',
      domain: 'money you earn, things you own, what you consider yourself worth',
      long: 'Material security and the values underneath it. Traditionally about income and possessions; modern practice reads it as self-worth, on the theory that the two are rarely unrelated.' },
    { name: 'the 3rd house', title: 'Communication and the near world',
      domain: 'speech, writing, siblings, short journeys, everyday thinking',
      long: 'The immediate environment: how you talk, how you learn, your siblings and neighbours, and all the small journeys that make up a week.' },
    { name: 'the 4th house', title: 'Home and roots',
      domain: 'family, origins, the private self, where you are from',
      long: 'The foundation — your home, your upbringing, the parent who shaped you most, and the inner life nobody sees. Its cusp is the lowest point of the chart, literally underground.' },
    { name: 'the 5th house', title: 'Creativity, romance and play',
      domain: 'what you make for joy, flirtation, children, performance',
      long: 'Everything done for its own pleasure: creative work, love affairs (as opposed to marriage), children, games, and the delight of showing off a little.' },
    { name: 'the 6th house', title: 'Work, routine and health',
      domain: 'daily tasks, service, habits, the body\'s maintenance',
      long: 'The unglamorous engine room — your job as opposed to your vocation, your routines, your health, and the small acts of service that hold life together.' },
    { name: 'the 7th house', title: 'Partnership',
      domain: 'marriage, close partners, declared enemies, one-to-one dealings',
      long: 'The other person. Marriage and business partnerships, but also open rivals — traditionally the same house, which tells you something. Its cusp is the Descendant, opposite your Ascendant.' },
    { name: 'the 8th house', title: 'Transformation and shared resources',
      domain: 'intimacy, other people\'s money, death, debt, what is hidden',
      long: 'The house of things held jointly and things not spoken about: sex, inheritance, taxes, debt, crisis, and psychological transformation. The uncomfortable, interesting one.' },
    { name: 'the 9th house', title: 'Far horizons',
      domain: 'travel, higher study, belief, foreign places',
      long: 'Everything that expands your frame: long journeys, universities, philosophy, religion, law, and the people from elsewhere who change how you see.' },
    { name: 'the 10th house', title: 'Ambition and reputation',
      domain: 'career, public standing, what you are known for',
      long: 'The most visible point in the chart — your vocation, your public role, your reputation, and the authority figure who set the standard. Its cusp is the Midheaven.' },
    { name: 'the 11th house', title: 'Community and hopes',
      domain: 'friends, networks, groups, long-term wishes',
      long: 'The collective: friendships, communities, causes, and the future you are hoping toward. Where the 5th house is personal pleasure, the 11th is shared purpose.' },
    { name: 'the 12th house', title: 'Secrets and the unconscious',
      domain: 'solitude, dreams, self-undoing, what is hidden even from you',
      long: 'The last and strangest house — retreat, institutions, the unconscious, hidden enemies, and the parts of yourself you meet only alone. Traditionally feared; modern practice reads it as the inner work.' },
  ];

  /* ---------- composition ---------- */

  /** Full plain-language reading of one natal placement. */
  function explainPlacement(p) {
    const planet = PLANETS[p.name];
    const sign = SIGNS[p.sign];
    const house = HOUSES[p.house];
    const parts = {
      headline: `${p.name} in ${sign.name}, ${house.name}`,
      question: planet.question,
      what: planet.meaning,
      how: `In ${sign.name} it expresses ${sign.style}. ${sign.note}`,
      where: `In ${house.name} this plays out in ${house.domain}.`,
      together: `In short: ${lower(planet.keyword)}, handled ${sign.style}, showing up most in ${house.domain}.`,
      facts: {
        element: `${sign.element} (${ELEMENTS[sign.element]})`,
        modality: `${sign.modality} — ${MODALITIES[sign.modality]}`,
        ruler: `ruled by ${sign.ruler}`,
        cycle: planet.cycle,
      },
      retro: p.retrograde
        ? `Retrograde at your birth: from Earth, ${p.name} appeared to move backwards. Practitioners read this as the planet's business turning inward — rehearsed privately before it is shown, and often matured later than usual.`
        : null,
    };
    return parts;
  }

  /** The angles, which are points rather than bodies. */
  function explainAngle(which, signIndex) {
    const sign = SIGNS[signIndex];
    if (which === 'asc') {
      return {
        headline: `Ascendant in ${sign.name}`,
        what: 'The Ascendant (or Rising sign) is the degree of the zodiac that was climbing over the eastern horizon at the moment and place you were born. It changes every two hours, which is why birth time matters.',
        how: `Rising in ${sign.name}, you arrive ${sign.style} — this is the first impression, not the inner life. ${sign.note}`,
        together: 'It sets the entire house framework of your chart: every other placement is positioned relative to it.',
      };
    }
    return {
      headline: `Midheaven in ${sign.name}`,
      what: 'The Midheaven (MC) is the highest point the ecliptic reached at your birth — the top of the chart, and the most public.',
      how: `In ${sign.name}, your public role and ambitions take shape ${sign.style}.`,
      together: 'Read it for vocation and reputation rather than for personality.',
    };
  }

  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  return { PLANETS, SIGNS, HOUSES, ELEMENTS, MODALITIES, explainPlacement, explainAngle };
});
