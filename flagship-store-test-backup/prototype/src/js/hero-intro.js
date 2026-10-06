/**
 * Hero intro
 * ----------
 * The nav and the hero build in on every page load, to the timeline of the
 * Principle prototype (see src/css/components/hero-motion.css for every
 * part's delay, length and travel). The motion is all CSS; this only decides
 * when it starts and tidies up once it has finished.
 *
 * An inline script in <head> sets data-hero-intro="hold" on <html> before the
 * first paint — unless the reader prefers reduced motion — which holds every
 * part at its starting point. This sets it to "go" once the hero's images have
 * decoded, or after 600ms if they are slow, so the renders never rise in
 * half-loaded.
 *
 * When the longest part (the gradient's five-second settle) is done, the
 * attribute comes off. With it go the animations, so a later layout change —
 * the nav swapping logos at 768, say — can't replay a part on its own.
 *
 * Hooks: data-hero-intro on <html> ("hold" → "go" → removed), and
 * [data-hero-intro-img] on the hero images waited for.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.hasAttribute('data-hero-intro')) return;

  var LONGEST = 5000;
  var WAIT = 600;
  var started = false;

  function go() {
    if (started) return;
    started = true;
    root.setAttribute('data-hero-intro', 'go');
    window.setTimeout(function () {
      root.removeAttribute('data-hero-intro');
    }, LONGEST + 100);
  }

  var images = document.querySelectorAll('[data-hero-intro-img]');
  Promise.all(Array.prototype.map.call(images, function (img) {
    return img.decode ? img.decode().catch(function () {}) : null;
  })).then(go);
  window.setTimeout(go, WAIT);
})();
