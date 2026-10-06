/**
 * Product page hero — placing the artwork around its safe box
 * -----------------------------------------------------------
 * The hero's background is drawn around one safe box, the same 1.07:1 shape
 * on both artboards, so a subject in it stays clear of the buy card
 * (README, "Hero artwork"). CSS sizes it: below lg as wide as the plate and
 * pinned to the top; from lg as tall as the plate, or as wide once the plate
 * outgrows it. This places it.
 *
 * Below lg the 958 x 3200 artboard's safe box (958 x 897, at the top) is made
 * to fill the band above the buy card: the artwork grows until the box ends
 * 16px above the card, and the overflow is trimmed evenly off both sides —
 * 8.8% a side at most, on a phone; nothing once the box already reaches the
 * card (about 880 up), where it stays as wide as the plate.
 *
 * From lg:
 *
 *   The 2640 x 1080 artboard's safe box (1153 x 1080, 360 in from its left)
 *   is centred in the space left of the buy card, less a 24px gap. On a small
 *   laptop that space is narrower than the box, so the box loses a little from
 *   each side — 13% a side at 1024, nothing from about 1344. The artboard is
 *   then held to cover the plate: its left edge never inside the plate's, its
 *   right edge never short of the plate's.
 *
 * Both layouts: the intro's zoom (hero-motion.css) pivots about a point on the
 * plate, 53.67% across and 93.26% down; the image is now larger than the
 * plate, so that point is given in the image's own pixels (--zoom-origin).
 *
 * Re-placed whenever the plate or the card changes size.
 *
 * Every slide of the gallery (src/js/hero-gallery.js) is drawn on the same
 * artboards, so the placement is written on the plate and each slide's media
 * inherits it.
 *
 * Hooks: [data-hero-art] on the first slide's <img>, [data-hero-art-plate] on
 * the plate, [data-hero-art-card] on the buy card. Writes --hero-art-x,
 * --hero-art-w (below lg) and --zoom-origin on the plate.
 */
(function () {
  'use strict';

  var ARTBOARD = { width: 2640, height: 1080 };
  var SAFE = { left: 360, width: 1153 };
  var GAP = 24;
  var MOBILE = { width: 958, safeHeight: 897, gap: 16 };
  var ZOOM = { x: 0.5367, y: 0.9326 };

  var img = document.querySelector('[data-hero-art]');
  var plate = img && img.closest('[data-hero-art-plate]');
  var card = plate && plate.querySelector('[data-hero-art-card]');
  if (!img || !plate || !card) return;

  var desktop = window.matchMedia('(min-width: 64rem)');

  function place() {
    var box = plate.getBoundingClientRect();
    var left = 0;

    if (desktop.matches) {
      var scale = box.height / ARTBOARD.height;
      var width = ARTBOARD.width * scale;
      if (width > box.width + 0.5) {
        var free = card.getBoundingClientRect().left - box.left - GAP;
        var safeWidth = SAFE.width * scale;
        left = (free - safeWidth) / 2 - SAFE.left * scale;
        left = Math.min(0, Math.max(box.width - width, left));
      }
      plate.style.setProperty('--hero-art-x', left + 'px');
      plate.style.removeProperty('--hero-art-w');
    } else {
      var cardTop = card.getBoundingClientRect().top - box.top;
      var grown = Math.max(box.width, MOBILE.width * (cardTop - MOBILE.gap) / MOBILE.safeHeight);
      left = (box.width - grown) / 2;
      plate.style.setProperty('--hero-art-w', grown + 'px');
      plate.style.setProperty('--hero-art-x', left + 'px');
    }

    plate.style.setProperty('--zoom-origin', (ZOOM.x * box.width - left) + 'px ' + ZOOM.y * box.height + 'px');
  }

  place();
  if ('ResizeObserver' in window) {
    var watch = new ResizeObserver(place);
    watch.observe(plate);
    watch.observe(card);
  } else {
    window.addEventListener('resize', place);
  }
  desktop.addEventListener('change', place);
})();
