/**
 * Loop essentials — the line under the tile in play
 * -------------------------------------------------
 * From lg with a pointer, a white line fills the stretch of rule under the
 * tile the pointer (or keyboard focus) is on. It is one element for the whole
 * grid, so it can travel: entering the grid it opens from the tile's centre;
 * moving to a neighbour in the same row it slides across, open; moving to
 * another row it closes behind (a copy, closing to the tile it left) while it
 * opens under the new tile; leaving the grid it closes to the
 * centre of the tile it left from. The motion is CSS
 * (src/css/components/essentials.css); this only places the line and says
 * whether it is open.
 *
 * Nothing runs without hover or below lg, where the grid is a carousel.
 *
 * Hooks: [data-essentials] on the section, [data-essentials-grid] (the
 * positioned list), [data-essentials-item] (each tile), [data-essentials-line].
 * State: data-open and data-jump on the line.
 */
(function () {
  'use strict';

  var desktop = window.matchMedia('(hover: hover) and (min-width: 64rem)');

  function setup(section) {
    var grid = section.querySelector('[data-essentials-grid]');
    var line = section.querySelector('[data-essentials-line]');
    if (!grid || !line) return;

    var current = null;

    function place(item) {
      line.style.setProperty('--line-x', item.offsetLeft + 'px');
      line.style.setProperty('--line-y', item.offsetTop + item.offsetHeight - line.offsetHeight + 'px');
      line.style.setProperty('--line-w', item.offsetWidth + 'px');
    }

    function closeBehind() {
      var ghost = line.cloneNode(false);
      ghost.removeAttribute('data-essentials-line');
      line.parentNode.insertBefore(ghost, line);
      void ghost.offsetWidth;
      ghost.removeAttribute('data-open');
      var gone = function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); };
      ghost.addEventListener('transitionend', gone);
      window.setTimeout(gone, 1000);
    }

    function enter(item) {
      if (!desktop.matches || item === current) return;
      var sameRow = current && current.offsetTop === item.offsetTop && line.hasAttribute('data-open');

      if (!sameRow) {
        // Leaving an open line in another row: a copy of it stays behind and
        // closes to its tile's centre, as it does leaving the grid.
        if (current && line.hasAttribute('data-open')) closeBehind();
        // Put it under the new tile, closed, with nothing animating; then open.
        line.setAttribute('data-jump', '');
        line.removeAttribute('data-open');
        place(item);
        void line.offsetWidth;
        line.removeAttribute('data-jump');
        line.setAttribute('data-open', '');
      } else {
        place(item);
      }
      current = item;
    }

    function leave() {
      line.removeAttribute('data-open');
      current = null;
    }

    grid.addEventListener('pointerover', function (event) {
      var item = event.target.closest('[data-essentials-item]');
      if (item && grid.contains(item)) enter(item);
    });
    grid.addEventListener('pointerleave', leave);

    // Keyboard focus only: a swatch clicked with the pointer takes focus too,
    // and following it would leave the line open after the pointer had gone.
    grid.addEventListener('focusin', function (event) {
      var item = event.target.closest('[data-essentials-item]');
      if (item && event.target.matches(':focus-visible')) enter(item);
    });
    grid.addEventListener('focusout', function (event) {
      if (!grid.contains(event.relatedTarget)) leave();
    });

    window.addEventListener('resize', function () {
      if (current) {
        line.setAttribute('data-jump', '');
        place(current);
        void line.offsetWidth;
        line.removeAttribute('data-jump');
      }
    });
  }

  document.querySelectorAll('[data-essentials]').forEach(setup);
})();
