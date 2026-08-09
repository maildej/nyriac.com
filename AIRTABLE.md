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

Last verified against the live base: **8 August 2026.**

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

Two pop-up forms: **Add a Charge** and **Add Case Note**.

---

## The automations

All six are deployed and valid.

| Automation | Fires when | Does |
|---|---|---|
| **Conflict Check on New Intake** | Intake form submitted | Flags anyone in Parties with a matching **surname**, or a matching **date of birth** regardless of name. Deliberately over-returns — a few names to flick through beats a missed conflict. |
| **1. Email to Case Note** | Email arrives at the `riac-case-file` address | Creates a note holding subject, body, sender, attachments. Does not attach it to a case. |
| **2. Attach Case Note to its case** | A note has a case number in its subject but no case | Finds the case and links it. Failing to match is harmless — the note lands in Needs Review. |
| **Monthly reminders 1 – Generate the list** | "Generate this month's list" ticked | Builds the batch and drafts each email. **Sends nothing.** |
| **Monthly reminders 2 – Send the reminders** | "Send the reminders" ticked | **Actually emails attorneys. No undo.** |
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
  `Closing Code`, `Date Closed`, `Days Since Attorney Contact`, `Attorney Email` and — since
  August 2026 — `Disposed?`.

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
| `NY Senate Link`, `CJI Link` | Lookup | Source links. |
| `VTL Classification (from catalogue)` | Lookup | Class of the linked VTL offence. |
| `VTL Statutory Text (from catalogue)` | Lookup | Verbatim VTL text. |
| `VTL Sentencing (from catalogue)` | Lookup | Sentencing exposure at the prior-conviction tier picked. |
| `VTL Source Link` | Lookup | NY Senate link. There is no CJI equivalent for VTL. |
| `VTL Practice Note (from catalogue)` | Lookup | Points not part of the offence definition, e.g. VTL 1192(12) notation duties. |

VTL entries carry **no attempt class**, so ticking `Attempted?` on a VTL charge falls
through to its ordinary class rather than going blank.

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

1. On the Case Viewer, display **`Attorney's Office`** instead of `Office on This Case`
2. Delete **`Office on This Case`** (case table)
3. Delete **`Attorney's Usual Office`** (case table)
4. Delete **`Affiliation`** (Attorneys & Requestors)

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
| `Attorney's Usual Office` | Lookup. The attorney's affiliation from their own record. |
| `Attorney's Office (this case)` | The **override box**. Filled in by hand only when a panel attorney is acting for a different office than usual. Empty on almost every case. |
| **`Office on This Case`** | Formula. Reads the override if set, otherwise the usual office. **This is the one to display.** |

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

## Disposition: a case note, not a per-charge field (August 2026)

**Status: the calculated side is BUILT AND TESTED. Three fields still need deleting by
hand — see `AIRTABLE-TODO.md` item 3.**

### The problem with recording disposition per charge

`Case Charges` carries `Disposition`, `Disposition Date` and `Sentence`. The premise —
every charge gets an outcome — does not survive contact with real cases. Cases are
regularly disposed of by a plea in a *different* case, or by a plea unrelated to the
charges listed here, and there is no honest per-charge answer in either situation. The
existing `Covered by plea to another count` option was an attempt to say this and only
half-manages it: it cannot express "covered by a plea in another matter entirely".

**The evidence agrees.** Checked 8 August 2026: all 48 rows in Case Charges have
`Disposition`, `Disposition Date` and `Sentence` **empty**. Nothing has ever been recorded
in them, so deleting them loses no data.

### The proposal, and why it holds up

Record disposition as a **case note** tagged `Case Disposed` on `Note Type`. Four things
follow, all verified against the live base:

1. **The tag is visible and filterable everywhere.** `RIAC Case Notes Key` — the primary
   field, so it is what shows on every chip — already reads the Note Type, so a disposed
   note announces itself: `12 Aug 2026 | Case Disposed | Subject: …`.
2. **It survives however the information arrives.** An email auto-filed by the
   "1. Email to Case Note" automation only needs the tag ticking; nothing has to be
   retyped anywhere.
3. **Paperwork rides along.** The note has an `Attachments` field and it is already on the
   Add Case Note popup.
4. **One note can cover several cases.** `Also Relates To` exists on the note and is on the
   popup, which is the only place in the base that can say "this one disposal ended three
   matters".

