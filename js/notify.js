/* notify.js — subscribe this device to the morning horoscope.
 *
 * iOS note: Safari only allows web push for sites added to the Home Screen,
 * on iOS 16.4 or later. The button explains itself when that isn't the case
 * rather than failing silently. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

  function say(html, cls) {
    const el = $('notify-status');
    el.innerHTML = html;
    el.className = 'notify-status' + (cls ? ' ' + cls : '');
  }

  function showSubscription(sub) {
    const json = JSON.stringify(sub);
    $('notify-sub').value = json;
    $('notify-result').hidden = false;
    const mail = $('notify-mail');
    mail.href = 'mailto:?subject=' + encodeURIComponent('Orbital Oracle push subscription') +
      '&body=' + encodeURIComponent(
        'Paste this into the GitHub secret PUSH_SUBSCRIPTION:\n\n' + json);
  }

  async function subscribe() {
    const cfg = window.PUSH_CONFIG || {};
    if (!cfg.vapidPublicKey) {
      say('No VAPID key set yet. Add one in <code>js/push-config.js</code> — see ' +
          '<code>docs/NOTIFICATIONS.md</code>.', 'err');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      say(isIOS() && !isStandalone()
        ? 'On iPhone, push works only once this is on your Home Screen. Tap Share → ' +
          '<strong>Add to Home Screen</strong>, open it from there, and press this button again.'
        : 'This browser does not support push notifications.', 'err');
      return;
    }
    if (isIOS() && !isStandalone()) {
      say('Almost — on iPhone you must open this from the Home Screen icon, not Safari. ' +
          'Tap Share → <strong>Add to Home Screen</strong>, then open that and try again.', 'err');
      return;
    }

    try {
      say('Asking permission…');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        say('Permission denied. You can re-enable it in Settings → Notifications.', 'err');
        return;
      }
      say('Registering…');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
        });
      }
      await reg.showNotification('Orbital Oracle', {
        body: 'Subscribed. The stars will be in touch each morning.',
        icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      });
      say('✓ This device is subscribed. One step left: copy the text below into the ' +
          'GitHub secret <code>PUSH_SUBSCRIPTION</code>.', 'ok');
      showSubscription(sub.toJSON());
    } catch (err) {
      say('Could not subscribe: ' + err.message, 'err');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('btn-notify');
    if (!btn) return;
    btn.addEventListener('click', subscribe);
    $('notify-copy').addEventListener('click', async () => {
      const ta = $('notify-sub');
      try {
        await navigator.clipboard.writeText(ta.value);
        $('notify-copy').textContent = 'Copied ✓';
        setTimeout(() => { $('notify-copy').textContent = 'Copy'; }, 2000);
      } catch (e) {
        ta.select();
      }
    });
    if (isIOS() && !isStandalone()) {
      say('Tip: add this to your Home Screen first — iPhone only allows notifications ' +
          'for installed web apps.');
    }
  });
})();
