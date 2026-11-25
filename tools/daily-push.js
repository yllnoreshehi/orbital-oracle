/* daily-push.js — computes today's horoscope and pushes it to your phone.
 *
 * Runs on GitHub Actions each morning (see .github/workflows/daily-horoscope.yml).
 * Uses exactly the same chart and message code as the website, so the notification
 * and the app always agree.
 *
 * Environment:
 *   BIRTH                 {"date":"1991-08-11","time":"22:35","lat":46.8065,"lon":7.162}
 *                         optional "zone":"Europe/Zurich" — otherwise derived from lat/lon
 *   PUSH_SUBSCRIPTION     the JSON from the app's "Notify me each morning" button
 *                         (one object, or an array of them for several devices)
 *   VAPID_PUBLIC_KEY      from: npx web-push generate-vapid-keys
 *   VAPID_PRIVATE_KEY     likewise — keep this one secret
 *   VAPID_SUBJECT         optional, defaults to a mailto: placeholder
 *
 * Local test without sending:  node tools/daily-push.js --dry-run
 */
const C = require('../js/chart.js');
const S = require('../js/satellites.js');
const O = require('../js/horoscope.js');

const DRY = process.argv.indexOf('--dry-run') !== -1;

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

function parseEnvJson(name, required) {
  const raw = process.env[name];
  if (!raw) {
    if (required) fail(`${name} is not set. See docs/NOTIFICATIONS.md.`);
    return null;
  }
  try { return JSON.parse(raw); }
  catch (e) { fail(`${name} is not valid JSON: ${e.message}`); }
}

/* local wall-clock time in a zone → UTC instant */
function tzOffsetMin(ts, zone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(ts))) p[part.type] = part.value;
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

async function buildMessage() {
  const birth = parseEnvJson('BIRTH', true);
  for (const k of ['date', 'time', 'lat', 'lon']) {
    if (birth[k] === undefined) fail(`BIRTH is missing "${k}".`);
  }
  let zone = birth.zone;
  if (!zone) {
    try { zone = require('tz-lookup')(birth.lat, birth.lon); }
    catch (e) { zone = 'UTC'; }
  }

  const utc = zonedToUtc(birth.date, birth.time, zone);
  const natal = C.computeChart(utc, birth.lat, birth.lon);
  const now = new Date();
  const transits = C.computeChart(now, birth.lat, birth.lon);

  const satMeta = await S.loadTLEs();
  const sats = S.placeSatellites(satMeta.tles, now, natal, C.houseOf);

  const msg = O.generate({
    natal, transits, satellites: sats,
    dateKey: now.toISOString().slice(0, 10),
    norm180: C.norm180,
  });

  // The notification shows the greeting and the star paragraphs. The satellite
  // paragraph stays in the app — it is the reward for tapping through.
  const body = [msg.tagline].concat(msg.paragraphs.slice(0, 2)).join('\n\n');
  return {
    title: msg.greeting,
    body,
    url: process.env.APP_URL || './',
    meta: { satelliteSource: satMeta.source, sunSign: natal.sunSignName },
  };
}

async function main() {
  const payload = await buildMessage();

  console.log('— ' + payload.title);
  console.log(payload.body.replace(/^/gm, '  '));
  console.log(`\n(satellite elements: ${payload.meta.satelliteSource})`);

  if (DRY) { console.log('\n✓ dry run — nothing sent'); return; }

  const webpush = require('web-push');
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) fail('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:oracle@example.com', pub, priv);

  let subs = parseEnvJson('PUSH_SUBSCRIPTION', true);
  if (!Array.isArray(subs)) subs = [subs];

  let sent = 0, gone = 0;
  for (const sub of subs) {
    if (!sub || !sub.endpoint) { console.error('✗ a subscription has no endpoint; skipped'); continue; }
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: payload.title, body: payload.body, url: payload.url,
      }));
      sent++;
      console.log('✓ sent to ' + sub.endpoint.slice(0, 48) + '…');
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        gone++;
        console.error('✗ subscription expired (' + err.statusCode + '). Re-subscribe in the ' +
          'app and update the PUSH_SUBSCRIPTION secret.');
      } else {
        console.error('✗ push failed (' + (err.statusCode || '?') + '): ' + err.message);
      }
    }
  }
  console.log(`\n${sent} sent, ${gone} expired, ${subs.length} total`);
  if (sent === 0) process.exit(1);
}

main().catch(e => fail(e.stack || e.message));
