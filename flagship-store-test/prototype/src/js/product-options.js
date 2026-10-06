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
 *
 * Switches (button[role="switch"], components/switch.css) turn on and off:
 * a click flips aria-checked. The buy card's personalization switch opens
 * the personalization modal in the final build; here it only turns.
 *
 * Groups inside one [data-swatch-set] are a single choice (the PDP buy card's
 * core and limited-edition colours): choosing in one clears the others. A
 * group's fieldset legend can name the choice: [data-swatch-legend] carries
 * the words for none chosen and one chosen (data-swatch-legend-none / -one),
 * [data-swatch-legend-label] shows them and [data-swatch-legend-name] shows
 * the chosen swatch's aria-label, hidden while nothing is chosen. The words
 * are attributes so a locale translates them (i18n.js); the legend is written
 * again on i18n:ready.
 */
(function () {
  'use strict';

  /* --- Colour swatches --------------------------------------------------- */

  var groups = [];

  // The legend follows its group's choice: "Core colors" with nothing chosen,
  // "Core color Graphite" once Graphite is.
  function name(group) {
    var fieldset = group.el.closest('fieldset');
    var legend = fieldset && fieldset.querySelector('[data-swatch-legend]');
    if (!legend) return;
    var label = legend.querySelector('[data-swatch-legend-label]');
    var chosenName = legend.querySelector('[data-swatch-legend-name]');
    var chosen = group.options.filter(function (option) {
      return option.getAttribute('aria-checked') === 'true';
    })[0];
    var words = legend.getAttribute(chosen ? 'data-swatch-legend-one' : 'data-swatch-legend-none');
    if (label && words) label.textContent = words;
    if (chosenName) {
      chosenName.textContent = chosen ? chosen.getAttribute('aria-label') : '';
      chosenName.hidden = !chosen;
    }
  }

  // Clear a group: nothing chosen, its first option the one in the tab order.
  function clear(group) {
    group.options.forEach(function (option, index) {
      option.setAttribute('aria-checked', 'false');
      option.tabIndex = index === 0 ? 0 : -1;
    });
    name(group);
  }

  document.querySelectorAll('[role="radiogroup"]').forEach(function (el) {
    var options = Array.prototype.slice.call(el.querySelectorAll('[role="radio"]'));
    if (!options.length) return;
    var group = { el: el, options: options, set: el.closest('[data-swatch-set]') };
    groups.push(group);

    // A group can show its product in the chosen colour: data-swatch-target
    // names the <img>, and each option's data-swatch-image is its picture. A
    // colour that has a video (data-swatch-video on the option) shows the
    // element data-swatch-video-target names instead, and any other colour
    // hides it and rewinds it to its first frame.
    var image = document.getElementById(el.getAttribute('data-swatch-target') || '');
    var video = document.getElementById(el.getAttribute('data-swatch-video-target') || '');

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
    // Choosing clears the other groups in the same set.
    function select(option, moveFocus) {
      options.forEach(function (candidate) {
        var chosen = candidate === option;
        candidate.setAttribute('aria-checked', String(chosen));
        candidate.tabIndex = chosen ? 0 : -1;
      });
      if (group.set) {
        groups.forEach(function (other) {
          if (other !== group && other.set === group.set) clear(other);
        });
      }
      name(group);
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
      el.addEventListener('pointerenter', warm);
      el.addEventListener('focusin', warm);
    }

    // Seed the roving tabindex from whichever option the markup marks selected.
    var checked = options.filter(function (option) {
      return option.getAttribute('aria-checked') === 'true';
    })[0];
    options.forEach(function (option) {
      option.tabIndex = option === (checked || options[0]) ? 0 : -1;
    });

    name(group);

    el.addEventListener('click', function (event) {
      var option = event.target.closest('[role="radio"]');
      if (option) select(option, false);
    });

    el.addEventListener('keydown', function (event) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      var index = options.indexOf(document.activeElement);
      select(options[(index + step + options.length) % options.length], true);
    });
  });

  // A locale swaps the legends' words and the swatches' names after load.
  document.addEventListener('i18n:ready', function () {
    groups.forEach(name);
  });

  /* --- Switches --------------------------------------------------------- */

  document.querySelectorAll('button[role="switch"]').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      toggle.setAttribute('aria-checked', String(toggle.getAttribute('aria-checked') !== 'true'));
    });
  });

})();
