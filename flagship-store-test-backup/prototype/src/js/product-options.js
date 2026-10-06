/**
 * Product option states
 * ---------------------
 * Prototype-level behaviour only: swatch selection, and swapping a product
 * picture to the chosen colour (Loop essentials). There is no cart, no
 * variant model and no analytics — those belong to the Shopify implementation.
 *
 * Hooks for the picture: data-swatch-target (the <img> id) and optional
 * data-swatch-video-target (a <video> id) on the radiogroup; data-swatch-image
 * (the colour's picture) and optional data-swatch-video on each option.
 *
 * Swatches follow the ARIA radiogroup pattern, so arrow keys move between
 * options and only the selected one stays in the tab order.
 */
(function () {
  'use strict';

  /* --- Colour swatches --------------------------------------------------- */

  document.querySelectorAll('[role="radiogroup"]').forEach(function (group) {
    var options = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
    if (!options.length) return;

    // A group can show its product in the chosen colour: data-swatch-target
    // names the <img>, and each option's data-swatch-image is its picture. A
    // colour that has a video (data-swatch-video on the option) shows the
    // element data-swatch-video-target names instead, and any other colour
    // hides it and rewinds it to its first frame.
    var image = document.getElementById(group.getAttribute('data-swatch-target') || '');
    var video = document.getElementById(group.getAttribute('data-swatch-video-target') || '');

    function show(option) {
      var src = option.getAttribute('data-swatch-image');
      if (!image || !src) return;
      var hasVideo = video && option.hasAttribute('data-swatch-video');
      if (image.getAttribute('src') !== src) image.src = src;
      image.hidden = hasVideo;
      if (video) {
        if (!hasVideo) { video.pause(); video.currentTime = 0; }
        video.hidden = !hasVideo;
      }
    }

    // Arrow keys move focus with the choice; a click leaves focus to the
    // browser, so a pointer choice doesn't hold keyboard focus in the tile.
    function select(option, moveFocus) {
      options.forEach(function (candidate) {
        var chosen = candidate === option;
        candidate.setAttribute('aria-checked', String(chosen));
        candidate.tabIndex = chosen ? 0 : -1;
      });
      if (moveFocus) option.focus();
      show(option);
    }

    // Fetch the other colours' pictures as the reader reaches for the swatches,
    // so a choice swaps without a blank frame.
    if (image) {
      var warmed = false;
      var warm = function () {
        if (warmed) return;
        warmed = true;
        options.forEach(function (option) {
          var src = option.getAttribute('data-swatch-image');
          if (src) new Image().src = src;
        });
      };
      group.addEventListener('pointerenter', warm);
      group.addEventListener('focusin', warm);
    }

    // Seed the roving tabindex from whichever option the markup marks selected.
    var checked = options.filter(function (option) {
      return option.getAttribute('aria-checked') === 'true';
    })[0];
    options.forEach(function (option) {
      option.tabIndex = option === (checked || options[0]) ? 0 : -1;
    });

    group.addEventListener('click', function (event) {
      var option = event.target.closest('[role="radio"]');
      if (option) select(option, false);
    });

    group.addEventListener('keydown', function (event) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      var index = options.indexOf(document.activeElement);
      select(options[(index + step + options.length) % options.length], true);
    });
  });

})();
