/**
 * Intro copy scroll reveal
 * ------------------------
 * Both artboards draw the intro paragraph twice: once dimmed at full length,
 * once at full contrast cut off mid-sentence. That's a scroll-linked fill, so
 * the copy brightens word by word as the paragraph moves up the viewport.
 *
 * Progressive enhancement: the paragraph ships fully legible at full contrast.
 * Only once this script has wrapped the words does it switch to the dimmed
 * state, so a JS failure leaves readable copy rather than grey mush.
 *
 * Honours prefers-reduced-motion via CSS (see src/css/components/reveal.css).
 */
(function () {
  'use strict';

  var SELECTOR = '[data-reveal]';
  /* Fill runs while the paragraph travels between these fractions of the
     viewport height — starting once its top passes 85% down the screen and
     completing when it reaches 35%. */
  var START = 0.85;
  var END = 0.35;
  /* How much of the paragraph brightens at once. A small window reads as a
     wipe; a wider one as a soft gradient. */
  var FEATHER = 0.28;

  /**
   * Replace each text node with one <span data-reveal-word> per word, leaving
   * element children (the <sup> trademark) intact and in place.
   */
  function wrapWords(root) {
    var words = [];

    Array.prototype.slice.call(root.childNodes).forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.setAttribute('data-reveal-word', '');
        words.push(node);
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE) return;

      var fragment = document.createDocumentFragment();
      // Keep the separators so spacing and line breaking are unchanged.
      node.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) {
          fragment.appendChild(document.createTextNode(chunk));
          return;
        }
        var span = document.createElement('span');
        span.setAttribute('data-reveal-word', '');
        span.textContent = chunk;
        fragment.appendChild(span);
        words.push(span);
      });
      root.replaceChild(fragment, node);
    });

    return words;
  }

  function setup(paragraph) {
    var words = wrapWords(paragraph);
    if (!words.length) return;

    paragraph.setAttribute('data-reveal', 'ready');

    var ticking = false;

    function paint() {
      ticking = false;

      var box = paragraph.getBoundingClientRect();
      var viewport = window.innerHeight || document.documentElement.clientHeight;
      // 0 before the paragraph enters the band, 1 once it has crossed it.
      var travelled = (START * viewport - box.top) / ((START - END) * viewport);
      var progress = Math.min(1, Math.max(0, travelled));

      // Spread the band a little past both ends so the first and last words
      // still reach full opacity.
      var head = progress * (1 + FEATHER) - FEATHER;

      words.forEach(function (word, index) {
        var position = index / Math.max(1, words.length - 1);
        var opacity = (head - position) / FEATHER + 1;
        word.style.setProperty('--word-opacity', Math.min(1, Math.max(0, opacity)).toFixed(3));
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(paint);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();

    // A translated page swaps the paragraph's text in after load (src/js/i18n.js),
    // which drops the spans: wrap the new words and paint them where the page is.
    document.addEventListener('i18n:ready', function () {
      words = wrapWords(paragraph);
      paint();
    });
  }

  document.querySelectorAll(SELECTOR).forEach(setup);
})();
