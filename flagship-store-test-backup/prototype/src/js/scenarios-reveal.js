/**
 * Scenario selector — the stacked list's scroll reveal
 * ----------------------------------------------------
 * Where the rows can't open on hover (below lg, or a touch screen), each row
 * plays the hover's open once as it scrolls into view: tile in from the left
 * with its photo drifting, the word pushed along and darkening, the disc
 * scaling up. The motion is CSS (src/css/components/scenarios.css); this arms
 * the list and marks each row data-in when a good part of it is on screen.
 * Rows arriving together (the first ones on load, or a fast scroll) are
 * staggered 0.12s apart through --scenario-delay.
 *
 * Nothing is armed under prefers-reduced-motion, without IntersectionObserver,
 * or in the hover layout; a list armed at a small width that grows into the
 * hover layout shows every row, as CSS there ignores the arming.
 *
 * Hooks: [data-scenarios] on the list, [data-scenarios-row] on each row's link;
 * state data-scenarios="armed" on the list and data-in on a row.
 */
(function () {
  'use strict';

  var hoverLayout = window.matchMedia('(hover: hover) and (min-width: 64rem)');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window) || hoverLayout.matches) return;

  document.querySelectorAll('[data-scenarios]').forEach(function (list) {
    var rows = list.querySelectorAll('[data-scenarios-row]');
    if (!rows.length) return;
    list.setAttribute('data-scenarios', 'armed');

    var watch = new IntersectionObserver(function (entries) {
      var arriving = entries.filter(function (entry) { return entry.isIntersecting; });
      arriving.forEach(function (entry, i) {
        entry.target.style.setProperty('--scenario-delay', i * 0.12 + 's');
        entry.target.setAttribute('data-in', '');
        watch.unobserve(entry.target);
      });
    }, { threshold: 0.6, rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(rows, function (row) { watch.observe(row); });
  });
})();
