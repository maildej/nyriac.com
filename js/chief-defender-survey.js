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

  // Chief Defender / office head names, keyed by the exact office option
  // text in the Q1 datalist. Source: NYSDA "Public Defense Services, New
  // York State" county defender office list (nysda.org), current as of the
  // date this was compiled. Offices without a named contact in that list
  // (vacant positions, or ones administered without a named individual)
  // are simply left out, so the field stays blank for those.
  var CHIEF_DEFENDERS = {
    "Albany County — Public Defender": "Yorden C. Huban",
    "Albany County — Alternate Public Defender": "Tina K. Sodhi",
    "Albany County — Assigned Counsel Plan": "Shane B. Hug",
    "Allegany County — Public Defender": "J.R. Santana Carter",
    "Broome County — Public Defender": "Michael T. Baker",
    "Broome County — Assigned Counsel Program": "Tony Westbrook",
    "Cattaraugus County — Public Defender": "Darryl R. Bloom",
    "Cattaraugus County — Assigned Counsel Plan": "Nicholas A. DiCerbo, Sr.",
    "Cayuga County — Assigned Counsel for the Indigent Program": "Lloyd E. Hoskins",
    "Chautauqua County — Public Defender": "Nathaniel L. Barone",
    "Chautauqua County — Assigned Counsel Plan": "Michael C. Panebianco",
    "Chemung County — Public Defender": "Rebecca Bain",
    "Chemung County — Public Advocate": "Richard R. Jennings",
    "Chenango County — Public Defender": "Paul J. Ryan",
    "Chenango County — Assigned Counsel Program": "James Cushman",
    "Clinton County — Public Defender": "Jamie Martineau",
    "Clinton County — Assigned Counsel Program": "Justin R. Meyer",
    "Columbia County — Public Defender": "Shane A. Zoni",
    "Columbia County — Alternate Conflict Defender": "Mark S. Portin",
    "Columbia County — Assigned Counsel Office": "Kyle W. Patzwahl",
    "Cortland County — Public Defender": "Kevin A. Jones",
    "Cortland County — Assigned Counsel Plan": "Michael R. Cardinale",
    "Delaware County — Public Defender": "Joseph A. Ermeti",
    "Dutchess County — Public Defender": "Margaret Walker",
    "Dutchess County — Assigned Counsel Plan": "Thomas J. O'Neill",
    "Erie County — Legal Aid Bureau of Buffalo, Inc.": "Nadine Patterson",
    "Erie County — Bar Association Aid to Indigent Prisoners Society, Inc.": "Michael M. Mohun",
    "Essex County — Public Defender": "Emily L. Evatt",
    "Essex County — Conflict Defender": "Miriam Hadden",
    "Franklin County — Public Defender": "Kristofer S. Michaud",
    "Franklin County — Conflict Defender": "Jonathan Miller",
    "Franklin County — Assigned Counsel Plan": "Hannah J. Fleury",
    "Fulton County — Public Defender": "Roger L. Paul",
    "Fulton County — Assigned Counsel Division": "Christopher Stanyon",
    "Genesee County — Public Defender": "Jamie Welch",
    "Genesee County — Assigned Counsel Program": "Kristie L. DeFreze",
    "Greene County — Public Defender": "Angelo F. Scaturro",
    "Hamilton County — Public Defender": "Sterling T. Goodspeed",
    "Herkimer County — Assigned Counsel Program": "Keith Bowers",
    "Jefferson County — Public Defender": "Laurel A. McCarthy",
    "Lewis County — Public Defender (Lewis Defenders, PLLC)": "Michael F. Young",
    "Lewis County — Conflict Defender": "Timothy M. McClusky",
    "Livingston County — Public Defender": "Lindsay P. Quintilone",
    "Livingston County — Conflict Defender": "Hayden M. Dadd",
    "Madison County — Assigned Counsel Plan": "David DeSantis",
    "Monroe County — Public Defender": "Julie A. Cianca",
    "Monroe County — Conflict Defender": "Chelsea L. Palmisano",
    "Monroe County — Assigned Counsel Plan": "Mark D. Funk",
    "Montgomery County — Public Defender": "William F. Martuscello",
    "Montgomery County — Assigned Counsel Program": "Kimberly Van Wormer",
    "Nassau County — Legal Aid Society of Nassau County": "N. Scott Banks",
    "Nassau County — Assigned Counsel Defender Plan": "Lindsay R. Boorman",
    "New York City — Appellate Advocates": "Patricia Pazner",
    "New York City — Assigned Counsel Plan, Appellate Division 2nd Dept. (Kings, Queens & Richmond)": "Barbara A. DiFiore",
    "New York City — The Bronx Defenders": "Juval Scott",
    "New York City — Brooklyn Defender Services": "Lisa Schreibersdorf",
    "New York City — Center for Appellate Litigation": "Jenay Nurse Guilford",
    "New York City — Center for Family Representation, Inc.": "Tehra Coles",
    "New York City — The Legal Aid Society": "Twyla Carter",
    "New York City — Neighborhood Defender Service of Harlem": "Piyali Basak",
    "New York City — New York County Defender Services": "Stanislao A. Germán",
    "New York City — Office of the Appellate Defender": "Caprice R. Jenerson",
    "Niagara County — Public Defender": "Herb Greenman",
    "Niagara County — Conflict Defender": "Mary-Jean Bowman",
    "Oneida County — Public Defender": "Andrew M. Dean",
    "Oneida County — Supplemental Assigned Counsel Plan": "Michael A. Arcuri",
    "Onondaga County — Hiscock Legal Aid Society": "Gregory W. Dewan",
    "Onondaga County — Bar Association Assigned Counsel Program, Inc.": "Kathleen M. Dougherty",
    "Ontario County — Public Defender": "Leanne Lapp",
    "Ontario County — Conflict Defender & Assigned Counsel Plan": "Carrie W. Bleakley",
    "Orange County — Legal Aid Society of Orange County, Inc.": "Michael Davis",
    "Orange County — Office of Assigned Counsel": "Damian Brady",
    "Orleans County — Public Defender": "Joanne L. Best",
    "Orleans County — Assigned Counsel Plan": "Kristie L. DeFreze",
    "Oswego County — Public Defender": "Bradley Janson",
    "Oswego County — Assigned Counsel Program": "Rachael Dator",
    "Otsego County — Public Defender": "Susan M. Lettis",
    "Putnam County — Legal Aid Society, Inc": "Elizabeth Costello",
    "Rensselaer County — Public Defender": "John C. Turi",
    "Rensselaer County — Conflict Defender": "Sandra J. McCarthy",
    "Rockland County — Public Defender": "James D. Licata",
    "Rockland County — Assigned Counsel Plan": "Keith I. Braunfotel",
    "St. Lawrence County — Public Defender": "James M. McGahan",
    "St. Lawrence County — Assigned Counsel Plan": "Megan R. Dutton, Esq.",
    "Saratoga County — Public Defender": "Andrew C. Blumenberg",
    "Saratoga County — Conflict Defender": "Matthew Maiello",
    "Saratoga County — 18-b Assigned Counsel Program": "Dawn M. Phillips",
    "Schenectady County — Public Defender": "Stephen M. Signore",
    "Schenectady County — Conflict Defender": "Tracey J. Chance",
    "Schenectady County — Assigned Counsel Plan": "Martin Finn",
    "Schoharie County — Assigned Counsel Plan": "Suzanne Graulich",
    "Schuyler County — Public Defender": "Josette Colon",
    "Seneca County — Public Defender": "Michael J. Mirras",
    "Steuben County — Public Defender": "Shawn M. Sauro",
    "Steuben County — Assigned Counsel Plan": "Stephen P. Hampsey",
    "Suffolk County — Legal Aid Society of Suffolk County, Inc.": "Laurette D. Mulry",
    "Suffolk County — Assigned Counsel Defender Plan of Suffolk County": "Daniel A. Russo",
    "Sullivan County — Legal Aid Panel, Inc.": "Tim L. Havas",
    "Sullivan County — Conflict Legal Aid, Inc.": "Joel M. Proyect",
    "Sullivan County — Assigned Counsel Plan": "Lynda G. Levine",
    "Tioga County — Public Defender": "Michael L. Arcesi",
    "Tioga County — Assigned Counsel Plan": "Irene K. Graven",
    "Tompkins County — Assigned Counsel Program": "Lance N. Salisbury",
    "Ulster County — Public Defender": "Elizabeth Corrado",
    "Ulster County — Assigned Counsel Plan": "John Stegmayer",
    "Warren County — Public Defender": "Gregory V. Canale",
    "Warren County — Assigned Counsel Plan": "Brian Pilatzke",
    "Washington County — Public Defender": "Michael J. Mercure",
    "Washington County — Assigned Counsel Office": "Julie Eagan",
    "Wayne County — Public Defender": "Andrew D. Correia",
    "Wayne County — Assigned Counsel Program": "Mark D. Funk",
    "Westchester County — Legal Aid Society of Westchester County": "Clare J. Degnan",
    "Westchester County — Independent Office of Assigned Counsel": "Stephanie Perez",
    "Wyoming County — Public Defender": "Leah Nowotarski",
    "Wyoming County — Attica Legal Aid Bureau, Inc.": "Norman Effman",
    "Wyoming County — Assigned Counsel Plan": "Jennifer M. Wilkinson",
    "Yates County — Public Defender": "Matthew Tantillo",
    "Yates County — Assigned Counsel Program": "Cynthia Rochford",
    "New York State Defenders Association": "Susan C. Bryant",
    "Prisoners' Legal Services of New York": "Krin Flaherty"
  };

  var officeInput = document.getElementById('office');
  var chiefDefenderInput = document.getElementById('chief-defender');
  var lastAutoFilled = '';

  if (officeInput && chiefDefenderInput) {
    officeInput.addEventListener('input', function () {
      var match = CHIEF_DEFENDERS[officeInput.value];
      if (!match) return;
      // Only overwrite if the field is still empty or holds our own
      // previous auto-fill, so we never clobber something the user typed.
      if (chiefDefenderInput.value === '' || chiefDefenderInput.value === lastAutoFilled) {
        chiefDefenderInput.value = match;
        lastAutoFilled = match;
      }
    });
  }

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
