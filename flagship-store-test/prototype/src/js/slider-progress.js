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
 * Optional previous / next buttons ([data-slider-prev], [data-slider-next])
 * step the carousel one slide at a time — a slide's width plus the gap — and
 * are marked aria-disabled at either end. Smooth unless the reader prefers
 * reduced motion; the snap settles the final position either way.
 *
 * With [data-slider-center] on the root the carousel opens on its middle
 * slide, centred, so there is one to either side (the social-proof reviews);
 * where the slides fit and nothing scrolls, it does nothing.
 *
 * With [data-slider-bounce] the carousel answers a drag past either end: the
 * slides follow the finger with growing resistance (a rubber band, never
 * more than MAX px) and spring back with a little overshoot on release, so
 * the end feels soft rather than a dead stop. The browser's own edge effect
 * is switched off on the track (overscroll-behavior-x: none, slider.css) so
 * every phone feels the same. Touch only, and off under reduced motion.
 *
 * Used by the PDP's social-proof reviews and the homepage's Loop essentials.
 *
 * Hooks: [data-slider] on the carousel's root, [data-slider-track] on the
 * scrolling element, [data-slider-fill] on the fill, [data-slider-prev] and
 * [data-slider-next] on the buttons.
 */
(function () {
  'use strict';

  function setup(root) {
    var track = root.querySelector('[data-slider-track]');
    var fill = root.querySelector('[data-slider-fill]');
    if (!track || !fill) return;
    var prev = root.querySelector('[data-slider-prev]');
    var next = root.querySelector('[data-slider-next]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var frame = null;

    function paint() {
      frame = null;
      var travel = track.scrollWidth - track.clientWidth;
      var p = travel > 0 ? track.scrollLeft / travel : 0;
      fill.style.setProperty('--p', p.toFixed(4));
      // An end counts as reached once its slide sits where it snaps to (or the
      // track can go no further), within 2px — a centred snap can settle a
      // pixel or so short of the track's very end.
      var ends = snapEnds(travel);
      if (prev) prev.setAttribute('aria-disabled', String(track.scrollLeft <= ends[0] + 2));
      if (next) next.setAttribute('aria-disabled', String(track.scrollLeft >= ends[1] - 2));
    }

    // The scroll positions at which the first and last visible slides snap into
    // place, clamped to the track's range.
    function snapEnds(travel) {
      var slides = Array.prototype.filter.call(track.children, function (slide) {
        return slide.offsetWidth > 0;
      });
      if (!slides.length) return [0, travel];
      if (getComputedStyle(slides[0]).scrollSnapAlign.indexOf('center') === -1) return [0, travel];
      var box = track.getBoundingClientRect();
      var at = function (slide) {
        var r = slide.getBoundingClientRect();
        return track.scrollLeft + r.left - box.left - track.clientLeft + r.width / 2 - track.clientWidth / 2;
      };
      return [Math.max(0, at(slides[0])), Math.min(travel, at(slides[slides.length - 1]))];
    }

    // One slide: from one slide's start to the next — which is its width plus
    // the gap, or less where slides overlap (Loop essentials, below lg).
    function step(direction) {
      var slide = track.firstElementChild;
      if (!slide) return;
      var after = slide.nextElementSibling;
      var pitch = after && after.offsetWidth
        ? after.getBoundingClientRect().left - slide.getBoundingClientRect().left
        : slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
      track.scrollBy({
        left: direction * pitch,
        behavior: reduce.matches ? 'auto' : 'smooth',
      });
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    function schedule() {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    }

    // Open on the middle slide, centred in the track, without animating.
    if (root.hasAttribute('data-slider-center') && track.scrollWidth > track.clientWidth) {
      var slides = track.children;
      var middle = slides[Math.floor(slides.length / 2)];
      if (middle) {
        var box = middle.getBoundingClientRect();
        var trackBox = track.getBoundingClientRect();
        track.scrollLeft += box.left - trackBox.left - (track.clientWidth - box.width) / 2;
      }
    }

    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    paint();

    if (root.hasAttribute('data-slider-bounce')) bounce(track, reduce);
  }

  /* The rubber band. While a horizontal drag would take the track past an end,
     the overshoot is eased — 1 - 1 / (x / MAX * 0.55 + 1), the curve iOS uses —
     and applied as a translate on the track; on release it springs home. */
  var MAX = 100; // px: the most the slides ever travel past an end
  var SPRING = 'transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1)';

  function bounce(track, reduce) {
    var startX = 0, startY = 0, startScroll = 0, axis = null, pulled = 0;

    function rubber(over) {
      var sign = over < 0 ? -1 : 1;
      var x = Math.abs(over);
      return sign * (1 - 1 / ((x / MAX) * 0.55 + 1)) * MAX;
    }

    function release() {
      if (!pulled) return;
      pulled = 0;
      track.style.transition = SPRING;
      track.style.transform = 'translateX(0)';
    }

    track.addEventListener('transitionend', function (event) {
      if (event.target === track && event.propertyName === 'transform' && !pulled) {
        track.style.transition = '';
        track.style.transform = '';
      }
    });

    track.addEventListener('touchstart', function (event) {
      if (reduce.matches || event.touches.length !== 1) return;
      var t = event.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScroll = track.scrollLeft;
      axis = null;
      track.style.transition = '';
    }, { passive: true });

    track.addEventListener('touchmove', function (event) {
      if (reduce.matches || event.touches.length !== 1) return;
      var t = event.touches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (axis === null) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axis !== 'x') return;
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 0) return;
      // Where the drag would put the track, and how far past an end that is.
      var wanted = startScroll - dx;
      var over = wanted < 0 ? -wanted : wanted > max ? max - wanted : 0;
      pulled = over;
      track.style.transform = over ? 'translateX(' + rubber(over).toFixed(2) + 'px)' : '';
    }, { passive: true });

    track.addEventListener('touchend', release);
    track.addEventListener('touchcancel', release);
  }

  document.querySelectorAll('[data-slider]').forEach(setup);
})();
