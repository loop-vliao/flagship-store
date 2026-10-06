/**
 * How they work (the homepage) / How Engage works (the product page)
 * ------------------------------------------------------------------
 * Two videos and one pause control; a section may have either or both.
 *
 * The loop: the exploding earplug plays muted on a loop while its tile is
 * near the screen, and pauses when it leaves, so nobody decodes a video they
 * can't see.
 *
 * The scrub: the portrait doesn't play; the scroll drives it. Its frame is the
 * portrait's pass through the screen — the first frame as its top comes up
 * past the bottom of the screen, the last as its foot leaves over the top, or
 * with data-htw-scrub-end="middle" as its centre reaches the screen's centre
 * (the product page's exploding earplug, which finishes coming apart as it
 * arrives mid-screen and holds there) — and it is set only while it is on screen (and displayed: it is
 * desktop only). It is fetched whole as it nears the screen (so it seeks on
 * any server) and has a keyframe on every frame, so any seek
 * decodes one frame. A seek is never queued behind another: the latest
 * target waits for the current seek to finish.
 *
 * The control: every [data-htw-toggle] in the section is the same switch
 * (one per layout), kept in step. Pressed, the loop pauses and the portrait
 * holds its frame; released, the loop resumes and the portrait catches up
 * with the scroll. It is an aria-pressed toggle with a fixed label, its glyph
 * showing what pressing it will do. Under prefers-reduced-motion both start
 * paused — the loop on its poster, the portrait on its first frame — and the
 * control starts pressed, so the reader can still choose to play them.
 *
 * Hooks: [data-htw] on the section, [data-htw-loop] and [data-htw-scrub] on
 * the videos, [data-htw-toggle] on each control.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-htw]').forEach(function (section) {
    var loop = section.querySelector('[data-htw-loop]');
    var scrub = section.querySelector('[data-htw-scrub]');
    var toggles = section.querySelectorAll('[data-htw-toggle]');
    var paused = reduce;
    var loopNear = false;
    var scrubOn = false;
    var frame = 0;
    var target = null;

    function syncLoop() {
      if (!loop) return;
      if (loopNear && !paused) {
        var playing = loop.play();
        if (playing && playing.catch) playing.catch(function () {});
      } else {
        loop.pause();
      }
    }

    function seek() {
      if (target === null || scrub.seeking || !scrub.duration) return;
      if (Math.abs(scrub.currentTime - target) > 0.02) scrub.currentTime = target;
      target = null;
    }

    function update() {
      frame = 0;
      if (paused || !scrubOn || !scrub.getClientRects().length) return;
      var box = scrub.getBoundingClientRect();
      var screen = window.innerHeight;
      var run = scrub.getAttribute('data-htw-scrub-end') === 'middle' ? (screen + box.height) / 2 : screen + box.height;
      var p = Math.min(1, Math.max(0, (screen - box.top) / run));
      if (scrub.duration) target = p * (scrub.duration - 0.05);
      seek();
    }

    function request() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    if ('IntersectionObserver' in window) {
      if (loop) {
        new IntersectionObserver(function (entries) {
          loopNear = entries[0].isIntersecting;
          syncLoop();
        }, { rootMargin: '25% 0px' }).observe(loop);
      }
      if (scrub) {
        // Load it whole, a screen away, so it is there when it arrives. As a blob
        // it seeks anywhere whatever the server (one that ignores byte ranges
        // leaves a streamed video unseekable); from file://, where fetch fails,
        // it falls back to the browser's own loading.
        new IntersectionObserver(function (entries, watch) {
          if (!entries[0].isIntersecting) return;
          watch.disconnect();
          var fallback = function () { scrub.preload = 'auto'; scrub.load(); };
          if (!window.fetch || location.protocol === 'file:') return fallback();
          fetch(scrub.currentSrc || scrub.src)
            .then(function (response) { if (!response.ok) throw response; return response.blob(); })
            .then(function (blob) { scrub.src = URL.createObjectURL(blob); })
            .catch(fallback);
        }, { rootMargin: '100% 0px' }).observe(scrub);
        new IntersectionObserver(function (entries) {
          scrubOn = entries[0].isIntersecting;
          request();
        }).observe(scrub);
      }
    } else {
      loopNear = true;
      scrubOn = true;
      syncLoop();
    }

    if (scrub) {
      scrub.addEventListener('seeked', seek);
      scrub.addEventListener('loadedmetadata', request);
      window.addEventListener('scroll', function () { if (scrubOn) request(); }, { passive: true });
      window.addEventListener('resize', request);
    }

    function show() {
      toggles.forEach(function (toggle) {
        toggle.setAttribute('aria-pressed', String(paused));
        var glyph = toggle.querySelector('use');
        if (glyph) glyph.setAttribute('href', paused ? '#i-play' : '#i-pause');
      });
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        paused = !paused;
        show();
        syncLoop();
        request();
      });
    });

    show();
  });
})();
