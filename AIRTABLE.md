# AIRTABLE.md — the RIAC case management database

## Why this file exists

Chats get stranded. A conversation started in a terminal on one computer cannot be
read from another, and when that computer sleeps the chat is gone for practical
purposes. This file is the durable record of **what was built and why**, so the
decisions survive in GitHub even when the conversation that produced them does not.

It is a map, not a manual. The detailed reasoning for individual fields lives in the
**field descriptions inside Airtable itself** — hover any field name to read it. Those
descriptions are unusually full and are the primary documentation; this file exists to
tell you where to look and to record the things a field description cannot say.

Last verified against the live base: **10 August 2026.**

---

## The three bases

| Base | ID | What it is |
|---|---|---|
| **RIAC CMS Pilot** | `appwoHVXRp4vgfJB9` | The live build. Everything below describes this one. |
| Referral & Advice Manager | `appAYdFzfIPSweIQq` | Earlier attempt. Not in active use. |
| ARCHIVE – RIAC Database | `appg134SbRoIah566` | Old data, kept for reference. |

---

## How the database is shaped

The central idea: **a person is recorded once, and their involvement in a case is
recorded separately.** The same human can be a client on one case and a witness on
another. That separation is what makes the conflict check possible.

### The core tables

| Table | One row per | Notes |
|---|---|---|
| **Parties** | Person | Every human on any case, in any capacity. Immigration fields are only filled in for people we act for. This is the single table the conflict check searches. |
| **State Case Info & RIAC Progress** | Case | The main table. Carries the case number, status, uploads and all the reminder machinery. |
| **Case Parties** | Person-on-a-case | Records what role someone played on a given case. The *client* is linked on the case itself; this table is for everyone else. |
| **Case Charges** | Charge | Links to the Penal Law or VTL catalogue where possible; free text for out-of-state and federal charges. |
| **RIAC Case Notes** | Note or filed email | The case log. Notes can also be attached to additional cases via "Also Relates To". |
| **Pending Intakes** | Intake submission | The queue before a case is created. |
| **Attorneys & Requestors** | Requesting attorney | |

### Reference tables

| Table | Purpose |
|---|---|
| **Counties**, **RIACs**, **Courts**, **Agencies** | Geography and institutions. A case inherits its county and region *through the court* — never typed. |
| **NY Penal Law Offenses** | Every chargeable variant, with verbatim statutory text. |
| **NY VTL Offenses** | Alcohol and driving offences, one row per prior-conviction tier. |
| **IDP Chart Entry** | Immigrant Defense Project quick-reference chart, reproduced with permission. **Do not add lookups or rollups of the IDP fields to other tables** — IDP content must only ever be readable in the context of an IDP record, so its source is always visible. |
| **Email Templates** | The wording of automated emails, editable without touching any automation. |
| **Reminder Control** | A single record acting as two buttons. **Never add a second record** — the automations would fire twice. |

### Conventions worth knowing

- **"Fake Entry?" checkboxes** appear on Parties, Cases, Case Parties, Attorneys and
  Case Charges. Test data is ticked so it can all be filtered out and deleted before
  real use.
- **Two versions of the case number.** `RIAC Case No.` is number + client name, so case
  pickers can be searched by either. `Case No.` is the bare number, because automations
  need to match on it numerically. Same number, two presentations.
- **A-Numbers are identifiers, not quantities.** They belong in text fields. Storing one
  as a number destroys leading zeros. The `A Number` field on Parties is currently a
  text field, which is correct.
- **Anything ending "(calc)" or described as a helper** exists to feed something else.
  Editing it by hand will be overwritten.

---

## The interface (`pbdHwnz9pUuUshXzP`)

| Page | Type | What it's for |
|---|---|---|
| **Pending Intakes** | List | The intake queue. |
| **Needs Review** | Dashboard | Two grids: intakes awaiting a decision, and case notes that arrived by email with no case attached. |
| **Find a Case** | Dashboard | Grid of all cases. |
| **Case Viewer** | List | The main case file. |
| **Monthly Reminders** | List | Review the chasers before they go out. |
| **Run Monthly Reminders** | List | The two buttons on the Reminder Control record. |
| **EOIR Checks** | List | Backstop only — people with an A-Number nobody has looked up yet. See "EOIR checks" below. |
| **Reminder Queue** | Dashboard | The four-rung chaser system: cases needing a chase, a tick to approve each, and the button that sends them. See gap 8. |

Two pop-up forms: **Add A New Charge** and **Add Case Note**.

---

## The automations

All seven are deployed and valid. **Two of them send real email** — see gap 8.

| Automation | Fires when | Does |
|---|---|---|
| **Conflict Check on New Intake** | Intake form submitted | Flags anyone in Parties with a matching **surname**, or a matching **date of birth** regardless of name. Deliberately over-returns — a few names to flick through beats a missed conflict. |
| **1. Email to Case Note** | Email arrives at the `riac-case-file` address | Creates a note holding subject, body, sender, attachments. Does not attach it to a case. |
| **2. Attach Case Note to its case** | A note has a case number in its subject but no case | Finds the case and links it. Failing to match is harmless — the note lands in Needs Review. |
| **Monthly reminders 1 – Generate the list** | "Generate this month's list" ticked | Builds the batch and drafts each email. **Sends nothing.** |
| **Monthly reminders 2 – Send the reminders** | "Send the reminders" ticked | **Actually emails attorneys. No undo.** |
| **Send approved reminders** | "Send approved reminders" ticked | The four-rung system behind the Reminder Queue page: first chaser, second chaser, final warning, then a closing notice that also closes the case as "No Atty Response". **Actually emails attorneys. No undo.** Reads its reply-to and BCC addresses from the Reminder Control record. |
| **Stamp EOIR check date** | EOIR Result changed on a person | Writes today's date into EOIR Last Checked. |

### Changing behaviour without touching an automation

This was a deliberate design goal. Each of these is a single edit in one place:

