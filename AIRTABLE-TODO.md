# Airtable — the outstanding list

Everything still to do on the RIAC case management base, in one place. The reasoning behind
the design lives in `AIRTABLE.md`; this file is the doing.

**Base:** RIAC CMS Pilot (`appwoHVXRp4vgfJB9`) · **Interface:** the one containing Case Viewer

## How to use this file

Ask a new chat *"what's on my Airtable to-do list?"* and it will read this. Then pick one or
two items to work on in that session — most of these are big enough to want a chat of their
own.

Every item is tagged with who can actually do it:

| Tag | Meaning |
|---|---|
| **[Claude]** | Can be done through the API — tables, fields, formulas, automations, new interface pages |
| **[Dan]** | Must be done by hand in Airtable. The API **cannot** change a field's type, delete a field, edit an existing page's layout, edit a form's field list, or create a button field |
| **[Both]** | Claude builds the data side, Dan wires it into the interface |
| **[Decide]** | Needs a decision before any work starts |

> **Before doing interface work:** layouts have **no version history**, and publishing pushes
> *every* page's pending draft live at once. Change one thing, look at it, then move on.

Delete items as they are done. When the list is empty, delete the file.

---

# Dan's list, 9 August 2026

Recorded in Dan's own numbering so they can be referred to by number. Claude's notes under
each are first assessments, not decisions — nothing here has been designed or built yet.

## 1. Linked cases, and notes that apply to all of them  **[Claude]**

A way to mark cases as linked to one another, so that when writing a case note there is an
option to **"add this note to all linked cases"** — alongside the existing ability to tick
individual cases by hand.

*Notes.* Two pieces. The link itself is a self-link on the case table (a case linking to
other cases), which is straightforward. The "apply to all linked cases" option cannot be a
formula, because **a formula cannot write into a link field** — it needs an automation that
fires when a note is created with a checkbox ticked and copies the case's linked cases into
`Also Relates To`. That is a stamp-once-at-creation automation, not a mirror, so it does not
repeat the drift problem that killed the old `Status` field — but it does mean a note written
before two cases were linked will not retrospectively appear on the new one. Worth deciding
whether that matters.

## 2. The Related Parties popup  **[Dan]**, spec ready

Same item as the one already on the list, stated more fully:

- **(a)** A button opening a popup that either **searches people already known to RIAC** or
  **creates a new person**, and in both cases records how they relate to this case —
  witness, complainant, co-defendant and so on.
- **(b)** A **continually displayed list** of everyone linked to the case.

*Notes.* The data side is finished and has been for a while — `Case Parties` is a junction
table, `Name` builds itself, and the Parties picker is searchable by name and date of birth.
The full specification is in `AIRTABLE.md` under "Spec for the Add Related Party popup".
What is left is purely designer work, because **the API cannot build forms or popups**.
Two things to get right: make `Party` a **required** field (a row with no person reads
" — Witness"), and **leave inline record creation ON** here — that is the opposite of the
public intake form, where it must be off. Expect the button's own label to be unchangeable,
as with "+ Add case".

## 3. Immigration document details  **[Both]**

Where RIAC holds a green card, visa, foreign passport, I-94 or employment authorization
document — **or simply the information from one, without the document itself** — there should
be fields to record it, displayed in the client info.

*Notes.* One decision comes first: a person can hold several of these, and can hold the same
type more than once over time, so this is probably **its own table linked to Parties**
(one row per document) rather than a block of fields on the person. A flat set of fields is
simpler to build but cannot hold two visas. Note also that the information matters even with
no document attached, so the document upload must be optional rather than the anchor.

## 4. Two-step delete for case notes  **[Decide]**

Click delete → "are you sure?" → yes/no.

*Notes.* Needs checking against what Airtable actually offers — interface record deletion may
already prompt, in which case this is done. If it does not, Airtable has no way to insert a
custom confirmation step, and the realistic substitute is a **`Marked for deletion` checkbox**
plus a review view where deletions are actually carried out. That is a different shape from
what was asked for, so it is worth looking at the real behaviour before building anything.

