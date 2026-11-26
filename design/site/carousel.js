// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Previous and next buttons for the template carousel. The carousel scrolls and snaps without this file
// (touch, trackpad, keyboard, scrollbar); the buttons only appear when there is something to scroll to.
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector("[data-track]");
    var controls = root.querySelector("[data-controls]");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    if (!track || !controls || !prev || !next) return;

    function distance() {
      var slide = track.querySelector("[data-slide]");
      if (!slide) return track.clientWidth;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return slide.getBoundingClientRect().width + gap;
    }

    function update() {
      var overflow = track.scrollWidth - track.clientWidth > 4;
      controls.hidden = !overflow;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }

    function go(direction) {
      track.scrollBy({ left: direction * distance(), behavior: reduced ? "auto" : "smooth" });
      // The scroll event can lag behind a smooth scroll, so the buttons are refreshed once it has settled too.
      window.setTimeout(update, 600);
    }

    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