| To change | Edit |
|---|---|
| Who gets chased (statuses, the 30-day threshold) | The **`Reminder Due`** formula on the case table |
| The wording of reminder emails | The **Email Templates** table |
| The subject-line caption, court, docket | The **`Reminder Subject Prefix`** formula on the case table |
| What counts as an EOIR check still outstanding | The **`EOIR Check Status`** formula on Parties |
| Which statuses count as "ready for advisal" | The **`Readiness (calc)`** formula on the case table |
| What shows on the second line of the Case Viewer list | The **`Case List Line`** formula |

---

## EOIR checks (August 2026)

Looking a client up in the EOIR/ACIS system — the immigration court's own case-status
lookup — to see whether they have immigration proceedings on foot.

### The decision: on demand, never on a timer

**EOIR checks are run by hand, when a RIAC attorney is working on the case.** They are not
scheduled, not batched, and nothing comes back round on its own.

An earlier design had a 90-day recheck cycle: a "No records found" answer older than 90
days would be flagged for checking again. That was dropped on 8 August 2026 as unnecessary.
Two things follow, and both are easy to forget:

- **`EOIR Recheck Due` was renamed `EOIR Check Status`** and its 90-day branch deleted. It
  now does exactly one thing: read `⚠ Never checked` for anyone we hold an A-Number for
  whose result has never been recorded, and go blank the moment one is. The old name
  described a schedule that no longer exists.
- **Once a result is recorded, that person never resurfaces anywhere.** That is intended. If
  a periodic recheck is ever wanted again, this formula is where it goes — not an
  automation.

### How the workflow runs

The whole thing is designed to happen on one screen, without the attorney going looking:

1. Attorney opens the case in **Case Viewer** and sees `EOIR Result` and `EOIR Last Checked`
   alongside the A-Number — "Not yet checked", or a result with the date it was true on.
2. They click the client's name, which opens the client's own record.
3. They click **Look up on EOIR**, which opens the ACIS site. *Nothing is recorded by this.*
4. They paste the A-Number into ACIS — the button cannot pre-fill it — and run the search.
5. **They pick the answer in `EOIR Result`.** This is the step that records the check.
6. Optionally they print the result to PDF and attach it to `EOIR Results PDF`.

The **Stamp EOIR check date** automation then writes today's date into `EOIR Last Checked`.

### Two things that record nothing — read this before assuming otherwise

Both are easy to believe and both lose data silently.

**Clicking the button records nothing.** It opens a website. That is all it does. The
automation fires on `EOIR Result` *changing* and on nothing else — a click is not an edit to
the record, so the date does not move and no check is logged. A person can have that button
clicked fifty times and still read `⚠ Never checked`.

**Doing nothing does NOT mean "no records found".** There is no silent nil. If the search
comes back empty, someone must still pick "No records found" — that is what stamps the date
and turns an empty screen into a dated finding. Leave it blank and the record simply says
nobody has ever looked, which six months later is indistinguishable from the truth. Attaching
the PDF on its own does not help either; it carries no date stamp and fires no automation.

**The only action that records anything is picking a value in `EOIR Result`.** Everything
else in the workflow is navigation and evidence.

Because that is so easy to get wrong, `EOIR Result` carries the interface label
**"(MAKE SURE TO UPDATE THIS WHEN CHECKING)"** in the client popup. Note what that is: an
interface label sitting on top of the field, not a rename — the field is still `EOIR Result`
in the base, which is why grids, pickers and column headers stay clean. The trade-off is that
the warning appears **only in that popup**. The EOIR Checks page shows the same field, also
editable, without it.

The fields all live on **Parties**, on the person — never on the case. The same human can
appear on several cases, and their EOIR position is a fact about them, not about any one
matter. The case only ever *displays* it, through lookups.

### The fields

| Field | Table | What it does |
|---|---|---|
| `A Number` | Parties | The A-Number as held. Text, not a number — see the conventions above. |
| `A-Number for EOIR` | Parties | The same digits padded to 9, which is the form ACIS expects. Flags a warning if there are no digits or more than nine. |
| `EOIR Lookup` | Parties | The ACIS address, blank when there is no A-Number. |
| `EOIR Result` | Parties | What the lookup found. The only field anyone types into. |
| `EOIR Last Checked` | Parties | Stamped by automation — do not type into it. |
| `EOIR Results PDF` | Parties | The printout, as evidence of what was seen on the day. |
| `EOIR Check Status` | Parties | `⚠ Never checked`, or blank. Feeds the EOIR Checks page. |
| `EOIR Result`, `EOIR Last Checked` | Cases | Lookups through `Client Code`. Read-only copies for the Case Viewer. |

### What is editable where

Two screens show the same EOIR information and they behave differently on purpose.

**On the case (Case Viewer) — read-only, and not by choice.** `EOIR Result` and
`EOIR Last Checked` there are *lookups*: live copies of what sits on the client's record.
Airtable does not allow typing into a lookup at all. The case displays the EOIR position; it
never sets it.

**On the client's record (the popup from the client chip) — editable, and it must be.**
These are the real fields, and this popup is the only place most staff will ever reach them.
Locking them here would leave nowhere to enter an A-Number short of the raw base.

Only three fields are forced read-only, and only because they are formulas — there is
nothing to type into:

| Forced read-only | Why |
|---|---|
| `A-Number for EOIR` | Computed — pads the A-Number to the 9 digits ACIS expects |
| `EOIR Lookup` | Computed — the ACIS address |
| `Client Key Code` | Computed — the name + date-of-birth chip |

Everything else on that popup should stay editable, including `EOIR Last Checked`. That last
one looks like it should be locked, since an automation writes it — but leaving it editable
is the manual fallback for the limitation below: when a re-check finds the same answer the
automation does not fire, and typing the date is then the only way to correct it.

**Date of birth is editable too, deliberately** — DoBs do get corrected from bad prior
information. Two consequences to be deliberate about: it feeds the client chip, so the person
looks different in every picker afterwards; and **the conflict check matches on date of birth
regardless of name**, so a correction makes future checks sharper and a typo quietly blunts
them.

### The button

`Look up on EOIR` on Parties is a button field set to **Open URL**, with the URL coming from
a formula reading `{EOIR Lookup}` rather than a typed-in address. Reading it from the formula
is what makes the button grey itself out for anyone with no A-Number.

