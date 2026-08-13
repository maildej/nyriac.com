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
| **NY VTL Offenses** | Alcohol and driving offences, one row per prior-conviction tier. `Short Name` is the column to edit — see "Classes, attempts and short names". |
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
- **`Counts` on Case Charges is a single select, not a number** (1–5 and "6 or more",
  changed 11 August 2026). That is deliberate. Its only job is to flag to the RIAC attorney
  that there is more than one count when they do the advisal — nothing calculates with it
  and nothing aggregates on it, so a picker that cannot be typed inconsistently is worth
  more than arithmetic nobody performs. **Don't convert it back to a number to tidy it up.**

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
| **People** | Grid | Everyone in Parties, in any capacity. **The place a person is added**, because they cannot be created from a picker — see below. Clicking one opens the existing editable Parties detail page. Created 11 Aug 2026. |
| **EOIR Checks** | List | Backstop only — people with an A-Number nobody has looked up yet. See "EOIR checks" below. |
| **Reminder Queue** | Dashboard | The four-rung chaser system: cases needing a chase, a tick to approve each, and the button that sends them. See gap 8. |

Two pop-up forms: **Add A New Charge** and **Add Case Note**.

---

## The automations

Six are deployed and valid; the seventh (`4. Add a case note to all linked cases`) was built
on 11 Aug 2026 and is **still switched off**. **One of them sends real email** — see gap 8.
(There were seven, and two senders, until `Monthly reminders 1` and `2` were deleted on
10 Aug 2026 and `3. Filed advisal closes the case` was added on 11 Aug.)

> **An automation created through the API arrives as an off draft.** It is saved and
> validated but does nothing until someone opens it in the UI and turns it on. This is the
> sibling of the trap already recorded below — that an *edit* made through the API stays an
> unapplied draft while the automation is on.

| Automation | Fires when | Does |
|---|---|---|
| **Conflict Check on New Intake** | Intake form submitted | Flags anyone in Parties with a matching **surname**, or a matching **date of birth** regardless of name. Deliberately over-returns — a few names to flick through beats a missed conflict. |
| **1. Email to Case Note** | Email arrives at the `riac-case-file` address | Creates a note holding subject, body, sender, attachments. Does not attach it to a case. |
| **2. Attach Case Note to its case** | A note has a case number in its subject but no case | Finds the case and links it. Failing to match is harmless — the note lands in Needs Review. |
| **3. Filed advisal closes the case** | A note has an advisal subject *and* a case link | Tags the note, sets the case to Closed, writes the closing code, stamps Date Closed. See "The reminder ladder" below. |
| **Send approved reminders** | "Send approved reminders" ticked | The **three-rung** system behind the Reminder Queue page: first reminder, second reminder, then a closing notice that also closes the case as "No Atty Response". **Actually emails attorneys. No undo.** Reads its reply-to and BCC addresses from the Reminder Control record. |
| **4. Add a case note to all linked cases** | A note has "Add To All Linked Cases" ticked, a case attached, and "Also Relates To" still empty | Fills in `Also Relates To` with every other case linked to this one, from **either** side of the self-link. **Built 11 Aug 2026 and still OFF** — a new automation is created as a draft and has to be turned on by hand. See "Linked cases" below. |
| **Stamp EOIR check date** | EOIR Result changed on a person | Writes today's date into EOIR Last Checked. |

### Changing behaviour without touching an automation

This was a deliberate design goal. Each of these is a single edit in one place:

| To change | Edit |
|---|---|
| Who gets chased, and when (30 / 60 / 90 days) | The **`Reminder Stage`** formula on the case table |
| How long a case must be quiet before it is flagged dormant (45 days) | The **`Dormant Case Flag`** formula on the case table |
| What the reminder queue *says* — the rung labels | The **`Review Queue Reason`** formula. **Not `Reminder Stage`** — see below |
| The wording of reminder emails | The **Email Templates** table |
| The subject-line caption, court, docket | The **`Reminder Subject Prefix`** formula on the case table |
| What counts as an EOIR check still outstanding | The **`EOIR Check Status`** formula on Parties |
| Which statuses count as "ready for advisal" | The **`Readiness (calc)`** formula on the case table |
| What shows in the Case Viewer list | The **`Case List Title`** formula — case number, client, attorney, attorney's office. The second line is the element's own "Field 1", currently `Top Charge`. ⚠️ **Not `Case List Line`**, which despite the name is displayed nowhere — an earlier draft of the second line, orphaned once the attorney moved into the title |

---

## The reminder ladder (August 2026)

Two separate routes feed one review queue. Nothing is ever sent without a person approving it.

**Route A — the chaser ladder.** For cases at *Intake Sent / Awaiting Contact* only, i.e. the
attorney has never engaged. `Reminder Stage` puts a case on rung 1, 2 or 3 at **30 / 60 / 90
days since the request date** — not since last contact. A rung only steps up once the previous
reminder has actually been sent and logged (`Chasers Sent (calc)`, which sums). A case leaves
the ladder if it has no request date, no attorney email, a closing code, a closing date, a
disposal note, a status without the word "awaiting", or a reminder sent in the last 21 days.

> **The 21-day suppression catches people out.** A blank rung on an old case usually means
> "chased recently", not "not due".

**Route B — dormancy.** For cases at *Atty Has Been In Contact* only. `Dormant Case Flag`
fires when **no case note of any kind** has been added for 45 days. It counts *any* note,
including internal ones, because the question is "has this been forgotten", not "has the
attorney replied". Nothing is ever sent for these — a chaser would be the wrong letter.

**`Review Queue Reason` merges the two, and is what the queue page filters on.**

> ⚠️ **Do not filter on `Reminder Stage` and `Dormant Case Flag` together.** A case can never
> be both, so an AND of the two returns **zero rows**. This has caught two people out.

It is also the **display** field — it rewrites rungs as "1 - Eligible for First Reminder" and
so on. Reword the queue *there*. **Never reword `Reminder Stage`**: the send automation matches
its three values as exact text, and changing them stops every reminder silently.

**Sending.** Tick `Approve` on each case, then tick `Send approved reminders` on the single
Reminder Control record. Step order inside the automation is deliberate — **send, then log,
then update** — so a failed send never marks a case as chased.

**Advisals close cases.** `Advisal Type From Subject` reads a filed email's subject. Beginning
"RIAC ADVISAL 1234" or "RIAC EMAIL ADVISAL 1234" — optionally behind one or two `Fw:`/`Fwd:`
prefixes, never behind `Re:` — makes automation 3 close the case. Forwards count so an attorney
who forgot to BCC can forward from their sent items; replies do not, so a reply cannot re-close
a case someone has reopened.

### The word-matching rule

Seven formulas drive all of this, and every one matches on a **word** rather than an exact
option name, so select options can be renamed freely. The trap is the reverse: **naming a new
option with a reserved word**.

| Field | Table | Reserved words |
|---|---|---|
| `Readiness (calc)` | cases | "needs immediate", "ready for advisal", "draft advisal" |
| `Reminder Stage` | cases | "awaiting" |
| `Dormant Case Flag` | cases | "been in contact" |
| `Attorney Contact Date` | notes | "interaction", "documents received", "email received", "phone call", "substantive" |
| is-a-chaser | notes | "chaser" |
| is-a-disposal-note | notes | "case disposed" |
| `Closed Case Banner` | cases | "closed" in `RIAC Next Steps`; "other" in `Closing Code` |

The last row is not part of the reminder ladder — it is the closed-case banner (August 2026,
TODO item 27) — but it carries the same trap, so it belongs in the same list. Its "other"
word is the one most likely to be tripped by accident: a closing code named "Closed For Other
Reasons" would make the banner start demanding a reason that nobody meant to ask for.

Rung timing uses **`Days Since Referral (calc)`**, *not* the contact chain. The contact chain
(`Attorney Contact Date` → two rollups → `Last Attorney Contact` → `Days Since Attorney
Contact`) and the dormancy chain (`Note Date (any)` → two rollups → `Last Case Note (any)` →
`Days Since Any Case Note`) are separate; trace the right one.

### Things that cost a day to learn

- **Airtable's mail server rejects reserved domains such as `example.com`.** A test send to a
  fake address fails at the send step and leaves the case untouched with its approval still
  ticked — silently. This produced three wrong diagnoses on 11 Aug before anyone tested against
  a real address. **Test against a real address.**
- **An automation edited through the API stays an unapplied draft while the automation is on.**
  Live behaviour does not change until someone clicks **Update** in the UI. This bit us three
  separate times in two days.
- **Deleting a select option silently clears that value on every record.** Restructuring
  `RIAC Next Steps` wiped the status and closing code on all 44 cases. Renaming preserves data
  but rewrites history. On live data: export first, and prefer add-new → migrate → delete-old.
- **`update_field` can return success and keep the old formula.** Seen with a regex containing
  a quantified group. Always read a formula back, or test it against real records.
- **Check the Record source on every delete button.** It does not reliably bind to the record
  whose page you are on — on the Case Note page it bound to the *case*. See TODO item 4.
- **Buttons do not render on dashboard pages.** They can be placed in the editor and even work,
  but are invisible once published. Blank canvas pages render them properly.
- **Script steps cannot be created through the API** (`readOnlyNodeType`). Anything needing
  string manipulation has to live in a formula field.

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

**4. ~~A dead field~~ — RESOLVED, deleted 10 August 2026.** `CrimeTime` on NY VTL Offenses
was disabled — CrimeTime covers Penal Law sentencing only — and Dan deleted it by hand.
The Penal Law `CrimeTime` field is untouched and still working.

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
| `Effective Class` | Formula | The class the charge actually carries — attempt class if attempted, else the Penal Law class, falling through to the VTL class. **Read this, not `Classification`.** Since 9 Aug 2026 it also appears, abbreviated, inside `Charge`. |
| `Classification (from catalogue)` | Lookup | Class of the completed Penal Law offence. |
| `Attempt Class (from catalogue)` | Lookup | What the class becomes on an attempt. |
| `Statutory Text (from catalogue)` | Lookup | Verbatim text, readable on the case. |
| `NY Senate Link`, `CJI Link` | Lookup | Source links. `CJI Link` is the specific jury instruction. |
| `CJI Article Page`, `CJI Match` | Lookup | The other half of the jury-instruction picture — the article page to fall back on, and how good the direct link is. `CJI Match` arrives as a coloured chip. See "Jury instruction links" below; show all three together. |
| `VTL Classification (from catalogue)` | Lookup | Class of the linked VTL offence. |
| `VTL Statutory Text (from catalogue)` | Lookup | Verbatim VTL text. |
| `VTL Sentencing (from catalogue)` | Lookup | Sentencing exposure at the prior-conviction tier picked. |
| `VTL Source Link` | Lookup | NY Senate link. |
| `VTL CJI Link`, `VTL CJI Article Page`, `VTL CJI Match` | Lookup | The VTL jury-instruction set, mirroring the Penal Law fields. See "Jury instruction links" below. |
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

