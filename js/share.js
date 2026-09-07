/* share.js — renders today's reading as a 1080px-wide PNG for sharing.
 * Draws the night sky + message on a canvas, then offers download / Web Share,
 * with an on-screen preview as the universal fallback (long-press to save). */
(function () {
  'use strict';

  const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
  const MONO = '"IBM Plex Mono", Menlo, Consolas, monospace';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function wrap(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const probe = line ? line + ' ' + w : w;
      if (ctx.measureText(probe).width > maxWidth && line) {
        lines.push(line); line = w;
      } else line = probe;
    }
    if (line) lines.push(line);
    return lines;
  }

  async function renderCard({ dateText, greeting, tagline, paragraphs }) {
    try { await document.fonts.ready; } catch (e) {}

    const W = 1080, M = 96, TEXTW = W - 2 * M;
    const c = document.createElement('canvas');
    const x = c.getContext('2d');

    // ---- measure pass (layout before we know the height) ----
    const blocks = [];
    let y = 150;
    blocks.push({ t: 'brand', y }); y += 78;
    blocks.push({ t: 'date', y }); y += 96;
    blocks.push({ t: 'greeting', y }); y += 84;
    blocks.push({ t: 'tagline', y }); y += 100;

    c.width = W; // context needed for measuring
    const paraFont = `italic 400 36px ${SERIF}`;
    const LH = 56;
    const paraLines = [];
    paragraphs.forEach((p, i) => {
      x.font = paraFont;
      const lines = wrap(x, p, TEXTW);
      paraLines.push(lines);
      if (i === paragraphs.length - 1) y += 56; // divider before satellite para
      blocks.push({ t: 'para', y, i });
      y += lines.length * LH + 44;
    });
    y += 30;
    blocks.push({ t: 'foot', y }); y += 110;

    const H = Math.max(1350, y);
    const extra = H - y;
    const shift = extra > 0 ? Math.floor(extra / 2) : 0;

    c.width = W; c.height = H;

    // ---- paint ----
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1830'); g.addColorStop(0.55, '#0a0a14'); g.addColorStop(1, '#0a0a14');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    const rng = mulberry32(20260101 ^ H);
    for (let i = 0; i < 130; i++) {
      const sx = rng() * W, sy = rng() * H, r = rng() * 1.3 + 0.3;
      x.globalAlpha = 0.25 + rng() * 0.55;
      x.fillStyle = rng() < 0.2 ? '#ffe9b8' : '#ffffff';
      x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill();
    }
    x.globalAlpha = 1;

    // thin frame
    x.strokeStyle = 'rgba(212,180,106,0.35)';
    x.lineWidth = 2;
    x.strokeRect(40, 40, W - 80, H - 80);

    x.textAlign = 'center';
    for (const b of blocks) {
      const by = b.y + shift;
      if (b.t === 'brand') {
        x.fillStyle = '#b89d5e';
        x.font = `500 30px ${MONO}`;
        x.fillText('☾  ✦  🛰', W / 2, by - 46);
        x.font = `600 34px ${SERIF}`;
        x.fillStyle = '#d4b46a';
        const brand = 'O R B I T A L   O R A C L E';
        x.fillText(brand, W / 2, by + 8);
      } else if (b.t === 'date') {
        x.fillStyle = '#6a6478';
        x.font = `400 24px ${MONO}`;
        x.fillText(dateText.toUpperCase().split('').join(' '), W / 2, by);
      } else if (b.t === 'greeting') {
        x.fillStyle = '#e8e4d8';
        x.font = `italic 600 66px ${SERIF}`;
        x.fillText(greeting, W / 2, by);
      } else if (b.t === 'tagline') {
        x.fillStyle = '#e8e4d8';
        x.font = `italic 400 42px ${SERIF}`;
        x.fillText(tagline, W / 2, by);
      } else if (b.t === 'para') {
        if (b.i === paragraphs.length - 1) {
          x.strokeStyle = 'rgba(212,180,106,0.3)';
          x.lineWidth = 1;
          x.beginPath(); x.moveTo(W / 2 - 140, by - 48); x.lineTo(W / 2 + 140, by - 48); x.stroke();
          x.fillStyle = '#cfd8e8';
        } else {
          x.fillStyle = '#e8e4d8';
        }
        x.font = paraFont;
        paraLines[b.i].forEach((ln, k) => x.fillText(ln, W / 2, by + k * LH));
      } else if (b.t === 'foot') {
        x.fillStyle = '#6a6478';
        x.font = `italic 26px ${SERIF}`;
        x.fillText('the stars have spoken · so have the satellites', W / 2, by);
      }
    }
    return c;
  }

  function showOverlay(canvas, blob) {
    let ov = document.getElementById('share-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'share-overlay';
    ov.innerHTML =
      '<div class="share-box">' +
      '<img alt="Your reading as an image">' +
      '<div class="share-actions">' +
      '<button type="button" id="share-download">Download PNG</button>' +
      (navigator.share ? '<button type="button" id="share-native">Share…</button>' : '') +
      '<button type="button" id="share-close">Close</button>' +
      '</div>' +
      '<p class="share-hint">On mobile: press and hold the image to save it.</p>' +
      '</div>';
    document.body.appendChild(ov);
    const url = URL.createObjectURL(blob);
    ov.querySelector('img').src = url;
    ov.querySelector('#share-close').onclick = () => { URL.revokeObjectURL(url); ov.remove(); };
    ov.onclick = (e) => { if (e.target === ov) { URL.revokeObjectURL(url); ov.remove(); } };
    ov.querySelector('#share-download').onclick = async () => {
      const filename = 'orbital-oracle-' + new Date().toISOString().slice(0, 10) + '.png';
      // Claude artifact viewer: downloads go through the platform's save flow
      if (window.claude && typeof window.claude.use === 'function') {
        try {
          const dl = await window.claude.use('downloads');
          if (dl) { await dl.save({ filename, data: blob }); return; }
        } catch (e) { /* declined or unavailable — fall through */ }
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    };
    const nat = ov.querySelector('#share-native');
    if (nat) nat.onclick = async () => {
      try {
        const file = new File([blob], 'orbital-oracle.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Orbital Oracle' });
      } catch (e) { /* user cancelled or unsupported — the preview remains */ }
    };
  }

  window.Share_ = {
    async fromReading() {
      const canvas = await renderCard({
        dateText: document.getElementById('msg-date').textContent,
        greeting: document.getElementById('msg-greeting').textContent,
        tagline: document.getElementById('msg-tagline').textContent,
        paragraphs: Array.from(document.querySelectorAll('#msg-body p')).map(p => p.textContent),
      });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      showOverlay(canvas, blob);
    },
  };
})();