`EOIR Lookup` is therefore **hidden, not deleted** — the button depends on it, and the EOIR
Checks page still displays it. Button fields cannot be created through the API; this one was
made by hand on 8 August 2026.

**The button pre-fills nothing.** The A-Number appears in that formula only as a test — "does
this person have one?" — and never in the address, which is a fixed string. Clicking opens the
ACIS front page and stops there. ACIS does not accept search terms as part of a web address,
which is why `A-Number for EOIR` exists: it holds the padded 9-digit form ready to copy into
the ACIS box by hand. If ACIS ever gains a deep link, this button's formula is the one place
to change.

**There is no way to copy the A-Number to the clipboard automatically.** Airtable button
fields have no copy action, and the scripting extension is sandboxed without clipboard access.
Click into `A-Number for EOIR` and copy it the ordinary way. Nine digits — not worth
engineering around.

### ACIS needs TWO things: A-Number *and* country

**A search cannot be run without both.** ACIS requires the client's nationality alongside the
A-Number; an A-Number on its own will not return a result. Confirmed by Dan, 8 August 2026.

This does not change how any field works — nothing can be pre-filled either way — but it does
change what "ready to check" means:

- **A person with an A-Number but no `Country` cannot be looked up at all.** Recording the
  country is a prerequisite, not a nice-to-have.
- `EOIR Check Status` tests only for an A-Number, so such a person reads `⚠ Never checked` and
  appears actionable on the EOIR Checks page when in fact the first job is to find out where
  they are from. **No records are in that state today** (checked 8 August 2026: every person
  with an A-Number also has a country), which is why this was left alone rather than fixed.
- If real data does start producing them, the fix is one formula edit — give
  `EOIR Check Status` a third branch:

  ```
  IF(
    {A Number} = BLANK(),
    "",
    IF(
      {Country} = BLANK(),
      "⚠ Cannot check - no country recorded",
      IF(
        OR({EOIR Result} = BLANK(), {EOIR Result} = "Not yet checked"),
        "⚠ Never checked",
        ""
      )
    )
  )
  ```

`Country` is already shown on the EOIR Checks page and in the client popup, so the information
is in front of whoever is doing the check either way.

### Known limits, accepted

- **A re-check that finds the same answer does not move the date.** The automation fires
  when `EOIR Result` *changes*. Re-picking the value already there is not a change, so the
  date stays as it was. Consequence: someone re-checked in November still reads as last
  checked in March, and a later attorney may repeat work already done. Judged not worth
  fixing while checks are occasional and manual. The fix, if it is ever wanted, is a
  "Re-checked today" checkbox and a second automation that stamps the date and unticks it.
- **The button cannot pre-fill the search.** ACIS ignores anything passed to it in the
  address, so the button opens the site and the A-Number is still pasted in by hand. It is
  a shortcut, not a lookup.
- **The EOIR Checks page has no `Fake Entry?` filter.** Deliberate — it is what makes the
  page testable while the base holds only test data. Add the filter before real client data
  goes in, or the page will list test people forever.
- **EOIR checks are not done at intake, deliberately.** They belong later, once the case is
  set up, and **always after the conflict check has been completed** — there is no point
  researching someone we may be about to conflict out of. This suits how the data sits
  anyway: the intake form captures `A Number` and `Country of Birth`, but they live on the
  **Pending Intakes** row as loose text, and a pending intake has no Parties record attached,
  so there would be nowhere to record a result. Confirmed as the intended behaviour on
  8 August 2026 — not a gap.

## Known gaps and unfinished work

**1. ~~`Status` on the case table~~ — RESOLVED, deleted 8 August 2026.**
It was documented as *"Set automatically from RIAC Next Steps by the 'Advisal readiness'
automations."* No such automation ever existed. The data looked right only because all 44
cases were seeded on 6 August with `Status` already matching `Readiness (calc)`; nothing
kept them matching, so the first edit to `RIAC Next Steps` would have broken it silently.

Deleting it was safe because there are exactly two calculations on this table and neither
used it:

- **`Readiness (calc)`** groups `RIAC Next Steps` into ready / not ready. Reads only
  `RIAC Next Steps`.
- **`Reminder Due`** decides who goes on the monthly chase list. Reads `RIAC Next Steps`,
  `Closing Code`, `Date Closed`, `Days Since Attorney Contact` and `Attorney Email`.

Confirmed after deletion: `Readiness (calc)` still computes, so no interface filter was
depending on it. **If you ever need this check again**, note that renaming a field first
proves nothing — Airtable references fields by internal ID, so a filter carries on working
under any new name. The only real check is the filter settings in the interface designer,
and the fix if one does depend on a deleted field is to re-point it at `Readiness (calc)`.

**2. The Case Viewer is still editable.**
A session on 7 August was titled *"Make Airtable case interfaces read-only with record
viewer."* On the published Case Viewer page these remain editable: RIAC Next Steps,
RIAC Atty, Request Date, Case Type, Next Important Date, Case Docket No, Case Flags,
Closing Code, and all four upload fields. The work looks unfinished, or was left as an
unpublished draft.

**3. Reminders send from Airtable's own mail server.**
Once an Outlook account is connected, the "Send the chaser" step should be swapped to
the Microsoft Outlook send action so mail comes from the real RIAC address. Noted in the
automation's own description.

**4. A dead field.** `CrimeTime` on NY VTL Offenses is disabled and safe to delete —
CrimeTime covers Penal Law sentencing only. The API cannot delete fields, so it needs
doing by hand.

**5. Naming drift.** Several field descriptions refer to "the All Cases page". The page
is now called **Find a Case**.

**6. ~~The EOIR workflow~~ — RESOLVED and published, 8 August 2026.**
Built, tested end to end, and live. See the **EOIR checks** section above for how it works and
what was deliberately left out.

Worth keeping from the build, because it will apply to anything similar:

- **The API cannot finish this kind of job.** It can create fields, formulas, automations and
  whole new interface pages, but it **cannot** edit an existing page's layout and **cannot**
  create button fields. Both had to be done by hand in the designer. Plan for that split
  rather than discovering it late.