#### The VTL has jury instructions too

An earlier note in this file said there was no CJI equivalent for the VTL. **That was
wrong** — the CJI has a "Vehicle & Traffic Law" section, and **NY VTL Offenses** now
carries the same three fields as the Penal Law catalogue:

| | |
|---|---|
| `CJI Link` | 30 of the 36 records. |
| `CJI Article Page` | Formula. **One page for the entire VTL**, not one per article as with the Penal Law, so the value is the same on every record. |
| `CJI Match` | Exact subdivision 28 · Broader document 2 · Not listed 6. |

Two things specific to the VTL:

- **The instruction is about the elements of the offence, not the sentence**, so every
  prior-conviction tier of a subdivision shares one document. All five tiers of 1192(2)
  point at the same PDF, which is correct — the tier changes the grade, not the elements.
- **The six unmatched records are genuinely absent from the CJI**, not a matching failure:
  1192(5) and 1192(6) (commercial-vehicle DWI) and 1192-a (zero tolerance, under 21).
  Two more are "Broader document" — the table holds 511(2)(a) and 511(3)(a), while the
  CJI splits each into `(i)` and `(ii)`, so the link goes to the `(i)` instruction.

Note this is **not** the same situation as `CrimeTime`, which really is Penal Law only.
The dead VTL `CrimeTime` field was deleted on 10 August 2026.

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
can be searched by offence name. This reproduced all 1,918 existing citations exactly —
`P.L. 240.05`, `P.L. 140.10(a)`, `P.L. 265.01-D(2)(c)`, `P.L. 496.06 - SUBSECTION UNKNOWN`
— and appended the name:

```
"P.L. " & {Section} &
IF({Subdivision} = "SUBSECTION UNKNOWN", " - SUBSECTION UNKNOWN", {Subdivision}) &
" — " & {Offense Name}
```

Cost: every charge chip gets longer. Drop the final line to keep short chips, but then
name search stops working — searchability and brevity are the same setting.

