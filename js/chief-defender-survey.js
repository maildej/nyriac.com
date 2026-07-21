// Chief Defender RIAC Referral Survey.
// Submits the form to Formspree via fetch so we can show an inline
// "thank you" message instead of leaving the page. The recipient email
// (RIAC2@ocbaacp.org) and the subject line are configured on the form
// itself: the recipient in the Formspree form settings, and the subject
// via the hidden "_subject" field in chief-defender-survey.html.
(function () {
  var form = document.getElementById('survey-form');
  if (!form) return;

  var errorEl = document.getElementById('form-error');
  var thanksEl = document.getElementById('survey-thanks');
  var submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (errorEl) errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (response) {
      if (response.ok) {
        form.hidden = true;
        if (thanksEl) {
          thanksEl.hidden = false;
          thanksEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        throw new Error('Form submission failed');
      }
    }).catch(function () {
      if (errorEl) errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Survey to RIAC';
    });
  });
})();