- **Publishing is all-or-nothing.** It pushes *every* page's pending draft live at once, not
  just the page being worked on. Check nothing else is sitting half-finished first.
- **Client details on a case are lookups, and lookups cannot be clicked or edited.** `Client
  Name` on the Case Viewer is a copy of the text. The clickable chip is `Client Code`, the
  actual link field — that distinction is what makes the whole case-to-person workflow
  possible, and it is easy to miss.

**7. The Needs Review page needs rethinking.** As structured it is not clear how it will
actually work in use. The rule it has to express is that a pending intake is **pushed**
into a case from this page — never pulled from a case file, which is why the intake link
was deliberately removed from the Case Viewer. The page currently just stacks two grids
(intakes awaiting a decision, and case notes that arrived by email with no case attached)
without making that push action obvious.

**8. Two chaser systems are running side by side, and both send real email.**
`Send approved reminders` (the four-rung one behind the Reminder Queue page) and
`Monthly reminders 1 and 2` (the batch one behind Monthly Reminders and Run Monthly
Reminders) are both deployed.

**This may well be deliberate** — Dan believes a workflow was designed around it in
another conversation — so **do not retire either without checking first**. What is worth
confirming is which does what, because they are started by different tick-boxes, and
someone ticking the wrong one would chase the same attorneys twice.

---

## The charge picker rebuild (August 2026)

### The problem

