/**
 * Footer link groups
 * ------------------
 * Below 1024 the four link groups are accordions; from 1024 they are plain
 * columns, always open. The FAQ's motion exactly (src/js/faq.js): the panel's
 * height animates with the Web Animations API over 360ms on the same curve,
 * held at its last frame until the panel is settled, and a closing panel waits
 * for its fold before hiding. The plus turns and folds into a minus, and a
 * line draws over the rule above a hovered or open group, as on the FAQ
 * (disclosure.css, faq.css).
 *
 * Without script every group is simply open. From 1024 the toggles stay in the
 * markup as the column headings but are taken out of the tab order and marked
 * aria-disabled, since there is nothing for them to do there.
 *
 * Hooks: [data-footer-group], [data-footer-toggle], [data-footer-panel]; the
 * plus and the line follow the group's data-state. The sign-up field's states
 * are the second script below.
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

  // faq.js's grow(): held at its last frame until `done` has run, then
  // dropped, so a closing panel doesn't flash back open for the frame between
  // the animation ending and its callback.
  function grow(g, from, to, done) {
    if (reduce.matches) { done(); return null; }
    var anim = g.panel.animate(
      [{ height: from + 'px', opacity: from ? 1 : 0 }, { height: to + 'px', opacity: to ? 1 : 0 }],
      { duration: DURATION, easing: EASE, fill: 'forwards' }
    );
    anim.onfinish = function () {
      done();
      anim.cancel();
    };
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

/**
 * Footer sign-up — a stand-in that answers and sends nothing
 * ----------------------------------------------------------
 * The field checks for a whole address (something, an @, a domain with a
 * dot, and two or more letters after the last dot) and shows Echo's states
 * (components/signup.css) as data-signup-state on [data-signup]:
 *
 *   error     the field is left with a part-typed address, or sent without a
 *             whole one (the field keeps focus then). It clears the moment
 *             the address is whole, or the field is emptied.
 *   success   sent with a whole address, by the disc or Enter: the field lets
 *             go of focus, as drawn, and the answer is read out from the live
 *             region. Typing again puts the field back to where it was.
 *
 * There is no <form>, so without script the field is only typeable, and the
 * address never reaches a URL.
 *
 * Hooks: [data-signup], [data-signup-send], [data-signup-message="error"] (its
 * id is what the input is described by while in error; otherwise the consent
 * line, the input's own aria-describedby).
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-signup]');
  if (!root) return;
  var input = root.querySelector('input[type="email"]');
  var send = root.querySelector('[data-signup-send]');
  var error = root.querySelector('[data-signup-message="error"]');
  if (!input || !send) return;

  var WHOLE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
  var note = input.getAttribute('aria-describedby');

  function state(next) {
    if (next === undefined) return root.getAttribute('data-signup-state') || '';
    if (next) root.setAttribute('data-signup-state', next);
    else root.removeAttribute('data-signup-state');
    var bad = next === 'error';
    if (bad) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (error && note) input.setAttribute('aria-describedby', bad ? error.id : note);
  }

  function whole() {
    return WHOLE.test(input.value.trim());
  }

  function submit() {
    if (state() === 'success') return;
    if (!whole()) {
      state('error');
      input.focus();
      return;
    }
    state('success');
    input.blur();
  }

  input.addEventListener('blur', function () {
    if (!state() && input.value.trim() && !whole()) state('error');
  });

  input.addEventListener('input', function () {
    if (state() === 'success' || (state() === 'error' && (whole() || !input.value.trim()))) state('');
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      submit();
    }
  });

  send.addEventListener('click', submit);
})();
