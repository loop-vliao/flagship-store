/**
 * Footer link groups
 * ------------------
 * Below 1024 the four link groups are accordions; from 1024 they are plain
 * columns, always open. Same motion as the FAQ: the panel's height animates with
 * the Web Animations API and a closing panel waits for its fold before hiding.
 *
 * Without script every group is simply open. From 1024 the toggles stay in the
 * markup as the column headings but are taken out of the tab order and marked
 * aria-disabled, since there is nothing for them to do there.
 *
 * Hooks: [data-footer-group], [data-footer-toggle], [data-footer-panel]; the
 * plus/minus follows the group's data-state (src/css/components/disclosure.css).
 */
(function () {
  'use strict';

  var desktop = window.matchMedia('(min-width: 1024px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 360;
  var EASE = 'cubic-bezier(0.2, 0, 0, 1)';

  var groups = Array.prototype.map.call(document.querySelectorAll('[data-footer-group]'), function (group) {
    return {
      group: group,
      toggle: group.querySelector('[data-footer-toggle]'),
      panel: group.querySelector('[data-footer-panel]'),
      running: null,
    };
  });
  if (!groups.length) return;

  function grow(g, from, to, done) {
    if (reduce.matches) { done(); return null; }
    var anim = g.panel.animate(
      [{ height: from + 'px', opacity: from ? 1 : 0 }, { height: to + 'px', opacity: to ? 1 : 0 }],
      { duration: DURATION, easing: EASE }
    );
    anim.onfinish = done;
    return anim;
  }

  function apply() {
    groups.forEach(function (g) {
      if (g.running) { g.running.cancel(); g.running = null; }
      if (desktop.matches) {
        g.panel.hidden = false;
        g.toggle.setAttribute('aria-expanded', 'true');
        g.toggle.setAttribute('aria-disabled', 'true');
        g.toggle.tabIndex = -1;
      } else {
        var open = g.group.dataset.state === 'open';
        g.panel.hidden = !open;
        g.toggle.setAttribute('aria-expanded', String(open));
        g.toggle.removeAttribute('aria-disabled');
        g.toggle.removeAttribute('tabindex');
      }
    });
  }

  groups.forEach(function (g) {
    g.group.dataset.state = 'closed';
    g.toggle.addEventListener('click', function () {
      if (desktop.matches) return;
      var current = g.running ? g.panel.getBoundingClientRect().height : null;
      if (g.running) g.running.cancel();

      if (g.group.dataset.state === 'closed') {
        g.group.dataset.state = 'open';
        g.toggle.setAttribute('aria-expanded', 'true');
        g.panel.hidden = false;
        g.running = grow(g, current === null ? 0 : current, g.panel.scrollHeight, function () { g.running = null; });
      } else {
        g.group.dataset.state = 'closed';
        g.toggle.setAttribute('aria-expanded', 'false');
        var from = current === null ? g.panel.getBoundingClientRect().height : current;
        g.running = grow(g, from, 0, function () {
          g.running = null;
          if (g.group.dataset.state === 'closed') g.panel.hidden = true;
        });
      }
    });
  });

  apply();
  desktop.addEventListener('change', apply);
})();