`Case Disposed` is also **safe as a tag name** — it contains none of *email received*,
*phone call*, *documents received* or *substantive*, so it does not accidentally count as
the attorney having responded. See "Before you change anything".

### The holes

**1. `Also Relates To` is a second-class link, and this is the sharp one.** The `Last
Attorney Contact` rollup reads `RIAC Case Notes` only — the primary link — and ignores
`Notes From Other Cases`. Anything built to answer "is this case disposed?" must read
**both** link fields, or exactly the multi-case scenario this design exists to handle will
report the extra cases as undisposed, silently.

**2. Nothing stops the monthly chaser.** `Reminder Due` looks at `RIAC Next Steps`,
`Closing Code`, `Date Closed`, `Days Since Attorney Contact` and `Attorney Email`. A
`Case Disposed` note touches none of them. So a case disposed without RIAC ever advising —
attorney went dark, client pled — **keeps being emailed a chaser every month, forever**,
asking for documents in a case that is over. If the disposal arrived by email the note will
usually also carry `Email Received`, which stamps `Attorney Contact Date` and buys 30 days
of quiet; then the chasing resumes. This is not a nice-to-have; it is live mail going to
real attorneys.

**3. A tag is not an outcome.** The tag says *that* the case ended, never *how*. `Pled
guilty to a reduced charge` and `Dismissed` are the same tag. Anyone wanting to count
outcomes has to read prose. Deleting the per-charge fields removes the only structured
record of what the client was actually convicted of — which, for immigration purposes, is
the single most consequential fact on the file (the offence pled to, and whether the
sentence reached a year). RIAC's own work is pre-plea advice, so this may genuinely not
matter; it should be a decision rather than a side effect.

**4. Note date ≠ disposition date.** The note's `Date` is when the note was written. Learn
about a disposal three weeks late and the two diverge, with nowhere to say so.

**5. Nothing enforces the tag.** The scheme depends on a human noticing that an email
mentions a plea and ticking a box. Same shape as the EOIR trap: an untagged case looks
identical to a case that is not disposed. No backstop exists, and none is proposed.

**6. "Also Relates To" is all-or-nothing.** A note can be linked to case B for some other
reason, and the tag then marks B disposed too. Keep disposal notes to disposal.

**7. Disposal ≠ RIAC closing its file.** RIAC may still owe an advisal after a plea. Do
not wire `Case Disposed` to `Closing Code` or `Date Closed`.

### Decisions taken

**Disposition detail stays as free text in the note body — deliberately.** Holes 3 and 4
were considered and declined. The information arrives messy and incomplete, so it is a poor
candidate for categorising; and the only version RIAC would ever fully rely on is an
official certificate of disposition, which means past cases get looked up by hand on
purpose anyway. No `Disposition` picker and no `Date Disposed` box were built. **Do not add
them later without revisiting this** — the reason is about the nature of the information,
not about effort.

