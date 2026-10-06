/**
 * Announcement bar — messages taking turns
 * ----------------------------------------
 * The bar over the nav (components/announcement.css) holds its messages as
 * slides and rolls from one to the next: the slide on the bar rises out as
 * the next rises in from below, and the new message's words and art rise
 * into place (all CSS, keyed to the states set here). Each message stays
 * --announcement-dwell, measured from one roll to the next; the pause holds
 * the bar on its message — pressed while paused, its glyph swapping to play,
 * as the hero gallery's does — and the bar carries data-paused while held.
 *
 * A swipe rolls it by hand, with a finger or a mouse: right or up to the
 * next message, left or down back to the one before (the bar carries
 * data-roll-back while it rolls back: the slide sinks and the one before
 * comes down from above). The swipe doesn't count as a tap on the slide's
 * link, and the next roll waits a full dwell from it.
 *
 * The message on the bar at load rises in too. The pause's colour follows
 * the slide's ink. Under reduced motion the slides change in place.
 *
 * Behind the page (data-announcement-behind): the bar is sticky under the
 * nav, which scrolls up over it. Once the nav's top has reached the top of
 * the screen the bar is covered: it carries data-covered (hidden, in CSS)
 * and holds its turn; uncovered, it takes up its dwell again.
 *
 * A bar with one slide doesn't roll; one marked data-announcement-still
 * (the content types laid out in states.html) doesn't move at all.
 *
 * Hooks: [data-announcement] on the bar, [data-announcement-slide] on each
 * slide (data-state: current | entering | leaving; data-shown while its
 * words are up), [data-announcement-pause] on its button.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SWIPE = 24; // px of travel before a drag is a swipe
  var DRAG = 8; // px before the bar takes the pointer to itself

  // A CSS time in milliseconds: browsers serialise "800ms" as ".8s".
  function ms(value) {
    var n = parseFloat(value) || 0;
    return /ms\s*$/.test(value) ? n : n * 1000;
  }

  document.querySelectorAll('[data-announcement]').forEach(function (bar) {
    if (bar.hasAttribute('data-announcement-still')) return;
    var slides = Array.prototype.slice.call(bar.querySelectorAll('[data-announcement-slide]'));
    if (!slides.length) return;
    var pause = bar.querySelector('[data-announcement-pause]');
    var glyph = pause && pause.querySelector('use');
    var style = getComputedStyle(bar);
    var rollTime = ms(style.getPropertyValue('--announcement-roll')) || 800;
    var dwell = ms(style.getPropertyValue('--announcement-dwell')) || 6000;
    var index = 0;
    var timer = null;
    var paused = false;
    var rolling = false;
    var covered = false;

    slides.forEach(function (slide, i) {
      if (slide.getAttribute('data-state') === 'current') index = i;
    });

    function show(slide) {
      slide.setAttribute('data-shown', '');
      bar.style.color = getComputedStyle(slide).color;
    }

    function schedule() {
      window.clearTimeout(timer);
      if (!paused && !covered && slides.length > 1) timer = window.setTimeout(function () { roll(1); }, dwell);
    }

    // Roll to the next slide (step 1) or back to the one before (step -1).
    function roll(step) {
      if (rolling || slides.length < 2) return;
      rolling = true;
      var from = slides[index];
      index = (index + step + slides.length) % slides.length;
      var to = slides[index];
      bar.toggleAttribute('data-roll-back', step < 0);
      from.removeAttribute('data-shown');
      from.setAttribute('data-state', 'leaving');
      to.setAttribute('data-state', 'entering');
      show(to);
      window.setTimeout(function () {
        from.removeAttribute('data-state');
        to.setAttribute('data-state', 'current');
        rolling = false;
      }, reduce.matches ? 0 : rollTime);
      schedule();
    }

    slides[index].setAttribute('data-state', 'current');
    show(slides[index]);
    schedule();

    // Behind the page: covered once the nav, which follows it, has scrolled
    // up over it.
    var over = bar.hasAttribute('data-announcement-behind') && bar.nextElementSibling;
    if (over) {
      var cover = function () {
        var now = over.getBoundingClientRect().top <= 0;
        if (now === covered) return;
        covered = now;
        bar.toggleAttribute('data-covered', covered);
        schedule();
      };
      window.addEventListener('scroll', cover, { passive: true });
      window.addEventListener('resize', cover);
      cover();
    }

    if (pause) {
      pause.addEventListener('click', function () {
        paused = pause.getAttribute('aria-pressed') !== 'true';
        pause.setAttribute('aria-pressed', String(paused));
        bar.toggleAttribute('data-paused', paused);
        if (glyph) glyph.setAttribute('href', glyph.getAttribute('href').replace(/#.*$/, paused ? '#i-play-bare' : '#i-pause-bare'));
        schedule();
      });
    }

    // Swipes. The bar takes the pointer once it has moved a little, so a
    // vertical swipe that leaves the 36px bar still ends on it; a tap never
    // moves that far, and stays with the link it lands on.
    var start = null;
    var swiped = false;

    bar.addEventListener('pointerdown', function (event) {
      swiped = false;
      if (event.button !== 0 || (pause && pause.contains(event.target))) return;
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });

    bar.addEventListener('pointermove', function (event) {
      if (!start || event.pointerId !== start.id || bar.hasPointerCapture(event.pointerId)) return;
      if (Math.max(Math.abs(event.clientX - start.x), Math.abs(event.clientY - start.y)) > DRAG) {
        bar.setPointerCapture(event.pointerId);
      }
    });

    bar.addEventListener('pointerup', function (event) {
      if (!start || event.pointerId !== start.id) return;
      var dx = event.clientX - start.x;
      var dy = event.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      swiped = true;
      // right or up: the next; left or down: the one before
      var forward = Math.abs(dx) > Math.abs(dy) ? dx > 0 : dy < 0;
      roll(forward ? 1 : -1);
    });

    bar.addEventListener('pointercancel', function () {
      start = null;
    });

    // A swipe ends in a click on the bar; it isn't a tap on the link.
    bar.addEventListener('click', function (event) {
      if (!swiped) return;
      swiped = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  });
})();
