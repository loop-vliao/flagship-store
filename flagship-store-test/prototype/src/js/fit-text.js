/**
 * Fit text — measures how long a line is, so CSS can fit it to its slot.
 * ---------------------------------------------------------------------
 * The sizing itself is a clamp in src/css/components/fit-text.css:
 *
 *   font-size: clamp(floor, --fit-space ÷ --fit-em, design size)
 *
 * This script supplies --fit-em: the element's widest line, unwrapped, in em
 * of its own font size. That ratio is the same at every screen width, so it is
 * measured once (and again when the web fonts arrive, or when told to) and the
 * clamp does the rest on resize.
 *
 * It also marks the floor state: when the slot is too small even at the floor,
 * the element wraps, and gets [data-fit-floor] so a component can adjust its
 * leading. That is re-checked when the window or the element's parent resizes.
 *
 * Hooks
 *   [data-fit]        an element whose parent sets its design size
 *   [data-fit-group]  optional, a name: every [data-fit] with the same name takes
 *                     the smallest scale among them, so parts of one lockup stay
 *                     one size. Members' slots must scale together (the same
 *                     container, in cqi), since the shared size is set once.
 *   [data-fit-floor]  state, set here — only on an element that itself can't fit
 *                     at the floor, so a group member that fits keeps its leading
 *   --fit-min         optional floor, as a share of the design size (default 0.7)
 *
 * For content that changes after load (a CMS preview, a language switch):
 *   window.fitText.refresh()
 */
(function () {
  'use strict';

  var SAFETY = 1.02; // a hair of room, so rounding never wraps a line that fits
  var PROBE = 100; // px; the measured width at this size, over it, is the em ratio

  function all() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-fit]'));
  }

  // The widest line, unwrapped, at PROBE px. A clone beside the element inherits
  // what the element inherits, and is measured hidden, so nothing on the page moves.
  function measure(el) {
    var probe = el.cloneNode(true);
    probe.removeAttribute('data-fit');
    probe.removeAttribute('data-fit-floor');
    probe.removeAttribute('id');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;top:0;left:0;display:block;visibility:hidden;pointer-events:none;' +
      'white-space:nowrap;width:max-content;max-width:none;font-size:' + PROBE + 'px;';
    el.parentNode.appendChild(probe);
    var width = probe.getBoundingClientRect().width;
    probe.remove();
    el._fitEm = width > 0 ? (width / PROBE) * SAFETY : 0;
    if (el._fitEm) el.style.setProperty('--fit-em', el._fitEm.toFixed(4));
  }

  // The scale an element would take on its own: its slot over its line, in design sizes.
  function scaleOf(el) {
    var space = parseFloat(getComputedStyle(el).maxInlineSize);
    var design = parseFloat(getComputedStyle(el.parentElement).fontSize);
    return el._fitEm > 0 && isFinite(space) ? space / (el._fitEm * design) : Infinity;
  }

  // A group shares its smallest scale: each member's --fit-em is set so the clamp
  // lands every one of them on that scale.
  function group(els) {
    var groups = {};
    els.forEach(function (el) {
      var name = el.getAttribute('data-fit-group');
      if (name) (groups[name] = groups[name] || []).push(el);
    });
    Object.keys(groups).forEach(function (name) {
      var members = groups[name];
      var scale = Math.min.apply(null, members.map(scaleOf));
      if (!isFinite(scale)) return;
      members.forEach(function (el) {
        var mine = scaleOf(el);
        if (isFinite(mine)) el.style.setProperty('--fit-em', (el._fitEm * (mine / scale)).toFixed(4));
      });
    });
  }

  function floorState(el) {
    var min = parseFloat(getComputedStyle(el).getPropertyValue('--fit-min')) || 0.7;
    el.toggleAttribute('data-fit-floor', scaleOf(el) < min);
  }

  function update() {
    var els = all();
    group(els);
    els.forEach(floorState);
  }

  function refresh() {
    all().forEach(measure);
    update();
  }

  var timer = null;
  function onResize() {
    clearTimeout(timer);
    timer = setTimeout(update, 100);
  }

  refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  // A translated page swaps its strings in after load (src/js/i18n.js): new words, new widths.
  document.addEventListener('i18n:ready', refresh);
  window.addEventListener('resize', onResize);
  // A slot can change size without the window resizing (a container query, a CMS
  // preview pane), and a resize event can arrive before layout has caught up:
  // watching each fitted element's parent catches both.
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(onResize);
    all().forEach(function (el) { observer.observe(el.parentElement); });
  }

  window.fitText = { refresh: refresh };
})();
