// Practice advisories page:
//  1. Filters the advisory list by title as the user types.
//  2. Equalizes every card's title bar to the tallest, so they all match
//     regardless of title length or screen width.
(function () {
  var input = document.getElementById('advisory-search');
  var items = document.querySelectorAll('#advisory-list > li');
  var noResults = document.getElementById('advisory-no-results');

  // --- Title-bar height equalizer ---
  // Measures the tallest visible title bar and sets them all to it.
  // Recalculated on load, on resize, and whenever the search filters
  // the list (so the height tracks only the currently visible cards).
  function equalizeTitles() {
    var titles = [];
    items.forEach(function (item) {
      if (item.hidden) return;
      var h3 = item.querySelector('h3');
      if (h3) titles.push(h3);
    });
    if (!titles.length) return;

    // Reset so each bar reports its natural height, then find the max.
    titles.forEach(function (h3) { h3.style.height = 'auto'; });
    var max = 0;
    titles.forEach(function (h3) {
      if (h3.offsetHeight > max) max = h3.offsetHeight;
    });
    titles.forEach(function (h3) { h3.style.height = max + 'px'; });
  }

  // Run once now, and again once web fonts finish loading (font metrics
  // change the wrapping and therefore the heights).
  equalizeTitles();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(equalizeTitles);
  }
  window.addEventListener('load', equalizeTitles);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(equalizeTitles, 150);
  });

  // --- Search filter ---
  if (input) {
    input.addEventListener('input', function () {
      var query = input.value.trim().toLowerCase();
      var visibleCount = 0;

      items.forEach(function (item) {
        var title = item.querySelector('h3').textContent.toLowerCase();
        var matches = title.indexOf(query) !== -1;
        item.hidden = !matches;
        if (matches) visibleCount++;
      });

      if (noResults) noResults.hidden = visibleCount !== 0;
      equalizeTitles();
    });
  }
})();