**Contact on one of a client's cases now counts across all of them.** Previously `Last
Attorney Contact` read only notes attached to the case itself. An attorney who rang about
one matter was still chased on the client's others the same week, and one disposal ending
several cases only ever registered on one of them.

### What was built (August 2026)

Seven fields, all calculated — nothing here is ever typed into. Helpers carry `(calc)`,
following the convention above.

| Field | Table | What it does |
|---|---|---|
| `Disposal Flag (calc)` | RIAC Case Notes | 1 if the note is tagged `Case Disposed`, else 0 |
| `Last Contact on This Case (calc)` | Cases | The old `Last Attorney Contact` rollup, **renamed** |
| `Last Contact on Related Cases (calc)` | Cases | Same, over `Notes From Other Cases` |
| **`Last Attorney Contact`** | Cases | The later of those two. **This is the one to display** |
| `Disposal Notes on This Case (calc)` | Cases | Count of disposal notes attached here |
| `Disposal Notes on Related Cases (calc)` | Cases | Count reaching here via `Also Relates To` |
| **`Disposed?`** | Cases | `Disposed` or blank |

Two existing formulas were repointed:

- **`Days Since Attorney Contact`** now counts from the combined `Last Attorney Contact`.
- **`Reminder Due`** gained a sixth test, `{Disposed?} = ""`, so disposed cases drop off the
  chase list.

**No automation was written, deliberately.** An automation stamping `RIAC Next Steps` was
rejected: it is the same pattern that produced the dead `Status` field, and it would wipe a
live state such as `Ready For Advisal` with no record of what it had been. A formula cannot
drift and destroys nothing.

**Renaming was safe** because Airtable stores field references by internal ID — the
interface pages and automations followed the rename automatically.

### How it was tested

On case 6008, which carries a note tagged `Case Disposed`:

- Its status was temporarily set to `Intake Email Sent`, making **every** other test in
  `Reminder Due` pass (331 days since contact, no Closing Code, no Date Closed, attorney
  email held). `Reminder Due` stayed **0** — so the disposal is genuinely what removes it.
- The tag was then removed: `Disposed?` went blank and `Reminder Due` flipped to **1**.
- The tag and the original status (`Ready For Advisal`) were both restored.

Also confirmed: the flag fires on a note carrying **several** tags (`Internal Note,
Case Disposed`), and a note linked to the same case by both routes at once is harmless —
the counts add to 2, which still reads `Disposed`, and the two dates are identical.

### Why `Disposed?` is calculated rather than a box someone ticks

Being a formula, it is read-only whatever any interface setting says — but the reason it was
built as a formula rather than a dropdown matters more than the mechanics, and is Dan's:

> A dropdown lets someone assert that a case is disposed **with no record of where that came
> from.** A case note carries the date, who wrote it, what we were told and the paperwork —
> so the provenance travels with the fact.

Anyone wondering why a case reads `Disposed` clicks through to the note and finds out. Same
principle as refusing to create a "Not Listed" agency record, and the same trap as EOIR,
where a blank box could not be told apart from "nobody ever looked".

**The consequence, which is not discoverable from the interface: the only way to undo a
wrong `Disposed` is to find the note and untick the tag.** There is deliberately no override
on the case. That is also the move if a plea is vacated or a case is restored.

### Still true, and still uncovered

Holes 5, 6 and 7 above stand as accepted limits. In particular **nothing enforces the
tag** — an untagged disposed case is indistinguishable from a live one, exactly as with the
EOIR trap. There is no backstop and none is planned.

## The monthly reminder workflow, in full (NOT YET BUILT)

Only **step 2** exists today. Steps 1, 3 and 4 have never been built, and the automations
would need real work — this is a job for its own session. Recorded here so the target is
not lost.

**Step 0 — per case, by hand.** A referral arrives one of three ways: the attorney completes
the online intake form; the attorney sends a written intake form or an email about a new
case; or an agency sends a list carrying little more than a client name and the assigned
attorney. In every instance the paralegal creates the case from whatever is to hand, then
forwards emails for automatic logging and uploads documents. The paralegal also sets
`RIAC Next Steps` to reflect how much is still needed from the assigned attorney.

**Step 1 — per case, by hand.** If no initial documents have arrived (RIAC intake form, RAP
sheet, charges), send the template email: *we have your referral, please send x, y, z, and
be aware of a, b, c meanwhile*. If some documents did arrive, the paralegal writes an
individual email saying what is still missing.

**Step 2 — periodic, all cases. THIS IS THE ONLY STEP THAT EXISTS.** No contact within 30
days: template email saying *we still have this case, you have not sent what we need,
please do so*.

**Step 3 — periodic, all cases. Not built.** Another 30 days of silence: template email
saying *we still have this case — send it, and if we do not hear within 30 days we will
close the case and report you*.

**Step 4 — periodic, all cases. Not built.** Another 30 days of silence: close the case for
non-response and send a template email saying so.

**What this implies for the build.** The present machinery has one threshold (30 days) and
two wordings picked by status. Steps 2–4 are an escalating ladder, so something has to
record **which rung a case is on** and when it was last climbed — `Last Reminder Sent`
alone cannot distinguish a first chase from a third. Step 4 also *writes* to the case
(closing it), which no reminder step currently does. Expect new fields and a reworked
"Monthly reminders 1" automation rather than a tweak.

### The queue model — DECIDED, half built (9 August 2026)

**Built and tested: the calculated backbone.** Not built: the approval control, the send
automation, and the queue page. Nothing yet can send an email. The decisions below are
settled; read them before touching any of it.

| Field | Table | What it does |
|---|---|---|
| `Chaser Flag (calc)` | Notes | 1 if the note is tagged `Email Chaser Sent` |
| `Chasers Sent (calc)` | Cases | How many chasers have gone out — decides *which* email is next |
| `Days Since Referral (calc)` | Cases | Days from `Request Date` — decides *when* |
| **`Reminder Stage`** | Cases | Which reminder is due, or blank. **This is the queue.** |
| `Days Waiting in Queue` | Cases | How long it has sat unapproved. Sort on this, highest first |

**`Reminder Due` and the old batch machinery were deliberately left alone.** The existing
monthly system still works exactly as before. Retire it only once the new one is proven,
or there will be two ways to send and they can disagree.

**Timed from the referral date, but the rung is decided by chaser count.** Dan's call, 9
August 2026: 30 / 60 / 90 / 120 days from `Request Date`, because cover exists when someone
is away and it is not critical that emails land on exactly the right day — only that three
escalating warnings arrive roughly a month apart. Using the *count* of chasers already sent
to pick which email goes means a case reviewed late catches up rather than skipping a rung,
so nobody receives a final warning without first receiving the polite one. A 21-day guard
since the last chaser stops a late-started case firing all three inside a week.

**What removes a case from the queue is documents, not contact.** This is the subtlest part
of the design and the easiest to get wrong later. The attorney simply being in touch does
**not** clear a case — only actually supplying what we need does, which happens when the
paralegal moves `RIAC Next Steps` off the three waiting-for-documents statuses. So the queue
deliberately includes cases where the attorney has been in touch but sent nothing, and the
paralegal's review is the filter. Same philosophy as the conflict check: over-return, and
let a human decide.

**Consequence: attorney contact no longer gates the chaser at all.** `Last Attorney Contact`
and `Days Since Attorney Contact` change role from *gate* to *information* — they are shown
on the queue so the paralegal can see "they rang last week, leave it" and decline to
approve. The related-cases work done earlier the same day still earns its keep for exactly
that reason, but it no longer decides who gets chased.

**A bug in the old model that the new one fixes.** Case 6051 was referred on 4 August but
carried a note dated 8 June, so `Days Since Attorney Contact` read 62 and `Reminder Due`
read 1 — a referral five days old was queued for a non-response chaser. Counting from the
referral date makes that impossible.

**Formula trap, cost half an hour.** `{Date} != BLANK()` does **not** reliably work in
Airtable — the first version of `Reminder Stage` returned blank for every case because of
it. `{Date} = BLANK()` is sound, so write the negative as `NOT({Date} = BLANK())`. Same for
`= ""` on lookups and multi-selects. Use the proven direction and negate it.

**Templates: structure now, wording later — and Claude does not write the wording.**
Established 9 August 2026. This is what the Email Templates table is *for*: the automation
looks a row up by its `Used For` value and assembles the email from the fields, so the
wording is data. RIAC can rewrite any of it at any time without an automation being touched.
The standing rule is the other side of that bargain: **never rename a `Used For` value**, as
it is the only thing tying a row to the automation.

Four wordings are needed where two existed. `Standard chaser` (existing) serves rung 1.
Three rows were added for rungs 2, 3 and 4 — `Second chaser`, `Final warning`,
`Closing notice` — as **empty shells**: correct names, correct `Used For` values, every
content field blank, and a note in each saying what that email is for in Dan's own words.
Fill them in before the send automation goes live.

One question must be settled before the rung-3 wording can be written: **who the attorney is
reported to** was never specified. The older `Final chase before closing` row is superseded
but left in place, and — like `Standard chaser` — carries wording written in an earlier
session that Dan may want to review now that copy is his to write.

### The review-and-send front end — BUILT 9 August 2026

**Two stages, not one — Dan's design, and better than the one-tick version originally
proposed.** Approving and sending are separate acts, so a stray tick costs nothing until
somebody deliberately sends. That keeps the safety property of the old batch model while
still letting review happen case by case at leisure.

| What | Where | Does |
|---|---|---|
| `Approved to Send` | Cases (checkbox) | The paralegal's confirmation. **Sends nothing by itself.** |
| **Reminder Queue** page `pagLFdxeOATz1syeZ` | Interface | Review, send, then check — three sections, one screen |
| `Send approved reminders` | Reminder Control (checkbox) | **Sends real mail. No undo.** |
| `Approved reminders last sent` | Reminder Control (date) | Stamped by the automation |
| **Send approved reminders** | Automation `wflms095u1rZ6sIWs` | Does the work |

The automation picks the Email Templates row matching each case's rung, emails the
requesting attorney, logs a note tagged `Email Chaser Sent`, stamps `Last Reminder Sent`,
and unticks the approval — so a case cannot go out twice on the same rung. Rung 4 also sets
`Closing Code` to "No Atty Response" with today's date, which drops the case out of the
queue by itself because `Reminder Stage` already excludes closed cases.

**Three things it depends on by NAME, all of which will break it silently if renamed:** the
`Email Chaser Sent` option on `Note Type`, the `No Atty Response` option on `Closing Code`,
and the `Used For` values in Email Templates. Templates are matched by `Used For` — which is
exactly why wording can be rewritten freely but those values cannot.

**Approve and send live on one page, in two sections.** A dashboard section is backed by a
single table, but a page can hold several sections each backed by a *different* one — so
section 1 is the queue (the case table) and section 2 is the single Reminder Control record
carrying the send tick-box. The paralegal reviews the rows and sends underneath them without
changing screens, and the two-action safety survives because ticking rows still sends
nothing.

**A trap that cost a round, and will recur.** `Send approved reminders` was created *after*
the Run Monthly Reminders page already existed, and **the API cannot add a field to an
existing page's layout** — so the control existed on the record but appeared on no page at
all, and the instructions said to tick something that was not there. **Whenever a new field
is meant to be used by a human, creating it is only half the job**: it must also be put on a
page, which means either building a new page or hand-work in the designer. Same lesson as
"adding a field to a record page is only half the job" under the EOIR section.

**Three limits of the API found here.** Dashboard pages have **no free-text element**, and
section and grid titles cap at **255 characters**. There is **no `update_page`** — a page's
titles, sections or layout can only be changed by deleting and recreating it, which is why
this page has had three IDs in one day. And a new automation is always **saved switched
off** — a human must review and enable it, which is a useful gate rather than an obstacle.

**So the explanation lives in the field notes, not on the page.** Decided 9 August 2026: the
page carries a short prominent warning plus a pointer, and the full "why is this case
listed" text is the **description on `Reminder Stage`**, which Airtable surfaces as hover
help. That text is written for the paralegal rather than for a developer, because it is now
user-facing. Keep it that way.

### BCC the reminders to the auto-filing address

Dan's idea, 9 August 2026, and a better record than an internal note alone: an auto-filed
copy is evidence that a real email actually left the building, where a note only records
that the automation believed it sent one.

**Two traps checked before agreeing, both clear:**

- The auto-filing automation tags what it creates **`Email (filed)`**, not `Email Chaser
  Sent`. So a BCC'd copy is **not** counted by `Chasers Sent (calc)` and cannot make a case
  skip a rung. Had it been tagged as a chaser, every reminder would have counted twice.
- `Email (filed)` also contains none of the words `Attorney Contact Date` matches on, so our
  own outgoing mail cannot be misread as the attorney having replied to us.

The copy will also attach itself to the right case: `Reminder Subject Prefix` begins
`RIAC Case <number>`, which is exactly what the `Case No. in Subject` formula extracts, so
"2. Attach Case Note to its case" will link it automatically.

**Built 9 August 2026** — all four `sendEmail` nodes now BCC:

```
riac-case-file-appwoHVXRp4vgfJB9.183c-wtrRwntbDiQDdpYsJ.29a1@automations.airtableemail.com
```

**That address cannot be derived from anything the API exposes.** The trigger stores only
the prefix (`riac-case-file`); the rest is generated by Airtable and shown only on the
automation's own screen, so it had to be read off by hand. Note the `wtrRwntbDiQDdpYsJ`
inside it — that is the **email-received trigger's own ID**. If "1. Email to Case Note" is
ever deleted and rebuilt, the address changes and every BCC here silently stops filing.
Nothing would flag it: the reminders would still send perfectly.

**One consequence to expect: two notes per reminder.** The internal one tagged `Email Chaser
Sent`, which is what the ladder counts, and the filed copy tagged `Email (filed)`, which is
the evidence. That is deliberate — the ladder must never depend on an email round-trip
succeeding, or a delivery failure would quietly stall the escalation.

**If the send steps are ever swapped to Outlook**, check the BCC survives the swap.

**Testing.** All 50 attorney emails were `@example.com` — a reserved domain that cannot
deliver — which is what made building the sending end safe at all. For a live proof of
concept, **Tomasz Wielgus's address was changed to `dejackson@outlook.com`** on 9 August
2026; he is the attorney on case 6010. **Change it back before real data goes in.**

**Proven end to end on 9 August 2026, on case 6010.** The email arrived. Subject came out as
`RIAC Case 6010 - People v. Dmytro Havryliuk (Buffalo City Court - CR-00987-26) - Referral
Still Outstanding` — the case prefix and the template's subject line joined correctly. Both
notes appeared: the internal one tagged `Email Chaser Sent`, and the BCC'd copy tagged
`Email (filed)`, which **attached itself to the right case automatically** off the case
number in the subject. `Chasers Sent` went to 1, `Last Reminder Sent` stamped, the approval
cleared itself, and the case left the queue — it returns at rung 2 once the 21-day gap has
passed. Every moving part did what it should.

### What happens when a send fails

Found in the same test, and confirmed from the run history on 9 August 2026. Case 6022 was
approved alongside 6010 and did not send. The error:

> **No MX record found for saoirse.devaney@example.com**

An artifact of the test data — `example.com` has no mail exchanger — but the run history
answers two questions that matter well beyond it.

**One bad address does not halt the batch.** Both cases appear in the loop's iteration
picker, and for 6022 the `Repeated for` row and the enclosing `If Reminder Stage is 1` row
both read **Success**, with only the `Send an email` step marked Fail. Airtable contains a
step failure inside its own iteration and carries on. The run as a whole is flagged
"Failed to run", but the other cases still go out. So a single typo cannot quietly stop a
month of chasers.

**A failed case loses nothing and retries.** The send errors *before* the log and update
steps, so the ladder does not advance and the approval is not cleared. The case simply comes
round again on the next send. **Keep the nodes in that order in any rebuild** — send, then
log, then update. Reordering them would mark a case as chased that was never reached.

**How to see a failure without reading run history — no build needed.** A successful send
unticks its own `Approved to Send`; a failed one cannot, because it never reaches that step.
So:

> **After hitting send, anything still ticked on the queue is a case that did not go.**

That is worth telling whoever works the queue, and it is why no `Send Failed?` field was
added — the tick already carries the information, and a second field could disagree with it.

The one caveat: a case with a permanently dead address stays ticked and fails on every run,
flagging each one as "Failed to run". Untick it and fix the address rather than leaving it.

**That rule is now on the page itself**, as a third section headed *"3. Check afterwards"*:
a live count of cases still ticked, with the explanation beneath it. **How to get text to
render *below* something on a dashboard**, given there is no text element: a `number`
element has a `description`, and that is the only slot that renders under its content — grid
elements have a title and nothing else. Using a count rather than a static note also makes it
self-checking: it should read zero after a clean run.

### Sending from RIAC's own address instead of Airtable's

**Yes, it is possible, and it is worth doing** — but it needs a step only Dan can take.

Airtable has dedicated `microsoftOutlookSendEmail` and `gmailSendEmail` actions that send
through a connected mailbox rather than Airtable's own mail server. Each needs an
`externalAccountId`, which only exists once someone connects that account to Airtable.
**Checked 9 August 2026: no external accounts are connected**, so the swap cannot be made
from here yet.

Once one is connected, each of the four `sendEmail` nodes in **Send approved reminders**
changes to the Outlook action — and the same applies to the older "Monthly reminders 2"
automation while it survives.

Three things to get right, because they are easy to miss:

- **Connect the shared RIAC mailbox, not a personal account.** These actions send *as* the
  connected account. Connect a named person's mailbox and every chaser appears to come from
  that individual, and all of it stops working the day they leave.
- **Check the BCC survives the swap.** The audit copy that files itself against the case
  depends on it.
- **The real prize is replies.** Attorneys currently reply into Airtable's sending address,
  where nothing is monitoring. Sending from a real mailbox means a reply lands somewhere a
  human reads.

**Done in the meantime, 9 August 2026: every send carries a Reply-To of
`RIAC2@ocbaacp.org`.** Mail still shows as coming from Airtable, but an attorney who hits
Reply now writes to a mailbox someone reads. That closes the worst of it — a lawyer answering
a chaser into an unmonitored address — without waiting for a mailbox to be connected. The old
"Monthly reminders 2" automation does **not** have this and still replies into the void; add
it there too if that automation is used again before it is retired.

### Both addresses are configuration, not automation

Neither email address is written inside the send automation. Both live as fields on the
**Reminder Control** record and are read from it at send time:

| Field | Holds |
|---|---|
| `Reply-To Address` | Where an attorney's reply goes |
| `Case File BCC Address` | The auto-filing address the evidence copy is BCC'd to |

**This works because the Reminder Control record *is* the automation's trigger record**, so
any configuration field on it is available to every node with no lookup — the cheapest
possible config mechanism in Airtable, and worth reusing for anything else that needs setting
per-region.

Two reasons this matters more than tidiness:

- **RIAC is moving from `@ocbaacp.org` to `@nyriac.com`.** That migration is now one cell,
  not four buried automation inputs.
- **Rolling out to other RIACs.** See below — the BCC address is the dangerous one.

### If this base is copied for another RIAC, change the BCC address FIRST

The auto-filing address embeds **this base's ID and this base's email-trigger ID**:

```
riac-case-file-appwoHVXRp4vgfJB9.183c-wtrRwntbDiQDdpYsJ.29a1@automations.airtableemail.com
                ^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^^
                this base             this base's email trigger
