/**
 * Localization — a page's English swapped for a locale on ?lang=
 * --------------------------------------------------------------
 * The markup is English, and every translatable string in it carries a key
 * (build/locales.py documents the marks and generates locales/en.default.json
 * from them):
 *
 *   data-t="product.faq.show_more"        the element's text
 *   data-t="…_html"                        a key ending _html keeps its inline tags
 *   data-t="…" data-t-words                a headline animated one span per word: the
 *                                          translation's words are laid into the existing
 *                                          spans, lines split on \n; a longer line clones
 *                                          its last span for the extra words, a beat later each
 *   data-t-attr="alt:key aria-label:key"  attributes, space-separated attr:key pairs
 *
 * ?lang=de loads locales/de.json, sets <html lang="de">, swaps every string the
 * file has (a key it lacks keeps its English), rewrites in-site links so the
 * parameter travels to the next page, and dispatches i18n:ready on document,
 * which the scripts that measure or wrap text listen for (fit-text,
 * btn-product, scroll-reveal, hero-gallery). Without the parameter, or with
 * ?lang=en, the page is its English self and nothing is swapped.
 *
 * In <head> and not deferred: it sets data-i18n="loading" on <html> before the
 * first paint, and src/css/components/i18n.css holds every [data-t] invisible
 * while that is set, so the English never flashes. The hold comes off when the
 * swap lands, when the file fails to load — a browser will not fetch JSON from
 * file://, so a page opened from disk stays English — or after 3s regardless.
 *
 * window.i18n = { lang, t(key, vars) }: t returns the loaded translation with
 * its {{ placeholders }} filled from vars, or null when there is none, so a
 * caller falls back to the English it has in the markup.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var DEFAULT = 'en';
  var HOLD = 3000;

  var param = new URLSearchParams(window.location.search).get('lang');
  var lang = param && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(param) ? param : null;
  var table = null;

  function lookup(key) {
    var node = table;
    var parts = key.split('.');
    for (var i = 0; node && i < parts.length; i++) node = node[parts[i]];
    return typeof node === 'string' ? node : null;
  }

  function t(key, vars) {
    var value = lookup(key);
    if (value === null || !vars) return value;
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, function (match, name) {
      return name in vars ? String(vars[name]) : match;
    });
  }

  window.i18n = { lang: lang || DEFAULT, t: t };

  function whenParsed(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // In-site links carry the parameter on, so the next page opens in the same language.
  function propagate() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var m = /^([^:?#]*\.html)(\?[^#]*)?(#.*)?$/.exec(a.getAttribute('href'));
      if (!m) return;
      var params = new URLSearchParams(m[2] ? m[2].slice(1) : '');
      params.set('lang', lang);
      a.setAttribute('href', m[1] + '?' + params.toString() + (m[3] || ''));
    });
  }

  if (!lang) return;
  if (lang === DEFAULT) {
    whenParsed(propagate);
    return;
  }

  // The deepest single child of a word span is the element that holds the word.
  function setWord(span, word) {
    var target = span;
    while (target.childNodes.length === 1 && target.firstChild.nodeType === 1) target = target.firstChild;
    target.textContent = word;
  }

  function beatOf(span) {
    return parseFloat(getComputedStyle(span).getPropertyValue('--at')) || 0;
  }

  // Lay a translation into a headline animated one span per word. Every existing span
  // keeps its classes and its beat; a line with more words clones its last span for
  // the extra ones, each a beat later; a line with fewer drops the spare; the lines
  // follow the string's \n.
  function words(el, value) {
    var lines = [[]];
    var breaks = [];
    Array.prototype.forEach.call(el.children, function (child) {
      if (child.tagName === 'BR') {
        lines.push([]);
        breaks.push(child);
      } else {
        lines[lines.length - 1].push(child);
      }
    });
    var filled = lines.filter(function (line) { return line.length; });
    if (!filled.length) {
      el.textContent = value;
      return;
    }
    var lastLine = filled[filled.length - 1];
    var fallback = lastLine[lastLine.length - 1];
    var out = [];
    value.split('\n').forEach(function (line, i) {
      var have = lines[i] || [];
      var base = have[have.length - 1] || fallback;
      var beat = beatOf(base);
      if (i) out.push(breaks[i - 1] || document.createElement('br'));
      line.split(/\s+/).filter(Boolean).forEach(function (word, j) {
        if (j) out.push(document.createTextNode(' '));
        var span = have[j];
        if (!span) {
          span = base.cloneNode(true);
          span.style.setProperty('--at', (beat + 0.1 * (j - have.length + 1)).toFixed(1) + 's');
        }
        setWord(span, word);
        out.push(span);
      });
    });
    while (el.firstChild) el.removeChild(el.firstChild);
    out.forEach(function (node) { el.appendChild(node); });
  }

  function apply() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      var key = el.getAttribute('data-t');
      var value = lookup(key);
      if (value === null) return;
      if (el.hasAttribute('data-t-words')) words(el, value);
      else if (/_html$/.test(key)) el.innerHTML = value;
      else el.textContent = value;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-t-attr]'), function (el) {
      el.getAttribute('data-t-attr').split(/\s+/).forEach(function (pair) {
        var at = pair.indexOf(':');
        if (at < 1) return;
        var value = lookup(pair.slice(at + 1));
        if (value !== null) el.setAttribute(pair.slice(0, at), value);
      });
    });
    root.setAttribute('lang', lang);
  }

  root.setAttribute('data-i18n', 'loading');
  var timer = window.setTimeout(release, HOLD);

  function release() {
    window.clearTimeout(timer);
    root.removeAttribute('data-i18n');
  }

  var request = window.fetch
    ? window.fetch('locales/' + lang + '.json', { cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
        return response.json();
      })
    : Promise.reject(new Error('fetch is not available'));

  request.then(function (json) {
    table = json;
    whenParsed(function () {
      apply();
      propagate();
      release();
      document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: lang } }));
    });
  }, function (error) {
    release();
    window.i18n.lang = DEFAULT;
    whenParsed(propagate);
    console.warn(
      '[i18n] locales/' + lang + '.json did not load (' + error.message + '), so the page stays English.' +
      (window.location.protocol === 'file:' ? ' A browser will not fetch it from file:// — serve the page (npm run dev).' : '')
    );
  });
})();
