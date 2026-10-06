/**
 * 14 million fans
 * ---------------
 * The section's two moments and its videos.
 *
 * Arrival: the section is armed (data-fans="armed") as soon as this runs, which
 * sets the 14's reels at 00 and the stars at nothing; when half of the headline
 * block is on screen it becomes data-fans="in" and
 * src/css/components/fans.css rolls the number and pops the stars, once.
 * Without script — or under reduced motion — none of that is hidden.
 *
 * Videos: each plays muted on a loop only while its tile is near the screen,
 * and pauses when it leaves, so a video nobody can see isn't decoding. The
 * control on a tile pauses and resumes it for good: a video the reader paused
 * stays paused when it comes back into view. Its glyph swaps between pause and
 * play so it always shows what pressing it will do.
 *
 * Hooks: [data-fans] on the section, [data-fans-arrival] on the element whose
 * visibility starts the arrival, [data-fans-video] on each video tile holding a
 * <video> and a [data-fans-video-toggle] button.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-fans]').forEach(function (section) {
    var arrival = section.querySelector('[data-fans-arrival]');

    if (arrival && !reduce && 'IntersectionObserver' in window) {
      section.setAttribute('data-fans', 'armed');
      var watch = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        section.setAttribute('data-fans', 'in');
        watch.disconnect();
      }, { threshold: 0.5 });
      watch.observe(arrival);
    }

    section.querySelectorAll('[data-fans-video]').forEach(function (tile) {
      var video = tile.querySelector('video');
      var toggle = tile.querySelector('[data-fans-video-toggle]');
      if (!video) return;

      var near = false;
      var heldByReader = false;

      function sync() {
        if (near && !heldByReader) {
          var playing = video.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else {
          video.pause();
        }
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          near = entries[0].isIntersecting;
          sync();
        }, { rootMargin: '25% 0px' }).observe(tile);
      } else {
        near = true;
        sync();
      }

      if (toggle) {
        var glyph = toggle.querySelector('use');
        toggle.addEventListener('click', function () {
          heldByReader = !heldByReader;
          toggle.setAttribute('aria-pressed', String(heldByReader));
          if (glyph) glyph.setAttribute('href', heldByReader ? '#i-play' : '#i-pause');
          sync();
        });
      }
    });
  });
})();
