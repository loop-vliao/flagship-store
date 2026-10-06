/**
 * Sticky buy — "Add to bag" kept on screen
 * ----------------------------------------
 * Three states, read from where the buy card's button is on every scroll
 * frame (components/sticky-buy.css has the look). The bar is below lg only;
 * the mini runs at every width:
 *
 *   below   the button is under the screen's foot: the full-width bar sits
 *           on the foot, and the button is hidden behind it. Over the last
 *           --sticky-buy-morph of the button's climb to the foot, the bar
 *           becomes it where it stands — narrowing to the button's inset and
 *           rounding to its pill, its foot staying on the screen's — so it is
 *           the button the moment the button's own foot reaches the screen's.
 *           There the bar goes and the button shows, scrolling on with the
 *           page. Back down, the same in reverse: the button settles onto the
 *           foot and opens out into the bar. Drawn from the scroll, so it is
 *           exactly as fast as the reader.
 *   on      the button is on screen: nothing extra.
 *   above   the button has left the top of the screen: the mini rises from
 *           below (a CSS transition, --sticky-buy-slide). It sinks when the
 *           button comes back, and as the footer's top reaches the screen's
 *           foot, so it never sits over the footer.
 *
 * Both hand a tap to the buy card's button, so whatever it does, they do.
 * From lg the buy card sits beside the gallery and there is no bar: the mini
 * alone rises once the button has left the top, and goes at the footer.
 *
 * Hooks: [data-sticky-buy] (data-sticky-buy-end: a selector for where the mini
 * stops, default #footer), [data-sticky-buy-target] on the buy card's button,
 * [data-sticky-buy-bar], [data-sticky-buy-mini] (data-shown while up),
 * [data-sticky-buy-add] on each stand-in. The target carries
 * [data-sticky-buy-covered] while the bar stands in for it.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-sticky-buy]');
  var target = document.querySelector('[data-sticky-buy-target]');
  if (!root || !target) return;

  var bar = root.querySelector('[data-sticky-buy-bar]');
  var mini = root.querySelector('[data-sticky-buy-mini]');
  var end = document.querySelector(root.getAttribute('data-sticky-buy-end') || '#footer');
  var wide = window.matchMedia('(min-width: 64rem)');
  if (!bar || !mini) return;

  function px(value) {
    var n = parseFloat(value) || 0;
    return /rem\s*$/.test(value) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
  }

  // Ease in and out, close to the house curve: the bar gathers pace as the
  // button rises into it and settles onto it.
  function ease(t) {
    return t * t * (3 - 2 * t);
  }

  var style = getComputedStyle(root);
  var rest = px(style.getPropertyValue('--sticky-buy-bar')) || 66;
  var morph = px(style.getPropertyValue('--sticky-buy-morph')) || 40;
  var covered = false;

  function cover(on) {
    if (on === covered) return;
    covered = on;
    target.toggleAttribute('data-sticky-buy-covered', on);
    bar.hidden = !on;
  }

  // Straight from the scroll event, which browsers fire once a frame, before
  // it paints: the bar moves in the same frame as the button it follows.
  function update() {
    var view = window.innerHeight;
    var width = document.documentElement.clientWidth;
    var button = target.getBoundingClientRect();
    var below = button.bottom - view; // how far the button's foot is under the screen's

    // The bar: full width on the foot while the button is well below, then,
    // over the last `morph` of its climb, eased into the button's shape on
    // the spot — its foot stays on the screen's — so the two are one when
    // the button's foot reaches the screen's; from there, the button.
    if (!wide.matches && below > 0 && button.height) {
      var t = ease(Math.min(1, Math.max(0, 1 - below / morph)));
      var left = button.left * t;
      var right = width + (button.right - width) * t;
      var tall = rest + (button.height - rest) * t;
      bar.style.transform = 'translate3d(' + left.toFixed(2) + 'px, 0, 0)';
      bar.style.width = (right - left).toFixed(2) + 'px';
      bar.style.height = tall.toFixed(2) + 'px';
      bar.style.borderRadius = (t * button.height / 2).toFixed(2) + 'px';
      cover(true);
    } else {
      cover(false);
    }

    // The mini: up while the button is above the screen and the footer isn't
    // yet in.
    var past = button.bottom < 0;
    var ending = end && end.getBoundingClientRect().top < view;
    mini.toggleAttribute('data-shown', past && !ending);
  }

  function add() {
    target.click();
  }

  root.querySelectorAll('[data-sticky-buy-add]').forEach(function (button) {
    button.addEventListener('click', add);
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  wide.addEventListener('change', update);
  update();
})();
