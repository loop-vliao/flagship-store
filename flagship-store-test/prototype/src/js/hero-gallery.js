/**
 * Product page hero — the gallery
 * -------------------------------
 * The hero's artwork is a gallery of slides, pushed across the plate one at a
 * time: the slide leaving and the slide arriving travel together, edge to
 * edge, on the house curve (--ease-loop) over --hero-gallery-dur. It runs
 * round: after the last slide comes the first. (Figma 162:7387.)
 *
 *   Pointer   from lg on a device with hover, previous / next buttons fade in
 *             over the gallery (their look is utilities on the markup).
 *   Touch     a horizontal swipe drags the slides with the finger; let go past
 *             a fifth of the plate, or with a flick, and it moves on,
 *             otherwise it settles back. A vertical swipe scrolls the page.
 *
 * The position is one number, in slides, animated here rather than by CSS
 * transitions, so a swipe can pick a move up mid-flight and a click during a
 * move retargets it. Each frame places the slides within one plate of view,
 * the renders that belong to slide 1 ([data-hero-slide-follow]) with it, and
 * writes --hero-gallery-at on the plate (0 at the first slide, 1 at the last)
 * for the position indicator. Slides further away keep `hidden`, and are
 * un-hidden as they become neighbours, so their artwork loads just ahead of
 * being shown.
 *
 * A video slide plays, looping, while it is in view and the hero is on screen,
 * and its pause control shows; pausing holds until the reader plays it again.
 * Under reduced motion slides change without travelling and videos start
 * paused.
 *
 * Hooks: [data-hero-gallery] on the plate; [data-hero-slide] on each slide;
 * [data-hero-slide-follow]; [data-hero-gallery-prev] / [-next];
 * [data-hero-gallery-pause] in [data-hero-gallery-pause-wrap] (data-shown);
 * [data-hero-gallery-status], a live region whose wording is its
 * data-hero-gallery-status-template ("Image {{ index }} of {{ count }}", translated
 * by src/js/i18n.js). [data-hero-art-card] is left out of swiping.
 */
