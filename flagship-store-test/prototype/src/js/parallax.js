/**
 * Scroll parallax
 * ---------------
 * One loop for every element carrying `data-parallax`. Each writes a single
 * `--p` — a plain number — that its own CSS multiplies by whatever travel that
 * element wants. Keeping the distance in CSS means it stays a fluid token, and
 * means nothing here has to know what it is moving.
 *
 * `--p` runs 0 to 1 as the section crosses the viewport, and both layers spend
 * it the same way: 0 is the composition exactly as drawn, reached just before
 * the section enters, and the layer travels *down* from there.
 *
 * `--sy` is the same crossing in plain pixels scrolled since the section's top
 * entered — for the USP collage, whose tiles move at a fixed share of the scroll
 * (measured off the prototype) rather than over a fixed distance.
 *
 * Down-only is the artwork's doing, not a preference. The hand is a cut-out
 * whose case sits at the top of its clipped box, so lifting it at all would
 * shear the top off before the section had even arrived; and the impact crops
 * carry headroom above the plate and none below. Scrolling back up returns
 * both to the drawn frame, which is what climbs the hand back out.
 *
 * Progress is the section's travel across the viewport, +1 entering from
 * below to -1 once it has left above — the same measure earplug-drift.js uses.
 *
 * rAF is only entered while a section is on screen, and `prefers-reduced-motion`
 * leaves everything at its drawn position.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'))
    .map(function (el) {
      var section = el.closest('section');
      return { el: el, section: section, on: false };
    })
    .filter(function (item) { return item.section; });

  if (!items.length) return;

  var frame = null;

  function tick() {
    var viewport = window.innerHeight || document.documentElement.clientHeight;
    var running = false;

    items.forEach(function (item) {
      if (!item.on) return;
      running = true;

      var box = item.section.getBoundingClientRect();
      var centre = box.top + box.height / 2;
      var travel = viewport / 2 + box.height / 2;
      // +1 entering from below, -1 once it has left above.
      var progress = Math.max(-1, Math.min(1, (centre - viewport / 2) / travel));

      item.el.style.setProperty('--p', ((1 - progress) / 2).toFixed(4));
      // Pixels scrolled since the section's top came up past the bottom of the
      // screen — for layers that move at a rate of the scroll rather than across
      // a fixed distance (the USP collage).
      item.el.style.setProperty('--sy', Math.max(0, viewport - box.top).toFixed(1));
    });

    frame = running ? window.requestAnimationFrame(tick) : null;
  }

  function wake() {
    if (frame === null) frame = window.requestAnimationFrame(tick);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      items.forEach(function (item) {
        if (item.section === entry.target) item.on = entry.isIntersecting;
      });
    });
    wake();
  }, { rootMargin: '20% 0px' });

  items.forEach(function (item) { observer.observe(item.section); });

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);

  // USP collage stops. The outer tiles travel until their feet are level with
  // the middle tile's. Measured from offsetTop/offsetHeight, which ignore the
  // transforms, so the reading is the drawn layout whatever the scroll.
  var collage = document.querySelector('[data-parallax="usp"]');
  if (collage) {
    var middle = collage.querySelector('[data-tile="2"]');
    var outer = { 1: collage.querySelector('[data-tile="1"]'), 3: collage.querySelector('[data-tile="3"]') };
    var measure = function () {
      var foot = middle.offsetTop + middle.offsetHeight;
      [1, 3].forEach(function (n) {
        var tile = outer[n];
        var gap = foot - (tile.offsetTop + tile.offsetHeight);
        collage.style.setProperty('--usp-stop-' + n, Math.max(0, gap).toFixed(1) + 'px');
      });
    };
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(collage);
    else window.addEventListener('resize', measure);
  }
})();
