/* Portfolio behavior. No dependencies, no build step. Four small features:
   copy email to clipboard, back to top, highlight the card in view on touch
   devices, and the hero background animation. */

// The one value to change when the career email is ready. It is assembled from
// parts rather than written out, and the markup shows a spaced out version, so
// a crawler doing a plain text scan of either file comes up empty. Anyone who
// bothers to run the page still gets it, so this stops the lazy scrapers and
// not the determined ones.
const EMAIL = ['abrahamjhernandez.dev', 'gmail.com'].join('@');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------------------------------------------------------- clipboard */

const toast = document.querySelector('[data-toast]');
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

document.querySelectorAll('[data-copy-email]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      // Chrome does not always reject a clipboard write when the document is
      // not focused: it can leave the promise pending forever, which would
      // leave the click with no feedback at all. Race it so the fallback still
      // runs.
      await Promise.race([
        navigator.clipboard.writeText(EMAIL),
        new Promise((_, reject) => setTimeout(reject, 1500)),
      ]);
      showToast('Copied to clipboard');
    } catch {
      // The browser can refuse clipboard access, for instance without a real
      // user gesture or outside a secure context. Show the address instead of
      // navigating away to a mail client, which would throw the visitor out of
      // the page for what they expected to be a copy.
      showToast(EMAIL);
    }
  });
});

/* -------------------------------------------------------------- back to top */

document.querySelectorAll('[data-back-to-top]').forEach((button) => {
  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    });
  });
});

/* ------------------------------------------------- card highlight on mobile */

/* On a phone there is no hover, so nothing ever highlights. Instead, give the
   highlight to whichever card is mostly on screen. Desktop keeps real hover
   and this stays switched off. */

const narrow = window.matchMedia('(max-width: 45.99rem)');
const cards = document.querySelectorAll('.card');
let cardObserver;

function watchCards() {
  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
        entry.target.classList.add('is-in-view');
      } else if (entry.intersectionRatio < 0.2) {
        entry.target.classList.remove('is-in-view');
      }
    });
  }, { threshold: [0, 0.2, 0.4, 1] });

  cards.forEach((card) => cardObserver.observe(card));
}

function unwatchCards() {
  if (cardObserver) cardObserver.disconnect();
  cardObserver = null;
  cards.forEach((card) => card.classList.remove('is-in-view'));
}

function syncCardWatching() {
  if (narrow.matches) {
    if (!cardObserver) watchCards();
  } else {
    unwatchCards();
  }
}

syncCardWatching();
narrow.addEventListener('change', syncCardWatching);

/* -------------------------------------------------------- demo clips */

/* The project cards autoplay looping screen recordings. A CSS media query
   cannot stop a <video>, so reduced motion has to be handled here: pause every
   clip, show its controls so it can still be watched deliberately, and react if
   the visitor changes the setting while the page is open. */

const clips = document.querySelectorAll('.card__media video');
const visibleClips = new Set();

function syncClipPlayback(clip) {
  if (visibleClips.has(clip) && !prefersReducedMotion.matches) {
    // play() rejects if the browser blocks it, which is not an error worth
    // surfacing on a decorative clip.
    clip.play().catch(() => {});
  } else {
    clip.pause();
  }
}

const clipObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
      visibleClips.add(entry.target);
    } else {
      visibleClips.delete(entry.target);
    }
    syncClipPlayback(entry.target);
  });
}, { threshold: [0, 0.25, 1] });

clips.forEach((clip) => clipObserver.observe(clip));

function applyMotionPreference() {
  const reduce = prefersReducedMotion.matches;
  clips.forEach((clip) => {
    clip.controls = reduce;
    if (reduce) {
      clip.autoplay = false;
      clip.loop = false;
      clip.pause();
    } else {
      clip.loop = true;
      syncClipPlayback(clip);
    }
  });
}

applyMotionPreference();
prefersReducedMotion.addEventListener('change', applyMotionPreference);

/* ----------------------------------------------------- hero background */

/* A grid of faint dots with a soft band of light sweeping diagonally across
   it. Drawn on a canvas rather than shipped as an image so it scales to any
   viewport and costs a few hundred bytes instead of a few hundred kilobytes. */

const canvas = document.querySelector('.hero__canvas');

if (canvas && !prefersReducedMotion.matches) {
  const ctx = canvas.getContext('2d');

  const SPACING = 26;   // px between dots
  const SPEED = 110;    // px per second the band travels
  const SLOPE = 0.45;   // how far the band leans off vertical
  const REST_ALPHA = 0.1;  // brightness of a dot the band is nowhere near
  const PEAK_ALPHA = 0.45; // extra brightness at the centre of the band

  // The band scales with the viewport. A fixed pixel width that looks right on
  // a phone reads as a thin stripe on a wide monitor.
  let band = 240;

  let width = 0;
  let height = 0;
  let offset = null; // set on first measure, once the band width is known
  let lastFrame = 0;
  let frameId;

  // The canvas is sized in CSS pixels but drawn on a backing store scaled by
  // the device pixel ratio, otherwise it looks soft on a retina screen.
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    band = Math.max(220, width * 0.4);

    // Start one band width offscreen so the sweep enters rather than popping
    // into view. Only on the first measure, or a resize would restart it.
    if (offset === null) offset = -band;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // How far "along" runs from the first dot to the last one.
    const span = width + height * SLOPE;

    for (let y = SPACING / 2; y < height; y += SPACING) {
      for (let x = SPACING / 2; x < width; x += SPACING) {
        // Distance from this dot to the centre of the band, measured along the
        // band's direction of travel.
        const along = x + y * SLOPE;
        const distance = Math.abs(along - offset);

        // Dots outside the band stay at their resting brightness.
        let intensity = 0;
        if (distance < band) {
          const t = 1 - distance / band;
          intensity = t * t; // squared so the falloff is soft in the middle
        }

        const alpha = REST_ALPHA + intensity * PEAK_ALPHA;
        const radius = 1 + intensity * 0.9;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 158, 62, ${alpha})`;
        ctx.fill();
      }
    }

    // Fade the bottom edge out so the field dissolves into the page instead of
    // stopping at a hard line.
    const fade = height * 0.35;
    const gradient = ctx.createLinearGradient(0, height - fade, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - fade, width, fade);
    ctx.globalCompositeOperation = 'source-over';

    return span;
  }

  function tick(now) {
    // Advance by real elapsed time rather than per frame, so the band moves at
    // the same speed on a 60Hz and a 144Hz display. The delta is clamped
    // because a backgrounded tab can return a very large one.
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;

    const span = draw();

    // The band starts one width off the leading edge and wraps once it is one
    // width past the trailing edge, so it enters and leaves smoothly instead of
    // travelling offscreen for several seconds and then snapping back.
    const travel = span + band * 2;
    offset += SPEED * delta;
    if (offset > span + band) offset -= travel;

    frameId = requestAnimationFrame(tick);
  }

  resize();

  // A plain resize listener is not enough: the first measurement can happen
  // before fonts finish loading and the hero settles at its real height, which
  // leaves the dot field painting into a stale, too-small box. A
  // ResizeObserver fires on that first layout too, so the canvas always
  // matches the element it is sitting in.
  new ResizeObserver(resize).observe(canvas);

  frameId = requestAnimationFrame(tick);

  // If the visitor turns on reduced motion while the page is open, stop.
  prefersReducedMotion.addEventListener('change', (event) => {
    if (event.matches) {
      cancelAnimationFrame(frameId);
      ctx.clearRect(0, 0, width, height);
    }
  });
}
