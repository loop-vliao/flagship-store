/**
 * "Different by design" carousel
 * ------------------------------
 * Three slides that advance on their own, with the benefit list as both the
 * label and the control:
 *
 *   auto    a slide holds for --carousel-dwell while its rule fills top-down,
 *           then hands over to the next one and loops
 *   manual  the first click, key press or swipe picks that slide and stops
 *           the advance for good — the reader has taken over, so the page
 *           stops moving under them. Hovering does nothing.
 *
 * From 900 the slides crossfade in one plate beside the list. Below 900 they
 * sit in a row (xs-pdp-product-design 554:12829): the slide on show fills the
 * box, a sliver of each neighbour peeks in from the gutter, --carousel-gap
 * apart, and the row is endless — each slide is placed by its offset from the
 * row's position, wrapped into the half-loop either side, so there is always
 * a slide on both sides and the one being wrapped is well off screen (with
 * three, a slide and a half out). A change of slide glides the row one step
 * (--carousel-glide, on the house curve), always forward on its own; a tab
 * takes the shorter way round. The row follows a sideways drag, and on
 * release settles on the next or previous slide if the drag went a fifth of
 * the way or was flicked, else back where it was — either way the list
 * follows and the reader has taken over. Vertical drags stay the page's
 * (touch-action: pan-y, carousel.css).
 *
 * The cycle only runs while the section is on screen and the tab is visible,
 * so a reader who scrolls past does not come back mid-sequence.
 *
 * ARIA: the list is a tablist and the media is its single panel. Arrow keys
 * move between rows, which counts as taking over just as a click does. The
 * slides not on show are aria-hidden.
 *
 * Timing lives in src/css/components/carousel.css (--carousel-dwell,
 * --carousel-fade, --carousel-glide, --carousel-gap) so it can be tuned with
 * the rest of the section.
 *
 * Hooks: [data-carousel] on the section, [data-carousel-media], [data-carousel-slide],
 * [data-carousel-list], [data-carousel-tab], [data-carousel-fill]. The media
 * carries [data-dragging] while a drag is under way.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // From 900 the plate crossfades beside the list; below it the row.
  var wide = window.matchMedia('(min-width: 56.25rem)');

  // The rule fills as a pill sliding down into it — see .carousel-fill. A plain
  // translate is the one thing every engine animates on the compositor, so the
  // fill keeps time even while the main thread is busy.
  var EMPTY = 'translateY(-100%)';
  var FULL = 'translateY(0%)';

  var SLOP = 6; // px a pointer moves before it counts as a drag, or as a scroll
  var NUDGE = 0.2; // share of a slide a slow drag must cover to move on
  var FLICK = 0.3; // px per ms that moves on however short the drag

  /* CSS time values arrive as "6s" or "600ms". */
  function ms(value) {
    var n = parseFloat(value);
    if (!n) return 0;
    return /ms\s*$/.test(value) ? n : n * 1000;
  }

  /* CSS lengths arrive as written: "0.625rem" or "10px". */
  function px(value) {
    var n = parseFloat(value) || 0;
    return /rem\s*$/.test(value) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
  }

  // CSS's cubic-bezier(), for a glide the script draws frame by frame (the row
  // wraps mid-glide, which a transition on each slide couldn't).
  function bezier(x1, y1, x2, y2) {
    function at(a1, a2, t) { return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t; }
    function slope(a1, a2, t) { return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1; }
    return function (x) {
      if (x <= 0 || x >= 1) return x;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var d = at(x1, x2, t) - x;
        var s = slope(x1, x2, t);
        if (Math.abs(d) < 1e-5 || Math.abs(s) < 1e-6) break;
        t = Math.min(1, Math.max(0, t - d / s));
      }
      return at(y1, y2, t);
    };
  }

  var HOUSE = bezier(0.25, 0.1, 0.25, 1); // --ease-loop: a glide on its own or from a tab
  var SETTLE = bezier(0.2, 0, 0, 1); // the drawers' ease-out: the finger has given it its speed

  function setup(section) {
    var tabs = Array.prototype.slice.call(section.querySelectorAll('[data-carousel-tab]'));
    var slides = Array.prototype.slice.call(section.querySelectorAll('[data-carousel-slide]'));
    var panel = section.querySelector('[data-carousel-media]');
    if (tabs.length < 2 || slides.length !== tabs.length || !panel) return;

    var style = getComputedStyle(section);
    var dwell = ms(style.getPropertyValue('--carousel-dwell')) || 6000;
    var glideTime = ms(style.getPropertyValue('--carousel-glide')) || 600;
    var count = slides.length;
    var index = 0;
    var auto = !reduceMotion.matches;
    var onScreen = false;
    var timer = null;
    var fill = null; // the running fill animation, so it can be cancelled

    /* --- The row, below 900 ------------------------------------------------ */

    var pos = 0; // the row's position in slides: slide i is on show at pos = i (mod count)
    var frame = null; // the glide under way
    var drag = null;

    function inRow() {
      return !wide.matches;
    }

    function wrap(n) {
      return ((n % count) + count) % count;
    }

    function pitch() {
      return panel.offsetWidth + px(getComputedStyle(section).getPropertyValue('--carousel-gap'));
    }

    function place() {
      if (!inRow()) {
        slides.forEach(function (slide) { slide.style.transform = ''; });
        return;
      }
      var step = pitch();
      slides.forEach(function (slide, i) {
        var offset = wrap(i - pos);
        if (offset > count / 2) offset -= count;
        slide.style.transform = 'translate3d(' + (offset * step).toFixed(2) + 'px, 0, 0)';
      });
    }

    function halt() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = null;
    }

    function glide(to, duration, curve) {
      halt();
      if (!inRow() || reduceMotion.matches || Math.abs(to - pos) < 0.001) {
        pos = wrap(Math.round(to));
        place();
        return;
      }
      var from = pos;
      var start = null;
      function step(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / duration);
        pos = from + (to - from) * curve(t);
        place();
        if (t < 1) {
          frame = window.requestAnimationFrame(step);
        } else {
          frame = null;
          pos = wrap(Math.round(to));
          place();
        }
      }
      frame = window.requestAnimationFrame(step);
    }

    // Where in the row slide i is nearest: a step on, or back round the loop.
    function nearest(i) {
      var here = Math.round(pos);
      var d = wrap(i - here);
      if (d > count / 2) d -= count;
      return here + d;
    }

    /* `progress` is what the active slide's rule should do:
         'run'   fill over the dwell, because the cycle is turning
         'hold'  sit full, because this slide was chosen and nothing follows it
         'idle'  sit empty, because the cycle has not reached this section yet
       `settled`: the row is already on its way there (a swipe), so leave it. */
    function show(next, progress, settled) {
      index = next;

      tabs.forEach(function (tab, i) {
        var current = i === index;
        tab.setAttribute('aria-selected', String(current));
        // Roving tabindex: one stop for the whole list, as the pattern wants.
        tab.tabIndex = current ? 0 : -1;
      });
      slides.forEach(function (slide, i) {
        if (i === index) {
          slide.setAttribute('data-current', '');
          slide.removeAttribute('aria-hidden');
        } else {
          slide.removeAttribute('data-current');
          slide.setAttribute('aria-hidden', 'true');
        }
      });
      panel.setAttribute('aria-labelledby', tabs[index].id);
      if (inRow() && !settled && !drag) glide(nearest(index), glideTime, HOUSE);

      if (fill) fill.cancel();
      var bar = tabs[index].querySelector('[data-carousel-fill]');
      tabs.forEach(function (tab) {
        if (tab !== tabs[index]) tab.querySelector('[data-carousel-fill]').style.transform = EMPTY;
      });

      if (progress === 'run' && bar.animate) {
        bar.style.transform = '';
        fill = bar.animate(
          [{ transform: EMPTY }, { transform: FULL }],
          { duration: dwell, easing: 'linear', fill: 'forwards' }
        );
      } else {
        // Stopped or reduced motion: the rule reads as a marker, not a clock.
        fill = null;
        bar.style.transform = progress === 'hold' ? FULL : EMPTY;
      }
    }

    /* --- The automatic cycle ---------------------------------------------- */

    function stop() {
      window.clearTimeout(timer);
      timer = null;
    }

    function run() {
      stop();
      if (!auto || !onScreen || document.hidden) return;
      show(index, 'run');
      timer = window.setTimeout(function () {
        index = (index + 1) % tabs.length;
        run();
      }, dwell);
    }

    // A reader who takes over keeps control for the rest of the visit.
    function takeOver(next, settled) {
      auto = false;
      stop();
      show(next, 'hold', settled);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        takeOver(i);
      });
    });

    section.querySelector('[data-carousel-list]').addEventListener('keydown', function (event) {
      var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      var next = step ? (index + step + tabs.length) % tabs.length
        : event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
        : null;
      if (next === null) return;
      event.preventDefault();
      takeOver(next);
      tabs[next].focus();
    });

    /* --- Swiping the row --------------------------------------------------- */

    panel.addEventListener('pointerdown', function (event) {
      if (!inRow() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: pos, moving: false, trail: [] };
    });

    panel.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var dx = event.clientX - drag.x;
      if (!drag.moving) {
        var dy = event.clientY - drag.y;
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          drag = null; // a scroll: the page's
          return;
        }
        // Taken over from here: the cycle stops and the row follows the finger.
        drag.moving = true;
        auto = false;
        stop();
        halt();
        drag.from = pos;
        drag.x = event.clientX;
        dx = 0;
        try {
          panel.setPointerCapture(event.pointerId);
        } catch (error) {
          // The pointer has already gone; the release below still settles the row.
        }
        panel.setAttribute('data-dragging', '');
      }
      pos = drag.from - dx / pitch();
      place();
      drag.trail.push([event.timeStamp, event.clientX]);
      if (drag.trail.length > 8) drag.trail.shift();
    });

    function release(event) {
      if (!drag || event.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (!d.moving) return;
      panel.removeAttribute('data-dragging');

      // The finger's speed over its last 100ms, px per ms (+ is rightward).
      var speed = 0;
      if (event.type === 'pointerup') {
        for (var k = d.trail.length - 1; k >= 0; k--) {
          var age = event.timeStamp - d.trail[k][0];
          if (age > 100) break;
          if (age > 0) speed = (event.clientX - d.trail[k][1]) / age;
        }
      }

      var from = Math.round(d.from);
      var to = Math.round(pos);
      if (to === from) {
        if (speed < -FLICK || pos - from > NUDGE) to = from + 1;
        else if (speed > FLICK || from - pos > NUDGE) to = from - 1;
      }
      takeOver(wrap(to), true);
      glide(to, Math.max(200, glideTime * Math.min(1, Math.abs(to - pos))), SETTLE);
    }

    panel.addEventListener('pointerup', release);
    panel.addEventListener('pointercancel', release);

    // Across 900 the slides swap between the row and the plate.
    wide.addEventListener('change', function () {
      halt();
      pos = index;
      place();
    });
    window.addEventListener('resize', function () {
      if (inRow()) place();
    });

    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) run();
      else stop();
    }, { threshold: 0.25 }).observe(section);

    // A slide should not expire behind a background tab.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else run();
    });

    // Nothing has run yet, so the first rule starts empty — unless motion is
    // off, in which case it is a plain marker for the slide on show.
    place();
    show(0, auto ? 'idle' : 'hold');
  }

  document.querySelectorAll('[data-carousel]').forEach(setup);
})();
