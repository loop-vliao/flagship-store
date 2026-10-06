/**
 * Component states — a page previewed in a designed state on ?state=
 * ------------------------------------------------------------------
 * The master build renders every component in its everyday state. A state
 * Echo draws beside it (a sale; out of stock next) is built into the same
 * markup, switched off, and switched on by an attribute on <html> that the
 * components answer with in-data-[…] variants — so a change to a component
 * reaches its states too, and the page without a state is the master
 * prototype, untouched.
 *
 *   ?state=sale           data-price="sale" data-promo="sale"
 *   ?state=black-friday   data-price="sale" data-promo="black-friday"
 *   ?state=archive-sale   data-price="sale" data-promo="archive"
 *       the buy card's sale price (the same in every campaign), the hero's
 *       campaign tag and the saving ribbon in the campaign's colours
 *   ?state=halo           data-message="halo"
 *       the messaging block under the hero plate, with the Halo example
 *   ?state=personalization   data-personalization="case"
 *       the buy card's personalization row — the case, signed — and its
 *       switch, which closes the gap to the button from 32 to 24
 *
 * One attribute per dial — price (full or sale), promo (the campaign that
 * paints the tags), message (the block and its content), personalization
 * (what the product offers to personalise); stock, later — so states
 * combine: ?state=black-friday,halo. states.html shows each state side by
 * side and flips them live on the real page: its live frame posts
 * { type: 'loop:states', dials: { price, promo, message, personalization } }
 * (a value or null) to the framed page,
 * which sets or clears each known dial in place. A message rather than a
 * reach into the frame, so it works from a server and from disk alike (a
 * browser won't let one file:// page touch another's document).
 *
 * In <head> and not deferred, so a state is set before the first paint and
 * the everyday one never flashes. In the Shopify theme these come from the
 * product's own data (a compare-at price above the price is a sale), not a
 * parameter; the attributes are the hooks either way.
 */
(function () {
  'use strict';

  // state name → the dials it sets, each as data-<dial>="<value>" on <html>.
  var STATES = {
    sale: { price: 'sale', promo: 'sale' },
    'black-friday': { price: 'sale', promo: 'black-friday' },
    'archive-sale': { price: 'sale', promo: 'archive' },
    halo: { message: 'halo' },
    personalization: { personalization: 'case' },
  };

  var root = document.documentElement;
  var dials = {};
  Object.keys(STATES).forEach(function (name) {
    Object.keys(STATES[name]).forEach(function (dial) { dials[dial] = true; });
  });

  var param = new URLSearchParams(window.location.search).get('state');
  if (param) {
    param.split(/[\s,]+/).forEach(function (name) {
      var state = STATES[name.toLowerCase()];
      if (!state) return;
      Object.keys(state).forEach(function (dial) { root.setAttribute('data-' + dial, state[dial]); });
    });
  }

  // From the states page's live frame only: set or clear each known dial.
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (window.parent === window || event.source !== window.parent) return;
    if (!data || data.type !== 'loop:states' || !data.dials) return;
    Object.keys(data.dials).forEach(function (dial) {
      if (!dials[dial]) return;
      var value = data.dials[dial];
      if (value) root.setAttribute('data-' + dial, String(value));
      else root.removeAttribute('data-' + dial);
    });
    // Scripts that measure the page (the sticky buy) read it afresh.
    window.dispatchEvent(new Event('resize'));
  });
})();
