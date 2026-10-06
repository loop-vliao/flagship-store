/**
 * Hero earplugs on scroll
 * -----------------------
 * As the page scrolls, the hero's two earplugs sink behind the plate and turn
 * back out to the 15deg they rose in at. Measured off the Principle recording,
 * where the motion is linear in scroll position, so it reverses exactly on
 * the way back up:
 *
 *   left   sinks 0.397px for every px scrolled, turning to -15deg
 *   right  sinks 0.286px for every px scrolled, turning to +15deg
 *
 * Both turns complete over the first 800px of scroll at 1512 — the plate's
 * 772 plus 28, so the plate's height x 800/772, which carries the same feel
 * to the taller mobile plate.
 *
 * This writes two plain numbers on the render cluster — --hero-sy (px
 * scrolled) and --hero-turn (0-1) — and src/css/components/hero-motion.css
 * turns them into distance and angle. The CSS uses `transform`, while the
 * intro animates the separate `translate` and `rotate` properties, so the
 * two compose rather than fight if someone scrolls mid-intro.
 *
 * Idle while the hero is off screen; nothing at all under reduced motion.
 *
 * Hooks: [data-hero-scroll] on the section, [data-hero-scroll-plate],
 * [data-hero-scroll-cluster].
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var hero = document.querySelector('[data-hero-scroll]');
  var plate = hero && hero.querySelector('[data-hero-scroll-plate]');
  var cluster = hero && hero.querySelector('[data-hero-scroll-cluster]');
  if (!plate || !cluster) return;

  var TURN = 800 / 772;
  var frame = null;
  var onScreen = true;

  function tick() {
    frame = null;
    var scrolled = Math.max(0, window.scrollY || window.pageYOffset || 0);
    var range = plate.offsetHeight * TURN;
    cluster.style.setProperty('--hero-sy', scrolled.toFixed(1));
    cluster.style.setProperty('--hero-turn', Math.min(1, scrolled / range).toFixed(4));
  }

  function wake() {
    if (onScreen && frame === null) frame = window.requestAnimationFrame(tick);
  }

  new IntersectionObserver(function (entries) {
    onScreen = entries[0].isIntersecting;
    wake();
  }).observe(hero);

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  tick();
})();
