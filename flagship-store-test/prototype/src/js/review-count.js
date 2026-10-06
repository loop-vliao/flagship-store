/**
 * Review count, rounded — "5,500+ 5-star reviews" from the product's 5,513
 * -----------------------------------------------------------------
 * The buy card's rating carries the product's review total, and a claim
 * elsewhere on the page (the company benefits' "5,500+ 5-star reviews") is that
 * total rounded down to the hundred, so it moves with the total and never
 * overstates it: 5,513 and 5,599 both read 5,500+. Below a hundred it is
 * the total itself. The number is formatted for the page's language
 * (5.500 on ?lang=de) and laid into the element's template.
 *
 * Without script the element keeps the text in the markup (the same claim,
 * written out), which is right for English at today's total.
 *
 * Hooks: [data-review-total] on the element that shows the total (its value
 * is the count, digits only); [data-review-floor] on each rounded claim, with
 * data-review-floor-template ("{{ count }}+ 5-star reviews", translated through
 * data-t-attr like any other attribute).
 */
(function () {
  'use strict';

  var STEP = 100;

  var source = document.querySelector('[data-review-total]');
  var claims = document.querySelectorAll('[data-review-floor]');
  if (!source || !claims.length) return;

  function render() {
    var total = parseInt(source.getAttribute('data-review-total'), 10);
    if (!(total > 0)) return;
    var count = total >= STEP ? Math.floor(total / STEP) * STEP : total;
    var number = new Intl.NumberFormat(document.documentElement.lang || 'en').format(count);
    claims.forEach(function (el) {
      var template = el.getAttribute('data-review-floor-template') || '{{ count }}+ 5-star reviews';
      el.textContent = template.replace(/\{\{\s*count\s*\}\}/g, number);
    });
  }

  render();
  // A translated page swaps the template in after load (src/js/i18n.js).
  document.addEventListener('i18n:ready', render);
})();
