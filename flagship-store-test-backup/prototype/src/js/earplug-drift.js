/**
 * Earplug drift
 * -------------
 * Two effects on every earplug carrying `data-drift`, both deliberately slight:
 *
 *   drift      they lean toward the cursor (desktop pointers only)
 *   parallax   they lag the page as their section crosses the viewport
 *   tilt       they turn a few degrees with the same two inputs
 *
 * All three resolve into the same --dx / --dy / --rz that each section's CSS
 * folds into its own transform, so nothing here needs to know about the drawn
 * angle, the flip, or which corner an earplug sits in. --rz is a delta on top
 * of whatever the artboard draws, never the angle itself.
 *
 * `data-drift` is either `lead` or `trail` and picks how much of the parallax
 * that earplug takes: different rates are what separate the pair in depth,
 * where equal rates would just move the whole section.
 *
 * The distances, the turn and the easing live in CSS (--bud-drift,
 * --bud-parallax, --bud-tilt, --bud-ease), set once for every section that
 * uses this so the try-me band and social proof cannot drift apart.
 *
 * One rAF loop runs while any section with earplugs is on screen.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Drift is a pointer affordance; a touch screen has no hover to respond to.
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var RATE = { lead: 1, trail: 0.6 };

  var buds = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'))
    .map(function (el) {
      return {
        el: el,
        section: el.closest('section'),
        rate: RATE[el.getAttribute('data-drift')] || 1,
        at: { x: 0, y: 0, r: 0 },
      };
    })
    .filter(function (bud) { return bud.section; });

  if (!buds.length) return;

  var sections = buds.map(function (b) { return b.section; })
    .filter(function (s, i, all) { return all.indexOf(s) === i; });

  var onScreen = new WeakMap();
  var pointer = { x: 0, y: 0 };   // -1..1 from the section's centre
  var frame = null;

  function tune(section, name, fallback) {
    return parseFloat(getComputedStyle(section).getPropertyValue(name)) || fallback;
  }

  function tick() {
    var viewport = window.innerHeight || document.documentElement.clientHeight;
    var leaning = finePointer.matches;
    var settled = true;
    var live = false;

    buds.forEach(function (bud) {
      if (!onScreen.get(bud.section)) return;
      live = true;

      var box = bud.section.getBoundingClientRect();
      var centre = box.top + box.height / 2;
      var travel = viewport / 2 + box.height / 2;
      // +1 entering from below, -1 once it has left above.
      var progress = Math.max(-1, Math.min(1, (centre - viewport / 2) / travel));

      var drift = tune(bud.section, '--bud-drift', 0);
      var parallax = tune(bud.section, '--bud-parallax', 0);
      var tilt = tune(bud.section, '--bud-tilt', 0);
      var ease = tune(bud.section, '--bud-ease', 0.08);

      // The turn rides the two inputs that are already there rather than
      // adding a third: how far across the section the cursor is, and how far
      // through its travel the section is. Clamped so --bud-tilt is a true
      // maximum however the two line up.
      var lean = (leaning ? pointer.x : 0) + progress * bud.rate;

      var target = {
        x: leaning ? pointer.x * drift : 0,
        y: (leaning ? pointer.y * drift : 0) + progress * parallax * bud.rate,
        r: Math.max(-1, Math.min(1, lean)) * tilt,
      };

      bud.at.x += (target.x - bud.at.x) * ease;
      bud.at.y += (target.y - bud.at.y) * ease;
      bud.at.r += (target.r - bud.at.r) * ease;

      if (Math.abs(target.x - bud.at.x) > 0.05 ||
          Math.abs(target.y - bud.at.y) > 0.05 ||
          Math.abs(target.r - bud.at.r) > 0.01) {
        settled = false;
      }

      bud.el.style.setProperty('--dx', bud.at.x.toFixed(2) + 'px');
      bud.el.style.setProperty('--dy', bud.at.y.toFixed(2) + 'px');
      bud.el.style.setProperty('--rz', bud.at.r.toFixed(2) + 'deg');
    });

    // Idle out once nothing is moving; any input below wakes it again.
    frame = live && !settled ? window.requestAnimationFrame(tick) : null;
  }

  function wake() {
    if (frame === null) frame = window.requestAnimationFrame(tick);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      onScreen.set(entry.target, entry.isIntersecting);
    });
    wake();
  }, { rootMargin: '20% 0px' });

  sections.forEach(function (section) { observer.observe(section); });

  window.addEventListener('pointermove', function (event) {
    // Normalised against whichever section the pointer is over, so the full
    // drift is reached at that section's own corners.
    var section = sections.filter(function (s) { return onScreen.get(s); })[0];
    if (!section) return;
    var box = section.getBoundingClientRect();
    pointer.x = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2)));
    pointer.y = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2)));
    wake();
  }, { passive: true });

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
})();