## 5. Two-step change of which case a note belongs to  **[Decide]**

Same protection when moving a note from one case to another.

*Notes.* Same investigation as item 4 — worth doing the two together. Note that
**automation 2 only attaches notes that have no case**, so re-pointing a note by hand is not
something the automations will fight or undo.

## 6. EOIR printout visible on the case  **[Both]**

The EOIR lookup printout, where one exists, should be visible in Case Viewer → client info.

*Notes.* Straightforward. `EOIR Results PDF` is an attachment field on Parties; a lookup
through `Client Code` brings it onto the case, the same way `EOIR Result` and
`EOIR Last Checked` already arrive. Claude creates the lookup; Dan adds it to the layout.
It will be **read-only on the case** — like every other client field — which is correct.

## 7. Prior criminal history  **[Decide]** then **[Claude]**

Recorded on the **person** in Parties, because criminal history travels with the person, not
the case. For each entry:

- **(a)** Where the information came from — usually a fingerprint RAP sheet generated on a
  given date — **linked to the uploaded RAP sheet**, so the original can always be clicked
  through to.
- **(b)** The **incident/commission date and the arrest date**, flagged where they differ,
  because immigration cares about both.
- **(c)** All charges.
- **(d)** All pleas and dispositions, with the date each happened.
- **(e)** The sentencing date and the sentence, allowing for **resentencing** — violations of
  probation and the like.

*Notes.* The largest item on the list, and the one most worth designing carefully before
building. It is not one table but probably three: a **source** (this RAP sheet, generated on
this date), the **incidents** it evidences, and the **charges and their dispositions over
time** — because "all pleas or dispositions" and "resentencing" both mean a charge's outcome
changes more than once, which a single row cannot hold.

**One conflict to resolve first:** `RAP Sheet Upload` currently sits on the **case**, but the
criminal history it evidences belongs to the **person**. Linking history to a RAP sheet held
on a case would tie a fact about the person to one particular matter. Either the RAP sheet
moves to Parties, or the history record links to the case the sheet arrived on and accepts
that. This is exactly the "which office" question the base already resolved once, and the
answer there was to record the fact where it is actually true.

## 8. Generate a written advisal in Word  **[Decide]**

A button that produces a Word document containing all the case and client information in a
standard format, which the RIAC attorney then adds the immigration analysis to. More advanced
generation can come later.

*Notes.* Be aware before starting: **Airtable cannot produce a .docx file on its own.** Its
built-in Page Designer makes PDFs, not Word, and PDFs cannot be typed into afterwards — which
defeats the purpose here. The realistic routes are a **third-party document add-on** (several
exist that fill a Word template from Airtable; most are paid), or **generating the document
outside Airtable** from exported case data. That second route fits how advisories are already
worked on — they live in OneDrive and are edited in local sessions, per `CLAUDE.md`. Worth a
conversation about which before any building.

## 9. The charge popup  **[Dan]**

Clicking a recorded charge in the Case Viewer should open a popup showing:

- **(a)** The calculated offence title, exactly as it now reads — no changes
- **(b)** The excerpted statutory text
- **(c)** Links to NY Senate and CJI, preferably as **two buttons**
- **(d)** Number of counts, and whether it is the top charge
- **(e)** Notes on issues relevant for immigration purposes — this is the existing
  `Charge Notes` field; only its visible description on the popup needs to change
- **(f)** `Fake Entry?` — for now; to be removed at go-live

*Notes.* Every field already exists on Case Charges: `Charge`, `Statutory Text (from
catalogue)`, `NY Senate Link`, `CJI Link`, `Counts`, `Top Charge?`, `Charge Notes`,
`Fake Entry?`, plus the VTL equivalents for VTL charges. So this is layout work, not data
work. One catch: **a true button field cannot be created through the API** — if the Senate
and CJI links must be buttons rather than clickable URLs, Dan makes those by hand, the same
way `Look up on EOIR` was made.

