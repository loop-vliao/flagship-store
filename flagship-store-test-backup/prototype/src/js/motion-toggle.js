/**
 * Pause controls
 * --------------
 * Every [data-motion-toggle] pauses and resumes the motion of the section it
 * sits in by flipping that section's `data-motion` between running and
 * paused; the section's CSS decides what that stops.
 *
 * The button is an aria-pressed toggle with a fixed label ("Pause …", pressed
 * while paused), and its glyph swaps from pause to play so it always shows
 * what pressing it will do.
 *
 * The how-it-works control is wired the same way, but nothing in that section
 * listens yet: the animation it will pause hasn't been built.
 *
 * Hooks: [data-motion-toggle] on the button; data-motion on its section.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-motion-toggle]').forEach(function (toggle) {
    var section = toggle.closest('section');
    var glyph = toggle.querySelector('use');

    toggle.addEventListener('click', function () {
      var pausing = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(pausing));
      if (section) section.setAttribute('data-motion', pausing ? 'paused' : 'running');
      if (glyph) glyph.setAttribute('href', pausing ? '#i-play' : '#i-pause');
    });
  });
})();
