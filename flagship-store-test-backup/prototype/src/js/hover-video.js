/**
 * Hover video — plays on hover; on leave, pauses or rewinds
 * ---------------------------------------------------------
 * A video that starts on its first frame and plays forward while its host is
 * hovered (or holds keyboard focus). What leaving does is the video's
 * data-hover-video-leave:
 *
 *   pause     it stops where it is, and the next hover carries on from there —
 *             for a loop (give the <video> `loop`). Loop Dream's tile in Loop
 *             essentials spins a full 360 this way, seamlessly, at 1.25x.
 *   rewind    (default) it runs back from wherever it had got to, to its first
 *             frame, at data-hover-video-rewind times real time — for a move
 *             that should always return to rest.
 *
 * data-hover-video-rate sets the forward speed (default 1).
 *
 * Forward is the browser's own playback. Browsers can't play backward, so a
 * rewind seeks frame by frame on the display's clock (encode a rewinding
 * video with a keyframe on every frame, so each seek decodes one frame). A
 * seek never queues behind another: the latest target waits for the one in
 * flight. The video is fetched whole as it nears the screen, so it seeks and
 * loops on any server.
 *
 * Only for a pointer that can hover, and for keyboard focus; a touch screen
 * keeps the first frame. A hidden video (Dream in a colour it has no video
 * for) doesn't play. Nothing moves under prefers-reduced-motion.
 *
 * Hooks: [data-hover-video] on the <video> (with its leave mode and speeds),
 * [data-hover-video-host] on the element whose hover and focus drive it.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var hover = window.matchMedia('(hover: hover)');

  document.querySelectorAll('[data-hover-video]').forEach(function (video) {
    var host = video.closest('[data-hover-video-host]');
    if (!host) return;

    var rate = parseFloat(video.getAttribute('data-hover-video-rate')) || 1;
    var rewindRate = parseFloat(video.getAttribute('data-hover-video-rewind')) || 1;
    var pauseOnLeave = video.getAttribute('data-hover-video-leave') === 'pause';
    var rewinding = false;
    var wanted = false;
    var last = 0;
    var target = null;

    function load() {
      var fallback = function () { video.preload = 'auto'; video.load(); };
      if (!window.fetch || location.protocol === 'file:') return fallback();
      fetch(video.currentSrc || video.src)
        .then(function (response) { if (!response.ok) throw response; return response.blob(); })
        .then(function (blob) { video.src = URL.createObjectURL(blob); })
        .catch(fallback);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, watch) {
        if (!entries[0].isIntersecting) return;
        watch.disconnect();
        load();
      }, { rootMargin: '50% 50%' }).observe(host);
    } else {
      load();
    }

    function seek() {
      if (target === null || video.seeking) return;
      video.currentTime = target;
      target = null;
    }
    video.addEventListener('seeked', seek);
    // Hovered before it had loaded: start once it can.
    video.addEventListener('loadeddata', function () { if (wanted) forward(); });

    function rewind(now) {
      if (!rewinding) return;
      var dt = last ? (now - last) / 1000 : 0;
      last = now;
      var from = target === null ? video.currentTime : target;
      var next = Math.max(0, from - dt * rewindRate);
      target = next;
      seek();
      if (next > 0) window.requestAnimationFrame(rewind);
      else rewinding = false;
    }

    function forward() {
      if (video.hidden) return; // another colour is showing
      wanted = true;
      rewinding = false;
      target = null;
      if (!video.duration) return;
      video.playbackRate = rate;
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    }

    function back() {
      wanted = false;
      video.pause();
      if (pauseOnLeave || rewinding || !video.currentTime) return;
      rewinding = true;
      last = 0;
      window.requestAnimationFrame(rewind);
    }

    host.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' || hover.matches) forward();
    });
    host.addEventListener('pointerleave', back);
    // Keyboard focus only: a swatch clicked with the pointer mustn't start it.
    host.addEventListener('focusin', function (event) {
      if (event.target.matches(':focus-visible')) forward();
    });
    host.addEventListener('focusout', function (event) {
      if (!host.contains(event.relatedTarget)) back();
    });
  });
})();
