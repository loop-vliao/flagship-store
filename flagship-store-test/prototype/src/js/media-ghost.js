/**
 * Media ghost — a placeholder that only appears when a picture is slow
 * --------------------------------------------------------------------
 * A rounded media box carries no background colour of its own: a ground under
 * a rounded clip is anti-aliased separately from the picture and bleeds into
 * its corners as a rim. So the box is empty until its picture paints, and this
 * gives it a ghost — neutral/50, components/media.css — only if the picture
 * still isn't there a moment after the box comes on screen. When the picture
 * loads the ghost comes off; if it fails, the ghost stays, so the hole reads
 * as a hole. A fast load never shows it, and without this script nothing
 * shows at all.
 *
 * Hooks: [data-media] on the box. Its value, if any, is a selector for the
 * picture that counts (the hero's first slide, the carousel's first slide);
 * empty, the box's first <img> or <video>. For a <video> the picture is its
 * poster (or its first frame, whichever comes first). The script sets
 * [data-media-ghost] on the box while it should show.
 */
(function () {
  'use strict';

  var GRACE = 400; // ms on screen before a missing picture shows its ghost

  var boxes = document.querySelectorAll('[data-media]');
  if (!boxes.length) return;

  // Calls done() once the picture has painted, fail() if it can't.
  function watch(el, done, fail) {
    if (!el) return done();

    if (el.tagName === 'IMG') {
      if (el.complete) return el.naturalWidth ? done() : fail();
      el.addEventListener('load', done, { once: true });
      el.addEventListener('error', fail, { once: true });
      return;
    }

    if (el.tagName === 'VIDEO') {
      if (el.readyState >= 2) return done();
      var settled = false;
      var ok = function () {
        if (settled) return;
        settled = true;
        done();
      };
      el.addEventListener('loadeddata', ok, { once: true });
      var poster = el.getAttribute('poster');
      if (poster) {
        var probe = new Image();
        probe.onload = ok;
        probe.onerror = function () {
          if (!settled && el.readyState < 2) fail();
        };
        probe.src = poster;
      }
      return;
    }

    done();
  }

  var state = new WeakMap();

  var seen = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var s = state.get(entry.target);
          if (!s || s.loaded) return;
          s.visible = entry.isIntersecting;
          clearTimeout(s.timer);
          if (!s.visible) return;
          if (s.failed) return ghost(entry.target, true);
          s.timer = setTimeout(function () {
            if (!s.loaded) ghost(entry.target, true);
          }, GRACE);
        });
      })
    : null;

  function ghost(box, on) {
    if (on) box.setAttribute('data-media-ghost', '');
    else box.removeAttribute('data-media-ghost');
  }

  boxes.forEach(function (box) {
    var s = { loaded: false, failed: false, visible: false, timer: 0 };
    state.set(box, s);

    var selector = box.getAttribute('data-media');
    var picture = selector ? box.querySelector(selector) : box.querySelector('img, video');

    watch(
      picture,
      function () {
        s.loaded = true;
        clearTimeout(s.timer);
        ghost(box, false);
        if (seen) seen.unobserve(box);
      },
      function () {
        s.failed = true;
        if (s.visible || !seen) ghost(box, true);
      }
    );

    if (!s.loaded && seen) seen.observe(box);
  });
})();
