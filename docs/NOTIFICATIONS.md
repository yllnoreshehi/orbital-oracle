# Morning notifications

Get the daily horoscope pushed to your phone each morning. No App Store, no
developer account, no server — GitHub Actions sends it for free.

It works because the chart and message code runs unchanged in Node, so a
scheduled job can compute exactly what the website would show you.

**Requirements:** an iPhone on iOS 16.4 or later (released March 2023), or any
Android phone. On iPhone the app must be on your Home Screen — Apple only
allows notifications for installed web apps, never for a normal Safari tab.

---

## 1. Generate your keys (on your computer, once)

```bash
npx web-push generate-vapid-keys
```

You get a **public** and a **private** key. The public one identifies your app
to Apple's push service; the private one proves the push is really from you.

Paste the **public** key into `js/push-config.js`:

```js
window.PUSH_CONFIG = {
  vapidPublicKey: 'BEl62iU...your public key...',
};
```

Commit and push that. The public key is safe in a public repo — that is what
"public" means here. **Never commit the private key.**

## 2. Add the app to your Home Screen

On your iPhone, open the site in Safari → Share → **Add to Home Screen**.
Then open it from the new icon, not from Safari.

## 3. Subscribe this device

In the app, generate your chart, then press **Notify me each morning** and
allow notifications. You should get a test notification immediately.

The app then shows a long line of JSON — your push subscription. Press
**Email it to myself** to get it onto your computer.

## 4. Add four secrets to GitHub

Repo → **Settings** → **Secrets and variables** → **Actions** → New repository secret.

| Secret | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the public key from step 1 |
| `VAPID_PRIVATE_KEY` | the private key from step 1 — this one is the password, treat it like one |
| `PUSH_SUBSCRIPTION` | the JSON from step 3 (for several devices, wrap them in `[ ... ]` separated by commas) |
| `BIRTH` | `{"date":"1991-08-11","time":"22:35","lat":46.8065,"lon":7.162}` |

Your birth details go in a secret rather than in the code so that a public
repository does not publish your birth time and place to the world.

Optional: `VAPID_SUBJECT` (a `mailto:` address push services can contact — some
providers prefer one), and a repository *variable* `APP_URL` set to your site,
so tapping the notification opens the app.

## 5. Test it

Repo → **Actions** → **morning horoscope** → **Run workflow**. Your phone should
buzz within a few seconds. The run log shows the exact message that was sent.

Afterwards it runs by itself at **06:12 UTC** daily — about 07:12 in Zürich in
winter, 08:12 in summer. To change it, edit the `cron` line in
`.github/workflows/daily-horoscope.yml`; it is always in UTC and cannot follow
daylight saving.

## Testing locally without sending

```bash
BIRTH='{"date":"1991-08-11","time":"22:35","lat":46.8065,"lon":7.162}' \
  node tools/daily-push.js --dry-run
```

Prints the notification it would send and stops.

---

## When it stops working

**Nothing arrives.** Check the Actions run first — it logs whether the push was
accepted. A `410` or `404` means the subscription expired (this happens
occasionally, and whenever you delete and re-add the Home Screen icon): press
**Notify me each morning** again and update the `PUSH_SUBSCRIPTION` secret.

**It stops after a couple of months of not touching the repo.** GitHub disables
scheduled workflows in repositories that have had no activity for 60 days. The
weekly satellite-refresh job counts as activity, so this should not happen —
but if it does, GitHub emails you, and re-enabling is one button in the Actions
tab.

**The notification time drifts by a few minutes.** GitHub's scheduler is
best-effort and queues jobs under load; a scheduled run can be late. For a
morning horoscope this is beneath notice.
