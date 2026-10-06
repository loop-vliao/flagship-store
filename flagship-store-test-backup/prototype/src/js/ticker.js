/**
 * Review-count ticker
 * -------------------
 * The social-proof number is a row of split tiles, each holding a reel of
 * digits that rolls like a mechanical counter:
 *
 *   reveal   the reels sit at 0 until the ticker is well into view, then all
 *            roll up to the count at once. The right-hand reels take extra
 *            turns and run longer, so the number settles left to right, each
 *            reel running a touch past its digit and dropping back onto it.
 *   tick     while the page is open the count goes up by one a minute. Only
 *            the reels that change move — the last first, a carry rippling
 *            left (5519 -> 5520 turns two).
 *
 * Each reel is 0-9 followed by a second 0, so a reel running from 9 round to 0
 * never jumps back. The count lives in data-ticker and in a visually hidden
 * label, so assistive tech reads a plain number rather than the reels.
 *
 * Without script the tiles show the digits in the markup. With
 * `prefers-reduced-motion` the count is shown straight away and ticks over
 * without rolling.
 *
 * Hooks: [data-ticker] on the row (its value is the count), [data-ticker-tile]
 * on each tile, [data-ticker-label] on the visually hidden number. The reels
 * and digits it builds carry .ticker-reel / .ticker-digit for their styling
 * (src/css/components/social.css).
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MINUTE = 60 * 1000;
  var CELLS = 11;         // 0-9, then 0 again
  var OVERSHOOT = 0.14;   // of a digit: how far past its mark a reel runs
  var SETTLE = 0.2;       // share of a roll spent dropping back onto the mark

  // The reveal starts every reel together and lengthens each one left to
  // right; a tick keeps one length and starts each reel later, right to left.
  var REVEAL = { duration: 1900, lengthen: 320 };
  var TICK = { duration: 1000, delay: 110 };

  function mod(n, m) { return ((n % m) + m) % m; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return (1 - Math.cos(Math.PI * t)) / 2; }

  // Where a roll from `from` to `to` is at t (0-1): out to just past the
  // digit, a stop, then back onto it.
  function travel(from, to, t) {
    var run = 1 - SETTLE;
    if (t < run) return from + (to + OVERSHOOT - from) * easeOut(t / run);
    return to + OVERSHOOT * (1 - easeInOut((t - run) / SETTLE));
  }

  function setup(root) {
    var value = parseInt(root.getAttribute('data-ticker'), 10) || 0;
    var label = root.querySelector('[data-ticker-label]');
    var reels = [];
    var frame = null;
    var revealed = false;

    function build(tile) {
      var strip = document.createElement('span');
      strip.className = 'ticker-reel';
      for (var i = 0; i < CELLS; i++) {
        var cell = document.createElement('span');
        cell.className = 'ticker-digit';
        cell.textContent = String(i % 10);
        strip.appendChild(cell);
      }
      tile.textContent = '';
      tile.appendChild(strip);
      return { tile: tile, strip: strip, pos: 0, roll: null };
    }

    function draw(reel) {
      var shift = mod(reel.pos, 10) / CELLS * 100;
      reel.strip.style.transform = 'translate3d(0, ' + (-shift).toFixed(4) + '%, 0)';
    }

    // A count that outgrows the row gets another tile on the left.
    function fit(length) {
      while (reels.length < length) {
        var tile = document.createElement('span');
        tile.className = 'ticker-tile';
        tile.setAttribute('data-ticker-tile', '');
        tile.setAttribute('aria-hidden', 'true');
        root.insertBefore(tile, reels[0].tile);
        var reel = build(tile);
        draw(reel);
        reels.unshift(reel);
      }
    }

    function step(now) {
      var busy = false;
      reels.forEach(function (reel) {
        if (!reel.roll) return;
        var t = (now - reel.roll.start) / reel.roll.duration;
        if (t >= 1) {
          reel.pos = mod(reel.roll.to, 10);
          reel.roll = null;
        } else {
          reel.pos = t <= 0 ? reel.roll.from : travel(reel.roll.from, reel.roll.to, t);
          busy = true;
        }
        draw(reel);
      });
      frame = busy ? window.requestAnimationFrame(step) : null;
    }

    // Move the reels to `count`: at once, or as a 'reveal' or a 'tick'.
    function show(count, style) {
      var digits = String(count);
      fit(digits.length);
      while (digits.length < reels.length) digits = '0' + digits;
      var now = performance.now();
      var last = reels.length - 1;

      reels.forEach(function (reel, i) {
        var digit = Number(digits[i]);
        if (!style || reduce.matches) {
          reel.roll = null;
          reel.pos = digit;
          draw(reel);
          return;
        }
        if (style === 'reveal') {
          var turns = digit + 10 * i;
          if (!turns) return;
          reel.roll = { from: 0, to: turns, start: now,
                        duration: REVEAL.duration + i * REVEAL.lengthen };
        } else {
          // Forward from wherever the reel is headed, never backwards.
          var heading = reel.roll ? reel.roll.to : Math.round(reel.pos);
          var ahead = mod(digit - mod(heading, 10), 10);
          if (!ahead) return;
          reel.roll = { from: reel.pos, to: heading + ahead,
                        start: now + (last - i) * TICK.delay, duration: TICK.duration };
        }
      });

      if (frame === null) frame = window.requestAnimationFrame(step);
    }

    root.querySelectorAll('[data-ticker-tile]').forEach(function (tile) {
      reels.push(build(tile));
    });
    if (!reels.length) return;

    if (reduce.matches) {
      revealed = true;
      show(value);
    } else {
      reels.forEach(draw);   // zeros until it is seen
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        revealed = true;
        show(value, 'reveal');
      }, { threshold: 0.6 });
      seen.observe(root);
    }

    window.setInterval(function () {
      value += 1;
      root.setAttribute('data-ticker', String(value));
      if (label) label.textContent = value.toLocaleString(document.documentElement.lang || 'en-US');
      // Before the reveal the new count simply becomes what it rolls up to.
      if (revealed) show(value, 'tick');
    }, MINUTE);
  }

  document.querySelectorAll('[data-ticker]').forEach(setup);
})();
