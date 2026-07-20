// Filters the practice advisory list by title as the user types.
(function () {
  var input = document.getElementById('advisory-search');
  var items = document.querySelectorAll('#advisory-list > li');
  var noResults = document.getElementById('advisory-no-results');
  if (!input) return;

  input.addEventListener('input', function () {
    var query = input.value.trim().toLowerCase();
    var visibleCount = 0;

    items.forEach(function (item) {
      var title = item.querySelector('h3').textContent.toLowerCase();
      var matches = title.indexOf(query) !== -1;
      item.hidden = !matches;
      if (matches) visibleCount++;
    });

    noResults.hidden = visibleCount !== 0;
  });
})();
