/**
 * What's in the box — the case closes and opens
 * ---------------------------------------------
 * The box shows the case open. Press Close and it plays shut, and the pill
 * rolls over to Open at once; press Open and it plays open again, the pill
 * rolling back to Close. A press while the case is moving turns it round from
 * where it is, so it can be opened and closed at will. Two silent videos do
 * it (build/make-box-video.py): box-close.mp4, and box-open.mp4, the same
 * frames reversed and just as long — a browser can't play a video backwards
 * smoothly, so the reverse is its own file, and the frame at t in one is the
 * frame at (length − t) in the other. They are stacked; turning round pauses
 * the one playing, seeks the other to the same frame and shows it once it is
 * there, so the swap never shows; at the ends, one's last frame is the other's
 * first.
 *
 * The arrow off the pill (box.css) draws itself on while the case waits open
 * and the section is on screen; it hides the moment Close is pressed and
 * comes back once the case is open again. The videos start loading as the
 * section comes near. With `prefers-reduced-motion` the case jumps to its
 * other end rather than playing. Without script the box shows the open case
 * (the first video's poster) and no pill.
 *
 * Hooks: [data-box-video-root] (state in data-box-state: open, closing,
 * closed, opening), [data-box-video="close"|"open"] (the one showing carries
 * data-shown), [data-box-toggle] with its labels in data-box-label-close /
 * -open, [data-box-toggle-label] on each copy of its rolling label,
 * [data-box-arrow]. The section gets data-box-live while on screen.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-box-video-root]');
  if (!root) return;

  var closeV = root.querySelector('[data-box-video="close"]');
  var openV = root.querySelector('[data-box-video="open"]');
  var toggle = root.querySelector('[data-box-toggle]');
  if (!closeV || !openV || !toggle) return;

  var section = root.closest('section') || root;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  toggle.hidden = false;
  // An <svg> has no `hidden` property, so the attribute comes off by name.
  root.querySelectorAll('[data-box-arrow]').forEach(function (arrow) { arrow.removeAttribute('hidden'); });

  function state(next) {
    if (next) root.setAttribute('data-box-state', next);
    return root.getAttribute('data-box-state');
  }

  function text(which) {
    return toggle.getAttribute('data-box-label-' + which) || (which === 'open' ? 'Open' : 'Close');
  }

  // Both copies of the rolling label change, or the roll would show the old word.
  function label(which) {
    toggle.querySelectorAll('[data-box-toggle-label]').forEach(function (copy) { copy.textContent = text(which); });
  }

  // The label changes the way the hover rolls it (buttons.css, "Rolling
  // labels"): the word showing rolls up and out, and the new one rolls in from
  // below, 0.2s behind, 0.5s each on the house curve. Whichever copy is
  // showing — the hover may have rolled the second one in — goes out; the
  // other, given the new word, comes in. Then both carry the new word and the
  // animations come off, leaving the button exactly as the CSS has it.
  var rolling = null; // the roll under way, so a quick second press can settle it first

  function roll(which) {
    var copies = toggle.querySelectorAll('[data-box-toggle-label]');
    if (rolling) rolling();
    if (reduce.matches || copies.length < 2 || !copies[0].animate) return label(which);
    // The copy showing is the one sitting in the mask, level with its top.
    var top = copies[0].parentNode.getBoundingClientRect().top;
    var off = function (copy) { return Math.abs(copy.getBoundingClientRect().top - top); };
    var shown = off(copies[0]) <= off(copies[1]) ? 0 : 1;
    var outgoing = copies[shown], incoming = copies[1 - shown];
    var style = getComputedStyle(toggle);
    var duration = parseFloat(style.getPropertyValue('--dur-roll')) * 1000 || 500;
    var delay = parseFloat(style.getPropertyValue('--delay-roll')) * 1000 || 200;
    var ease = style.getPropertyValue('--ease-loop').trim() || 'ease';
    incoming.textContent = text(which);
    var out = outgoing.animate([{ translate: '0 0' }, { translate: '0 -100%' }], { duration: duration, easing: ease, fill: 'forwards' });
    var into = incoming.animate([{ translate: '0 100%' }, { translate: '0 0' }], { duration: duration, delay: delay, easing: ease, fill: 'both' });
    rolling = function () {
      rolling = null;
      label(which);
      out.cancel();
      into.cancel();
    };
    into.onfinish = rolling;
  }

  function show(video) {
    closeV.toggleAttribute('data-shown', video === closeV);
    openV.toggleAttribute('data-shown', video === openV);
  }

  // Resolves once `video` is showing the frame at `time`.
  function seek(video, time) {
    return new Promise(function (resolve) {
      if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return resolve();
      video.addEventListener('seeked', function done() {
        video.removeEventListener('seeked', done);
        resolve();
      });
      video.currentTime = time;
    });
  }

  function load() {
    [closeV, openV].forEach(function (video) {
      if (video.preload !== 'auto') {
        video.preload = 'auto';
        video.load();
      }
    });
  }

  // The case arrives: shut at the end of the closing video; open at the end of
  // the opening one, where the first video takes over again on the same frame.
  function arrive(video) {
    if (video === closeV && state() === 'closing') {
      state('closed');
    } else if (video === openV && state() === 'opening') {
      seek(closeV, 0).then(function () {
        if (state() !== 'opening') return;
        show(closeV);
        openV.pause();
        state('open');
      });
    }
  }

  closeV.addEventListener('ended', function () { arrive(closeV); });
  openV.addEventListener('ended', function () { arrive(openV); });

  var run = 0; // each press's number, so a superseded seek doesn't act

  // Sets the case moving towards `target` ('closing' or 'opening'): from the
  // start of its video, or — if it is already moving the other way — from the
  // frame it has reached, mirrored into the other video.
  function go(target) {
    var video = target === 'closing' ? closeV : openV;
    var other = video === closeV ? openV : closeV;
    var from = 0;
    if (state() === 'closing' || state() === 'opening') {
      other.pause();
      from = Math.max(0, (other.duration || 0) - other.currentTime);
    }
    state(target);
    roll(target === 'closing' ? 'open' : 'close');
    var mine = ++run;
    seek(video, from).then(function () {
      if (mine !== run) return;
      show(video);
      other.pause();
      if (reduce.matches) {
        return seek(video, video.duration || 0).then(function () { if (mine === run) arrive(video); });
      }
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    });
  }

  toggle.addEventListener('click', function () {
    load();
    go(state() === 'open' || state() === 'opening' ? 'closing' : 'opening');
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        section.toggleAttribute('data-box-live', entry.isIntersecting);
      });
    }, { threshold: 0.25 }).observe(section);

    new IntersectionObserver(function (entries, observer) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        load();
        observer.disconnect();
      }
    }, { rootMargin: '50% 0px' }).observe(section);
  } else {
    section.setAttribute('data-box-live', '');
    load();
  }

  // A translated page swaps its strings in after load (src/js/i18n.js).
  document.addEventListener('i18n:ready', function () {
    label(state() === 'closed' || state() === 'closing' ? 'open' : 'close');
  });
})();