## 10. Move the EOIR check onto the case, and delete the EOIR Checks page  **[Decide]**

Checks are done case by case by the paralegal, just before generating the draft initial
advisal — never in batches. So the same functionality should sit on the Case Viewer, and the
EOIR Checks interface should go.

*Notes.* **Read `AIRTABLE.md` → "EOIR checks" before touching this.** Two things constrain it:

- **The EOIR fields cannot be made editable on the case.** They arrive there as lookups
  through `Client Code`, and no interface setting can make a lookup editable. The existing
  route is clicking the client chip, which opens the client's record where the fields *are*
  editable and already carry the "MAKE SURE TO UPDATE THIS WHEN CHECKING" warning. So this may
  be less "build something new" and more "make that existing route obvious from the case".
- **Deleting the EOIR Checks page removes the backstop.** Its purpose is catching people with
  an A-Number nobody has looked up. If checks are always done at a fixed point in the workflow
  that may genuinely be unnecessary — but it is a deliberate safety net, and `EOIR Check
  Status` was built to feed it. Decide knowingly rather than as a tidy-up.

## 11. The Court field cannot be changed on the case  **[Dan]**

On Case Viewer → State Case Info, `Court` is not editable and there is no obvious way to make
it so.

*Notes.* Almost certainly the same trap already recorded in `AIRTABLE.md`: **adding a field to
a record page is only half the job — if inline editing is off, the field displays but cannot
be changed.** That is what was wrong with the client detail page in August. Check the field's
own setting in the designer first. This matters more than it looks: the case inherits its
county and RIAC region *through the court*, so a case with the wrong court has the wrong
region and cannot be corrected.

## 12. A crime viewer  **[Claude]**

A page for viewing everything held about a single offence in one place — a search, then a
display of the information.

*Notes.* Feasible, and mostly Claude's: **the API can create new interface pages** (it cannot
edit existing ones). The Penal Law catalogue is 1,918 rows and now searchable by citation,
offence name and class, so the search half is largely solved. Worth deciding what belongs on
it — statutory text, classification, attempt class, the Senate and CJI links, sentencing, and
possibly the IDP chart entry, though note the standing rule that **IDP content must only ever
be readable in the context of an IDP record**.

## 13. Is "Find a Case" superfluous?  **[Decide]**

Nothing seems achievable there that the Case Viewer cannot do.

*Notes.* Probably right, with one caveat worth checking before deleting: Find a Case is a
**grid** — every case as sortable, filterable rows — whereas Case Viewer is a list with one
record open at a time. The grid is better for "show me everything at once" and for spotting
gaps across cases. If item 14 gives filtered Case Viewer variants, the case for keeping it
weakens considerably.

## 14. Several Case Viewer pages with different pre-set filters  **[Dan]**

Structurally identical pages the user would not notice were different, each pre-filtered —
e.g. **Version 1**: only cases ready for advisal by the current user, oldest first;
**Version 2**: all cases.

*Notes.* Yes, this works, and it is the standard answer to the "buttons cannot change filters"
limitation. Two costs to accept going in:

- **Every future layout change must be made on every copy, by hand.** Two pages means doing it
  twice, forever. That is the real price, and it argues for keeping the number small.
- The pages will appear separately in the interface's navigation, so they need names that make
  sense to whoever is clicking — "My cases ready for advisal" and "All cases" read better than
  "Case Viewer 1" and "Case Viewer 2", even if the layouts are identical.

"Ready for advisal by the user" is already available: filter on `Readiness (calc)` and
`RIAC Atty`.

---

# Already recorded, still outstanding

## 15. Finish the intake form  **[Dan]**

The three new fields exist but nothing can reach them, so the form is still collecting the
*old* free-text office. Short, and blocking nothing else — but the form is live-facing.

**The form is called "Attorney Intake Form", and it is the only form in the base.** Find it in
the **Data** tab → **Pending Intakes** table → the **view list down the left**, below "Grid
view". It does **not** appear in the Forms tab in the top navigation — see `AIRTABLE.md` on
why the two listings do not match.

