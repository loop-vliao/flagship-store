/**
 * Product pill — one line or two
 * ------------------------------
 * A product pill (.btn-product, src/css/components/buttons.css) has two
 * states: one line, 64 tall with a 100px render cut at its foot, and two
 * lines, 72 tall with a 76px render shown whole. Which one a label needs
 * depends on its words and the pill's width, so this measures it.
 *
 * The label is always measured in the one-line state: if it wraps there, the
 * pill takes two lines. A label that would only fit beside the smaller render
 * still gets the two-line pill, so the state can't flip back and forth as the
 * padding changes. The measurement sets and reads within one task, so the
 * one-line state is never painted when the answer is two.
 *
 * It re-measures when the pill's container changes width and once the fonts
 * have loaded (a fallback face sets the label at a different width).
 *
 * Hooks: [data-btn-product] on the button, [data-btn-product-label] on the
 * copy of its label that is read (the first .roll-text). State: data-lines.
 */
(function () {
  'use strict';

  function measure(button) {
    var label = button.querySelector('[data-btn-product-label]');
    if (!label) return;
    button.setAttribute('data-lines', '1');
    var style = getComputedStyle(label);
    var line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    var lines = Math.round(label.getBoundingClientRect().height / line);
    if (lines > 1) button.setAttribute('data-lines', '2');
  }

  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-btn-product]'));
  if (!buttons.length) return;

  var all = function () { buttons.forEach(measure); };
  all();

  if ('ResizeObserver' in window) {
    buttons.forEach(function (button) {
      var width = 0;
      new ResizeObserver(function (entries) {
        var next = Math.round(entries[0].contentRect.width);
        if (next === width) return;
        width = next;
        measure(button);
      }).observe(button.parentElement);
    });
  } else {
    window.addEventListener('resize', all);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  // A translated page swaps its strings in after load (src/js/i18n.js).
  document.addEventListener('i18n:ready', all);
})();
