// Replaces the browser's slow, built-in SVG tooltip with one that appears
// immediately on hover, showing each county's name as the cursor moves
// over the region map.
(function () {
  var paths = document.querySelectorAll('.riac-map path');
  if (!paths.length) return;

  var tooltip = document.createElement('div');
  tooltip.className = 'map-tooltip';
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  function position(event) {
    tooltip.style.left = (event.clientX + 14) + 'px';
    tooltip.style.top = (event.clientY + 18) + 'px';
  }

  paths.forEach(function (path) {
    var titleEl = path.querySelector('title');
    if (!titleEl) return;
    var text = titleEl.textContent;

    // Detach the native <title> while hovering so the browser's own
    // delayed tooltip never appears alongside ours.
    path.addEventListener('mouseenter', function (event) {
      if (titleEl.parentNode === path) path.removeChild(titleEl);
      tooltip.textContent = text;
      tooltip.hidden = false;
      position(event);
    });

    path.addEventListener('mousemove', position);

    path.addEventListener('mouseleave', function () {
      if (titleEl.parentNode !== path) path.appendChild(titleEl);
      tooltip.hidden = true;
    });
  });
})();
