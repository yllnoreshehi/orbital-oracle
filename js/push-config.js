/* push-config.js — the one value you have to fill in yourself.
 *
 * Generate a VAPID key pair on your machine:
 *     npx web-push generate-vapid-keys
 *
 * Paste the PUBLIC key below (it is public — safe to commit).
 * Put the PRIVATE key in a GitHub secret called VAPID_PRIVATE_KEY.
 * Full walkthrough: docs/NOTIFICATIONS.md
 */
window.PUSH_CONFIG = {
  vapidPublicKey: 'BFSwwqN7IW9-Bc5kTin9cvioOm9WVPg1lrRqVPZ6ahgIltZ-cenC2y6HB3PyzPLeR_i7f3C16cE5aGfrjaYI-QM',   // ← paste your public key here
};
