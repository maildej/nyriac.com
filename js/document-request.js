// Passes the requested document through the request form to the thank-you
// page, where the real download link is revealed after submission.
(function () {
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // request.html: show which document was requested and carry it through
  // Formspree's redirect (_next) and into the emailed submission.
  var docTitleEl = document.getElementById('doc-title');
  if (docTitleEl) {
    var path = param('doc') || '';
    var title = param('title') || 'this document';
    docTitleEl.textContent = title;

    var docField = document.getElementById('doc-field');
    if (docField) docField.value = title + ' (' + path + ')';

    var nextField = document.getElementById('next-field');
    if (nextField) {
      nextField.value = 'thanks.html?doc=' + encodeURIComponent(path) + '&title=' + encodeURIComponent(title);
    }
  }

  // thanks.html: reveal the real download link for the requested document.
  var thanksTitleEl = document.getElementById('thanks-title');
  if (thanksTitleEl) {
    var thanksPath = param('doc');
    var thanksTitle = param('title') || 'your document';
    thanksTitleEl.textContent = thanksTitle;

    var downloadLink = document.getElementById('thanks-download');
    if (downloadLink && thanksPath) {
      downloadLink.href = thanksPath;
      downloadLink.setAttribute('download', '');
    }
  }
})();
