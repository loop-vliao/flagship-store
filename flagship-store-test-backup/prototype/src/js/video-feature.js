/**
 * "See it in action" player
 * -------------------------
 * Two states, no media chrome:
 *
 *   ambient  muted, looping, plays on its own — the page's resting state
 *   sound    Play restarts it from the beginning with audio
 *
 * Clicking anywhere on the frame during `sound` returns it to `ambient`, as
 * does the video reaching its end. Deliberately thin — real controls, a scrub
 * bar and a mute toggle come later.
 *
 * In `ambient` a small pause button in the corner stops and restarts the
 * silent loop — an accessibility control (WCAG 2.2.2), not a player one. It
 * is an aria-pressed toggle whose glyph swaps to play while the loop is held,
 * and it hides during `sound`. A held loop stays held: coming back from
 * `sound` shows the paused frame rather than restarting motion the reader
 * asked to stop. Under reduced motion the loop starts held.
 *
 * Autoplay policy: browsers allow muted autoplay but require a user gesture
 * before anything makes noise. `ambient` is muted so it starts on its own, and
 * `sound` is only ever entered from a click, so it is always permitted.
 *
 * Hooks: [data-video-feature] on the section, [data-video-feature-video],
 * [data-video-feature-play], [data-video-feature-stop],
 * [data-video-feature-pause] (optional).
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setup(section) {
    var video = section.querySelector('[data-video-feature-video]');
    var play = section.querySelector('[data-video-feature-play]');
    var stop = section.querySelector('[data-video-feature-stop]');
    var pause = section.querySelector('[data-video-feature-pause]');
    if (!video || !play || !stop) return;

    var held = false;   // the reader has paused the silent loop

    function hold(on) {
      held = on;
      if (!pause) return;
      pause.setAttribute('aria-pressed', String(on));
      var glyph = pause.querySelector('use');
      if (glyph) glyph.setAttribute('href', on ? '#i-play' : '#i-pause');
    }

    function loop() {
      if (held) { video.pause(); return; }
      // Rejected autoplay is fine — the poster stays up and Play still works.
      var started = video.play();
      if (started && started.catch) started.catch(function () {});
    }

    function ambient() {
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;
      play.hidden = false;
      stop.hidden = true;
      if (pause) pause.hidden = false;
      loop();
    }

    function sound() {
      video.muted = false;
      // Looping is off so the video can hand itself back to the ambient state
      // when it finishes, rather than replaying with sound indefinitely.
      video.loop = false;
      video.currentTime = 0;
      play.hidden = true;
      stop.hidden = false;
      if (pause) pause.hidden = true;
      var started = video.play();
      if (started && started.catch) started.catch(ambient);
      stop.focus();
    }

    play.addEventListener('click', sound);
    if (pause) pause.addEventListener('click', function () {
      hold(!held);
      loop();
    });
    stop.addEventListener('click', ambient);
    video.addEventListener('ended', ambient);

    if (reduceMotion.matches) {
      // Nothing moves until it is asked for: the poster, Play, and the loop
      // held — its button showing play, should the reader want it.
      video.loop = true;
      video.muted = true;
      play.hidden = false;
      stop.hidden = true;
      hold(true);
    } else {
      ambient();
    }
  }

  document.querySelectorAll('[data-video-feature]').forEach(setup);
})();
