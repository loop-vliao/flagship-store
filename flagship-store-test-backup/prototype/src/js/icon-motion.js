/**
 * Animated icons — play on hover or keyboard focus, ease back on leave
 * --------------------------------------------------------------------
 * The motion is CSS (src/css/components/icon-motion.css), keyed to
 * data-playing on the icon's <svg>. This sets it while the icon's link or
 * button is hovered (by a pointer that can hover) or holds keyboard focus,
 * restarting the motion on every visit.
 *
 * Leaving mid-move, CSS would snap each moving part to rest the moment the
 * animation is removed. So first each part's current transform is read, then
 * data-playing comes off, then the part eases from where it was to rest over
 * its --icon-motion-out. A new visit cancels any ease still running.
 *
 * Hooks: [data-icon-motion] on the <svg>, [data-icon-motion-part] on each part
 * that animates (the cups transition in CSS and need nothing).
 */
(function () {
  'use strict';

  var hover = window.matchMedia('(hover: hover)');

  // A CSS time in milliseconds: browsers serialise "240ms" as ".24s".
  function ms(time) {
    var value = parseFloat(time);
    return /ms\s*$/.test(time) ? value : value * 1000;
  }

  document.querySelectorAll('[data-icon-motion]').forEach(function (icon) {
    var host = icon.closest('a, button');
    if (!host) return;
    var parts = Array.prototype.slice.call(icon.querySelectorAll('[data-icon-motion-part]'));
    var eases = [];

    function play() {
      eases.forEach(function (ease) { ease.cancel(); });
      eases = [];
      icon.removeAttribute('data-playing');
      void icon.getBoundingClientRect(); // restart the CSS animation
      icon.setAttribute('data-playing', '');
    }

    function rest() {
      if (!icon.hasAttribute('data-playing')) return;
      var from = parts.map(function (part) { return getComputedStyle(part).transform; });
      icon.removeAttribute('data-playing');
      if (!parts[0] || !parts[0].animate) return;
      parts.forEach(function (part, i) {
        if (from[i] === 'none') return;
        var out = ms(getComputedStyle(part).getPropertyValue('--icon-motion-out')) || 200;
        eases.push(part.animate([{ transform: from[i] }, { transform: 'none' }], {
          duration: out,
          easing: 'cubic-bezier(0.33, 0, 0.2, 1)',
        }));
      });
    }

    host.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' || hover.matches) play();
    });
    host.addEventListener('pointerleave', rest);
    host.addEventListener('focusin', function (event) {
      if (event.target.matches(':focus-visible')) play();
    });
    host.addEventListener('focusout', rest);
  });
})();
