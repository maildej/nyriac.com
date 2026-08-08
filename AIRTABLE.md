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
| How often EOIR nil results are rechecked (currently 90 days) | The **`EOIR Recheck Due`** formula on Parties |
| Which statuses count as "ready for advisal" | The **`Readiness (calc)`** formula on the case table |
| What shows on the second line of the Case Viewer list | The **`Case List Line`** formula |

---

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
else.** It caused the charge-catalogue problem above, and it is still live in two places:

| Table | Primary field | What a picker shows and searches |
|---|---|---|
| **Parties** | `Client Key Code` — autoNumber | `29`, `7`, `26` |
| **Attorneys & Requestors** | `Attorney Code` — autoNumber | `29`, `7`, `26` |

So a "find the person" or "find the attorney" picker **cannot be searched by name today**.
Both tables hold the name (`Client Full Name`, `Attorney Full Name`) but in non-primary
fields, where the picker cannot reach them.

This matters most for **Case Parties**, because the whole conflict check depends on people
being *linked* rather than typed — and staff will not link reliably to a list of bare
numbers.

**The fix, and why it needs care.** Unlike the Penal Law citation, an autoNumber cannot be
rebuilt by a formula — converting it destroys the numbers. So the order matters, and step 2
must happen before step 3.

**Steps 1 and 2 are done (8 August 2026).** `Client Key Code (original)` and
`Attorney Code (original)` exist and hold every historic number — 53 people and 50
attorneys, none missing.

**Step 3 is by hand**, since the API cannot change a field's type. Convert each primary
field to a formula:

*Parties → `Client Key Code`:*
```
IF({Client Key Code (original)}, {Client Key Code (original)} & " — ", "") & {Client Full Name}
```

*Attorneys & Requestors → `Attorney Code`:*
```
IF({Attorney Code (original)}, {Attorney Code (original)} & " — ", "") & {Attorney Full Name}
```

Airtable will warn that data will be lost. That is the autoNumber, and it has already been
copied to safety — accept it.

**One consequence to accept knowingly: after conversion, new people and attorneys no longer
receive a code number.** The `IF` above means they simply show as a name, which reads fine
in a picker. Airtable's own record ID remains the real identity, so nothing breaks. If
codes must continue, add a fresh autoNumber field afterwards and fold it into the formula —
but be aware its numbering starts from row order and can collide with the historic codes.

## Case Parties is a junction table

One row = **one person + one case + the role they played on it**. "Adding a related party"
therefore means creating a Case Parties row, not editing a list on the case.

The **client is deliberately not in this table** — the client is the `Client Code` link on
the case itself. So a "related parties" list shows co-defendants, complainants, witnesses
and referred-out contacts, never the client. That is by design, not an omission.

Always populate the `Party` link rather than relying on the typed `Name`. The link is what
ties a co-defendant on one case to the same human appearing as a client on another, which
is the entire basis of the conflict check.

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
