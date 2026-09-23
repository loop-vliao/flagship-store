/**
 * "Different by design" carousel
 * ------------------------------
 * Three slides that advance on their own, with the benefit list as both the
 * label and the control:
 *
 *   auto    a slide holds for --carousel-dwell while its rule fills top-down,
 *           then hands over to the next one and loops
 *   manual  the first click or key press picks that slide and stops the
 *           advance for good — the reader has taken over, so the page stops
 *           moving under them. Hovering does nothing.
 *
 * The cycle only runs while the section is on screen and the tab is visible,
 * so a reader who scrolls past does not come back mid-sequence.
 *
 * ARIA: the list is a tablist and the media is its single panel. Arrow keys
 * move between rows, which counts as taking over just as a click does.
 *
 * Timing lives in src/css/components/carousel.css (--carousel-dwell,
 * --carousel-fade) so it can be tuned with the rest of the section.
 *
 * Hooks: [data-carousel] on the section, [data-carousel-media], [data-carousel-slide],
 * [data-carousel-list], [data-carousel-tab], [data-carousel-fill].
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The rule fills as a pill sliding down into it — see .carousel-fill. A plain
  // translate is the one thing every engine animates on the compositor, so the
  // fill keeps time even while the main thread is busy.
  var EMPTY = 'translateY(-100%)';
  var FULL = 'translateY(0%)';

  /* CSS time values arrive as "6s" or "600ms". */
  function ms(value) {
    var n = parseFloat(value);
    if (!n) return 0;
    return /ms\s*$/.test(value) ? n : n * 1000;
  }

  function setup(section) {
    var tabs = Array.prototype.slice.call(section.querySelectorAll('[data-carousel-tab]'));
    var slides = Array.prototype.slice.call(section.querySelectorAll('[data-carousel-slide]'));
    var panel = section.querySelector('[data-carousel-media]');
    if (tabs.length < 2 || slides.length !== tabs.length) return;

    var dwell = ms(getComputedStyle(section).getPropertyValue('--carousel-dwell')) || 6000;
    var index = 0;
    var auto = !reduceMotion.matches;
    var onScreen = false;
    var timer = null;
    var fill = null; // the running fill animation, so it can be cancelled

    /* `progress` is what the active slide's rule should do:
         'run'   fill over the dwell, because the cycle is turning
         'hold'  sit full, because this slide was chosen and nothing follows it
         'idle'  sit empty, because the cycle has not reached this section yet */
    function show(next, progress) {
      index = next;

      tabs.forEach(function (tab, i) {
        var current = i === index;
        tab.setAttribute('aria-selected', String(current));
        // Roving tabindex: one stop for the whole list, as the pattern wants.
        tab.tabIndex = current ? 0 : -1;
      });
      slides.forEach(function (slide, i) {
        if (i === index) slide.setAttribute('data-current', '');
        else slide.removeAttribute('data-current');
      });
      if (panel) panel.setAttribute('aria-labelledby', tabs[index].id);

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
    function takeOver(next) {
      auto = false;
      stop();
      show(next, 'hold');
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
    show(0, auto ? 'idle' : 'hold');
  }

  document.querySelectorAll('[data-carousel]').forEach(setup);
})();