(function () {
  'use strict';

  var plate = document.querySelector('[data-hero-gallery]');
  if (!plate) return;
  var slides = Array.prototype.slice.call(plate.querySelectorAll('[data-hero-slide]'));
  var count = slides.length;
  if (count < 2) return;

  var follow = plate.querySelector('[data-hero-slide-follow]');
  var prevButton = plate.querySelector('[data-hero-gallery-prev]');
  var nextButton = plate.querySelector('[data-hero-gallery-next]');
  var pause = plate.querySelector('[data-hero-gallery-pause]');
  var pauseWrap = plate.querySelector('[data-hero-gallery-pause-wrap]');
  var status = plate.querySelector('[data-hero-gallery-status]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var DURATION = ms(getComputedStyle(plate).getPropertyValue('--hero-gallery-dur')) || 900;
  var ease = bezier(getComputedStyle(document.documentElement).getPropertyValue('--ease-loop'));
  var SWIPE = 0.2; // share of the plate a drag must cover to move on
  var FLICK = 0.4; // px/ms: a faster release moves on however short the drag

  var position = 0; // where the gallery is, in slides; runs past count and below 0, read modulo
  var target = 0; // where it is heading
  var frame = null;
  var width = plate.clientWidth;
  var onScreen = true;
  var videoPaused = reduce.matches;
  var preload = false; // neighbours load once the page has, so they never compete with the first slide

  // CSS time values arrive as "0.9s" or "900ms".
  function ms(value) {
    var n = parseFloat(value);
    if (isNaN(n)) return 0;
    return /ms\s*$/.test(value) ? n : n * 1000;
  }

  // The house curve as a function of progress. The token may arrive as its
  // keyword once minified (cubic-bezier(0.25, 0.1, 0.25, 1) is `ease`).
  function bezier(value) {
    var named = { ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1], linear: [0, 0, 1, 1] };
    var match = /cubic-bezier\(([^)]+)\)/.exec(value);
    var p = match ? match[1].split(',').map(parseFloat) : named[value.trim()] || named.ease;
    function axis(t, a, b) {
      return 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0;
      var hi = 1;
      var t = x;
      for (var i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        if (axis(t, p[0], p[2]) < x) lo = t;
        else hi = t;
      }
      return axis(t, p[1], p[3]);
    };
  }

  function wrap(n) {
    return ((n % count) + count) % count;
  }

  // A slide's offset from the view, in slides, the short way round.
  function offset(i) {
    var d = wrap(i - position);
    return d >= count / 2 ? d - count : d;
  }

  function render() {
    slides.forEach(function (slide, i) {
      var d = offset(i);
      if (Math.abs(d) < 1) {
        slide.hidden = false;
        slide.style.visibility = '';
        slide.style.translate = d ? d * width + 'px 0' : '';
      } else {
        slide.style.visibility = 'hidden';
        slide.style.translate = '';
      }
    });

    if (follow) {
      var d = offset(0);
      follow.style.translate = d && Math.abs(d) < 1 ? d * width + 'px 0' : '';
      follow.style.visibility = Math.abs(d) < 1 ? '' : 'hidden';
    }

    // The thumb travels the track from the first slide to the last, and on the
    // step from the last round to the first it runs back.
    var at = wrap(position);
    at = at <= count - 1 ? at / (count - 1) : count - at;
    plate.style.setProperty('--hero-gallery-at', at.toFixed(4));
  }

  function announce(index) {
    if (!status) return;
    var template = status.getAttribute('data-hero-gallery-status-template') || 'Image {{ index }} of {{ count }}';
    status.textContent = template
      .replace(/\{\{\s*index\s*\}\}/g, String(index + 1))
      .replace(/\{\{\s*count\s*\}\}/g, String(count));
  }

  // What follows from the slide the gallery is heading to: which slides are
  // exposed to assistive tech, which artwork loads next, the video.
  function arrive() {
    var index = wrap(target);
    slides.forEach(function (slide, i) {
      var current = i === index;
      slide.inert = !current;
      if (current) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
      if (preload && (i === wrap(index - 1) || i === wrap(index + 1))) {
        if (slide.hidden) {
          slide.style.visibility = 'hidden';
          slide.hidden = false;
        }
      }
    });
    announce(index);
    syncVideo();
  }

  function syncVideo() {
    var index = wrap(target);
    var hasVideo = false;
    slides.forEach(function (slide, i) {
      var video = slide.querySelector('video');
      if (!video) return;
      if (i === index) {
        hasVideo = true;
        video.preload = 'auto';
        if (!videoPaused && onScreen) {
          var playing = video.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else {
          video.pause();
        }
      } else if (Math.abs(offset(i)) >= 1) {
        video.pause();
      }
    });
    if (pauseWrap) pauseWrap.toggleAttribute('data-shown', hasVideo);
    if (pause) {
      pause.setAttribute('aria-pressed', String(videoPaused));
      var glyph = pause.querySelector('use');
      if (glyph) glyph.setAttribute('href', videoPaused ? '#i-play' : '#i-pause');
    }
  }

  function animateTo(next) {
    target = next;
    arrive();
    if (frame) cancelAnimationFrame(frame);
    var from = position;
    var distance = next - from;
    var duration = reduce.matches ? 0 : DURATION * Math.min(1, Math.max(0.5, Math.abs(distance)));
    var start = null;

    function step(now) {
      if (start === null) start = now;
      var t = duration ? Math.min(1, (now - start) / duration) : 1;
      position = from + distance * ease(t);
      render();
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        frame = null;
        position = target = wrap(target);
        render();
        syncVideo();
      }
    }
    frame = requestAnimationFrame(step);
  }

  function go(direction) {
    animateTo(Math.round(target) + direction);
  }

  if (prevButton) {
    prevButton.hidden = false;
    prevButton.addEventListener('click', function () { go(-1); });
  }
  if (nextButton) {
    nextButton.hidden = false;
    nextButton.addEventListener('click', function () { go(1); });
  }
  if (pause) {
    pause.addEventListener('click', function () {
      videoPaused = !videoPaused;
      syncVideo();
    });
  }
  // A translated page swaps the template in after load (src/js/i18n.js).
  document.addEventListener('i18n:ready', function () { announce(wrap(target)); });

  // Swiping — touch and pen; a mouse has the buttons.
  var drag = null;

  plate.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'mouse' || drag) return;
    if (event.target.closest('[data-hero-art-card], button, a, input, label')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, from: position, axis: null, lastX: event.clientX, lastT: event.timeStamp, speed: 0 };
  });

  plate.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dx = event.clientX - drag.x;
    var dy = event.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'y') {
        drag = null;
        return;
      }
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      drag.from = position;
      drag.x = event.clientX;
      dx = 0;
      try { plate.setPointerCapture(event.pointerId); } catch (e) { /* already released */ }
    }
    var dt = event.timeStamp - drag.lastT;
    if (dt > 0) drag.speed = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;
    position = drag.from - dx / width;
    render();
  });

  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    var ended = drag;
    drag = null;
    if (ended.axis !== 'x') return;
    var moved = position - ended.from;
    var stale = event.timeStamp - ended.lastT > 100;
    var speed = stale ? 0 : ended.speed;
    if (moved > SWIPE || speed < -FLICK) animateTo(Math.floor(position) + 1);
    else if (moved < -SWIPE || speed > FLICK) animateTo(Math.ceil(position) - 1);
    else animateTo(Math.round(position));
  }

  plate.addEventListener('pointerup', release);
  plate.addEventListener('pointercancel', release);

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      width = plate.clientWidth;
      render();
    }).observe(plate);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[entries.length - 1].isIntersecting;
      syncVideo();
    }).observe(plate);
  }

  render();
  arrive();

  function warm() {
    preload = true;
    arrive();
  }
  if (document.readyState === 'complete') warm();
  else window.addEventListener('load', warm);
})();