```

A duplicated base keeps that value, so **another region's reminders would file their evidence
copies into RIAC 2's database** — one region's case correspondence landing in another
region's case files, silently, with both bases appearing to work. Every new base must read
its own address off its own "1. Email to Case Note" automation and paste it into
`Case File BCC Address` before anything is sent.

The same applies here: if that automation is ever deleted and rebuilt, the address changes
and every BCC quietly stops filing while the reminders keep sending perfectly.

**The wider point for rolling out to other RIACs.** Each region has to set up its own outbound
mail regardless, so treat the Reminder Control record as the per-region setup sheet: reply-to
address, case-file address, and — once mailboxes are connected — the account each send action
uses. Anything else that turns out to be region-specific belongs there too, for the same
reason.

### One auto-filer address per RIAC — required, and already the case

**Incoming case email cannot be pooled.** Conflicts mean a region's correspondence has to
land directly in that region's own confidential data, never in a shared inbox that is later
parsed and distributed. Dan's requirement, 9 August 2026.

**The architecture already enforces this, and it is not an accident.** Airtable generates the
auto-filing address from the base and the email trigger that owns it, so an address belongs
to exactly one base and cannot be pointed at another. Give each RIAC its own base and each
gets its own filer address automatically. There is no configuration in which one address
serves two regions — pooling is not merely discouraged here, it is unavailable.

**Which makes the copied-base trap the one real danger**, because it produces pooling by
accident and in the wrong direction: a duplicate keeps the *original* address in
`Case File BCC Address`, so the new region's mail files into the old region's case files
while both bases look healthy. That is exactly the outcome this requirement exists to
prevent, arriving through an omission rather than a decision. **Reading the new base's own
address off its "1. Email to Case Note" automation is therefore a go-live step, not a
tidying-up step.**

**Conflict checking is region by region — CONFIRMED by Dan, 9 August 2026.** RIAC conflict
checks its own offices only, so the conflict universe is properly the region's, not the
state's. That matters because the base is also Airtable's permission boundary: the conflict
check searches the Parties table in its own base and nothing else, so a person known to one
RIAC will not flag in another. That is the intended behaviour, not a limitation to engineer
around — and it means the per-region base is the right unit for confidentiality *and* for
conflicts, which is a happy alignment rather than a compromise.

### Why the case-file address stays BCC and not CC

Considered and rejected on 9 August 2026. The appeal is obvious: put the auto-filing address
in CC and an attorney who hits *Reply All* has their reply filed against the case
automatically.

**The objection is that the case-file address is an unauthenticated way to write into this
base.** Anything emailed to it becomes a case note, and if the subject carries `RIAC Case
<number>` the companion automation attaches it to that case. Putting it in CC publishes that
address to every attorney RIAC chases — and to anyone they forward the mail to, and to
anything that scrapes it. From then on, a stranger could create notes on any case whose
number they can guess, and spam to that address would land in the case log. With real client
data in the base that is a confidentiality and integrity problem, not an annoyance.

The benefit is also weaker than it looks: it only pays off when someone uses Reply All rather
than Reply, which most people do not.

**The safe way to get the same result** is a forwarding rule on `RIAC2@ocbaacp.org` — forward
anything whose subject contains `RIAC Case` to the case-file address. Replies then file
themselves exactly as CC would have achieved, the address stays private, and it works for
plain Reply as well as Reply All. That is also precisely what the "1. Email to Case Note"
automation was built for: *"BCC or forward any case email to this automation's address."*

### Airtable emails the automation's owner when a run fails

Confirmed 9 August 2026 — a "Something went wrong with an automation" message arrived after
the two failed test runs. This softens, but does not remove, the silent-failure problem
recorded above:

- It goes to the person who owns or last edited the automation, **not** to a shared mailbox,
  so it stops reaching anyone if that person leaves.
- It is aggregated — *"failed 2 times"* — and names no case, so it tells you something broke,
  not which attorney went unchased.

Treat it as a smoke alarm, and the count on the Reminder Queue page as the thing that says
what actually needs fixing.

### The original proposal, for reference

Replace the monthly batch ritual with a **standing queue**. A case joins it the moment it
becomes eligible; the paralegal works the queue at their own pace, confirms each case really
does belong there, and approving one case sends that case's email. Two answers are still
outstanding at the end.

**This is less machinery than the batch model, not more — the flagging already happens by
itself.** `Reminder Due` is a formula counting from `TODAY()`, so it already recalculates
every day and a case becomes eligible overnight with nobody doing anything. The "Generate
this month's list" button never *found* eligible cases; it only wrote draft text onto them
and ticked a box. Drop those and the queue is a page filtered on the formula. No generate
step, nothing to remember.

**Count the 30/60/90 days from the last chaser we sent, not from the referral or the last
attorney contact.** This is the decision that matters most. If the paralegal is away three
weeks, a case counting from the referral returns to the queue already 60 days old and skips
a rung — the attorney gets "final warning before we report you" without ever receiving the
polite one. Counting from the last chaser gives every attorney a full 30 days to answer each
message however the review timing slips, and keeps a waiting case on the rung it is on
rather than escalating while it sits in the queue.

**Per-case draft text is probably unnecessary.** The paralegal's check is *"is this case
really eligible"*, not proofreading — the wording is the same every time and lives in Email
Templates. That retires `Reminder Email Draft` and `Reminder Email Subject` along with the
drafting step. Revisit only if wording ever needs tweaking case by case.

**Three problems, two of them accepted:**

1. **Nothing makes anyone look at the queue.** This is the real cost of dropping the monthly
   rhythm: a fixed ritual forces someone to look, a standing queue can be ignored for months
   while cases quietly age. Mitigate by sorting oldest-first and showing days-waiting, so
   neglect is visible on the page rather than invisible.
2. **One tick sends real mail, with no undo** — where today two deliberate actions stand in
   the way. The counterweight is that the blast radius shrinks from forty emails to one, so
   this is a net safety gain; but the failure mode changes from "sent the batch too early" to
   "mis-tapped a row".
3. **Volume.** Per-case approval scales less well than batch approval. Fine at 44 cases;
   revisit if the queue ever runs to hundreds.

**Roughly what it needs:** `Reminder Due` turned from yes/no into which-rung; a count of
chasers already sent; an approval control; **four** rows in Email Templates where there are
currently two wordings (1st, 2nd, final warning, closing notice — and note the standing rule
that `Used For` values must not be renamed, since automations find templates by them); one
automation that sends on approval, logs the note and stamps the date; and for step 4 sets
`Closing Code` to "No Atty Response" with today's date — which drops the case out of the
queue by itself, since the formula already excludes closed cases. Once proven, retire the two
`Reminder Control` buttons, or there are two ways to send and they can disagree.

**Both open questions were answered on 9 August 2026:**

- **A reply does not reset the ladder.** An attorney who answers with nothing useful and goes
  quiet again resumes where they were. The paralegal can hold a case back by hand.
- **The paralegal never edits the email.** They are checking case data to confirm a standard
  form email is warranted, nothing more — so `Reminder Email Draft` and `Reminder Email
  Subject` can be retired along with the drafting step, once the new automation replaces the
  old one.

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
