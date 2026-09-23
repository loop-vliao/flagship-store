/**
 * Slider progress
 * ---------------
 * A scroll-snap carousel's progress bar: a short fill that travels along its
 * rail as the carousel is scrolled. It reports where the carousel has been
 * scrolled to, so it is driven from the scroll position rather than from a
 * slide index — the slides snap, but a finger halfway between two of them
 * should show the fill halfway too.
 *
 * `--p` runs 0 to 1 on the fill, and src/css/components/slider.css moves it
 * by `--travel` of its own width, set on the fill to suit its rail: 200% for a
 * fill a third of its rail, 250% for 80 of 280. Scrolling is the browser's own
 * — scroll-snap in CSS — so there is no drag handling here, and none of this
 * is required for the carousel to work. Where a layout stops scrolling (the
 * slides fit), the rail is hidden by its utilities and this does nothing.
 *
 * Used by the PDP's social-proof reviews and the homepage's Loop essentials.
 *
 * Hooks: [data-slider] on the carousel's root, [data-slider-track] on the
 * scrolling element, [data-slider-fill] on the fill.
 */
(function () {
  'use strict';

  function setup(root) {
    var track = root.querySelector('[data-slider-track]');
    var fill = root.querySelector('[data-slider-fill]');
    if (!track || !fill) return;

    var frame = null;

    function paint() {
      frame = null;
      var travel = track.scrollWidth - track.clientWidth;
      var p = travel > 0 ? track.scrollLeft / travel : 0;
      fill.style.setProperty('--p', p.toFixed(4));
    }

    function schedule() {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    }

    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    paint();
  }

  document.querySelectorAll('[data-slider]').forEach(setup);
})();