The `Charge` field on **Case Charges** was doing two incompatible jobs. It is the row's
**name** (the primary field, so it is what shows in the case's charge list) *and* the only
**store for non-catalogue offences**. Job one means it must always be filled; job two
means it must be free text. The result: users had to type "P.L. 155.25" by hand
immediately after picking P.L. 155.25 from a list of 1,918 — and if they didn't, the case
showed a blank charge row. Two such blank rows existed when this was found.

Separately, the catalogue could only be searched by citation, never by offence name,
because Airtable's linked-record picker only ever searches an entry's **primary field** —
which was just `P.L. 240.05`.

### The fix

Split the two jobs. `Charge` becomes a formula that names the row automatically from
whichever catalogue entry is linked; a new free-text field takes the hand-typing.

Fields added to **Case Charges** (already done):

| Field | Type | Purpose |
|---|---|---|
| `Other Charge (not in catalogues)` | Text | The **only** place to hand-type. Out-of-state, federal, other statutes. |
| `Attempted?` | Checkbox | Charge is an attempt, not the completed offence. |
| `Effective Class` | Formula | The class the charge actually carries — attempt class if attempted, else the Penal Law class, falling through to the VTL class. **Read this, not `Classification`.** |
| `Classification (from catalogue)` | Lookup | Class of the completed Penal Law offence. |
| `Attempt Class (from catalogue)` | Lookup | What the class becomes on an attempt. |
| `Statutory Text (from catalogue)` | Lookup | Verbatim text, readable on the case. |
| `NY Senate Link`, `CJI Link` | Lookup | Source links. `CJI Link` is the specific jury instruction — see "Jury instruction links" below, there is a second link worth showing beside it. |
| `VTL Classification (from catalogue)` | Lookup | Class of the linked VTL offence. |
| `VTL Statutory Text (from catalogue)` | Lookup | Verbatim VTL text. |
| `VTL Sentencing (from catalogue)` | Lookup | Sentencing exposure at the prior-conviction tier picked. |
| `VTL Source Link` | Lookup | NY Senate link. There is no CJI equivalent for VTL. |
| `VTL Practice Note (from catalogue)` | Lookup | Points not part of the offence definition, e.g. VTL 1192(12) notation duties. |

VTL entries carry **no attempt class**, so ticking `Attempted?` on a VTL charge falls
through to its ordinary class rather than going blank.

### Jury instruction links (August 2026)

Every record in **NY Penal Law Offenses** carries **two** links to the Criminal Jury
Instructions, because they answer different questions:

| Field | What it is |
|---|---|
| `CJI Link` | The specific instruction document for that subdivision. Blank where none exists. **1,396 of 1,918 records.** |
| `CJI Article Page` | Formula. The court's page listing every instruction for the whole article. Built from `Article`, so it never needs maintaining. |
| `CJI Match` | How good `CJI Link` is — see below. |

`CJI Match` values, and what each means to an attorney:

- **Exact subdivision** (780) — the instruction for precisely this branch.
- **Broader document** (316) — one document covering this subdivision among others.
- **Same section only** (300) — no document for this exact branch; this is the nearest one
  in the same section. A convenience jump, *not* a precise match.
- **No model jury instruction exists for this offense** (233) — the court positively says
  none is prepared. This is an answer, not a gap; worth showing as such.
- **Not listed** (227) — the article page does not mention this provision at all.
- **No CJI page** (62) — the whole article has no CJI page. Both link fields are blank.

**Articles 179, 185, 241, 242, 275 and 280 have no CJI page whatsoever.** The links that
used to be stored for them were dead (404) and have been cleared.

Two facts to save re-discovering, if these ever need rebuilding:

- **The file names cannot be guessed from the citation.** The court uses at least eight
  naming conventions, sometimes within one article (`240-30(1).pdf`, `240-30%282%29.pdf`,
  `240-50-1.pdf`, `T-470.05(1)+470.10(1)(b).pdf`), and article 130 sits in a dated
  subfolder. Guessing addresses recovered 18% on a test sample; reading the pages
  recovered everything published.
- **nycourts.gov serves its HTML pages behind Cloudflare** — scripted fetches get a 403.
  A real browser loads them normally. `HEAD` returns 403 for *every* URL on the site
  including live ones, so a HEAD-based link checker reports everything as dead; use GET.
  The PDFs themselves fetch fine with an ordinary browser user-agent.

**Article 130 exists in two versions**, pre and post 1 September 2024, on separate pages.
The links stored are the current (post-9/1/24) set.

**Deliberately not done with an automation.** An automation could fill `Charge` when it
is empty, but that is the same two-fields-that-can-disagree pattern that produced the
dead `Status` field. A formula cannot drift.

### Manual steps — Airtable's API cannot do these

**All four were completed on 8 August 2026.** They are recorded because the API can create
fields and edit names, descriptions and formulas, but **cannot** change a field's type,
delete a field, reassign which field is primary, or edit a form's field list — so if any
of this is ever redone, or repeated in another region's base, it is hand work.

**1. Convert `Charge` on Case Charges from text to a formula.**
Safe: all 47 existing rows were checked. 45 carry text identical to the linked catalogue
entry, 2 are blank with a link (the bug), and **none** have text without a link — so no
typed information is lost.

```
IF({Attempted?}, "Attempted ", "") &
IF(
  {Penal Law Offense},
  ARRAYJOIN({Penal Law Offense}, ", "),
  IF(
    {VTL Offense},
    ARRAYJOIN({VTL Offense}, ", "),
    {Other Charge (not in catalogues)}
  )
)
```

**2. Convert `Citation` on NY Penal Law Offenses from text to a formula**, so the picker
can be searched by offence name. This reproduces all 1,918 existing citations exactly —
`P.L. 240.05`, `P.L. 140.10(a)`, `P.L. 265.01-D(2)(c)`, `P.L. 496.06 - SUBSECTION UNKNOWN`
— and appends the name:

```
"P.L. " & {Section} &
IF({Subdivision} = "SUBSECTION UNKNOWN", " - SUBSECTION UNKNOWN", {Subdivision}) &
" — " & {Offense Name}
```

Cost: every charge chip gets longer. Drop the final line to keep short chips, but then
name search stops working — searchability and brevity are the same setting.

**3. Add the new boxes to the Add a Charge popup**: `Other Charge (not in catalogues)`
and `Attempted?`. Remove `Charge` from the form once it is a formula.

**4. Delete `Status`** on the case table — see Known gaps.

### Known limits, tested

- **"+ Add case" cannot be renamed.** Hard-coded by Airtable. Renaming the record page,
  the form title and the form's own button label all leave it unchanged.
- **No padding or line-height control** in the Record panel, and no toggle for the
  up/down record picker. Only title size, full width, tab navigation and edit mode.
- **A form cannot display information back about what you picked.** Statutory text and
  the Senate/CJI links therefore cannot appear inside the add popup. They are instead on
  the charge row on the case page, via the lookups above.
- **Interface layouts have no version history.** Record *data* has revision history;
  page layouts do not. An unwanted layout change that has been published cannot be rolled
  back — it has to be undone by hand. Nor can the API revert it: the revert tool only
  undoes changes the API itself made.
- **The API cannot see interface tabs at all.** It exposes pages, their fields and
  dashboard elements, but not the tab structure inside a record page, nor whether a linked
  field is displayed as chips or as a view. Anything at that level has to be checked by
  eye in the designer.

### The Add a Charge popup, as published

Labels differ from the underlying field names, deliberately — they read as instructions:

| Box on the popup | Field behind it |
|---|---|
| Search NY Penal Law Offenses | `Penal Law Offense` |
| Search NY VTL Offenses | `VTL Offense` |
| Write In Charges, If They Are Not Listed in Catalogues (Use the format: State + Statutory Provision + Title + Weight) | `Other Charge (not in catalogues)` |
| Number of Counts Of This Charge | `Counts` |
| Select if This Is The Top Charge | `Top Charge?` |
| Select If This Is An Attempt | `Attempted?` |
| Charge Notes | `Charge Notes` |

`Charge` is deliberately **not** on the form — it names itself from whichever catalogue
entry is picked.

## The offence catalogues and their loader scripts

**NY Penal Law Offenses** (1,918 records) and **NY VTL Offenses** (36) are built and
maintained by two scripts, `catalogue_penal_law.py` and `catalogue_vtl.py`, kept in
`OneDrive - OCBA/RIAC - Documents/Admin/Database Design`. They upsert rather than replace,
so re-running one repairs the catalogue in place. The jury-instruction links on these
records are described under "Jury instruction links" above.

### Never edit `Section` or `Subdivision` by hand

Those two columns are how the loader recognises a record it has seen before. The `Citation`
you see on screen is a **formula** built on top of them, and a formula cannot be used for
matching — which is why the scripts key on the raw columns instead.

Change one by hand and that record becomes invisible to the script: the next run will not
update it, it will **create a second copy alongside it**. Treat those two columns as
belonging to the script, the same way `Classification` belongs to Dan — the script never
overwrites his hand-corrected classifications, and nobody should overwrite its section
numbers. Everything else on those records is safe to edit.

### Two Penal Law sections have moved on since the catalogue was loaded

Loaded 5 August 2026. Sections **265.07** and **265.09** have since gained lettered and
numbered branches that did not exist then, and the catalogue still holds the old
branch-less versions.

So the next full run of `catalogue_penal_law.py` will *add* `265.07(1)`, `265.07(2)(a)`,
`265.07(2)(b)` and `265.09(1)(a)`, and leave the superseded rows sitting alongside them.
Nothing breaks, but **those two sections want a look afterwards and the stale rows
deleting**. Everything else in the catalogue still lines up exactly.

### Neither catalogue has been re-run since the scripts were repointed

The repoint was 10 August 2026, so both points above are **untested against a real load**.
Expect to verify rather than trust the first run.

## Pickers can only search a table's primary field

This is the single most important thing to know when designing anything that asks a user to
find a record. **Airtable's linked-record picker searches the primary field and nothing
else.** It caused the charge-catalogue problem above, and it caused a worse one on Parties
and Attorneys & Requestors, where the primary field was a bare autoNumber — so a "find the
person" picker offered `29`, `7`, `26` and could not be searched by name at all.

**Both are now fixed** (verified 8 August 2026). Each primary field is a formula:

| Table | Primary field now reads |
|---|---|
| **Parties** | `Fatoumata Sissoko (D.o.B. 29 Oct 2005)` |
| **Attorneys & Requestors** | The attorney's name |

The date of birth on the Parties picker is there for safety, not decoration: two people can
share a name, and the conflict check depends on staff linking the *right* human. **Record a
date of birth whenever it is known** — without one, a person cannot be told from a namesake
at the moment of choosing.

**How it was done, and why the order mattered.** Unlike the Penal Law citation, an autoNumber
cannot be rebuilt by a formula — converting it destroys the numbers. So the historic codes had
to be copied to safety *first*:

1. `Client Key Code (original)` and `Attorney Code (original)` were created and filled with
   every historic number — 53 people and 50 attorneys, none missing.
2. *Then* each primary field was converted to a formula, by hand, since the API cannot change
   a field's type. Airtable warns that data will be lost at this point; that is the
   autoNumber, already copied, so it is safe to accept.

**Do not convert first.** In another region's base, follow the same order.

The formulas as actually built — note that neither shows the code, following the decision to
drop it from chips:

*Parties → `Client Key Code`:*
```
IF({Client Full Name}, {Client Full Name}, "Client " & {Client Key Code (original)})
  & IF({DoB}, " (D.o.B. " & DATETIME_FORMAT({DoB}, "D MMM YYYY") & ")", "")
```

*Attorneys & Requestors → `Attorney Code`:*
```
IF({Attorney Full Name}, {Attorney Full Name}, "Attorney " & {Attorney Code (original)})
```

The code appears only as a fallback, so a person with no name recorded can never show as a
blank chip. The originals carry no meaning outside the base that generated them.

**One consequence, accepted knowingly: new people and attorneys no longer receive a code
number.** They simply show as a name, which reads fine in a picker, and Airtable's own record
ID remains the real identity, so nothing breaks. If codes must continue, add a fresh
autoNumber afterwards and fold it into the formula — but be aware its numbering starts from
row order and can collide with the historic codes.

## Two people with the same name

The database always tells them apart — separate records, separate internal IDs, and linking
to one never touches the other. **The person choosing in a picker is the weak point**, not
the data. A picker shows only the primary field, so two records reading `Maria Torres` and
`Maria Torres` are indistinguishable on screen, and whoever is clicking picks one at random.

In a system whose conflict check depends on linking the *right* person, that is a real risk
of misidentification rather than a cosmetic annoyance.

So the Parties primary field carries **date of birth** as well as name:

> `Josefina Almonte-Vidal (D.o.B. 19 Aug 1972)`

The old `Client Key Code` is deliberately **not** shown. It was an autoNumber generated
when this base was built, it means nothing outside it, and — because an autoNumber cannot
survive becoming a formula — people added after August 2026 do not get one at all, so it
is not even a consistent identifier going forward. At 3,000+ clients it would put four
meaningless digits in front of every name. It is preserved in `Client Key Code (original)`
if ever needed.

Date of birth is the right discriminator here — it is what the conflict check already
matches on, and it is what distinguishes two people of the same name in practice. **Record
it whenever it is known.** A person with no date of birth on file is one who cannot be
told apart from a namesake at the moment of choosing.

Three test records currently have none, so they read as name alone.

**Attorneys are treated differently on purpose.** Their primary field shows the **name
only** — no code — because the code means nothing to the people using the interface and
the name is what they search on. The code is preserved in `Attorney Code (original)` and
can be put back into the formula at any time. If two attorneys ever share a name, add
their office to that formula; there is no equivalent of date of birth to fall back on.

The stakes differ, which is why the treatment differs: linking the wrong *client* corrupts
the conflict check, while linking the wrong *attorney* sends a chaser to the wrong lawyer —
serious, but visible and recoverable.

## Client details cannot be edited on the case. Ever.

Every client field on the Case Viewer — name, date of birth, A Number, country of birth,
immigration status, status date, client flags, immigration notes, immigration documents —
is a **lookup** through the `Client Code` link into Parties. A lookup is a mirror of another
table's field: it is read-only by definition, and **no interface setting can make it
editable**. This is not a permissions toggle that has been left off.

That is the design working as intended — a person is recorded once, and one edit updates
every case they appear on. The price is that editing must happen on the client's own
record.

So there is exactly **one** route to editing client details from a case: clicking through
to the client's record via the `Client Code` link, which opens the Parties record detail
page. Remove that route and there is no way to edit a client from the Case Viewer at all.

### ~~The client detail page is missing fields~~ — RESOLVED, 8 August 2026

This page used to expose only `First`, `Last Name`, `Current immigration status`,
`Date of current immigration status`, `Client Flags`, `Immigration Docs Received` and
`Case Info` — which left `DoB`, `A Number`, `Country`, `Address`,
`Notes on Imm Status or History`, `Immigration Docs Upload`, `EOIR Result` and
`EOIR Results PDF` reachable only by opening the Parties table directly.

All of them were added when the EOIR workflow was built, and **inline editing was switched
on**, which it had not been — without that the fields displayed but could not be changed,
which is the same dead end wearing a different hat.

Two of those matter more than the rest:

- **`DoB`** is in every picker label now, and the conflict check matches on it regardless of
  name. Correcting a wrong one sharpens every future check; mistyping one quietly blunts them.
- **`A Number` and `Country`** are both required for an EOIR search — see the EOIR checks
  section. Neither could be entered from anywhere a normal user could reach before this.

**The general lesson: adding a field to a record page is only half the job.** If inline
editing is off, a field that must be filled in is still unfillable.

## Which office: a fact about a case, not about a person

**An attorney has no office in this database.** The office is recorded on the case, and
only on the case.

This replaced an earlier arrangement — a usual office on the attorney, plus a per-case
override — which carried a real hazard. Someone looking at one case could click through to
the attorney, see the office sitting there editable, correct it, and silently rewrite that
attorney's office on every other case they had. Nothing on screen suggested the edit
reached past the case in front of them.

Recording it per case removes the hazard rather than warning about it, and is truer to the
work: panel attorneys sit on several counties' panels and move between offices, so "their
office" was never a single fact. The old model needed an override precisely because the
underlying claim was false.

| Field | Where | What it is |
|---|---|---|
| **`Attorney's Office`** | Case | The office the attorney is acting for on this case. The single source. Fill it in when a case is opened. |
| **`Offices Acted For`** | Attorney | Read-only rollup of every office they have acted for, gathered from their cases. Self-maintaining. |

Nothing can be edited at the person level, so nothing at the person level can be wrong.

**The cost:** every new case needs the office picking, where before it was inherited.
Accepted deliberately — it is the price of the office always being true of the case in
front of you.

**Seeding it from the intake form is not worth doing yet**, for two reasons:

1. `Affiliation` on Pending Intakes is **free text**, typed by the requesting attorney,
   while the case field is a **link to Agencies**. Bridging them means matching a typed
   string to an agency record — which fails silently on abbreviations and typos, and
   worse, can match the wrong agency confidently.
2. **No automation creates a case from an intake.** Someone accepts the intake and creates
   the case by hand, so a person is already there and can pick the office in the same
   motion.

The useful first step, if this is ever wanted, is to make the intake form's `Affiliation`
a picker of Agencies rather than free text. Then seeding is exact rather than a guess —
and by that point the automation may not be needed at all.

The same scope principle still applies one step further in: editing agency details from the
agency popup changes that agency for everyone linked to it. That is correct — agency contact
details genuinely are shared — but worth knowing before editing.

### What happens with two attorneys on one case

Three cases carry two offices — 6017, 6024 and 6041. Not a backfill error: each has **two
attorneys, from two different offices**, and both offices were correctly recorded.

This exposes the model's one real limitation. The office attaches to the **case**, not to
the attorney-on-the-case, so a case with co-counsel from different offices records that
both offices are involved without saying which attorney belongs to which.

That is acceptable because **co-counsel on a case are in practice always from the same
organisation** — the three examples are artefacts of randomly generated test data, not
situations that occur. Recording an office per attorney-per-case would need a junction
table, which is a large amount of machinery for a case that does not arise.

**Cosmetic consequence:** `Offices Acted For` de-duplicates whole cell values rather than
individual offices, so an attorney who appears on a two-office case shows a doubled entry
(`A, B | B`). For every attorney whose cases each have one office — which is all of them,
in reality — it reads cleanly. Not worth engineering around.

### Two API limits found here

- **A rollup's aggregation formula cannot be changed** through the API. `update_field`
  accepts `formula` for formula fields only; a rollup has to be rebuilt by hand.
- Combined with the API's inability to delete fields, this means **a rollup's aggregation
  is effectively fixed once created**. Get it right first time, or expect hand work.

### Retiring the old fields — in this order

The API cannot delete fields, so these are by hand. Order matters, because each depends on
the next:

1. ~~On the Case Viewer, display **`Attorney's Office`** instead of `Office on This Case`~~ — **done**
2. ~~Delete **`Office on This Case`** (case table)~~ — **done**
3. ~~Delete **`Attorney's Usual Office`** (case table)~~ — **done**
4. Delete **`Affiliation`** (Attorneys & Requestors) — **still outstanding**, tracked in `AIRTABLE-TODO.md`

Every case already carries its own office, so nothing is lost at step 4.

## The comma trap in ARRAYJOIN

When a formula reads a linked-record or lookup field, Airtable escapes any value containing
a comma by wrapping it in double quotes. So `ARRAYJOIN` over agency names produced:

> `"Suffolk County — Legal Aid Society of Suffolk County, Inc."`

quotes and all, while comma-free names like `The Bronx Defenders` came through clean — which
makes it look like a data problem affecting only some records. Wrap the result to strip them:

```
SUBSTITUTE( <the ARRAYJOIN expression> , '"', '')
```

Watch for this in any new formula that joins linked records whose names may contain commas —
agencies and courts especially.

## Case Parties is a junction table

One row = **one person + one case + the role they played on it**. "Adding a related party"
therefore means creating a Case Parties row, not editing a list on the case.

The **client is deliberately not in this table** — the client is the `Client Code` link on
the case itself. So a "related parties" list shows co-defendants, complainants, witnesses
and referred-out contacts, never the client. That is by design, not an omission.

Always populate the `Party` link rather than relying on the typed `Name`. The link is what
ties a co-defendant on one case to the same human appearing as a client on another, which
is the entire basis of the conflict check.

## The attorney's office: default, with a per-case override

Airtable cannot give a linked-record field a default value drawn from another record, so
"pre-fill it and let them change it" is not directly available. The same result is reached
with a formula instead, which has the advantage that it cannot drift:

| Field | Role |
|---|---|
| ~~`Attorney's Usual Office`~~ | Lookup of the attorney's affiliation from their own record. **Deleted.** |
| ~~`Attorney's Office (this case)`~~ | The override box. **Renamed `Attorney's Office`** — the single field that survives. |
| ~~`Office on This Case`~~ | Formula reading the override if set, otherwise the usual office. **Deleted.** |

**As built, this collapsed to one field.** The case table now carries only
**`Attorney's Office`**, filled in per case — which is simpler than the design above and
says the same thing, because every case records its own office anyway. The paragraph below
explains why the formula approach was chosen at the time; it is kept because the reasoning
still applies if a default-from-the-attorney is ever wanted again.

So the right office always shows without anyone filling anything in, and setting the
override changes it for that case alone. The alternative — an automation stamping the usual
office into the override box on creation — was rejected: it makes every case carry a value
that only differs on a handful, and a later correction to the attorney's record would not
reach cases already stamped.

### Spec for the "Add Related Party" popup

The data side supports this fully. `Name` on Case Parties is already a formula reading
`{Party Full Name} — {Role}`, so a row names itself and the blank-row problem that affected
Case Charges cannot recur here — **provided `Party` is filled**. With it empty the row reads
` — Witness`, so make `Party` a **required** field on the form.

The popup should collect exactly four things:

| Box | Field | Notes |
|---|---|---|
| The person | `Party` | Link to Parties. **Required.** Searchable by name and date of birth since the primary-field fix. New people can be created inline. |
| Their role on this case | `Role` | Client, Witness, Victim, Co-Defendant, Complainant, Other, Referred Out - Client |
| Notes | `Notes` | Optional |
| *(hidden)* | `Case` | Fills itself from the case the popup was opened on |

Creating a person inline gives them a name only — the immigration fields stay empty, which
is correct: those are filled in only for people we actually act for.

**`Role` includes "Client" even though the client is not held in this table.** That option
is for legacy imported rows, which carry a `Legacy Case No.` instead of a `Case` link. Do
not use it on new rows.

**The API cannot build this form.** `create_page` supports only visualization and dashboard
pages, not forms — so the popup, the button and the list beneath it are all hand work in
the interface designer. Expect the button's own label to be unchangeable, as with
"+ Add case".

## Status: this is still a pilot

Everything currently in the base is either **fake test data or information already in the
public domain**, and the same goes for the chats about it. That is a deliberate position
for the testing phase, and it is why this file, the field descriptions and the working
conversations can all be as open as they are.

**Before real client data goes in, that changes.** At minimum:

- Delete the test data. Every table that carries it has a **`Fake Entry?`** checkbox for
  exactly this purpose — filter on it and clear the lot. Parties, State Case Info, Case
  Parties, Attorneys & Requestors and Case Charges all have one.
- Review who can see the base, the interfaces, and any shared links.
- Revisit where conversations about the database happen, since transcripts will then
  contain client information.

Until that point, treat nothing here as confidential. After it, treat everything as
confidential.

## Before you change anything

- **Airtable edits are live.** There is no draft step and no undo on record updates.
- **The reminder "Send" button emails real attorneys.** Review the Monthly Reminders
  page first.
- **Do not add a second row to Reminder Control.**
- **Do not rename the `Used For` values in Email Templates** — the automations find each
  template by that value.
- **Do not name a new Note Type tag** containing the words *email received*, *phone
  call*, *documents received* or *substantive* unless you intend it to count as the
  attorney having responded. The `Attorney Contact Date` formula matches on those words.

## The intake form: office as a picker

The old `Affiliation` on Pending Intakes was free text typed by the requesting attorney,
which produced a different spelling every time and could not be matched to an agency.
Replaced by three fields:

| Field | Type | Purpose |
|---|---|---|
| `Attorney's Office` | Link to Agencies | The picker. Empty means not found. |
| `Office Not Listed?` | Checkbox | Makes "not found" an **answer** rather than a blank. Without it, an empty office could equally mean the question was skipped. |
| `Office Not Listed - Details` | Long text | What the attorney can tell us. Shown on the form only when the checkbox is ticked. Working text for the reviewer, not a substitute for the link. |

**"Not Listed" is deliberately NOT an agency record.** Adding one would put a fake office
into the Agencies table, where it would surface in county rollups, agency reports and every
future picker — and an intake nobody got round to fixing would sit permanently linked to a
non-existent office with nothing flagging it. An empty link plus a ticked checkbox says the
same thing without polluting the data.

The review queue is then a filter: **checkbox ticked, link still empty.**

### Two traps

- **Do not convert the old text field to a link.** Airtable matches existing values against
  the target table and **creates new records for whatever does not match** — the three test
  submissions alone would mint agencies called "Test Submission Two - Genesee PD (test)".
  The API cannot delete them. Create a new link field instead, which is what was done.
- **Turn off inline record creation** on the form's link field, or attorneys will invent
  agencies from the public form — precisely what the picker exists to prevent.

## The conflict check only fires from one specific form

The "Conflict Check on New Intake" automation triggers on `formSubmitted`, bound to one
form view (`viw60aBEiAQi6Jcxr`) on Pending Intakes.

**An intake record created any other way does not get conflict-checked.** Not by the API,
not by hand, not by a different form, not by a custom web form posting into Airtable. There
is no error and nothing on the record to show the check never ran — `Possible Conflict
Matches` is simply empty, which looks identical to "checked, nothing found".

**DECIDED, 8 August 2026: nyriac.com will link to the Airtable form**, not host its own
form posting into Airtable. This keeps the conflict check working and is a fraction of the
effort. The website connection is the last step before go-live.

If that is ever revisited — someone wanting the form styled to match the site, say — the
conflict check has to be rebuilt to trigger on record creation rather than form submission
*before* the switch, not after. Otherwise every intake stops being checked and nothing says
so.

### The check needs a surname to arrive, or it turns into noise

It matches on **surname OR date of birth**. That deliberate looseness is what lets it
survive misspelt first names and initials — but it only works if a surname actually
arrives. The automation's own description warns that when `Client Last Name` comes through
empty, *every person on file* matches, and the check stops being a signal.

So the public form must ask for **first and last name in separate boxes**. Of the three
intake submissions currently on file, **two have both name boxes empty** — the `Client
Name` formula renders as a single space. That may simply be how those test rows were made;
the form could not be read from the API to confirm, because it is a view-based form rather
than an interface form (see "Forms: two places" below). **Submit the live form once and
check the surname lands in `Client Last Name`.**

## Forms: two places, one confusing overlap

This cost two rounds of confusion, so it is worth writing down carefully — including the
part that is still not understood.

**Forms appear in two places in Airtable:**

- The **Forms** tab in the top navigation
- The **view list** down the left of a table in the **Data** tab

They are not independent. Deleting the card **"New State Case Info & RIAC Progress"** from
the Forms tab also removed the form *view* called **"Form"** from the case table — same
object, two places, two different displayed names. The Forms tab appears to auto-name a
generically-named form view as "New <Table Name>".

**Not understood:** `Attorney Intake Form` is a form view on Pending Intakes, yet it did
**not** appear in the Forms tab, while `Client Info` on Parties appeared in the Forms tab
but was never a view on Parties. The two listings clearly overlap but do not match, and no
explanation here has survived contact with the evidence. **Check both places** before
concluding a form does or does not exist.

**The API only sees form views** — `list_views_for_table` returns them; whatever the Forms
tab holds beyond that is invisible to it. So "the API says there is no form" is not proof.

### The form that must not be deleted

**`Attorney Intake Form`** on Pending Intakes (`viw60aBEiAQi6Jcxr`). The Conflict Check
automation is bound to it **by internal ID**, so deleting it stops every intake being
conflict-checked. To confirm it is healthy, check the automation's `configurationStatus`
reads `valid` — it turns invalid if the form it points at disappears.

As of 8 August 2026 it is the **only** form in the base. Three others were deleted
deliberately, so that every case arrives through one route and is therefore always
conflict-checked:

- `New State Case Info & RIAC Progress` / the case table's `Form` view — created cases
  directly, skipping intake
- `Client Info` on Parties — created people directly

All were unpublished, so nothing ever came through them.
