/**
 * FAQ drawers
 * -----------
 * Native <details> does the opening, the keyboard handling and the semantics;
 * this adds the motion, and the show-more that keeps the list to seven
 * questions until it is asked for, as the live product page does.
 *
 * Both animate height with the Web Animations API. <details> content cannot be
 * transitioned in CSS in every browser this has to run in yet (Safari and
 * Firefox lack ::details-content), and a transition on max-height eases against
 * the wrong number. Closing waits for its animation before dropping `open`, so
 * an answer folds away instead of vanishing and leaving the fold behind.
 *
 * The icon follows `data-state` rather than [open], because that attribute
 * changes the moment the drawer is clicked, where [open] lags a closing drawer
 * by the length of its animation.
 *
 * Without script every question is simply visible and every drawer toggles
 * natively; with `prefers-reduced-motion` the drawers and the reveal snap.
 *
 * Hooks are data attributes: [data-faq] on the section, [data-faq-item],
 * [data-faq-question], [data-faq-answer], [data-faq-more], [data-faq-toggle],
 * [data-faq-toggle-label] on each copy of the toggle's rolling label.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-faq]');
  if (!root) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DURATION = 360;
  var EASE = 'cubic-bezier(0.2, 0, 0, 1)';

  function grow(el, from, to, done) {
    if (reduce.matches) { done && done(); return null; }
    var anim = el.animate(
      [{ height: from + 'px', opacity: from ? 1 : 0 }, { height: to + 'px', opacity: to ? 1 : 0 }],
      { duration: DURATION, easing: EASE }
    );
    anim.onfinish = function () { done && done(); };
    return anim;
  }

  // Drawers -------------------------------------------------------------------

  root.querySelectorAll('[data-faq-item]').forEach(function (item) {
    var summary = item.querySelector('[data-faq-question]');
    var answer = item.querySelector('[data-faq-answer]');
    var running = null;

    item.dataset.state = item.open ? 'open' : 'closed';

    summary.addEventListener('click', function (event) {
      event.preventDefault();
      var current = running ? answer.getBoundingClientRect().height : null;
      if (running) running.cancel();

      if (item.dataset.state === 'closed') {
        item.dataset.state = 'open';
        item.open = true;
        var full = answer.scrollHeight;
        running = grow(answer, current === null ? 0 : current, full, function () { running = null; });
      } else {
        item.dataset.state = 'closed';
        var from = current === null ? answer.getBoundingClientRect().height : current;
        running = grow(answer, from, 0, function () {
          running = null;
          if (item.dataset.state === 'closed') item.open = false;
        });
        if (!running) item.open = false;
      }
    });
  });

  // Show more -------------------------------------------------------------------

  var more = root.querySelector('[data-faq-more]');
  var button = root.querySelector('[data-faq-toggle]');
  if (!more || !button) return;

  var revealing = null;
  more.hidden = true;
  button.hidden = false;

  button.addEventListener('click', function () {
    if (revealing) revealing.cancel();
    var expanding = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanding));
    // The label rolls on hover, so it is two copies (buttons.css, "Rolling
    // labels"), each carrying [data-faq-toggle-label]; both change, or the
    // roll would reveal the old word.
    // A translated page names its labels on the button (data-faq-label-more/-less).
    var label = expanding
      ? (button.getAttribute('data-faq-label-less') || 'Show less')
      : (button.getAttribute('data-faq-label-more') || 'Show more');
    var copies = button.querySelectorAll('[data-faq-toggle-label]');
    if (copies.length) copies.forEach(function (copy) { copy.textContent = label; });
    else button.textContent = label;

    if (expanding) {
      more.hidden = false;
      revealing = grow(more, 0, more.scrollHeight, function () { revealing = null; });
    } else {
      // Keep focus on the page rather than lose it inside what is folding away.
      if (more.contains(document.activeElement)) button.focus();
      revealing = grow(more, more.getBoundingClientRect().height, 0, function () {
        revealing = null;
        more.hidden = true;
      });
      if (!revealing) more.hidden = true;
    }
  });
})();