⚠️ **Never delete this form.** The conflict check is bound to it by internal ID; delete it and
every intake stops being conflict-checked.

- [ ] Add **`Attorney's Office`** to the form
- [ ] On that field, **turn OFF the option allowing submitters to create new records**
      (usually "Allow linking to new records"). Left on, attorneys will invent agencies from a
      public form — the exact thing the picker exists to prevent
- [ ] Add **`Office Not Listed?`** (checkbox)
- [ ] Add **`Office Not Listed - Details`**, shown **only when `Office Not Listed?` is ticked**
- [ ] **Remove the old `Affiliation`** field from the form (do not delete the field yet — it
      still holds three test submissions)
- [ ] Submit one test intake and check **Possible Conflict Matches** fills in. That confirms
      the conflict check still fires

## 16. Delete the superseded fields  **[Dan]**

The API cannot delete fields. Each of these is safe — every case now carries its own office.

- [ ] **`Affiliation`** on **Attorneys & Requestors**. This also removes the matching
      `Attorneys & Requestors` column from Agencies — the other end of the same link, unused
- [ ] **`Affiliation`** on **Pending Intakes**, *after* the three test submissions are cleared.
      **NEVER convert this field to a linked record.** Airtable would create a new agency for
      every value it cannot match — including "Test Submission Two - Genesee PD (test)" — and
      the API cannot delete them
- [ ] `CrimeTime` on **NY VTL Offenses** — dead field; CrimeTime covers Penal Law only

## 17. Check the attorney popup  **[Dan]**

Already built; worth confirming it covers Attorney First Name, Attorney Last Name, Email
Address, Cell Phone, Notes About Requestor — and that **`Affiliation` is gone from it** once
item 16 is done.

## 18. Make the Case Viewer read-only where it should be  **[Dan]**

Work started on 7 August and never finished. Still editable on the published page: RIAC Next
Steps, RIAC Atty, Request Date, Case Type, Next Important Date, Case Docket No, Case Flags,
Closing Code, and all four upload fields. Decide which of those *should* be editable — some
plainly should — and lock the rest.

## 19. Cosmetic — test data realism  **[Dan]**, optional

Three cases carry two attorneys from two different offices, which does not happen in real
life. The data is correct as recorded; this only matters if the test data should look
realistic: 6017 Josefina Almonte-Vidal · 6024 Bekim Gjonbalaj · 6041 Leonel Ayestas.

---

# Before this goes live

Do not start these until testing is finished. Several have no undo.

- [ ] **Delete all test data.** Filter on **`Fake Entry?`** and clear it in: Parties, State
      Case Info & RIAC Progress, Case Parties, Attorneys & Requestors, Case Charges
- [ ] Delete the three test intakes in Pending Intakes
- [ ] **Add a `Fake Entry?` filter to the EOIR Checks page** — if that page still exists after
      item 10. It was deliberately left off so the page had something to show during testing;
      leave it off and the page lists test people for ever
- [ ] **Reset Espoir Mukendi's EOIR fields** if he survives the test-data clear-out — his
      result was set on 8 August 2026 to prove the automation works, not because anyone looked
      him up
- [ ] **Remove `Fake Entry?` from the charge popup** — item 9(f) puts it there deliberately
      for the pilot only
- [ ] Review who can see the base, the interfaces, and any shared links
- [ ] **Switch the reminder emails to Outlook.** They currently send from Airtable's own mail
      server; the "Send the chaser" step needs swapping to the Microsoft Outlook send action so
      mail comes from the real RIAC address
- [ ] **Link nyriac.com to the Airtable intake form.** Link to it — do not build a form on the
      website that posts into Airtable, or the conflict check silently stops running on every
      intake
- [ ] From then on, treat everything in the base as confidential — see `AIRTABLE.md`

The website has its own outstanding list — contact details to verify, advisory PDFs, DNS
setup — in `CLAUDE.md`, separately.