*(This formula was superseded on 9 August 2026 — see "Classes, attempts and short names"
below. It is kept here because it is the record of what the conversion had to reproduce.)*

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
- **A form cannot host a button or a link either** (checked 11 August 2026 — the form
  editor's element menu offers none). So a popup cannot send anyone anywhere: no "not on
  the list? add them here" button, no jump to another page. The only place to put that kind
  of instruction is the form's own **description**, the slot under its title. That is how
  the Add a Related Party popup points at the People page.
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

## Classes, attempts and short names (9 August 2026)

### What changed

Three things, all display only. **No stored data was altered** — the verbatim statutory
names, statute numbers and classifications are exactly as they were; only what is shown on
top of them changed.

| Where | Before | After |
|---|---|---|
| Penal Law picker | `P.L. 215.51(b)(iii) — Criminal Contempt in the First Degree` | `P.L. 215.51(b)(iii) — Criminal Contempt 1st (E Fel)` |
| VTL picker | `V.T.L. 1192.2 - 1 Prior Conviction Within 10 Years` | `V.T.L. 1192.2 — DWI (0.08% BAC) — 1 Prior Conviction Within 10 Years (E Fel)` |
| A charge on a case | `Attempted P.L. 215.51(b)(iii) — Criminal Contempt in the First Degree` | `P.L. 110-215.51(b)(iii) — Attempted Criminal Contempt 1st (A Misd)` |

### The one rule that shaped the whole design

**A picker can only ever show a table's primary field**, so putting the class into the
Penal Law picker necessarily put it into `Citation` — and `Charge` used to be nothing more
than `ARRAYJOIN` of the linked record's name, i.e. a copy of `Citation`. Left alone, an
attempted E felony would have shown the completed offence's class in its own title while
the attempt-adjusted class sat in a column beside it, contradicting it.

So `Charge` no longer copies the catalogue entry's name. Each catalogue table now exposes
its name in **two separable pieces**, and `Charge` reassembles them with the attempt parts
inserted in the middle:

| Piece | On Penal Law | On VTL |
|---|---|---|
| `Statute No.` | `215.51(b)(iii)` | `1192.2` |
| `Display Name` | `Criminal Contempt 1st` | `DWI (0.08% BAC) — 1 Prior Conviction Within 10 Years` |

Both deliberately **omit the "P.L. " / "V.T.L. " prefix**. That is the whole point: the
prefix is added by whoever is assembling the line, so `Charge` can write
`"P.L. " & "110-" & {Statute No.}` and produce `P.L. 110-215.51(b)(iii)`. Put the prefix
back into `Statute No.` and the attempt citation becomes impossible without string surgery.

### Two different classes, on purpose

This is the thing most likely to look like a bug and is not.

- **The picker always shows the completed offence's class.** It is a catalogue of statutes,
  not of charges; nothing there knows whether any particular case is an attempt.
- **The charge row always shows the calculated class** — `Effective Class`, which has
  already dropped a rung for an attempt.

So an attempted first-degree criminal contempt is picked from a list saying `(E Fel)` and
lands on the case reading `(A Misd)`. Confirmed as acceptable by Dan before the work was
done. The word "Attempted" and the `110-` both sit in the same line, which is what makes
the drop legible rather than baffling.

### The pieces, table by table

| Field | Table | What it is |
|---|---|---|
| `Statute No.` | Penal Law | Formula. Number only, no prefix. Handles `SUBSECTION UNKNOWN`. |
| `Display Name` | Penal Law | Formula. Offence name with "in the Nth Degree" shortened to "Nth". |
| `Citation` | Penal Law | Primary. `Statute No.` + `Display Name` + abbreviated class. |
| `Short Name` | VTL | **Text — the one field to edit.** Plain-English name per row. |
| `Statute No.` | VTL | Formula. Number only. Works out `.` vs `-` for itself. |
| `Display Name` | VTL | Formula. `Short Name` (or the full name if blank) + prior-conviction tier. |
| `Citation` | VTL | Primary. Same shape as the Penal Law one. |
| `PL Statute No.`, `PL Display Name`, `VTL Statute No.`, `VTL Display Name` | Case Charges | Lookups. The four pieces `Charge` assembles. |
| `Charge` | Case Charges | Primary. The finished line. |
| `Top Charge Label` | Case Charges | Now just `IF({Top Charge?}, {Charge}, "")`. |

### Details that will not be obvious later

- **The degree shortening is a find-and-replace inside a formula, not an edit to the data.**
  Checked against all 1,918 rows first: every degree in the table is written
  `in the Nth Degree` with those exact capitals, nothing else in any offence name uses the
  word "degree", and 1,143 rows are affected. `SUBSTITUTE` is **case-sensitive**, so a row
  added later with different capitalisation will simply not shorten — it will not break.
- **`110-` is Penal Law only.** VTL has no attempt provision and its entries carry no
  attempt class, so a VTL charge ticked as an attempt gets the word "Attempted" and keeps
  its ordinary class. Tested.
- **A write-in charge shows no class at all** — there is no catalogue entry to read one
  from, so `Effective Class` is blank and the brackets are omitted rather than left empty.
  Tested.
- **The class abbreviations appear in three formulas** — `Citation` on both catalogues and
  `Charge` on Case Charges. There is no single place to change them. Change one, change all
  three. This was chosen over three more lookup fields and a fourth formula; the NY offence
  ladder does not change, so the duplication is inert.
- **The VTL `Short Name` column is meant to be edited by hand.** The picker and every charge
  line update the moment it is. A blank falls back to the full statutory name, so a new row
  is never nameless. Do not type the prior-conviction tier into it — that is appended
  automatically, which is what lets one short name serve all the tiers of an offence.
- **`Top Charge Label` must not append the class again.** It used to; `Charge` now carries
  it. The case-level `Top Charge` rollup reads this field and is otherwise untouched.

### What was checked before changing anything

Every formula, rollup and automation in the base was traced. **No automation reads a charge
or a catalogue entry**; the reminder emails do not mention charges. The only consumer of the
catalogues was `Charge`, and the only consumer of `Charge` was `Top Charge Label` → the
case-level `Top Charge` rollup. No case carried a VTL charge, so restyling the VTL entries
could not disturb existing data. Three throwaway charge rows — plain VTL, attempted VTL, and
an attempted write-in — were created, checked and deleted.

### The manual step, now done

**`Citation` on NY VTL Offenses was converted from text to a formula by hand on 9 August
2026**, completing the work. The API cannot change a field's type, so this was Dan's to do —
the same job the Penal Law `Citation` needed on 8 August. All 36 rows verified afterwards:
every statute number reproduced exactly, including the ones that do not follow the ordinary
pattern — `V.T.L. 1192-a`, `V.T.L. 511.1(a)`, `V.T.L. 1192.2-a(b)`, `V.T.L. 1192.4-a`.

The formula it now carries is the same shape as the Penal Law one:

```
"V.T.L. " & {Statute No.} & " — " & {Display Name} &
IF({Classification}, " (" & SWITCH( … abbreviations … ) & ")", "")
```

Worth knowing if this is ever repeated in another region's base: **the VTL charge line on a
case worked before this step and did not depend on it.** `Charge` is assembled from the
helper fields, not from `Citation`, so only the *picker* was waiting on the conversion. That
is a useful property — the risky hand-work can be left until last without holding anything
else up.

**One thing that confused the handover, worth writing down:** the field could not be found,
because it is the **primary field**. In an expanded record the primary field is the title at
the top and does not appear in the list of fields at all; in the grid it is the pinned
leftmost column. Anyone told to "edit the Citation field" will look for a labelled box and
not find one. Identify it by its values instead.

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

### Reading a classification out of the VTL is not like the Penal Law

The Penal Law states the grade at the end of every offence. **The VTL does not.** Its rule is
different: the default is a traffic infraction, and anything that is a crime says so
explicitly somewhere in the text. That is still machine-readable, with two conditions
established by sampling 15 sections on 10 August 2026:

- **Subdivision level, not section level.** VTL 375 runs to 114,000 characters, mostly
  infractions, with individual subdivisions carrying misdemeanours. The statute scopes its
  own declarations — "a violation of *this subdivision* shall be a misdemeanor" — so they
  can be attributed to the right branch.
- **Only declaratory phrasing counts.** "shall be a misdemeanor", "shall constitute",
  "shall be punishable as", "guilty of a class E felony" — never the bare word.

**⚠ The Open Legislation API escapes its line breaks.** Section text comes back with the
two characters `\` and `n` where a line break belongs, **not** a real newline. So
`re.sub(r'\s+', ' ', text)` does not collapse them, and any phrase straddling a line break
is invisible to a regex — `shall be\nguilty of a misdemeanor` simply never matches. This
silently hid reckless driving (1212) and a third of the VTL crimes until it was spotted.
**Always `text.replace('\\n', ' ')` before matching anything.**

**The trap, worth knowing before anyone tries this:** the words "misdemeanor or felony"
appear in **1192** exactly twice, both inside the passage about *out-of-state* prior
convictions. Neither grades anything; 1192's grades live in **1193**. So a rule keying on
bare mentions gets 1192 right by accident, and would silently classify the single most
important offence in the catalogue as a traffic infraction if that incidental wording ever
changed. **Treat "no grade declared in this section" as a flag for review, never as a
default to infraction.**

### The loaders are NOT broken by the Citation formula (checked 11 Aug 2026)

An earlier note claimed both scripts "fail outright" because they write `Citation` and
merge on it, and `Citation` is now a formula. **That note was stale** — it described the
state before the 10 August repoint and was never updated. Checked against the actual files:

- `catalogue_vtl.py` — `MERGE_FIELDS = ["Section", "Subdivision", "Prior Tier"]`,
  `Citation` absent from `TABLE_FIELDS`, with a comment in the file saying exactly why.
- `catalogue_penal_law.py` — `MERGE_FIELDS = ["Section", "Subdivision"]`, and `push()`
  passes `performUpsert.fieldsToMergeOn: merge_fields`, never `Citation`.
- A dry run of `catalogue_vtl.py` builds all 36 records cleanly.

**What has not been proved:** a real write. The dry run stops before the Airtable call, and
running a live one needs a token and would touch the live table. The merge fields are all
plain text, so a write should be accepted — but the first real run still wants watching.

### Neither catalogue has been re-run since the scripts were repointed

The repoint was 10 August 2026, so both points above are **untested against a real load**.
Expect to verify rather than trust the first run.

### ⚠️ Check what a re-run does to `Short Name` on the VTL catalogue

**Unverified, and worth establishing before the next VTL load.** `Short Name` on NY VTL
Offenses is a **hand-edited** text column — it is the plain-English name shown in the charge
picker and on every recorded charge, and it is the one column on that table Dan is meant to
type into. See "Classes, attempts and short names" above.

If `catalogue_vtl.py` writes a fixed set of columns on every upsert, whether it *clears*
`Short Name` or simply leaves it alone decides whether a routine catalogue repair silently
wipes 36 hand-written names. The script is in OneDrive rather than this repository, so this
has not been checked from a cloud session.

**Before the next run:** confirm the script does not write `Short Name`, or teach it to skip
the column, in the same way it already leaves Dan's hand-corrected `Classification` values
alone. Same question applies to the `Statute No.` and `Display Name` formulas on both
catalogues — but those are formulas, so a loader cannot overwrite them, and only `Section`
and `Subdivision` feed them. That is one more reason not to touch those two columns by hand.

## Pickers can only search a table's primary field

This is the single most important thing to know when designing anything that asks a user to
find a record. **Airtable's linked-record picker searches the primary field and nothing
else.** It caused the charge-catalogue problem above, and it caused a worse one on Parties
and Attorneys & Requestors, where the primary field was a bare autoNumber — so a "find the
person" picker offered `29`, `7`, `26` and could not be searched by name at all.

**Both are now fixed** (verified 8 August 2026). Each primary field is a formula:

| Table | Primary field now reads |
|---|---|
| **Parties** | `Fatoumata Sissoko (D.o.B. 10/29/2005)` |
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
  & IF({DoB}, " (D.o.B. " & DATETIME_FORMAT({DoB}, "MM/DD/YYYY") & ")", "")
```

**The date format is US month-first, and that is a search decision as much as a reading one**
(changed from `D MMM YYYY` on 11 August 2026). Everyone using this base will type a date the
American way, and a picker search is a **substring match on this text** — so the text has to
look like what people type. Two details follow from that and are easy to undo by accident:

- **Four-digit year, not two.** `11/02/1994` is found by typing either `94` or `1994`;
  `11/02/94` is not found by typing `1994` at all. Two extra characters buy a strictly larger
  set of successful searches.
- **Zero-padded**, so the width is fixed and it matches what a US date box expects.

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

### The second consequence, found 11 August 2026: a person can no longer be created from a picker

**A formula primary field cannot be typed into, so Airtable does not offer "create new record"
in any picker pointing at Parties or Attorneys & Requestors.** Creating a record from a picker
works by putting the typed text into the new record's primary field; where that field is
computed there is nowhere to put it, so the option simply does not appear. Tested on the Add a
Related Party popup — searching for a name that is not on file returns nothing and offers
nothing.

It is not a setting anyone has missed. No toggle on the form, the field or the page turns it
on, and hunting for one wastes an afternoon.

**On balance the trade is still right**, because the alternative was a picker offering `29`,
`7`, `26` that could not be searched by name at all. But it changes the workflow: a person is
added on the **People** page first — with a date of birth — and *then* linked. That is the
better order anyway. A person minted in a hurry from a picker gets a name and nothing else,
and the conflict check matches on date of birth regardless of name, so every DoB-less person
quietly blunts it. As of 11 Aug the only three people on file without one are the three legacy
imported rows.

**Anyone rebuilding this in another region's base needs to know both halves before choosing.**

## Two people with the same name

The database always tells them apart — separate records, separate internal IDs, and linking
to one never touches the other. **The person choosing in a picker is the weak point**, not
the data. A picker shows only the primary field, so two records reading `Maria Torres` and
`Maria Torres` are indistinguishable on screen, and whoever is clicking picks one at random.

In a system whose conflict check depends on linking the *right* person, that is a real risk
of misidentification rather than a cosmetic annoyance.

So the Parties primary field carries **date of birth** as well as name:

> `Josefina Almonte-Vidal (D.o.B. 08/19/1972)`

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
`Case Info` (renamed `Client On These RIAC Cases` on 11 August 2026) — which left `DoB`,
`A Number`, `Country`, `Address`, `Notes on Imm Status or History`,
`Immigration Docs Upload`, `EOIR Result` and `EOIR Results PDF` reachable only by opening
the Parties table directly.

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

## Linked cases: a self-link is NOT symmetric (11 August 2026)

`Linked Cases` (`fldTb4nPchAA61yAU`) on the case table links a case to other cases. **Airtable
made a second field alongside it** — `Linked Cases (from the other side)`
(`fldb1poJCuo4CaFhH`) — and the two are opposite ends of one relationship, not two
relationships.

**Tested, because it decides the whole design.** Linking case 6022 to 6043 from 6022's side
put 6043 in 6022's `Linked Cases` and put 6022 in **6043's second field**. 6043's own
`Linked Cases` box stayed **empty**.

Two consequences, and the first is the dangerous one:

- **Reading one box gives a silently incomplete answer.** A case that somebody linked *to*
  shows an empty `Linked Cases` and reads as unlinked. Anywhere the interface displays linked
  cases must display **both** fields.
- **Anything that computes over linked cases must OR across both.** The automation
  `4. Add a case note to all linked cases` does exactly that, which is why it does not matter
  which side of a pair somebody linked from. If either field is renamed or rebuilt, that OR
  is the thing to re-check.

The API cannot delete the second field, and cannot make the pair symmetric. Whether Airtable
will let the field be its own inverse from inside the designer is **untested** — worth two
minutes before accepting the two-box layout, because if it works the second field disappears
and everything collapses to one.

**A mirroring automation was considered and not built.** It would make linking A to B write B
into A's box too, giving one box — but *unlinking* would not mirror back, so removing a link
from one side would leave it in place on the other, silently. That is the drift pattern that
killed the old `Status` field, and it is the reason the note-tagging automation stamps once
rather than mirroring.

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

### The "Add a Related Party" popup, as built (11 August 2026)

It hangs off the **Related Parties** element on Case Viewer → State Case Info. The element's
`+ Add record` button is what opens it, and that only works because
**User actions → "Add records through a form" is ON**. Left off — which is how it was found —
the same button opens a link/unlink picker instead, which is the wrong thing and a dangerous
one; see below.

`Name` on Case Parties is a formula reading `{Party Full Name} — {Role}`, so a row names
itself and the blank-row problem that affected Case Charges cannot recur here — **provided
both parts are filled**, which is why both are required.

The popup collects exactly three things:

| Box on the popup | Field | Settings that matter |
|---|---|---|
| Party | `Party` | Link to Parties. **Required.** Searchable by name *and* date of birth since the primary-field fix |
| What Is The Person's Role On This Case? | `Role` | **Required.** Client, Witness, Victim, Co-Defendant, Complainant, Other, Referred Out - Client |
| Notes | `Notes` | Optional |

**Deliberately NOT on the form**, and each for its own reason:

- **`Case`** — it fills itself from the case the popup was opened on, exactly as the case
  link does on the Add a Charge popup. It was briefly on the form as "Add Any Additional
  Case This Person Is Linked To", which reads like a convenience and is not one: `Case` is a
  **single** link, so adding a second case does not add, it **replaces** — silently moving
  the person off the case in front of you. And even if it allowed two, one row cannot say
  that someone is a co-defendant on 6022 and a witness on 6043. **One row = one person + one
  case + one role.** To put the same person on another case, open that case and add them
  there, where their role there can also be recorded.
- **`Legacy Case No.`** — holds real values on the three imported rows and should never be
  set on a new one.
- **`Fake Entry?`** — a pilot artefact for the test-data sweep, not something a user
  filling this in should see.

**"Selection: All clients" is correct — do not narrow it.** Airtable calls records in the
Parties table "clients" throughout this panel (it is also why the button reads
`+ Add client` rather than `+ Add party`, which appears to be unchangeable, like
`+ Add case`). It has nothing to do with the `Client` role: verified 11 Aug 2026, the
tooltip's "53 clients in Parties" is exactly the record count of the whole table, witnesses
and co-defendants included. The option to avoid is **"Specific clients"**, which restricts
the picker to a hand-picked subset.

**Inline creation of a new person could not be found**, and the field's Rules panel offers
only Visibility, Selection, Default value, Required field, Limit selection and Validation —
no create-records toggle. Judged **not worth chasing**: a person created from a popup gets a
name and nothing else, and the only three people on file without a date of birth are the
three legacy rows. The conflict check matches on date of birth regardless of name, so every
DoB-less person blunts it. Adding the person on the Parties page first, with a date of birth,
then linking them here, is the better habit anyway.

**`Role` includes "Client" even though the client is not held in this table.** That option
is for legacy imported rows, which carry a `Legacy Case No.` instead of a `Case` link. Do
not use it on new rows.

**`Domestically Related To Client`** (`fldY82Q9M7P7ogJ6d`) was added on 11 Aug as a separate
checkbox rather than a `Role` option. `Role` is a single select and its options are
*procedural*; a domestic relationship is a different kind of fact that sits alongside them.
A complainant who is the client's ex-partner is both, and folding it into `Role` would force
whoever records it to discard one. What the relationship actually is goes in `Notes`.

**The API cannot build any of this.** `create_page` supports only visualization and dashboard
pages, not forms — so the popup, the button and the list beneath it are all hand work in
the interface designer.

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

⚠️ **The same routine diagnostic becomes a disclosure the day real data arrives.** On
13 August 2026, checking that two new formulas were computing meant reading four case records
into the chat - client name, county and category. Harmless now, because everything in the base
is fake test data. **After go-live that exact command discloses client information into a
transcript**, and it is the most ordinary thing in the world to run.

So once real data is in: read **schema** freely, but check formulas against **counts, blanks
and filtered views** rather than by pulling records. Where a record genuinely has to be
inspected, do it in the Airtable UI rather than through a chat.

Worth separating from the reporting design, which has never been at risk here: what the funder
receives is a table of **counts only**, so there is nothing in it to redact. The exposure is in
how the base gets *worked on*, not in what gets *sent*.

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
Replaced by four fields:

| Field | Type | Purpose |
|---|---|---|
| `Type Of Office` (`fldVztD8WLlMBM8cG`) | Single select | **Asked first, and routes the other three.** What KIND of requester this is. Added 12 Aug 2026 — see below. |
| `Attorney's Office` | Link to Agencies | The picker. Shown only to the two defender options. Empty means not found. |
| `Office Not Listed?` | Checkbox | Makes "not found" an **answer** rather than a blank. Without it, an empty office could equally mean the question was skipped. Shown only to the two defender options. |
| `Office Not Listed - Details` | Long text | The office or firm name in words. Does double duty — see below. |

**"Not Listed" is deliberately NOT an agency record.** Adding one would put a fake office
into the Agencies table, where it would surface in county rollups, agency reports and every
future picker — and an intake nobody got round to fixing would sit permanently linked to a
non-existent office with nothing flagging it. An empty link plus a ticked checkbox says the
same thing without polluting the data.

The review queue is then a filter: **checkbox ticked, link still empty.**

### What the Agencies table means, and what follows from it (12 Aug 2026)

All 124 original records are **mandated providers** — county public defenders, conflict
defenders, assigned counsel plans, and the institutional providers (Brooklyn Defender
Services, The Bronx Defenders, The Legal Aid Society, Hiscock, Appellate Advocates). The
table also carries `Name of Chief Defender`, `Chief Defender Email Address` and a county
link, which only make sense for that kind of office.

So **Agencies means "an office RIAC serves"**, and that decides the three groups of
requester who periodically turn up outside the county system:

- **Federal defenders and CJA panel attorneys are mandated providers too** — appointed
  counsel, same species. They belong in the table. **Ten records added 12 Aug 2026**: five
  `Federal Defender - …` and five `Federal CJA Panel - …`, each covering NDNY, SDNY, EDNY,
  WDNY and an `Other Than New York` catch-all. Their county link is deliberately blank —
  federal districts are not counties, and a case takes its county and RIAC region from **the
  court**, not the agency, so nothing depends on it.

  **A CJA panel attorney is privately practising but appointed**, which is exactly why they
  belong here: the line this table draws is *appointed vs privately retained*, not *office vs
  solo*. The panel records stand for a district's panel rather than an office, so the
  individual attorney is recorded on the intake rather than inferred from the link.

  **The ten together make federal coverage complete**, which is why the intake form
  deliberately shows federal requesters no "office not listed" route — the list cannot fail
  them. The accepted cost is that whoever picks a catch-all does not record which district
  they are in.

  ⚠️ **Unverified:** SDNY and EDNY are believed to be served by a single organisation
  (Federal Defenders of New York, Inc.). They are listed separately anyway because an
  attorney thinks and searches by district. Noted on the records themselves.

- **Names use a plain hyphen, not an em dash.** All 134 records were normalised on
  12 Aug 2026 (`Albany County - Public Defender`), changing 120 of them. Match that when
  adding.
- **Non-profit immigration organisations and privately retained attorneys are NOT** — and
  must never be added to Agencies. Thirty different private firms would collapse onto one
  fake "office" that then appears in county rollups and agency reports as if it were real,
  and the actual firm name would be lost. Same reasoning as "Not Listed".

### Why a *type* question and not just a longer picker

The three groups above are not a "my office is missing" problem. `Office Not Listed?` asks
*is our list incomplete*, and ticking it instructs the reviewer to go find or create the
agency — which for a private firm is an **error**, not a task. Their office is not missing;
it was never going to be there.

So the real question is **what kind of requester is this**, asked once, at the top:

> **Which best describes your office?**
> NY public defender, legal aid, conflict defender or assigned counsel · Federal defender ·
> Non-profit legal organization · Privately retained attorney or law firm ·
> None of these / not sure

Everything below it then behaves. **The routing separates three different jobs, and that
separation is the whole design** (settled 12 Aug 2026, after a first version that ran them
together):

| `Type Of Office` | Picker | Can request an addition to the list | Free-text name | Message |
|---|---|---|---|---|
| NY Public Defender / Institutional Provider | ✓ | ✓ | when ticked | |
| Assigned Counsel / 18(b) | ✓ | ✓ | when ticked | |
| Federal Defender / CJA Panel Attorney | ✓ | — | — | |
| Non-Profit Legal Organization | — | — | ✓ | |
| Privately Retained Attorney or Law Firm | — | — | — | ✓ |
| None of These | — | — | ✓ | |

**Asking to be added to the published list is not the same as typing your name.** The first
is a request that only a New York mandated provider can meaningfully make, and it puts work
in someone's queue. The second is just a fact being recorded. Federal needs neither, because
the ten federal records cannot fail them.

⚠️ **`Attorney's Office` must not be required on the form.** Required, an attorney whose
office is genuinely missing could not submit at all — which defeats `Office Not Listed?`
entirely.

### Telling one group something: it takes a field, not a text block

`Privately Retained - Firm Details` (`fldPcIGORdr3knstT`) exists to carry a message, not to
collect data. **A form view cannot show a block of text conditionally**, because labels and
help text belong to a *field* rather than to a branch — so saying something to one group
requires a field only that group sees. That is the whole reason this field exists, and the
pattern to reuse next time the same need arises.

**It cannot stop them submitting.** A form view has no conditional block on submission and no
conditional redirect, so a privately retained attorney can read the message and send a
complete intake anyway, RAP sheet and client details included. The message reduces wasted
effort; it does not prevent it. The backstop is `Type Of Office` making the referral decision
visible the moment the intake lands.

**A gate that actually works belongs on the website** — on `intake.html`, the page that links
to the form, before anyone reaches it.

**Putting "My office is not listed" into the picker itself was rejected**, and the reason
generalises: the burying problem comes from **length, not from being a list**. Entry 125 of
a searchable dropdown is unreachable — nobody scrolls, and nobody thinks to *search for the
absence* of something. Five options shown at once are read in two seconds.

**The referral decision is the other half of the payoff.** RIAC assists federal defenders
and non-profits but generally refers privately retained attorneys out to private crim-imm
counsel. Making that a recorded answer rather than an inference from a blank means the queue
shows it at a glance, nobody starts work on a case that is going to be referred out, and it
can be counted.

Two consequences still open, both by hand: `Review Status` offers only **New / Under Review
/ Accepted - Case Created / Rejected**, and "Rejected" is a harsh word for "referred out" —
a **Referred Out** option may be wanted. And a privately retained attorney completing the
whole form uploads a RAP sheet and full client details for a case RIAC will not take, which
puts someone else's confidential client data in the base for no reason; the cheap fix is
help text on that branch saying they need not complete the rest.

### Two traps

- **Do not convert the old text field to a link.** Airtable matches existing values against
  the target table and **creates new records for whatever does not match** — the three test
  submissions alone would mint agencies called "Test Submission Two - Genesee PD (test)".
  The API cannot delete them. Create a new link field instead, which is what was done.
- **Inline record creation on the form's link field must stay impossible**, or attorneys will
  invent agencies from the public form — precisely what the picker exists to prevent.

  **Tested on the LIVE form, 12 Aug 2026: it already is.** The form editor offers no setting
  for it, and typing an unknown office name on the shared form produces no way to create one.
  Earlier notes here said to go and switch a toggle off; there is no such toggle to find, and
  looking for one wasted a step. **Why** it is impossible is not established — most likely
  Airtable has withdrawn inline creation from form views, but that is inference, not fact.

  ⚠️ **Do not treat this as settled forever.** It is behaviour we have observed, not a
  setting we control, so it can come back — and the "new forms" migration in TODO item 30 is
  the obvious moment for it to change. Re-test with a nonsense office name after any change
  to how the form is built. Note that the same is NOT true of the Parties picker, where
  creation is blocked for a structural reason: its primary field is a formula, and nothing
  can be typed into one.

## Case Type — five options, multi-select, in two places

Widened from a single select on **12 August 2026**, and extended from three options to five.

| Option | Meaning |
|---|---|
| Criminal Case | A **live** state proceeding |
| Non-Criminal Case | A live family, matrimonial or other non-criminal proceeding |
| Appeal | A live appeal |
| Post Conviction Relief / Post-Disposition | **There is no live state case.** It has concluded, and the question is what it did to the client and what can be undone |
| Assistance With Removal Defense / USCIS | What RIAC is being **asked to do**, rather than what the case is |

**Multi-select, because a case is genuinely more than one of these at once** — criminal and on
appeal, say. A single select made people pick the least wrong option and put the truth in a
notes box.

The last two options typically arrive from **outside the mandated-provider pipeline** —
affirmative immigration practitioners and removal defence attorneys coming to RIAC after a
state case has ended. `Type Of Office` on the intake says which, and therefore whether RIAC
assists (non-profit) or refers out (privately retained).

### DECIDED 12 Aug 2026 — the two "outside" options are never ticked together

Where RIAC helps with removal defence **by** pursuing post-conviction relief, that is logged
as **two separate cases, then linked** (`Linked Cases`, item 28) — not one case ticked twice.

That is what makes the multi-select safe. The standing objection to multi-selects is that
they wreck counting: a case in two buckets is counted twice and "how many post-conviction
matters did we do" stops having an answer. Dan's rule removes the case where that would
happen, so the objection does not arise here. **It is a working rule, not something the
base enforces** — nothing stops someone ticking both.

### Two fields, kept in step by hand

`Case Type` exists **separately** on **Pending Intakes** (`fldjirYRp7Dc5zH6v`) and on **State
Case Info & RIAC Progress** (`fldi4vK65fm5FnOlb`), with different option IDs. Nothing copies
between them — an intake is turned into a case by hand — so **an option added to one must be
added to the other**, or it cannot be carried across when the case is created. Both currently
hold identical names and colours.

**Nothing in the base reads this field**: no formula references it and no automation triggers
on it, checked 12 Aug 2026. That is why the conversion was safe. **Interface filters are the
exception** — the API cannot see filter settings, so a filter written as *"Case Type is
Criminal"* needs re-checking as *"has any of"* after the widening.

## The court decides the county, not the office (12 August 2026)

The intake form used to ask for **County** as its own question and for the court as free text.
Both changed on 12 August: `Court` (`fldNjwAvSSJ1FyX0b`) is now a link to the **Courts** table,
and county came off the form entirely.

**The reason is not just brevity — deriving county from the agency would have been wrong.** An
attorney at the Albany County Public Defender can perfectly well have a case in Rensselaer. The
county that matters is where the case is *heard*, which is exactly the rule the case table
already follows. Courts carries `County` and `RIAC Area (from County)`, so both now arrive on
the intake as lookups — `County (from Court)` and `RIAC Area (from Court)` — and the attorney
answers one question instead of two.

Free text was also actively bad: a test submission arrived with `Court Name` reading
**"Fake Court"**, which matches nothing and routes nowhere.

**No inline-creation trap here**, unlike Agencies: the Courts primary field is a **formula**, so
a court cannot be created from the picker at all. Same structural block as the Parties picker.

**The fallback costs both lookups.** `Court Not Listed / Non-NY Court?` plus
`Court Not Listed - Details` handle an out-of-state or missing court — but an intake that goes
that way arrives with **no county and no RIAC area**, so somebody must set the county by hand
before it can be routed. Dan reports the Courts list is currently complete and changes perhaps
once every year or two, so this should be rare.

## Dates of birth: the picker defaults to today, and that gets submitted

`Date Of Birth Check` (`fld2iF5qXgC6wLJ6g`) is a formula that is blank on any plausible date
and otherwise says what is wrong — a date in the future, an age under 5, or an age over 110.

It exists because a test submission on 12 August arrived carrying **2 August 2026** as a date
of birth. The form's date picker opens on the current month and steps month by month, so
accepting today's date is the path of least resistance. **The picker cannot be removed from a
form view**; the box accepts typing, and the help text should say so, but some junk will get
through regardless.

That matters more than it looks: the conflict check matches on **date of birth as well as
surname**, so a junk date silently weakens the check, and it then travels onto the client's own
record. The under-5 threshold is deliberately crude — RIAC does see genuinely young clients,
SIJS cases among them — so this catches nonsense rather than second-guessing the attorney. It
is a flag, not a block.

## Two accounts of the allegations, deliberately

`Charges & Case Description` on Pending Intakes was renamed on 12 August 2026 to
**`Attorney's Summary of Misconduct Allegations`** (`fldplCTuEEDye3KMc`). It had no description
and was doing two jobs at once.

- **It is the facts, not the citations.** Charges become structured `Case Charges` records once
  the case exists, carrying their statutory text, classification and jury-instruction links. A
  citation typed into this box connects to nothing.
- **It pairs with `RIAC Summary Of Allegations`** on the case table: what we were told, and what
  we made of it.

**Dan's wording, and the instruction that matters — "at their worst":**

> Please summarize allegations against your client stated at their worst — i.e. NOT just what
> can be proven — e.g. "Client alleged to have slapped complainant, his girlfriend. She is
> alleged to have sustained a nose bleed and minor bruising".

That is not carelessness about the evidence, it is the immigration analysis working backwards:
the consequence turns on what the record of conviction *could* be made to support, so the
worst-case reading is the one that has to be assessed. An attorney who summarises defensively —
only what the prosecution can prove — hides the very facts RIAC needs. Both this field and
`RIAC Summary Of Allegations` want the same details: value of any loss, age of any complainant,
weapon or controlled substance, relationship between the parties, and anything touching intent.

## Conflict referrals: the county is a default, not a rule

`RIAC Area (from Court)` derives the center from the county. That is right almost always and
wrong in exactly the cases that matter most, because **a RIAC can accept a case outside its own
region when another center has a conflict.** Two situations, both real (Dan, 12 August 2026):

1. **The attorney already knows.** Their default RIAC has declined as a conflict and named the
   center to use instead. Rare.
2. **A RIAC paralegal enters a case their own center accepted.** Expected to be the common one.

Note what situation 2 depends on: **the paralegal uses the public form like anybody else**,
because the form is the only route that runs the conflict check. Entering the case any other way
would skip it silently — and a conflict-referred case is the last one you would want unchecked.

### Built 12 August 2026

| Field | |
|---|---|
| `Conflict Referral?` (`fldG2H1eYXswsOiC4`) | Checkbox — reveals the two below |
| `RIAC Requested` (`fldOk6aUmYq44J4jw`) | Single select, the six center names |
| `Conflict Referral - Details` (`fldxu8KfszBikoBIj`) | Which center declined it, and why |
| **`RIAC (Routing)`** (`fldNcByMdwfhLLFPW`) | **The one field to read.** Override if set, else the county's center, else a warning |

**The override beats the geography deliberately** — a conflict referral is a decision a human
has already taken, and the county is only ever a default. `RIAC Area (from Court)` stays visible
alongside it so you can see what the geographic answer *would* have been.

### ⚠️ What the six-database split does to this (Dan, 13 August 2026)

**`RIAC Requested` stops being the routing decision, and a blank stops being a problem.**

These fields were designed when all six centers shared one database, so the field genuinely
*was* where the case would go — and a ticked box with no center named silently fell back to the
county, sending the case straight back to the center that had just conflicted out of it. That
was worth guarding against, and the guard was to make the question required.

**Under six databases, each center has its own intake form and the website decides who receives
a submission before the attorney fills anything in.** So the question the field answers changes:

| | |
|---|---|
| **A center named** | *"I have been told specifically this should go to Region X"* |
| **Blank** | *"I know it is a conflict, and I am content with wherever you refer it"* |

**So it must NOT be a required question on the form.** Requiring it would force attorneys to
invent a destination nobody has given them, and turn a meaningful blank into a guess.

`RIAC (Routing)` keeps its job, but the job is different: it stops being *"who gets this"* and
becomes *"does this actually belong here, or should it be referred on?"* — still worth having,
because it is what catches a case sitting with the wrong center, but it is a check on the
routing rather than the routing itself.

**This is a good example of a design that was correct and quietly stopped being correct.**
Nothing about the fields changed; the architecture underneath them did.

**`Conflict Referral - Details` is the point of the whole thing.** A Buffalo case sitting with
the Syracuse center is either a considered referral or a mistake, and nothing else on the record
distinguishes them. Six months on, nobody remembers.

⚠️ **`RIAC Requested` is a single select, not a link to RIACs — and that is a compromise.** The
RIACs table's primary field is the **number** (1–6), and a link picker displays the primary
field, so a link would offer an attorney "1, 2, 3" with no names. The six names are therefore
written in two places, and renaming a center means renaming it twice. Accepted only because
center names change essentially never.

**The case side needs nothing.** `State Case Info & RIAC Progress` links to RIACs directly and
can be set to any center, so it already supports conflict cases. It was only the *intake* that
derived the answer with no way to say otherwise.

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

So the public form must ask for **first and last name in separate boxes**. Two of the three
oldest intake submissions have both name boxes empty — the `Client Name` formula renders as
a single space — which is what raised the question.

**Answered 12 Aug 2026 by a live test submission.** "Daniel" and "Jackson" arrived in
`Client First Name` and `Client Last Name` separately. The form asks properly.

### An empty result is NOT the same as an unchecked one — the header proves it ran

Worth knowing, because it softens the silent-failure problem recorded above. The automation
writes its heading — *"Possible matches - same surname, or same date of birth:"* — **whether
or not it finds anything**. So on any intake:

| `Possible Conflict Matches` | Means |
|---|---|
| Heading, then names | Checked, and here is who to look at |
| **Heading, nothing after it** | **Checked, found nobody** |
| Completely empty | **The check never ran** — this intake did not come through the form |

That last row is the dangerous one and it is now visibly distinguishable, which it was not
thought to be. Verified on the 12 Aug test: surname "Jackson", no Jackson anywhere in
Parties, and the field came back with the heading and nothing under it.

⚠️ **That test did not prove the matching arm still finds people** — only that the automation
fires and writes. Proving the other half needs a submission whose surname is actually on
file; **Smith** works, because Steven Smith is in Parties.

## Who RIAC acts for, and why it changes what "conflict" means

**RIAC serves the mandated attorney, not the defendant.** There is no direct
attorney-client relationship with the person named on the case. Dan confirmed this on
13 August 2026 and it belongs here because it shapes everything below: a "conflict" in this
base is not the ordinary one-client-against-another test. It is about **RIAC's own
knowledge** - having already advised one attorney on a matter, and being asked to advise a
different attorney whose client's interests may run against the first.

That is why the conflict check searches **people**, not clients, and why `Parties` holds
everyone RIAC has ever recorded in any capacity.

## Five conflict scenarios, and how the base answers them (13 August 2026)

Dan put five real situations to the base. They are recorded here in full because the
answers are not obvious from any single field, and four of the five turn on one idea:

> **`Parties` + `Case Parties` IS the conflict memory.** The check reads it. Anything a
> center learns and does not write there is invisible to every future intake.

### (A) A center enters a case from another region's county, because that region conflicted out

**Covered.** The `Conflict Referral?` / `RIAC Requested` / `Conflict Referral - Details`
trio on Pending Intakes, built 12 Aug 2026. `RIAC (Routing)` then follows the requested
center rather than the county. See "Conflict referrals" above.

The paralegal uses the public form like anybody else - that is the only route that runs the
conflict check.

### (B) The co-defendant is already a client of the same center

**Covered, but only if somebody wrote the co-defendant down.**

The check matches the incoming client's **surname or date of birth** against `Parties`. Two
co-defendants are two different people with two different surnames, so **nothing about the
shared case connects them automatically.** What connects them is that when the first case
was opened, the co-defendant was added as a `Case Parties` row with role Co-Defendant -
which puts them in `Parties`. Their own intake then matches on their own name, and the
check's output includes `Other Roles On RIAC Cases`, which says in terms: *this person is a
co-defendant on case 6022*.

⚠️ **So the safeguard is a data-entry habit, not a mechanism.** A center that opens a case
and never records the co-defendant has silently disabled the check for that person. Nothing
prompts it and nothing reports it missing.

**Matching on docket number was considered and not built.** It is the obvious way to tie two
people to one case without anyone recording anything, but docket numbers arrive as free text
from attorneys in formats that vary case to case, so it would miss often and match wrongly
sometimes. The habit is more reliable; it just has to be taught.

### (C) A center knows a referral is coming and wants to flag it as a conflict in advance

**Now covered - built 13 Aug 2026.** There was nowhere to put this. A person could be added
to `Parties`, but nothing on the record said *"when this one arrives, it is a conflict"*.

| Field on `Parties` | |
|---|---|
| `Conflict Alert?` (`fldc3Lyc9mNXq1dQn`) | Checkbox |
| `Conflict Alert - Details` (`fldYwPCSVQmUfJzG1`) | Which center is conflicted, why, where it should go |

The full move is: add the person to `Parties`, add them to the **existing** case as a
`Case Parties` row with the right role, then tick and explain.

⚠️ **It does not surface automatically yet.** The conflict-check automation renders a fixed
list of fields onto the intake and this pair is not in it, so ticking the box does not put a
warning on the incoming intake. Adding it is an outstanding job in `AIRTABLE-TODO.md`.

**An earlier version of this section said pre-creating the case was wrong. That was wrong,
and Dan was right to push back.** See "Cases that never had an intake" below - creating a
case by hand is not a workaround, it is how every case in this base is made.

### (D) Person X turns out to be the former partner of person Y, who is or was a client

**Covered, through `Case Parties` rather than through `Parties`.** Add X to Y's case as a
Case Parties row - role Complainant, Witness or Other as fits - tick
`Domestically Related To Client`, and put what the relationship actually is in `Notes`. X is
then in `Parties`, so if X ever arrives as a client the check finds her and shows the case
she is attached to.

**There is deliberately no person-to-person link on `Parties`.** A self-link would be the
tidy-looking answer and it is a trap already documented in this file under "Linked cases: a
self-link is NOT symmetric" - Airtable creates a second field for the other end, and reading
one box gives a silently incomplete answer. Relationships therefore hang off the case, where
they also carry the context that makes them mean something.

**The gap that remains:** if X has no connection to any case at all, there is nowhere to
record her. Judged rare - the reason a center learns about someone is almost always a case.

### (E) Splitting the base six ways - DECIDED 13 August 2026: strict silos

**Dan's answer, in his words:** each database strictly siloed, *"especially not being able to
run conflict checks against another center's clients"*. The only things shared are public
reference data - defender offices (not individual attorney details), and the NY Penal Law and
VTL sections.

That settles a question this file had framed as an agonising trade-off. It is worth recording
that **the trade-off was overstated here**, because it changes how easy the decision is:

> An earlier draft of this section warned that six silos would break the check that "would
> have caught every one of (A) to (D)". **That was wrong.** Scenarios (B), (C) and (D) are all
> **within one center** - the co-defendant, the anticipated referral and the former partner are
> all things one center learns about its own caseload. Only (A) crosses centers, and (A) is
> already handled by a human being sending an email, not by the database.

**So strict silos cost very little of what was actually being asked for.** What is genuinely
given up is the case nobody raised: a person who appeared in Region 5 two years ago quietly
surfacing in Region 1. Dan has decided that cross-center visibility is not wanted, and there
are good professional-responsibility reasons why one center's client information should not be
searchable by another.

#### What this means in practice

**Six separate bases - not one base with clever permissions.** Interface-only access restricts
what a *user* sees, but the data still sits together and anyone with base or workspace
admin rights can reach all of it. "Strictly siloed" means separate bases.

| | |
|---|---|
| **Conflict check** | Stays exactly as built, but each center only ever searches its own `Parties`. The cross-region disclosure problem disappears entirely. |
| **`RIAC (Routing)`** | Still earns its place - it tells a center *"this one belongs to another region, refer it out"*. It no longer routes inside a shared queue. |
| **Conflict referral fields** | Still right, now on the **receiving** center's base. A referral between centers becomes a re-entry by hand, because the two bases cannot see each other. |
| **This pilot base** | Becomes one center's base, or the template the other five are copied from. |

#### The real cost, and it is not small

**Everything gets built six times, and every future change has to be made six times.** Tables,
fields, automations, interfaces, the offence catalogues and their loader scripts. This base has
spent a fortnight learning things the hard way; multiplying that by six is the dominant risk of
the whole plan, and it is a *maintenance* risk rather than a build risk - it never ends.

**The mitigation is Airtable Sync.** One reference base holds the genuinely shared, public
tables - Courts, Counties, RIACs, Agencies, NY Penal Law, NY VTL, IDP Chart Entry, Email
Templates - and syncs them one-way and read-only into each of the six. Linked-record fields
work against a synced table, so the `Court` link and the charge picker carry on unchanged.
That is exactly the split Dan described: public reference shared, client data never.

⚠️ **Sync is a paid-plan feature and has not been checked against the plan RIAC is on.** That
check comes before any of this is designed in detail.

#### Still open

- **Statewide reporting.** Six bases means no single place to count cases across all centers.
  If RIAC ever has to report aggregate numbers, that needs designing - most likely a summary
  synced *back* from each center carrying counts and no client detail. **Nobody has said this
  is required; it is flagged because finding out late would be expensive.**
- **Which base is the template**, and how a change made in one is carried to the other five.

## Cases that never had an intake (13 August 2026)

**This corrects a claim made earlier in this file.** It said, of pre-creating a case, that
*"pre-logging a person is right; pre-creating their case is not"*, on the reasoning that the
case tables have no form so every case must arrive through intake.

**That reasoning does not hold.** There is no automation that creates cases. **Every case in
this base is made by hand** - the Needs Review page *pushes* an intake into a case, and a human
does the pushing. Creating a case without an intake is therefore not a workaround; it is the
ordinary mechanism used without an intake in front of you.

The only true cost is narrow and worth stating exactly: **the conflict check runs on intake
submission, so a case with no intake behind it never had one run.** Which matters differently
in the two cases below - and in neither is it a reason not to do it.

### Two different no-intake cases, which behave nothing alike

`Case Origin` (`fldWA9t94mcTny5Us`) on the case table records which is which.

**1. Opened from attorney enquiry - details to follow.** The vague email: *"I have a client who
says he is a green card holder, charged with murder, what is a safe plea?"* Nothing usable, but
RIAC wants a case to hang the reply on and something to chase. Attorney name, everything else
unknown. **This is a live case and should be chased like any other.** The missing conflict
check is deferred, not skipped - there is no name to check yet, and one can be run when the
details arrive.

**2. Conflict record - RIAC does not act on this case.** Built from what was learned on a case
the center *does* act on, usually about a co-defendant. Dan's reasoning, which is the right
one: the conflict check only says whether a person is known to us, and **it takes an attorney's
review to decide whether the relationship is a conflict needing referral or withdrawal.** That
review needs facts, and the facts come from the case we are not conflicted out of.
⚠️ **Nobody is represented here and no attorney should ever be contacted about it.**

### A conflict record closes itself - Dan's fix, 13 August 2026

An earlier version of this section said the safeguard was "the label being visible, not a rule
preventing it", and flagged that setting a conflict record to *Intake Sent / Awaiting Contact*
would put it on the chase list and email an attorney about a case RIAC is not on.

**Dan's answer was to stamp the closing code instead, and it turns that habit into a rule.**
Automation **`5. Conflict record closes itself`** (`wflw0tWN8KVbCvgDL`) fires when `Case Origin`
becomes *Conflict record*, and sets `Closing Code` = **Conflicted Out** and `RIAC Next Steps` =
**Closed**.

**Checked against the formulas before building, and all three hold:**

| | |
|---|---|
| `Reminder Stage` | Returns blank if `NOT({Closing Code} = "")` - **any** closing code drops the case off the chaser ladder *whatever the status says* |
| `Dormant Case Flag` | Requires `{Closing Code} = ""`, so the dormancy route excludes it too |
| `Closed Case Banner` | Fires on any closing code - the case carries a visible **"⚠ THIS CASE IS CLOSED — Conflicted Out"** |

So the exposure is closed at the formula level, not by anyone remembering. Setting the status
to Closed as well is what stops the banner appending its *"(status still reads: ...)"*
inconsistency note - the banner checks for exactly that mismatch.

**No word-matching formula was edited**, which was the thing worth avoiding. The fix works
entirely through a value the formulas already test for.

**`Date Closed` is deliberately left blank.** The case never opened, and the banner omits the
date cleanly when it is empty. The closing code alone does all the excluding.

**Accepted imprecision, Dan's call:** *Conflicted Out* is also the code for cases genuinely
referred to another center, so the two are not distinguished. If the referral later arrives,
the record makes the situation obvious and it can be referred then - at which point the label
becomes literally accurate. It never misleads anyone into doing something wrong in the interim.

## Checked against a real ILS annual report (13 August 2026)

RIAC-2's completed **2025 Annual Report** was read field by field against the base. It is the
authoritative statement of what the funder asks for, and it is worth keeping that in mind: the
eight questions below are the actual reporting obligation, not a guess at one.

**One clean pass:** the base's counties for Region 2 match ILS's list **exactly** — all 16,
Broome through Tompkins, none missing and none extra.

### What the report asks, and whether the base can answer it

| ILS question | Status |
|---|---|
| **1.** Total consultations offered | ⚠️ Definition missing, not data |
| **2.** Requests by county | ⚠️ Works, but silently drops cases with no court |
| **3.** Out-of-region requests: county, number, **reasons** | ❌ Reasons not held on the case |
| **4.** Requests by county **by type** | ❌ No Family Court category; Total column ambiguous |
| **5.** Out-of-region requests by type | ❌ Inherits 3 and 4 |
| **6.** Requests by county **by provider type** | ❌ Was unanswerable — field now built, empty |
| **7.** Meetings with providers: name, date, topic | ❌ Nothing records these |
| **8.** Trainings: topics, attendees, collaborators | ⚠️ Two columns were missing, now added |

### The gaps in detail

**Q1 — "consultations" is undefined.** The base counts *cases*. Whether a consultation is a
case, an advisal, or every contact is a question only RIAC can answer, and every other number
on the form has to reconcile with it.

**Q2 — county comes from the court, so a case with no court has no county.** That is fine for
criminal and family matters and wrong for the rest: an immigration-related or USCIS matter may
have no NY court at all, and a case opened from a vague attorney enquiry has nothing yet.
Those cases **vanish from every county count without appearing anywhere as missing**, so the
county totals will quietly fail to reconcile with Q1.

**Q3 — the reason an out-of-region case was accepted is not on the case.** The
`Conflict Referral - Details` box built on 12 August lives on the **Pending Intake**, and the
link from case back to intake was deliberately removed. So at reporting time the reason is not
where the report is written from. ILS asks for it in terms, giving "a conflict of interest at
another Center" as its own example.

**Q4 — two separate problems.**
- **"Non-Criminal Case" is not "Family Court".** Ours covers family, matrimonial *and other*
  non-criminal work; ILS wants Family Court specifically. A non-criminal case that is not
  family court has no honest column.
- **`Case Type` is a multi-select and ILS's table has a Total column.** A case ticked both
  Criminal and Appeal — expressly allowed, and expected — appears in two columns, so the
  columns will not sum to the number of requests. **Whether ILS's Total means requests or
  ticks has to be settled before a number is sent.** The 12 August rule only stops the two
  *outside* options being ticked together; it does not touch this.

**Q6 — this was the largest gap.** Nothing in the base could break requests down by provider
type. The type was only ever implicit in the agency's **name**, and the names are not
consistent enough to read it off: *Assigned Counsel Office*, *Assigned Counsel Plan* and
*18-b Assigned Counsel Program* all appear, and *Attica Legal Aid Bureau, Inc.* carries no
word a rule could key on. `Provider Type` (`fldBTrHMPXKWuMfqH`) has been added to Agencies with
ILS's own categories — **empty on all 134 records until they are classified.**

> The intake's `Type Of Office` does **not** substitute for it. That question deliberately
> merges public defender, legal aid, conflict defender and assigned counsel into one option,
> because its job is routing the form. Provider type is a fact about the office, so it belongs
> on the office — classified once, rather than restated by every attorney on every intake.

**Q7 — provider meetings are not recorded anywhere.** `Trainings & Presentations` covers
trainings; ILS asks separately for meetings with providers, by name, date and topic. The
shapes are close enough that one table can hold both, which needs a **"Provider meeting"**
option adding to `Training Type`. ⚠️ **The API cannot add a choice to an existing select** —
`update_field` accepts only name, description and formula — so that is hand-work.

**Q8 — `Topics Covered` and `Collaborators` were missing and are now added.** Both are named
columns on the form. They had been folded into `Notes` on the reasoning that the funder wanted
counts only, which the actual form disproves. `Audience Type`, added the same day on a guess,
turns out to answer ILS's "groups served" directly.

## The ILS report: answers and what was built (13 August 2026)

Dan settled the four open definitions, and the fields below follow from them.

### The definitions

| | |
|---|---|
| **A "consultation"** | **A RIAC case existing.** RIAC opens a case for anything it gives substantive legal advice on, even one with every field blank, so cases and consultations are the same population |
| **ILS's Total column** | **Requests, not ticks.** A case marked criminal *and* appeal counts as **one appeal case** |
| **"Family Court"** | ILS's name for what this base calls **Non-Criminal** — family court, and supreme court matrimonial, spousal support and custody. Anything else falls into ILS's own catch-all, "Immigration-related or other matter" |
| **Trainings vs meetings** | One table. Dan added a *Provider meeting* option and renamed the field **`Training / Meeting Type`** |

**One consequence Dan's definition carries that is easy to miss: conflict records must be
excluded.** A conflict record is a case RIAC expressly does *not* act on, so counting it as a
consultation would inflate every figure on the form. `ILS Report Category` excludes them in its
first branch.

### `ILS Report Category` (`fldTihyUK4BKDQcH6`)

Reduces the multi-select `Case Type` to exactly one of ILS's five columns, so the per-county
rows add up. Order, most specific first: **Post-conviction → Appeals → Family Court → Criminal
defense → Immigration-related or other.**

⚠️ **Only one step of that order is confirmed.** Dan's rule was that appeal beats criminal. The
rest is a sensible-looking assumption — in particular whether post-conviction should beat
appeal, and what a case marked both criminal *and* non-criminal should report as. **Confirm
before the first return is filed.**

### `County (Reporting)` (`fldpreoJWQUz60lxg`) — the answer to the missing-county problem

Dan asked whether to default the value to something like "court not selected yet". Close, but
county is a *lookup through the court*, and a lookup cannot be given a default. The same
result comes from the shape already used by `RIAC (Routing)`:

1. The **court's county** whenever a court is linked — always preferred, cannot be mistyped
2. Otherwise **`County (No Court On File)`** (`fld2dCt7RLzZl6N1M`), a hand-filled link, marked
   in the output so you can see it was entered by hand
3. Otherwise **"⚠ NO COUNTY - will not appear in the ILS county totals"**

**The warning is the point.** Before this, a case with no court simply had no county and
vanished from every breakdown with nothing marking it missing, so Q2 could never be reconciled
against Q1. Now those cases are *countable*: filter on the warning text and that is the list to
fix.

### `Out-Of-Region Reason` (`fldOhd5K7Q2ymCcW0`)

ILS Q3 asks for out-of-region requests **and the reasons**. `Conflict Referral - Details` records
that at intake, but the report is written from the **cases**, and the link from case back to
intake was deliberately removed — so the reason was not where the person filling in the form
would be looking. Copy it across when creating the case from the intake.

### `Provider Type` on Agencies — 121 of 134 classified

Applied from the names where the name settles it: **44 Public Defender, 45 Assigned Counsel /
18-B, 11 Conflict Defender, 11 Legal Aid, 10 Federal Defender / CJA Panel.**

**13 were left deliberately blank**, because a wrong value that looks decided is worse than an
obvious gap. They fall into three groups:

- **Two roles in one name** — *Ontario County - Conflict Defender & Assigned Counsel Plan*, and
  *Sullivan County - Conflict Legal Aid, Inc.* A single select cannot hold both.
- **The name says nothing a rule can use** — *Chemung County - Public Advocate*, *Erie County -
  Aid to Indigent Prisoners Society, Inc.*, and *Albany County - Alternate Public Defender*
  (alternate defenders do conflict work, so "Public Defender" would be misleading).
- **The NYC institutional providers**, which do not map onto ILS's county-shaped categories at
  all: *The Bronx Defenders*, *Brooklyn Defender Services*, *New York County Defender
  Services*, *Neighborhood Defender Service of Harlem*, *Center for Family Representation*.

**A seventh option, `Appellate / Assigned`, was added by Dan on 13 August 2026.** It went to the
three appellate institutional providers — *Appellate Advocates*, *Center for Appellate
Litigation*, *Office of the Appellate Defender* — and then to the two **Appellate Division**
assigned-counsel plans, First and Second Department, which had been classified as
`Assigned Counsel / 18-B` before the category existed.

✅ **All 134 records are now classified**, Dan having filled the remaining ten by hand the same
day. Verified by filtering for an empty `Provider Type`: zero rows.

**On it not being one of ILS's five categories — Dan's position, 13 Aug 2026:** the database
will be approved by ILS before going live, and a finer breakdown is the kind of thing a funder
adopts rather than rejects. So the extra category is not a problem to be mapped away; if ILS
keeps its five, `Appellate / Assigned` rolls into *Assigned Counsel* when the form is filled.

Adding a select option is safe and additive; nothing reads this field yet. Two things follow
from it, though:

- ✅ **The two Appellate Division plans were moved into it** on Dan's instruction — *Assigned
  Counsel Plan - Appellate Division, First Department* and *... Second Department*.

**A note on how it was added:** the Airtable API cannot add a choice to an existing select
through `update_field`, but writing a new value with `typecast: true` creates the option as a
side effect. That is a useful escape hatch and also a hazard — it means a typo in a write can
silently invent a select option. Use it deliberately, never as a default.

### ⚠️ New fields do not appear in a view that already hides fields

Worth knowing, because it cost a round of confusion on 13 August. The case table's Grid view has
**46 hidden fields**, and a field created through the API lands in that view **hidden**. So
`ILS Report Category`, `County (Reporting)`, `County (No Court On File)` and
`Out-Of-Region Reason` all existed and were computing correctly while being invisible.

To see them: open **State Case Info & RIAC Progress** → Grid view → click the **hidden fields**
button in the toolbar → search the field name → switch it on.

**"I cannot find the field" is therefore not evidence it was not created.** Check by filtering
or by the hidden-fields panel before assuming a build failed.

### Reporting cases sent OUT for conflict

Confirmed possible, and worth writing down because two things now share one closing code.

`Closing Code` = **Conflicted Out** is set in two quite different situations:

1. A case this center took in and then referred to another center — **this is the one ILS-style
   reporting would count**
2. A conflict record, where automation `5. Conflict record closes itself` stamps the same code
   on a case RIAC never acted on

**`Case Origin` is what separates them.** The count of cases genuinely referred out is:

> `Closing Code` has *Conflicted Out* **AND** `Case Origin` is **not** *Conflict record - RIAC
> does not act on this case*

Without that second condition the number would be inflated by every conflict record ever
created. Dan accepted the shared label on 13 August knowing the two were not distinguished;
this is the case where it would have mattered, and `Case Origin` rescues it.

The case table also carries a **`Referred Out To`** field, which is undocumented and empty on
the pilot data — worth checking before building any report, since it may already be the right
home for the destination center.

⚠️ **A field was created on the wrong table first.** `Provider Type` initially landed on
**Attorneys & Requestors** because that table's ID was used by mistake. It has been renamed
**`ZZ DELETE ME - created in error`** and needs deleting by hand — Claude cannot delete fields.
It is empty and nothing reads it. It should not be filled in either way: provider type belongs
to an *office*, and a copy on the person would be a second version of the same fact.

### Training materials and sharing between centers

`Materials` (`fldBAWNf9NcsX8r5E`) holds the deck and handouts. `Share With Other RIACs?`
(`fldBrsHVV5o8ZwuFS`) records whether they may be shared.

⚠️ **Ticking the box does not share anything yet** — the repository it feeds does not exist. It
is built now because the decision is cheapest at the moment the event is logged and nearly
impossible to reconstruct later.

**On confidentiality, Dan is clear and it is his call to make:** RIAC trainings never contain
client confidential information, so there is no review step and none is wanted. The unticked
default stays only because sharing should be a positive choice, not because the contents are
suspected.

## Trainings & Presentations (13 August 2026)

`Trainings & Presentations` (`tblIe2KxbV3cr4M2c`) logs every training RIAC delivers, for the
annual return to the funder. Roughly **20 events a year**. The funder asks for two things:
what was given, and how many attended.

| Field | |
|---|---|
| `Event` | Primary. Short recognisable name |
| `Date` | What every count is grouped by |
| `Training Type` | CLE (attorneys), CJE (judges), Magistrates' meeting, Other presentation |
| `Audience Type` | A countable category - PD office, bar association, judges, magistrates, non-profit, other |
| `Audience / Host` | Free text: who it was for, and who organised it if different |
| `Attendees` | Whole numbers |
| `Geographic Scope` | Single county / Regional / Statewide |
| `County` | **Optional** link to Counties |
| `Notes` | Everything else |

### Why it is not linked to Agencies

Dan's reasoning, and it holds. The audience for an event is frequently **not one entity** - a
CLE at a public defender's office draws attorneys from outside it. The **host and the audience
are often different bodies**, a county bar association organising an event for a PD office's
staff, and the two are not co-extensive, so one link could not represent both. And many
audiences are **not in this base at all**: non-profits, community groups, ad-hoc gatherings.

**The deciding point is the third one, and it is stronger than the volume argument.** Because
free text is needed for those audiences regardless, a link could only ever be populated for
some rows - and **a partially-populated link is worse than no link, because any count drawn
from it looks complete and is not.** That is the same failure this file already records for
`Linked Cases`, where reading one side of a relationship gives a silently partial answer.

At ~20 events a year a person can read the whole list in a minute, and the funder asks for no
analysis beyond counts.

### The two additions Dan did not ask for, and why

- **`Audience Type`.** Free text cannot be grouped, so *"how many trainings went to public
  defender offices rather than bar associations?"* would mean reading every row. Nobody has
  asked that. It is here because the answer costs nothing at the time and cannot be
  reconstructed reliably a year later.
- **`Geographic Scope`.** County is optional by design, because regional and statewide events
  have no single county. But that leaves a blank County ambiguous - not applicable, or never
  filled in? This separates the two. **Set it before County.**

**The link to Counties creates a matching field on the Counties table** listing trainings held
there. Normal Airtable behaviour for a link; nothing depends on it.

**Under the six-base split this table is per-center**, like the case data - each center reports
its own trainings.

## Statewide reporting: counts only, and the model already holds them (13 August 2026)

**Dan's requirement, in his words:** the RIACs are only ever asked to report *numbers* - e.g.
by county, how many written advisals, how many email advisals. Ideal is that ILS sees those
numbers in real time **without accidentally creating a back door to client information**;
acceptable is that each center generates them and sends them.

**The good news: no new fields are needed.** `Closing Code` already carries *Email Advisal
Sent* and *Written Advisal Sent*, and county arrives on the case through the `Court` link. The
report ILS wants is a count of cases grouped by **county × closing code** over a period, which
is answerable from the data as it stands today.

### The shape that gives ILS live numbers without a back door

A **Monthly Return** table in each center's base - one row per period × county × advisal type,
carrying a **count and nothing else** - written by a scheduled automation. Only that table is
synced out, into a reporting base ILS can see.

**The safety property is structural, not permissions-based**, which is what makes it worth
doing this way: the reporting base *physically contains only counts*. There is no client data
in it to expose, so a misconfigured share cannot leak one. Filtering an interface would rely on
the filter being right for ever; this does not.

⚠️ **It is near-real-time, not live, and that is deliberate.** The numbers are as fresh as the
automation's schedule - nightly, say. Genuinely live figures would mean syncing the case table
itself, which is precisely the back door Dan wants to avoid. **Fresh enough is the trade that
buys the isolation.**

**Fallback (Dan's option c) needs nothing built:** a grouped view exported per center. Worth
keeping in mind as the answer if Sync turns out not to be available.

⚠️ **One definition to settle before counting anything.** `Closing Code` is a *multi-select*, so
one case can carry both *Email Advisal Sent* and *Written Advisal Sent*. Counting by type will
then count that case twice. That is probably right if ILS is counting **advisals**, and wrong
if it is counting **cases** - and nobody has yet said which.



**`RIAC Case No.` copes with an empty client**, which is what makes a stub case workable: it is
the autonumber plus 5999, with the client and attorney parts each wrapped in their own `IF`. A
case with no client still numbers itself and still reads sensibly in a list.

## One route in, whatever route it arrived by (13 August 2026)

**The PDF intake forms cannot be retired**, and Dan's reasons are requirements rather than
preferences:

1. Some attorneys **handwrite them and post them in**.
2. Some complete them **at a jail with no cell service**, where a fillable PDF works and a web
   form cannot.

**His resolution, and it closes the gap completely:** leave the attorney's options open, and
make the **center's** route single. However an intake reaches a center — online, posted,
emailed — **the center only ever enters a new case through the Airtable intake form.** A paper
intake is therefore keyed in, and the conflict check runs on it like any other.

That works because it puts the constraint on the people RIAC controls rather than on the
attorneys it does not.

### The two fields that make it checkable rather than merely stated

| Field | |
|---|---|
| `Conflict Check Status` (`fldeaLAlIN42h7ATv`) | Formula. Reads **⚠ NEVER CONFLICT-CHECKED** when `Possible Conflict Matches` is completely empty |
| `How This Intake Arrived` (`fldhSKwa5tzk1kgzG`) | Online by the attorney / keyed from paper / keyed from an emailed PDF / keyed from a call or enquiry |

`Conflict Check Status` works because the automation writes its heading **whether or not it
finds anyone**, so a completely empty box means one thing only: the automation never ran. Put
it on Needs Review, or keep a view filtered to the warning — anything appearing there was made
by hand or by the API and needs re-entering through the form.

⚠️ **The oldest pilot intakes will flag.** Several pre-date the automation. That is the field
working.

**`How This Intake Arrived` is a staff field, not a form question** — an attorney submitting
online should never see it. Without it the paper route is invisible and nobody can say how much
re-keying the centers are actually doing. Worth counting once a year: if most intakes turn out
to be re-keyed, that argues for effort on the paper-to-form step; if almost none are, it argues
for leaving it alone.

**Interface-only access would make this structural.** Staff with no route to the Data tab
cannot create an intake by hand at all, so the six-base plan turns Dan's working rule into a
mechanism. Until then, `Conflict Check Status` is the check.

### `intake.html`, rebuilt the same day

The page now leads with **Submit a new case online**, linking to the Airtable form, and keeps
the two fillable PDFs below it under *"If you cannot submit online"* — with a prompt to
download before setting off somewhere without a connection.

⚠️ **Do not replace that link with a form hosted on nyriac.com.** The conflict check is bound to
the Airtable form by internal ID and silently stops running on anything else. There is a comment
saying so in the page's source, at the link.

**After the six-base split this becomes six links, one per region** — and it must stay possible
to pick a region *directly* rather than only by county, because an attorney conflicted out of
their own center needs to reach a different one.

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
