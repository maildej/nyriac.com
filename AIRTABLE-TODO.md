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
repeat the drift problem that killed the old `Status` field.

**DECIDED, 9 Aug 2026 — it only ever works forwards, and the interface says so.** A note
written before two cases were linked will not retrospectively appear on the newly linked
case. Rather than engineer around that, the linking control carries a notice in Dan's words:

> REMINDER: this only associates future case notes to all linked cases. If you want any prior
> case notes to appear on all linked cases, please review and link them manually.

Note what that is: an **interface label**, the same device as the "(MAKE SURE TO UPDATE THIS
WHEN CHECKING)" caption on `EOIR Result`. It therefore appears only where it is placed, not
everywhere the field is shown — so put it where the linking actually happens.

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

## 4. Two-step delete for case notes  **[Decide]** — half answered, half blocked

Click delete → "are you sure?" → yes/no.

**ANSWERED, 11 Aug 2026 — the confirmation half comes free.** A **Delete record** button in
an interface always prompts, and Airtable will not let you switch the prompt off: the
"Require confirmation" toggle is forced on and greyed out. Dialog text is editable
("Are you sure?" / "This will delete the record." / "Yes, delete"). Deleted records also go
to the base trash. So no custom dialog needs building — for anything that can host a delete
button at all.

⚠️ **BLOCKED, 11 Aug 2026 — a case note cannot host one, and the failure is dangerous.**
Adding a Delete button to the **Case Note** record page binds it to the wrong record:
its **Record source** comes up locked to **Case Detail**, and Airtable auto-labels the button
**"Delete case"**. Pressed, it would delete the whole case — notes, charges and all. The
source cannot be repointed. The button was added, spotted and removed the same day; nothing
was published.

**The rule this leaves behind, for every delete button anywhere in this base: check the
Record source before trusting it.** It does not reliably default to the record whose page you
are on, and the failure is silent and catastrophic. Two pages were checked the same day —
**Case Charges Detail** and **Case Party** both bind correctly to themselves, and the tell is
visible in the panel: correct pages read "Delete record", the dangerous one read "Delete case".

- [ ] **[Decide]** So notes still cannot be deleted from the interface. Three automations
      create notes automatically, so wrong ones will accumulate. The likely route is a delete
      button on a **notes list element** rather than on the note's own popup — untested, and
      it wants proving with a disposable record before it goes anywhere near real use.

## 5. Two-step change of which case a note belongs to  **[Claude]**, once designed

Same protection when moving a note from one case to another.

*Notes.* **Unlike item 4, there is nothing built in here and there never will be.** Re-pointing
a note is not a destructive action in Airtable's eyes — it is an ordinary edit to a
linked-record field, no different from changing any other value, and Airtable has no concept of
confirming a field edit anywhere in the product. So item 4 may come free; this one will not.

The workable shape is **two deliberate edits**: a staging field (`Move to case:`) plus a
`Confirm move` tick, with an automation doing the actual move and clearing both afterwards.

⚠️ **The obvious implementation is unsafe. Do not clear the case link as step one.**
Automation **2. Attach Case Note to its case** fires on any note that has a case number in its
subject line **and no case attached** — so a note left momentarily unlinked would be
re-attached to the case named in its subject, automatically, in the gap between the two steps.
That hits precisely the notes most likely to need re-filing: the ones created from email, which
are the reason the Needs Review queue exists at all.

**The link must therefore never be empty mid-move.** The staging field is not merely tidier
than clear-then-reset; it is the only safe shape. An automation that writes the new case and
removes the old one in a single update is safe for the same reason.

*(An earlier draft of this note said the automations would not fight a hand re-pointing. That
is only true while the link stays populated — clearing it first does trigger automation 2.)*

## 6. EOIR printout visible on the case  **[Both]**

The EOIR lookup printout, where one exists, should be visible in Case Viewer → client info.

*Notes.* Straightforward. `EOIR Results PDF` is an attachment field on Parties; a lookup
through `Client Code` brings it onto the case, the same way `EOIR Result` and
`EOIR Last Checked` already arrive. Claude creates the lookup; Dan adds it to the layout.
It will be **read-only on the case** — like every other client field — which is correct.

## 7. Prior criminal history  **[Claude]**

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

**DECIDED, 9 Aug 2026 — the history and its source sit on the person, carrying a link to the
case the RAP sheet arrived on.** The criminal history travels with the human, so it is
recorded on Parties; the case link is recorded as **provenance** — *this is where we got it
from* — rather than as ownership. Both facts are then true at once, and a second case can
reuse the same history without copying it.

This is the "which office" question answered the same way as before: record the fact where it
is actually true, and keep the incidental context as context. It follows that
`RAP Sheet Upload` on the case is **not** the right anchor for the history — the source
record on Parties is. Whether the existing case-level upload field then moves, is duplicated,
or simply stays as the place attorneys drop the file is a small implementation choice to make
when building, not a further decision to take now.

## 8. Generate a written advisal in Word  **[Dan]** to look, then **[Decide]**

A button that produces a Word document containing all the case and client information in a
standard format, which the RIAC attorney then adds the immigration analysis to. More advanced
generation can come later.

**Dan's preference, 9 Aug 2026: keep it inside the database if at all possible.** Generating
outside Airtable is liveable but distinctly second best.

*Notes.* **Airtable cannot produce a .docx on its own.** Its built-in Page Designer makes
PDFs, and a PDF cannot be typed into afterwards — which defeats the whole point, since the
attorney has to add the immigration analysis to whatever comes out.

**Investigated 9 Aug 2026.** Two shapes of solution exist, and the difference between them
matters far more here than price:

| Route | Examples | The catch |
|---|---|---|
| **An Airtable extension**, running inside the base | *Word Document Auto-Fill* on the Airtable Marketplace | Requires a **Team plan or above** — extensions are not on the free plan |
| **An external document service**, driven by automation | Documentero, Plumsail, Make, TypeFlow | **Case data leaves Airtable** and is processed on someone else's servers |

**The privacy point decides this, not the price.** These documents will contain a named
client, their date of birth, their A-Number, their immigration status and their criminal
charges. Routing that through a third-party document service means a processor holding
confidential client data, which is a question for RIAC's own obligations, not a technical
choice — and `AIRTABLE.md` already records that everything becomes confidential the moment
real data goes in. **The extension route keeps the data inside Airtable and should be tried
first for that reason alone.**

**Likely already available:** extensions need Team or above, and this base holds 1,918 Penal
Law rows — well past the free plan's 1,000-record cap — so RIAC is almost certainly on a
qualifying plan already. Worth confirming in the billing settings before assuming, but it
suggests the extension route costs nothing extra.

**Next step when this is picked up:** open the Airtable Marketplace and look at
*Word Document Auto-Fill* directly. Claude cannot — `airtable.com` is blocked to it by the
network proxy, so the marketplace listing, its pricing and its privacy terms could not be
read. What is established is that it exists, fills a Word/Google Docs template from base data,
outputs `.docx`, and preserves the template's fonts, paragraphs, pagination and colours. What
is **not** established is who publishes it, what it costs, whether it processes anything
off-device, and how well it copes with the linked and lookup fields this base leans on
heavily — a case pulls its client details, charges and court through links, and a template
filler that only reads plain fields would be little use here. **Test it against a real case
before committing.**

Sources: [Word Document Auto-Fill](https://airtable.com/marketplace/blkxzMlA4V5bcZh2w/word-document-auto-fill) ·
[Documentero](https://documentero.com/integrations/app/airtable/) ·
[Plumsail](https://medium.com/plumsail/auto-generate-documents-from-airtable-in-zapier-b6d9f2b340f7) ·
[Make](https://www.make.com/en/integrations/airtable/docx-templater) ·
[plan requirements](https://www.softr.io/blog/airtable-pricing)

## 9. The charge popup  **[Dan]**

Clicking a recorded charge in the Case Viewer should open a popup showing:

- **(a)** The calculated offence title, exactly as it now reads — no changes
- **(b)** The excerpted statutory text
- **(c)** Links to NY Senate and CJI, preferably as **two buttons**
- **(d)** Number of counts, and whether it is the top charge
- [x] ~~**(e)** Notes on issues relevant for immigration purposes~~ — **done 11 Aug 2026.**
  The popup label now reads "Charge Notes - Include Statutory Text If Offense Not Listed In
  Catalogue", and the field itself was renamed **`Charge Notes and Statutory Text`** to match.
  Its description now spells out the split: catalogue offences carry their text on the linked
  Penal Law or VTL record, so text is pasted here **only** for out-of-state, federal or
  other-statute charges, which have no catalogue record to hold it. Pasting it for a linked
  offence creates a second copy that drifts
- **(f)** `Fake Entry?` — for now; to be removed at go-live

*Notes.* Every field already exists on Case Charges: `Charge`, `Statutory Text (from
catalogue)`, `NY Senate Link`, `CJI Link`, `Counts`, `Top Charge?`, `Charge Notes`,
`Fake Entry?`, plus the VTL equivalents for VTL charges. So this is layout work, not data
work. One catch: **a true button field cannot be created through the API** — if the Senate
and CJI links must be buttons rather than clickable URLs, Dan makes those by hand, the same
way `Look up on EOIR` was made.

**(c) covers two CJI links, not one.** Item 20 explains why both matter, plus the
`CJI Match` caption that says how good the match is. The lookups now exist on Case Charges
— `CJI Link`, `CJI Article Page` and `CJI Match` — so all three can be placed straight onto
the popup. `CJI Match` comes through as a coloured chip, not plain text.

## 10. Make the EOIR check reachable from the case  **[Dan]**

Checks are done case by case by the paralegal, just before generating the draft initial
advisal — never in batches. So the check should be reachable from the Case Viewer.

**DECIDED, 9 Aug 2026 — make the existing route obvious rather than build a new one.**

*Notes.* **Read `AIRTABLE.md` → "EOIR checks" before touching this.**

**The EOIR fields cannot be made editable on the case, and no amount of building changes
that.** They arrive there as lookups through `Client Code`, and Airtable does not allow typing
into a lookup at all. The editable fields — and the `Look up on EOIR` button, and the
"(MAKE SURE TO UPDATE THIS WHEN CHECKING)" caption — already exist on the client's own record,
which opens from the client chip. So the job is signposting: make it plain from the case that
the check happens one click away, through the client.

**Still open: whether the EOIR Checks page is then deleted.** Its purpose is catching people
with an A-Number nobody has ever looked up, and `EOIR Check Status` exists solely to feed it.
If the check genuinely always happens at a fixed point in the workflow the page is redundant —
but it is a deliberate safety net against the case where it does not, and the failure it
catches is silent (`⚠ Never checked` looks identical to "checked, nothing found" if nobody is
looking). Worth deciding separately, once the signposting is in and it is clear whether the
workflow really does catch everyone.

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

**Item 20 already specifies the jury-instruction half** — two CJI links and a match caption,
not one link. Read it before designing this page.

## 13. Is "Find a Case" superfluous?  **[Decide]**

Nothing seems achievable there that the Case Viewer cannot do.

*Notes.* Probably right, with one caveat worth checking before deleting: Find a Case is a
**grid** — every case as sortable, filterable rows — whereas Case Viewer is a list with one
record open at a time. The grid is better for "show me everything at once" and for spotting
gaps across cases.

**Do item 14 first and then look again.** Once an unfiltered "All cases" Case Viewer exists,
the only thing Find a Case still offers is the grid layout itself. If nobody misses it, delete
it then — the decision costs nothing to defer and gets easier with the answer in front of you.

## 14. Several Case Viewer pages with different pre-set filters  **[Dan]**

Structurally identical pages the user would not notice were different, each pre-filtered.

**DECIDED, 9 Aug 2026 — exactly two copies:**

1. **The user's own cases that are ready for review**, oldest first
2. **No filter** — every case

*Notes.* This works, and it is the standard answer to the "buttons cannot change filters"
limitation. Two costs, accepted going in:

- **Every future layout change must be made on both copies, by hand, forever.** That is the
  real price, and it is why the answer is two and not five.
- The pages appear separately in the interface navigation, so they need names that mean
  something to whoever is clicking — "My cases ready for advisal" and "All cases" read far
  better than "Case Viewer 1" and "Case Viewer 2", even though the layouts are identical.

Both filters already have fields to hang on: `Readiness (calc)` groups cases into ready / not
ready, and `RIAC Atty` is the assigned attorney. Airtable can filter a page to the **current
logged-in user**, which is what makes "the user's own cases" work without a page per person.

Note the overlap with item 13: if these two pages exist, "Find a Case" has very little left to
do.

---

# Already recorded, still outstanding

## 15. Finish the intake form  — **DONE 12 August 2026**

Kept as a marker because later items refer to it by number. The office picker, the six-way
`Type Of Office` routing, the "not listed" pair, and the privately-retained message field are
all built and on the live form, and **two test submissions proved both arms of the conflict
check** — a surname match (Steven Smith) and a date-of-birth match (Fatoumata Sissoko).
First and last name arrive in separate boxes, which was the question blocking it.

The reasoning is in `AIRTABLE.md` under "The intake form: office as a picker". Further intake
work is **item 31**.

## 16. Delete the superseded fields  **[Dan]**

The API cannot delete fields. Each of these is safe — every case now carries its own office.

- [ ] **`Affiliation`** on **Attorneys & Requestors**. This also removes the matching
      `Attorneys & Requestors` column from Agencies — the other end of the same link, unused
- [ ] **`Affiliation`** on **Pending Intakes**, *after* the three test submissions are cleared.
      **NEVER convert this field to a linked record.** Airtable would create a new agency for
      every value it cannot match — including "Test Submission Two - Genesee PD (test)" — and
      the API cannot delete them
- [ ] **`Court Name`** on **Pending Intakes** (`fldNWlXrLiFqxFJq0`). Superseded 12 Aug 2026 by
      the `Court` link. Free text, and a test submission proved the point by arriving as
      "Fake Court". Take it off the form first; delete once the test intakes are cleared.
      **Nothing is lost by going:** `Court Not Listed / Non-NY Court?` already catches the
      court that is genuinely not in the list, which is the only job free text was doing.
      Taken off the form 12 Aug 2026 and confirmed working - the picker offers county-qualified
      names ("Fishkill Town Court (Dutchess County)"), so the wrong county's court cannot be
      picked by accident. Still on the **Pending Intakes interface page**, which needs the
      same swap.
      ⚠️ **Claude cannot do the deletion.** The Airtable API can create and update fields but
      has no delete-field call, so this one is Dan's hands only: Data tab → click the field
      header → Delete field
- [ ] **`Case List Line`** on **State Case Info & RIAC Progress** (`fldvaVSnvTAmdmzBP`).
      Confirmed orphaned 11 Aug 2026: it returns only `"Attorney: …"`, and the Case Viewer
      list uses `Case List Title` as its Title and `Top Charge` as its second line, so this
      field is displayed nowhere. It was an earlier draft of the second line, superseded when
      the attorney moved into the title. **Do not confuse the two** — `Case List Title` is the
      live one and controls what the list reads
- [x] ~~`CrimeTime` on **NY VTL Offenses**~~ — done 10 Aug 2026

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

## 20. Show both jury-instruction links wherever a charge is displayed  **[Dan]**

Every Penal Law offence now carries **two** CJI links, and they do different jobs:

- [ ] Add **`CJI Link`** — the specific instruction document, a one-click read
- [ ] Add **`CJI Article Page`** — the court's page for the whole article, so the attorney
      can look around it or find something the direct link missed
- [ ] Add **`CJI Match`** as a small caption beside them. This matters: **"Same section
      only"** is a nearest-neighbour jump rather than a precise match, and **"No model jury
      instruction exists for this offense"** is the court confirming none is prepared —
      which is a useful answer, not a blank

Both link fields are deliberately blank for the six articles with no CJI page at all
(179, 185, 241, 242, 275, 280). The reasoning and the full breakdown are in `AIRTABLE.md`
under "Jury instruction links".

**The VTL has its own set** — `VTL CJI Link`, `VTL CJI Article Page`, `VTL CJI Match` —
so a VTL charge gets the same treatment. 30 of the 36 VTL offences have an instruction.

**All six are already on Case Charges as lookups**, so nothing needs building first —
this is placement work only. Both `CJI Match` fields arrive as coloured single-select
chips rather than plain text, so they read as captions without any styling effort.

**Overlaps two other items — do them together.** Item 9 puts the Senate and CJI links on the
charge popup, and item 12 builds the crime viewer; both are the places these links belong.
This item is the specification of *what* to show; those two are *where*.

---

## 21. Extend the VTL catalogue to every VTL crime  **[Claude]**, with one **[Dan]** check

**Inclusion rule, corrected 11 Aug 2026. "Crimes only" was wrong.** The rule is: every VTL
**crime**, plus anything involving **drugs or controlled substances**, and anything
**fraudulent or intentional** — whatever New York calls it.

The correction came from VTL **403-a**: "Falsifying any temporary indicia of registration …
shall be a **traffic infraction**." A falsification offence, and the immigration analysis
does not turn on the state-law crime/infraction label. Dan: *"we definitely need to include
it because it can have immigration consequences."* Bulk traffic infractions are still out —
speeding and equipment faults carry nothing — but the filter is immigration relevance, not
the New York grade.

Dan's specific interest is **fraud** — fraudulent number plate and registration certificate
offences. Those are crimes, so "crimes only" includes rather than excludes them. He will send
a specific list. **If any provision on that list turns out to be an infraction, include it
anyway** — the reason for wanting it is the fraud analysis, not the grade.

*What a sample of 15 sections established (10 Aug 2026), before building anything:*

- **Classification is derivable, but only at subdivision level.** VTL 375 is 114,000
  characters, mostly infractions, with particular subdivisions carrying misdemeanours. A
  section-level answer for it is meaningless. The statute scopes its own declarations —
  "a violation of **this subdivision** shall be a misdemeanor" — so they are attributable.
- **Require declaratory phrasing, never a bare mention.** Match "shall be a misdemeanor",
  "shall constitute", "shall be punishable as", "guilty of a class E felony". Not the word
  on its own.
- **⚠ The 1192 trap, and why the bare-mention rule is dangerous.** The words "misdemeanor or
  felony" appear in 1192 exactly twice, both in the passage about *out-of-state* prior
  convictions. Neither grades anything — 1192's grades are in 1193. A rule keying on bare
  mentions gets 1192 right **by accident**, and would silently file the most important
  offence in the catalogue as a traffic infraction if those two incidental sentences were
  ever reworded. Whatever is built must treat "no grade declared in-section" as a flag, not
  as a default to infraction.

### Progress, 10 Aug 2026 — first pass done

**54 candidate crime sections found**, out of 981 sections in the VTL. Files in the
Database Design folder:

| File | What it is |
|---|---|
| `fetch_vtl.py` | Pulls the whole VTL with text from the Senate API in one call. Needs `NYSENATE_API_KEY`. |
| `scan_vtl_crimes.py` | Finds every provision graded as a crime, locally or from another section. |
| `vtl-crimes-candidates-2026-08-10.csv` | The 54, with the grade and the sentence that proves it. |

**All of Dan's fraud interests came through**: 392 (false statements and altered records),
392-A (stolen, false or fraudulent plates and registrations), 403 (number plates), 421
(altered vehicle ID numbers), 426 (false statements, stolen vehicles), 429 (junk and
salvage), 2130 (offences relating to certificates of title).

The scan was regression-checked **both ways** — 17 known crimes must appear, and the
known false positives must not. Both held.

**Two bugs worth remembering, because both failed silently:**

- **The API escapes its line breaks** as literal `\n` characters, so `\s+` does not collapse
  them and any phrase straddling one is invisible. This hid reckless driving and about a
  third of the crimes. Written up in `AIRTABLE.md`.
- **Blunt exclusion windows cut both ways.** Checking 200 characters for negation dropped
  reckless driving; not checking at all pulled in every red-light-camera owner-liability
  section, which the statute expressly says are *not* crimes. Negation has to be adjacent to
  the grade; hypothetical wording ("would, if occurring in this state, constitute a
  misdemeanor") can be matched anywhere in the sentence.

### Subdivision decomposition, 10 Aug 2026 — done, with caveats

**114 criminal provisions across 57 sections**, in
`vtl-crime-provisions-2026-08-10.csv` (built by `scan_vtl_subdivisions.py`). Each row is
section + subdivision + paragraph + grade, with the sentence that proves it and a `basis`
column saying *how* it was attributed.

### Checked against ypdcrime.com, 11 Aug 2026

Used for **one purpose only — completeness**: does our list miss anything that guide treats
as commonly charged? It carries no grade and is mostly traffic infractions, so it is not
evidence about classification. The statute decides that.

Of its 251 provisions, 83 sit in sections we hold no crimes for. **Exactly one of those
sections contains criminal language: VTL 318** — and that exposed a real bug.

**The 312/318 mis-citation.** VTL 318(7) reads "Failure … to deliver a certificate of
registration, number plates or driver's license to the commissioner after revocation
thereof **or as otherwise provided in section three hundred twelve** shall constitute a
misdemeanor." The scan took the section reference as the target, so it recorded a crime in
**312 — which has no criminal language at all** — and lost 318 entirely. A section is only
the target when the sentence grades it ("a violation of section X shall be…"); a bare
mention is a manner or definition reference.

Fixing that exposed a second one: "subdivision seven of section twelve hundred twenty-four"
names a subdivision of *that* section, and the scan was applying it locally, inventing
`2130.7` and `392.7`. Both rules are now in `scan_vtl_subdivisions.py`.

Net effect: **114 rows → 112**, and REVIEW rows **6 → 3**. Four sections that never existed
as crimes are gone (148, 312, 401.7, 1224.7), and 318(7) is properly captured.

**403-A, 530 and 1225-C carry no criminal language.** 530 and 1225-C are ordinary
infractions and stay out. **403-A does not** — see the corrected inclusion rule above.

### Non-crimes added for immigration relevance, 11 Aug 2026

Scanning the whole VTL for drugs, fraud and intent language outside the crimes gave 15
candidates. **Eight were added** to the staging table, all ticked "Needs review" and marked
`not a crime - included for immigration relevance`:

| | |
|---|---|
| **403-A** | falsifying temporary indicia of registration — traffic infraction |
| **417, 417-A, 417-B, 417-C** | delivering a certificate or disclosure instrument containing false or misleading information — "violation" |
| **515** | wilfully erasing a conviction endorsed on a licence — grade not stated |
| **507-A, 509-L** | consuming a drug or controlled substance while on duty (for-hire and commercial drivers) — grade not stated |

The seven weaker "knowingly permit" candidates — 385, 401, 402, 411, 498, 509, 514 — were
added too, at Dan's direction, 11 Aug 2026. **Staging table now holds 127 rows.**

### What accuracy actually means here (Dan, 11 Aug 2026)

**This table is not used to give criminal legal advice.** Getting the sentence right is not
the point. What matters is **exactly what the elements of the offence are** — what the
prosecution must prove — because that is what the immigration analysis turns on. The
classification and sentencing are useful background, and Dan is content for those to be
imperfect provided the elements are sound.

**This inverts the review list.** The flags raised so far are about *classification* —
roman-numeral subparagraphs, qualified whole-section grades. On the criterion above those
barely matter. What matters is whether we can isolate the right slice of statute.

**The draft cannot be moved into `NY VTL Offenses` as it stands, because it holds no
statutory text at all.** `Evidence` is a ~200-character fragment around the *grading*
sentence, often starting mid-word — it is proof of the classification, not the offence
definition. Moving it now would produce records that look complete while missing the one
thing that matters.

### Where the VTL working files live (11 Aug 2026)

All of it is in **`OneDrive - OCBA/RIAC - Documents/Admin/Database Design`**, reachable from
either desktop. Nothing needed is stranded on one machine.

| File | What it is |
|---|---|
| `vtl-full-statute-2026-08-11.json` | The entire VTL with text, one API call. Every scan reads this — no need to re-fetch. |
| `scan_vtl_crimes.py` | Pass 1: which sections are crimes |
| `scan_vtl_subdivisions.py` | Pass 2: decompose to subdivision, with the scoping rules |
| `audit_vtl_attributions.py` | Re-checks the loose attributions after any scanner change |
| `scan_vtl_immigration_relevant.py` | Finds drugs / fraud / intent provisions outside the crimes |
| `check_against_ypdcrime.py` | Completeness check against ypdcrime |
| `build_vtl_records.py` | Attaches the statutory text |
| `draft_vtl_offence_names.py` | First-pass names (its output was largely discarded — see below) |
| `vtl-records-for-import-2026-08-11.csv` | **The dataset**: 127 rows with statutory text |
| `cji-penal-law-index-2026-08-10.txt` | The harvested Penal Law CJI index, if those links ever need rebuilding |

⚠️ **The offence names in that CSV are the machine-generated first pass and are poor.**
The good ones were written by hand straight into Airtable. **`VTL Crimes (draft)` is the
authority on names**; the CSV is the authority on statutory text. Do not overwrite the
Airtable names from the CSV.

### Statutory text attached, 11 Aug 2026 — `vtl-records-for-import-2026-08-11.csv`

All 127 rows now carry the slice of statute that defines them, built by
`build_vtl_records.py`. A `Text Scope` column records how precise each slice is, so nothing
has to be taken on trust.

| Slice | Rows |
|---|---|
| paragraph | 37 |
| subdivision | 51 |
| subdivision (paragraph not found) | 2 |
| **whole section** | **36** |
| whole section (subdivision not found) | 1 |

**88 rows are provision-level — median 634 characters**, which is about right for a set of
elements. Those are ready.

**Offence names are deliberately not invented.** The file carries `Section Title` verbatim
from the statute as a starting point. The existing 36 records use curated names ("AUO 3rd"),
and inventing legal names for 127 provisions is not something to do silently.

- [ ] **[Dan]** **Twelve rows have text too long to be "the elements"** — the section is a
      whole regulatory scheme, not one offence. These are the ones worth your time:
      **375** Equipment, **385** dimensions and weights, and **401** registration (all three
      over 50,000 characters, truncated); **313** notice of termination (23k); **498**
      interjurisdictional for-hire (16k); **394** drivers' schools (16k); **1192** ×3 (16k
      each — these are the three 1193 back-reference rows); **370** indemnity bonds (15k);
      **429** junk and salvage (12k); **514** certifying convictions (11k).
      For each: either name the subdivision that actually carries the offence, or say the
      section-level text is good enough.
- The other 25 section-level rows are fine as they are — the section *is* the offence and
  the text is short (515 is 239 characters, 392-A is 465, 382 is 716).

- [ ] **[Claude]** **Migrate into `NY VTL Offenses` once the twelve are settled.** Needs an
      Airtable token, since 127 records with full statutory text is far too much to push
      through the connector. Also needs the classification values mapping onto the
      catalogue's existing `Classification` choices.

**Loaded into a staging table — `VTL Crimes (draft)` (`tblKjnkNeN278RYVE`)** so the review
can happen in Airtable rather than a spreadsheet. **8 rows are ticked "Needs review"**;
filter on that to see only what wants a decision. `Dan's decision` and `Reviewed` columns
are there to work through them. Nothing links to anything else and nothing reads from it —
`NY VTL Offenses` is untouched at 36 records. Delete the table once the real records exist.

**It reproduces the hand-built catalogue exactly**, which is the reason to trust it:

- All 8 criminal subdivisions of 1192 found, with their misdemeanour and felony tiers
- **1192(5) and 1192-a correctly excluded** — Dan graded them traffic infraction and
  non-criminal respectively, and the scan independently agrees
- 511 comes out as AUO 3rd and 2nd misdemeanours and AUO 1st a class E felony

**Three scoping bugs found on the way, all silent:**

- Structural markers vs cross-references — "pursuant to paragraph (a) of this subdivision"
  is not the start of paragraph (a). Treating it as one mis-attributed s.375.
- **Context must stop at the sentence boundary.** Looking further back picks up the previous
  sentence's cross-references, which is how "…of section five hundred ten of this chapter.
  (b) Aggravated unlicensed operation … is a misdemeanor" was attributed to s.510 rather
  than s.511, losing two of the three AUO offences.
- Enclosing structure is meaningless for a remote target. When 1193 grades 1192, the
  surrounding subdivisions belong to 1193 — using them invented 1192 subdivisions that
  do not exist.

### Still to do

- [ ] **[Dan]** **30 rows want a legal eye**, marked in the `basis` column. Six are
      `REVIEW - remote, scope unclear` — 1193 grading "any such subdivision" of 1192 by
      back-reference, which no parser can resolve. The rest are `whole section`, where the
      declaration named no branch.
- [ ] **[Dan]** **Two re-pointed rows want checking** — `201.12(a)` and `1193.1(a)`, where
      the grade sat in a roman-numeral subparagraph rather than a lettered one.
      (`303.3(f)` was a parser bug, since fixed — see below.)

### Citation convention — decided 10 Aug 2026: cite the offence-defining paragraph

511 is the pattern: paragraph **(a)** defines the offence, paragraph **(b)** grades it.
Dan's existing catalogue cites (a), so the scan now does too — an implied grade is
attributed to the first paragraph of its subdivision rather than the one the sentence
happens to sit in. 511 now comes out as `511.1(a)`, `511.2(a)`, `511.3(a)`, matching the
records already in the base.

Nothing is thrown away: a **`grade_stated_in`** column records the paragraph the grade was
actually written in, so the reasoning stays auditable. It affected **9 rows**; six are the
clean 511/415-A/1194 pattern, and the three flagged above are worth a glance.

**This applies only to implied grades.** Where the statute says "a violation of *this
paragraph* shall be a misdemeanor" it means that paragraph, and those rows are untouched.

### Not every VTL section is numbered at the top level (fixed 10 Aug 2026)

`303.3(f)` looked like a citation and was a parser fault. **VTL 303 has no subdivisions at
all** — its top level runs `(a)` to `(j)`, and the stray "2." and "3." in its text are
numbered provisos *inside* those lettered paragraphs. The scan read them as subdivisions,
produced **two "subdivision 2"s** — impossible in one section — and hung the grade on a
subdivision that does not exist.

Two rules now guard this, and they are worth keeping in anything similar:

- **Subdivisions must start at 1 and ascend.** A numbered run that opens at "2" is not
  top-level numbering, it is a list inside something else.
- **A section with no subdivisions can still be lettered.** Those grades attach to the
  paragraph (303 now reads `303.(g)`, which is where the grade actually sits) rather
  than being flattened to the whole section.

Checked against the validated cases: 1192 and 511 come through unchanged.

### Audit of the loose attributions, 10 Aug 2026

`audit_vtl_attributions.py` re-checks every row not pinned to a specific branch, asking the
two questions a human would. It found one more bug and cleared most of the rest.

**The bug: the governing scope is the LAST one named, not the first.** 415-A reads
"…registered pursuant to this **section** as required by this **paragraph** shall be a
class A misdemeanor". Reading the first match called it a section-wide offence. It is now
**14 properly scoped provisions** instead of one wrong one.

**Three more sections are lettered at the top level, like 303** — 605, 1146 and 1170 all
open at `(a)` with numbering nested inside. The start-at-1 rule already rejects their
numeric markers, so they attribute to paragraphs correctly.

**Nine "whole section" rows are genuine** and need no review: 375, 377, 382, 392, 394, 395,
429, 1182 and 382-A each say, in terms, "a violation of any of the provisions of this
section shall constitute a misdemeanor". A section-wide grade is what the statute means.

- [ ] **[Dan]** **Three qualified whole-section rows** — `313`, `370` and `2257-A`. Each
      grades a described act rather than the section at large ("…to a person not entitled
      to receive it shall be guilty of a misdemeanor"), so the citation wants narrowing to
      the right branch. These are the only whole-section rows left needing judgment.
- [ ] **[Dan]** **Look over the 54 for anything obviously wrong**, in either direction. A
      few want a legal eye rather than a parser: 1170 (obedience to railroad signal) comes
      out as a class E felony, and 201 (custody of records), 207 (uniform traffic summons)
      and 1194 (arrest and testing) are all worth a glance.
- [ ] **[Dan]** Send the specific fraud list, as a cross-check that nothing is missing.
- [ ] **[Claude]** Build the records once the above settles, following the existing
      `catalogue_vtl.py` shape. **That script runs fine** — checked 11 Aug 2026, see below.

**Escalation tiers stay Dan's**, as with 1192. Nothing in the statutory text models "one
prior conviction within ten years"; that is legal judgment and was hand-built last time.

---

## 22. Add the NY Tax Law offences  **[Claude]**, scope **[Dan]**

A small subset of Tax Law offences appears regularly in RIAC cases and should be a catalogue
alongside the Penal Law and VTL.

These matter disproportionately for immigration: tax fraud can reach the aggravated felony
definition through the fraud-or-deceit limb and the tax-evasion limb, so the amount involved
and the exact provision both matter. The obvious starting point is **Tax Law article 37**
(criminal tax fraud and related offences) — to be confirmed against the statute rather than
assumed, along with whichever cigarette and tobacco provisions actually turn up in practice.

The NY Senate law ID is **TAX** (as PEN is the Penal Law and VAT the VTL), so the existing
loader plumbing applies.

**Needs from Dan:** which offences actually appear. "A small subset regularly appear" —
better to catalogue the ones that arrive than the whole article. A handful of examples from
real intakes would define the scope quickly.

---

# Added 11 August 2026

## 23. Finish the Case Detail page  **[Dan]**, or **[Both]** with a handover

`Case Detail` (`pagpU8GLwLeHz83Mo`) is the record page that opens on click-through from
**everywhere** — the reminder queue, Find a Case, and every linked-record chip in the
interface. It had drifted badly and was found on 11 Aug with **no charges on it at all**.

Done that day: the empty **Misc** tab removed (it held only `Pending Intakes`), and **two
broken "Field deleted" placeholders** cleared, left behind when `Advisal & RIAC Uploads` was
deleted.

- [ ] Still missing, and all present on Case Viewer: **Case Charges**, Case Type, Top Charge,
      Disposed?, Case Parties, Notes From Other Cases, This Client's Cases, Attorney,
      Attorney's Office, EOIR Result, EOIR Last Checked — plus everything built this week
      (Review Queue Reason, Chasers Sent, Last Reminder Sent, Date Closed, RIAC Summary Of
      Allegations)

⚠️ **Field order within a group is the order fields were added and cannot be rearranged.**
Matching Case Viewer's *order* therefore means emptying and rebuilding a group, not appending
to it. Decide whether order matters before starting.

## 24. Case Viewer and Case Detail must be kept in step by hand  **[Dan]**, standing

**DECIDED, 11 Aug 2026 — two independent layouts, deliberately.** Airtable interface pages
cannot share or inherit a layout: Case Viewer is a record-*review* page, Case Detail is a
record-*detail* page, and an edit to one never carries to the other. Case Viewer was kept
separate because its **left-hand record selector** is worth the duplication cost.

The cost is real and permanent: **every future layout change must be made twice.** That drift
is exactly what produced item 23. Whoever changes one should change the other in the same
sitting.

Note also that **Case Viewer cannot be a click-through target** — click-into-record-details
can only open a record *detail* page, which is why Case Detail is the one that matters.

## 25. The other pop-ups  **[Dan]**

Seven record-detail pages exist. Two were sorted on 11 Aug: **Case Charges Detail** gained a
red "Delete this charge" button — tested end to end with a disposable charge, which confirmed
it removes the charge and leaves the case intact — and **Case Party** (formerly "Record
Detail") gained "Remove this person from the case".

- [ ] **Four still carry Airtable's default names** — the pages behind Courts, Agencies,
      Parties and Pending Intakes are all called "Record Detail", which makes them impossible
      to tell apart when picking a click-through target. Rename them
- [ ] **Several are entirely read-only.** Worth deciding per page whether that is intended
- [ ] No delete route exists on any of the rest. Before adding one, read item 4 — the record
      source check is not optional

## 26. RIAC Summary Of Allegations — placement  **[Dan]**, optional

Created 11 Aug on the case table and added to **Case Viewer → State Case Info**. Free-text
narrative of what the client is alleged to have done, written by the attorney or paralegal,
drawing out what matters for immigration: value of loss, age of complainant, weapon or
controlled substance, relationship between parties, anything touching intent.

- [ ] It sits at the **bottom** of State Case Info, below Related Parties. It reads more
      naturally directly under Case Charges — but see item 23's warning: moving it means
      rebuilding the group
- [ ] It is not yet on **Case Detail** — part of item 23

## 27. Make a closed case obvious on the Case Viewer  — **field built, placement is [Dan]**

When a case is closed, that should be **prominent** — something at the top of the RIAC Case
Info tab, in large text, that appears only when the case is closed.

### Built 11 Aug 2026: `Closed Case Banner` (`fldYSE88Qfg95XZ10`) on the case table

A formula field that is **blank on every open case** and otherwise reads, in one line:

> ⚠ THIS CASE IS CLOSED — Email Advisal Sent — 15 July 2026

The formula-field route was chosen over a static text element because it can name the
closing code and the date, and because it is one field to edit later rather than a caption
duplicated across two pages.

**It keys on `Closing Code` not empty OR the status reading Closed — deliberately both**,
because the two can disagree. Verified against all five closed cases in the base, including
case 6015, which carries a closing code and closing date while its status still reads
*Intake Sent / Awaiting Contact* (the rung-4 automation wrote the code but not the status;
that automation is fixed, but historic records still show the split). A banner keyed on the
status alone would have called 6015 open. Where the two disagree the banner says so:

> ⚠ THIS CASE IS CLOSED — No Atty Response — 11 August 2026  (status still reads: Intake Sent / Awaiting Contact)

### The "Other" closing code, 11 Aug 2026

Dan asked for a closing category of **Other**. **Nothing needed relinking** — which is worth
recording, because it is the design paying off rather than luck. The two calculations that
care about closures both test for **any code at all**, never for a named list:

- **`Reminder Stage`** drops a case off the chaser ladder the moment `Closing Code` is not empty
- **`Dormant Case Flag`** requires `Closing Code` to be empty before flagging a case as gone quiet

So a case closed as Other leaves both automatically. The two automations that involve closing
codes only ever **write** them, and both write by internal ID, so a new option cannot disturb
them. `Readiness (calc)` never reads closing codes at all.

**What did need building is the other half of the problem: "Other" on its own records
nothing.** Six months on, nobody could say why the case shut. So it follows the pattern
already established by `Office Not Listed?` / `Office Not Listed - Details` on the intake —
the option is a deliberate *answer*, and a companion box carries the substance:

- **`Closing Code - Other Details`** (`fldFVPrwVQytbrJJ7`), long text — built
- **`Closed Case Banner` prints it after the date** when the code is Other, and when the box
  is empty says `(⚠ 'Other' selected but no reason recorded)` on the case instead. A
  half-finished closure should be visible, not silent

⚠️ **Two reserved words now, both in this one formula:** **"closed"** in `RIAC Next Steps`,
and **"other"** in `Closing Code` — a future option called something like "Closed For Other
Reasons" would trigger the details logic by accident. See the word-matching rule in
`AIRTABLE.md`.

### What is left, all by hand in the designer

- [ ] **[Dan]** **Add `Other` to the `Closing Code` options**, at the **bottom** of the list.
      The API cannot add a select option, and — more to the point — it cannot set or change
      an option's **colour** afterwards. The existing five run blue → cyan → teal → green →
      yellow, so **orange** continues the sequence. Get the colour right first time.
      *(Adding an option is safe. It is **deleting** one that silently clears that value on
      every record.)*
- [ ] **[Dan]** **Test it once the option exists** — this branch has never run. On a fake
      case: tick `Other`, leave the details box empty, and check the banner reads
      `(⚠ 'Other' selected but no reason recorded)`. Then type a reason and check it appears
      after the date. Then clear both
- [ ] **[Dan]** **Check no interface filter keys on specific closing codes.** The API can see
      dashboard elements but not their filter settings, so Reminder Queue and Find a Case want
      an eye — anything listing codes by name needs `Other` adding to it
- [ ] **[Dan]** Put `Closing Code - Other Details` on **Case Viewer** and **Case Detail**,
      next to `Closing Code`
- [x] ~~Place the banner on **Case Viewer** — top of RIAC Case Info, label hidden, large text,
      Visibility rule *`Closed Case Banner` is not empty*~~ — **done 11 Aug 2026**
- [x] ~~Do the same on **Case Detail**~~ — **done 11 Aug 2026**

## 28. Linked cases — Dan's fuller specification, 11 Aug 2026

Supersedes and expands **item 1**. What is wanted, in three parts:

- **(a)** An easy way to designate one case as linked to one or more others
- **(b)** Whenever that link is active, case notes on one are **visible on the other** —
  either copied across, or marked as applicable and surfaced through
  `Notes From Other Cases Tagged To This Case`
- **(c)** An **obvious place** to see the list of all other cases linked to this case

*Status, 11 Aug 2026 — the data side is built; the display half is an open decision.*
Item 1 holds the design thinking, and its central constraint still governs: **a formula
cannot write into a link field**, so (b) is an automation that stamps at note-creation time,
not a mirror. Item 1 also records the decision that it only ever works **forwards** — notes
written before two cases were linked will not appear retrospectively — and the exact wording
of the interface notice that says so.

`Notes From Other Cases` and `Also Relates To` already existed and already did (b) manually,
one note at a time. So (b) was never a new mechanism, only *automating the tagging*.

### Built 11 Aug 2026

| | |
|---|---|
| `Linked Cases` (`fldTb4nPchAA61yAU`) | Self-link on the case table. **(a)** |
| `Linked Cases (from the other side)` (`fldb1poJCuo4CaFhH`) | Airtable's automatic other end of the same link — see below |
| `Add To All Linked Cases` (`fld3BLF33OGOcl52y`) | Checkbox on RIAC Case Notes |
| `4. Add a case note to all linked cases` (`wflipNRnaWp1FTeap`) | The automation. **(b)** |

The automation fires on a note that has the box ticked, a case attached, and `Also Relates To`
still **empty** — that last condition is what stops it overwriting a note somebody has already
tagged by hand, and what stops it firing twice on the same note.

### ⚠️ The finding that shapes everything: a self-link is NOT symmetric

Tested, not assumed. Linking case 6022 to 6043 from 6022's side put 6043 in **6022's**
`Linked Cases` and put 6022 in the **second field** on 6043. 6043's own `Linked Cases` box
stayed empty. Full write-up in `AIRTABLE.md` under "Linked cases".

**(b) is unaffected** — the automation ORs across both fields, so it does not matter which
side anyone linked from. **(c) is the open question**, because a case linked *to* shows an
empty box and reads as unlinked.

- [ ] **[Decide]** How linked cases are displayed. Three routes, put to Dan on 11 Aug and
      **not yet answered**:
      **(i)** show both boxes under one heading — nothing can drift, but two lists;
      **(ii)** first check whether Airtable will let `Linked Cases` be its own inverse from
      inside the designer, which would collapse it to one box (untestable through the API,
      two minutes by hand, and worth trying before settling for anything else);
      **(iii)** a mirroring automation — one box, but **unlinking would not mirror back**,
      leaving a link in place on one side silently. That is the drift pattern that killed the
      old `Status` field, and the reason it was not built
- [x] ~~Turn the automation on~~ — **done 11 Aug 2026.** Note for next time: an automation
      created through the API arrives as an **off draft**, saved and valid but doing nothing
- [x] ~~Test it end to end~~ — **done 11 Aug 2026, and it works in both directions.** Cases
      6022 and 6043 were linked from 6022's side, then a disposable note was written on each
      in turn with the box ticked. **Both** notes tagged themselves onto the other case. The
      second is the one that mattered: 6043's own `Linked Cases` box is empty — its half of
      the link lives in `Linked Cases (from the other side)` — and the note still found 6022,
      which is the OR across both fields doing its job. Both test notes were deleted
- [ ] **[Dan]** Place the fields on **Case Viewer** and **Case Detail**, once (i)/(ii)/(iii)
      is decided — with the notice from item 1 beside the linking control:
      > REMINDER: this only associates future case notes to all linked cases. If you want any
      > prior case notes to appear on all linked cases, please review and link them manually.

## 29. The Related Parties popup is not working  **[Dan]** to diagnose

Dan, 11 Aug 2026: *"the current setup does not appear to be working."*

*Status.* **Item 2 holds the full specification** and records that the data side was finished
some time ago — `Case Parties` is a junction table, `Name` builds itself, the Parties picker
is searchable by name and date of birth. What was outstanding was designer work.

### Diagnosed 11 Aug 2026 — it is not broken, it was never built

**The data is healthy.** Every row in Case Parties has a person, a role and either a case or
a legacy case number. The " — Witness" symptom of a half-completed add is **not present**:
the only three rows without a `Case` link are the legacy imports, which carry
`Legacy Case No.` instead and are meant to look like that. So neither of the two traps in
item 2 is what is wrong.

**The interface is the problem, in three separate ways.** Read against the *published*
layouts, which is all the API can see:

1. **There is no "Add Related Party" popup at all.** The base has exactly two embedded
   forms — `Add A New Charge` and `Add Case Note`. Item 2(a) has never been built, so there
   is no button and no popup to be misbehaving
2. **The Case Parties record page is entirely read-only.** Every field on it —
   `Party`, `Role`, `Notes`, `Case` — comes back non-editable. So even reaching it by
   clicking an existing person, nothing can be changed. This is item 25's "several are
   entirely read-only", and here it is not intended
3. **`Case Parties` on Case Viewer is read-only too**, so nothing can be added to the list
   from the case either

**An unpublished draft was suspected and ruled out.** The page is still called
**"Record Detail"** in the published layout, not "Case Party", even though
`Case Charges Detail` published its new name on the same day. Dan confirmed everything was
published and it read the same afterwards — so item 25's record of that rename does not match
what is live, and the "Remove this person from the case" button wants confirming too.

### ⚠️ The one thing still not done, re-checked live after publishing on 11 Aug

- [ ] **[Dan]** **The Case Parties popup is still entirely read-only** — `Party`, `Role`,
      `Notes` and `Case` all non-editable, confirmed against the published layout *after* the
      publish. So a person can now be added but **not corrected**: pick the wrong role and the
      only route back is the raw Data tab. Add the fields to that page **and switch inline
      editing on** — the general lesson in `AIRTABLE.md` applies exactly, that adding a field
      to a record page is only half the job
- [ ] **[Dan]** **Rename that page** from "Record Detail" — four pages share that name, which
      makes them impossible to tell apart when picking a click-through target (item 25)
### The cause, found 11 Aug 2026 — one toggle

On the **Related Parties** element, **User actions → "Add records through a form" was OFF**.
So `+ Add record` was opening a **link/unlink picker** instead of a form.

That is worse than merely unhelpful. The records in that list are `Case Parties` junction
rows, not people, and each row's `Case` is a **single** link — so the picker was offering
rows belonging to *other* cases, and choosing one would have **moved** that person off their
own case rather than copying them here. `Link / unlink records` was turned off for that
reason.

### Built the same day, and now essentially done

The popup exists and is called **"Add a Related Party"**: `Party` (required) · `Role`
(required, labelled "What Is The Person's Role On This Case?") · `Notes`. `Case`,
`Legacy Case No.` and `Fake Entry?` were all taken off it. **The full as-built record,
including why each of those three is off and why "Selection: All clients" must not be
narrowed, is in `AIRTABLE.md` → "The 'Add a Related Party' popup, as built".**

`Domestically Related To Client` (`fldY82Q9M7P7ogJ6d`) was added to Case Parties as a
separate checkbox rather than a `Role` option — `Role` is a single select and its options
are procedural, so a complainant who is also the client's ex-partner would otherwise lose
one of the two facts.

**Two fields on Parties were renamed on 11 Aug** so that the pair reads as a pair. They are
the two halves of "where does this person appear", and either one alone is half an answer:

| Was | Now |
|---|---|
| `Case Info` | **`Client On These RIAC Cases`** — the other end of `Client Code` on the case table |
| `Roles on other cases` | **`Other Roles On RIAC Cases (Witness, Co-Defendant Etc.)`** — the other end of `Party` on Case Parties |

Safe: Airtable references fields by internal ID, so nothing that reads them cares. Note that
two other tables still have a field called `Case Info` (Attorneys & Requestors, Courts) —
different fields, left alone.

- [x] ~~Convert `Domestically Related To Client` from a checkbox to a three-way answer~~ —
      **done 11 Aug 2026.** It is now a single select — **Yes / No / Maybe - Unknown** — and
      **required on the Add a Related Party popup**, with no default. A checkbox was the wrong
      shape: an unticked box cannot be told apart from a box nobody looked at, the same silent
      nil that `Office Not Listed?` and `EOIR Result` both exist to avoid.

      **Worth knowing for next time: converting a checkbox to a single select did NOT need the
      field emptying first.** The advice here said to untick the one populated row before
      converting, in case the conversion minted a stray option. It did not — the field came out
      with exactly the three intended options, and the ticked row (Ximena Chocano — Witness)
      carried across as "Yes" by itself. All four Case Parties rows now hold a real value.

### Inline creation is impossible, and it is not a missed setting (11 Aug 2026)

Tested: searching the `Party` picker for a name that is not on file returns nothing and offers
no way to create it. **The cause is that the Parties primary field is a formula.** Creating a
record from a picker works by typing into the new record's primary field, and a computed field
cannot be typed into — so Airtable does not offer the option at all. No toggle turns it on.
Full write-up in `AIRTABLE.md` under "The second consequence, found 11 August 2026".

**Answered with a new page instead.** There was no People page anywhere in the interface —
every page was cases, intakes, templates or the queue, and the only Parties-sourced page was
EOIR Checks, which is purpose-built for A-Number lookups. So a person is now added on
**People** (`paglJrX9Q9ySBdjlE`) and then linked here, which is the better order anyway
because it is what gets a date of birth recorded.

- [x] ~~Switch on adding records on the People page, and signpost it from the popup~~ —
      **done and published 11 Aug 2026.** Verified live: People carries an "Add Client" form
      and opens each person into the existing editable Parties detail page. **A form cannot
      host a button** — checked, the form editor's element menu offers none — so the signpost
      is the description text under the popup's title
- [ ] **[Dan]** **Confirm `DoB` is on the "Add Client" form**, along with `First`,
      `Last Name` and `Country`. A form's field list cannot be read through the API. This is
      the whole point of the page: if a person can be added there without a date of birth,
      the problem has moved rather than been solved. `Country` matters too — ACIS will not run
      an EOIR search without it
- [ ] **[Dan]** **Test the popup end to end** on a fake case before trusting it: add an
      existing person as a Witness, check the row reads "Name — Witness", and check they do
      **not** appear on any other case
- [ ] **[Dan]** **Put `Domestically Related To Client` on the Case Party record page**, next
      to `Role`. It is on the popup already, so it can be *set* but not *seen or corrected*
      afterwards. Do it in the same sitting as turning inline editing on above — same page,
      same fix
- [ ] **[Dan]** **Publish.** The interface has been carrying unpublished changes throughout
      this work — check nothing else is half-finished first, because publishing pushes every
      page's draft live at once and layouts have no undo

## 30. Move the intake form onto Airtable's "new forms"  **[Dan]** with a **[Claude]** check

**Not urgent, and deliberately deferred on 12 Aug 2026.** Nothing is broken and the old form
does the job. This is here so it happens **on our schedule rather than Airtable's.**

Airtable now shows an **"Upgrade to new forms"** button on the form view. The honest case for
pressing it eventually is not a feature — it is that Airtable is plainly steering everyone
to the new builder, and old form views will most likely be retired in time. Doing it
deliberately, with the automation re-pointed under controlled conditions, beats being
migrated at a moment not of our choosing. **The old form view already supports conditional
field visibility** (`equals`, `is any of`, `is empty` and so on), so item 15 needs nothing
from the new builder.

### ⚠️ Why this is dangerous here, and not merely fiddly

**"Upgrade" does not convert the form. It creates a second, separate one.** Airtable's own
guidance: an upgraded form is treated as a *new* form, and automations with a
*When a Form Is Submitted* trigger **are not** re-pointed automatically.

`Conflict Check on New Intake` is bound to the original view by internal ID
(`viw60aBEiAQi6Jcxr`). So nothing breaks loudly — the old view stays, the automation stays
`valid`, and the new form creates intake records perfectly well. **It just never
conflict-checks any of them**, and `Possible Conflict Matches` sits empty, which is
indistinguishable from "checked, found nothing". That is exactly the silent failure the
one-form rule exists to prevent.

### The order it must be done in

- [ ] **[Dan]** Press Upgrade
- [ ] **[Dan]** **Immediately** — Automations → `Conflict Check on New Intake` → re-point the
      trigger at the new form. Do not leave this to another sitting
- [ ] **[Claude]** Confirm from the API that the trigger points at a live form and reads
      `configurationStatus: valid`
- [ ] **[Dan]** Submit a test intake through the **new** form and confirm
      `Possible Conflict Matches` fills in. Nothing else proves it
- [ ] **[Dan]** Only then retire the old form view, and replace its URL everywhere it has
      been shared — including the link from nyriac.com, if that is live by then
- [ ] **[Dan]** Re-check the form's field conditions survived the move, particularly the
      `Type Of Office` routing from item 15
- [ ] **[Dan]** **Re-test that an attorney still cannot invent an agency.** Type a nonsense
      office name into the picker on the new live form. Inline creation is impossible on the
      current form (tested 12 Aug 2026) but that is observed behaviour, not a setting we
      control — a new form builder is exactly where it could come back, and it would pollute
      Agencies silently. See `AIRTABLE.md` → "Two traps"

Sources: [Airtable Community — upgraded form](https://community.airtable.com/base-design-9/upgraded-form-44819) ·
[Airtable — building and sharing forms](https://support.airtable.com/articles/9431794285-building-and-sharing-forms-in-airtable)

## 31. The second round of intake form work  **[Both]**

Item 15 got the form correct. This is making it *good*. Raised by Dan 12 Aug 2026 after
working through the live form.

### Built 12 Aug 2026, waiting to go on the form  **[Dan]**

| Field | |
|---|---|
| `Court` (`fldNjwAvSSJ1FyX0b`) | Link to Courts, replacing free-text `Court Name` |
| `Court Not Listed / Non-NY Court?` (`fld7TA3GDEFJFnyYG`) | Checkbox |
| `Court Not Listed - Details` (`fldNd67cwVHPM4TtH`) | Long text, shown only when ticked |
| `County (from Court)` (`flduSvqKuxUIobdmF`) | Lookup — arrives automatically |
| `RIAC Area (from Court)` (`fldVDCz3RPvpAQDRv`) | Lookup — arrives automatically |
| `Date Of Birth Check` (`fld2iF5qXgC6wLJ6g`) | Formula flag, for the grid — **not** for the form |

**Why the court link matters more than it looks.** County came off the form the same day, and
this is what replaces it: **a case takes its county and RIAC region from the court, not from
the attorney's office.** An attorney at the Albany County PD can have a case in Rensselaer, so
deriving county from the agency would have been quietly wrong. Courts already carried `County`
and `RIAC Area (from County)`, so both now arrive on the intake for free and the attorney
answers one question instead of two.

✅ **No inline-creation trap here.** The Courts primary field is a formula, so a court cannot
be created from the picker at all — the same structural block as the Parties picker, unlike
Agencies where the primary field is ordinary text.

- [ ] **[Dan]** Put `Court` on the form where `Court Name` is now, and **take `Court Name`
      off** (do not delete it — item 16)
- [ ] **[Dan]** Add `Court Not Listed / Non-NY Court?`, then `Court Not Listed - Details`
      shown only when it is ticked
- [x] ~~Set `Court` to allow **one** record rather than many~~ — **done 12 Aug 2026.** The API
      cannot set this; Dan did it in the field editor. Checked afterwards: the lookups and
      `RIAC (Routing)` all still resolve, and it now matches how `County` is already set
- [ ] **[Dan]** Add help text to `Client DoB`: *"Type the date as M/D/YYYY."* The picker opens
      on the current month and cannot be turned off, so typing is the only sane route for a
      date twenty years back. `Date Of Birth Check` catches the obvious failures afterwards —
      it already flags the 12 Aug test intake that came through with a 2026 date of birth

## THE BIGGEST ITEM BEFORE GO-LIVE: who can see what  **[Decide]** **[Dan]**

Raised 13 Aug 2026. **Nothing anywhere had addressed this** - the only trace was a one-line
"review who can see the base" under the pilot-status note. Full reasoning in `AIRTABLE.md` →
"(E) Splitting the base six ways".

The short version: **six intake forms would not do it.** All six would write to one table in
one base, so anyone with base access still sees everything. Permissions create the boundary,
forms do not. And the check is bound to one form by internal ID, so six forms means six
automations and six chances for a region's intakes to go silently unchecked.

**The decision that cannot be engineered around:** a statewide conflict check needs one
shared pool of people; six confidential silos need separation. Both in full is not available.

- [ ] **[Dan]** Decide the access model. The likely shape is one base with **interface-only**
      collaborators - a base collaborator can open the data whatever the interface shows, so
      only interface-only access actually restricts anyone. **Check this against the Airtable
      plan RIAC is on before designing around it.**
- [ ] **[Decide]** How much the conflict check may reveal across regions. It currently writes
      matched people's names, dates of birth, country of birth and attached cases onto the new
      intake - so a Region 2 paralegal already reads facts about Region 4's people. A narrower
      version ("possible conflict, contact Region 4", no names) is buildable and costs the
      ability to judge whether a match is real
- [ ] **[Claude]** Once decided: per-center filtered pages keyed on the case's RIAC
- ⚠️ Do **not** add a region picker to the intake form. `RIAC (Routing)` already derives the
      center from the court's county, and a picker would be a second source of truth for one
      fact

## Conflict alerts on a person  **[Claude]**

Built 13 Aug 2026 on `Parties`: `Conflict Alert?` (`fldc3Lyc9mNXq1dQn`) and
`Conflict Alert - Details` (`fldYwPCSVQmUfJzG1`), for flagging that a referral involving
this person will be a conflict *before* their intake arrives.

- [ ] **[Claude]** Add both to the **Conflict Check on New Intake** automation's rendered
      output, so a ticked alert actually appears on the incoming intake. Right now it does
      not surface anywhere automatically and has to be looked at by hand.
      ⚠️ **Needs Dan's go-ahead first:** edits land on the automation's *draft*, and this is
      the one automation that must not break. Expect to have to review and re-enable it.
- [ ] **[Dan]** Put both fields on the People page in the interface

## The co-defendant habit is a habit, not a mechanism  **[Dan]**

The conflict check matches the incoming client's surname or date of birth against `Parties`.
Two co-defendants are two different people, so **nothing about a shared case connects them
automatically** - what connects them is somebody having recorded the co-defendant as a
`Case Parties` row when the first case was opened.

- [ ] **[Dan]** Make this part of how centers are told to work. A center that opens a case and
      never records the co-defendant has silently disabled the check for that person, and
      nothing prompts it or reports it missing
- [ ] **[Decide]** Whether to ask the attorney about known co-defendants on the intake form
      itself, which would catch them at the one moment somebody is definitely paying attention

## NEXT CONVERSATION: supplemental intakes for cases we already have  **[Both]**

Raised by Dan 13 Aug 2026, parked deliberately until the conflict scenarios were finished.

The situation: RIAC sends the initial email, and the attorney comes back with everything -
already knowing the RIAC case number it belongs to. **Today they would have to fill the whole
intake form again**, re-entering their own name, affiliation and contact details, to tell us
something about a case we already have.

The shape to work out: a second, shorter route for *additional material on a known case*, as
against *telling us about a new case*. Probably keyed on the RIAC case number, and probably
landing as documents plus a case note rather than as a Pending Intake.

⚠️ **The trap to design around from the start:** the conflict check is bound to the one intake
form, and a second form would not run it. That is correct for supplemental material on a case
already checked - but only if the route genuinely cannot be used to introduce a *new* case.
Work out what stops that before building anything.


### Conflict referrals — built 12 Aug 2026, waiting to go on the form  **[Dan]**

The county is a default, not a rule: a RIAC can accept a case outside its region when another
center has a conflict. Full reasoning in `AIRTABLE.md` → "Conflict referrals".

| Field | |
|---|---|
| `Conflict Referral?` (`fldG2H1eYXswsOiC4`) | Checkbox |
| `RIAC Requested` (`fldOk6aUmYq44J4jw`) | Single select, six center names |
| `Conflict Referral - Details` (`fldxu8KfszBikoBIj`) | Which center declined it, and why |
| `RIAC (Routing)` (`fldNcByMdwfhLLFPW`) | Formula — **the one field to read.** Not for the form |

- [ ] **[Dan]** Add `Conflict Referral?` to the form, then `RIAC Requested` and
      `Conflict Referral - Details` shown **only when it is ticked**. Suggested question:
      *"Has a RIAC already told you this is a conflict, or are you a RIAC entering a case you
      have accepted as a conflict?"*
- [ ] **[Dan]** Put `RIAC (Routing)` on the **Needs Review** page, so an intake with no court
      and no referral shows its `⚠ NO RIAC YET` warning rather than sitting silently unrouted
- [ ] **[Decide]** Whether `RIAC Requested` should be visible to *every* submitting attorney or
      only really intended for RIAC staff. It is on a public form, so anyone can tick the box
      and choose a center — the details box is what makes a wrong claim visible, not the field
      itself
- ⚠️ **Renaming a center means renaming it twice** — in the RIACs table and in this select. The
  RIACs primary field is a number, so a link picker would have shown attorneys "1, 2, 3"

### `Urgent Flags` — split it rather than remove it  **[Decide]**

Dan's instinct on 12 Aug was to take it off the form and make it a paralegal review step. The
four options are not the same kind of thing, so the recommendation is to split by **who
actually knows**:

| Option | |
|---|---|
| **ICE Detainer** | Keep. Only the attorney knows, and it is what makes a case urgent |
| **TOP/OP** | Keep. A fact on the attorney's file |
| **Next Court Date Imminent** | **Drop** — `Next Court Date` is already collected, and a formula on it is objective where a tick can drift |
| **SIJS Eligible** | **Move off the form.** That is RIAC's legal assessment, not something a requester should be guessing at |

If the paralegal's own triage should also be recorded, that is a **second field**, not a
relocation of this one — attorney-reported and RIAC-assessed are different facts, the same
split as everywhere else in this base.

### Renamed 12 Aug 2026

`Charges & Case Description` → **`Attorney's Summary of Misconduct Allegations`**
(`fldplCTuEEDye3KMc`). It had no description at all and was doing two jobs. It is now
explicitly **the facts, not the citations** — charges become structured `Case Charges` records
later — and it pairs with `RIAC Summary Of Allegations` on the case table: what we were told,
and what we made of it.

- [x] ~~Reword the form question and add help text~~ — **done 12 Aug 2026, in Dan's words:**
      *"Please summarize allegations against your client stated at their worst - i.e. NOT just
      what can be proven - e.g. 'Client alleged to have slapped complainant, his girlfriend.
      She is alleged to have sustained a nose bleed and minor bruising'."*
      **"At their worst" is the instruction that matters** — the immigration consequence turns
      on what the record of conviction could be made to support, so an attorney who summarises
      defensively hides the very facts RIAC needs.

### The form's appearance  **[Both]**

Dan, 12 Aug 2026: *"extremely ugly — minimal branding, everything in a scroll-down list,
everything in a weirdly narrow column."* True, and form views give almost no control: a cover
image, a logo, the title and description. Deeper branding needs a higher plan.

- [ ] **[Both]** **Embed the form in `intake.html`** using *Share form → embed*. The page
      around it is ours — RIAC header, our own width, colours and intro copy — even though the
      form inside the frame stays Airtable-styled. This is also the only place a real gate can
      live, so the "who this form is for" message that the form itself cannot enforce belongs
      on that page. ⚠️ **Submit one test through the embedded version** and confirm the
      conflict check still fires
- ⛔ **Still absolutely not:** a form of our own that posts into Airtable. The conflict check
  is bound to this one form view and would silently stop running
- Multi-page forms, and better layout generally, are a reason to look at **item 30** — a form
  view cannot hide questions until earlier ones are answered, because conditions key on
  *values*, not on completion

### Confirmation email with a reference number  **[Claude]** to build

- [ ] **[Claude]** An automation on form submission emailing the address in `Attorney Email`
      a confirmation carrying a reference like `INT-0042`, so an attorney chasing later has
      something to quote. Needs a reference-number field on Pending Intakes — an autonumber
      plus a formula — which does not exist yet.
      ⚠️ **It would send from Airtable's own mail server**, exactly like the reminder ladder,
      so it must move to Outlook with the rest before go-live. Build it now, switch it then.
- Airtable's own *"Allow people to request a copy of their responses"* toggle is the built-in
  alternative. It is greyed out until the toggle above it is on, gives no reference number,
  and the wording cannot be controlled.

### Form settings  **[Dan]**

- [ ] **Turn on "Email me at …"** for the pilot — the cheapest safety net against an intake
      sitting unnoticed. Revisit at go-live: it is a personal address, and RIAC is moving to
      @nyriac.com where a shared inbox would be better
- Leave **"Submit another response"** and **"show a new blank form after 5 seconds"** off —
  the second would wipe the confirmation message before anyone read it
- "Show Airtable branding" is already off, and the post-submission message is good

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
- [x] ~~Confirm both chaser systems are meant to be there~~ — **settled 10 Aug 2026. There is
      now only one.** `Monthly reminders 1` and `2` were deleted, along with the Monthly
      Reminders and Run Monthly Reminders pages and the fields only they used. **`Send
      approved reminders` is the only sender**, and the ladder is **three rungs**, not four:
      first reminder at 30 days from the referral, second at 60, closure for non-response at
      90. The separate final-warning rung was removed on 11 Aug
- [ ] **Switch the reminder emails to Outlook.** Still the real blocker before any of this
      touches a live attorney. All three rungs currently send from **Airtable's own mail
      server**; each of the three `Send` steps in `Send approved reminders` needs swapping to
      the Microsoft Outlook action, and the **BCC and Reply-To must be re-checked afterwards**
      — the BCC is what files each sent chaser back as a case note
- [ ] **Approve the reminder wording.** All three templates in **Email Templates** now have
      text, but the Second Reminder and Closeout are **unapproved drafts written on 11 Aug**.
      One open question inside them: Dan's original sketch for the old final-warning rung said
      "we will close this case **and report you**", and who the attorney would be reported *to*
      was never settled. That sentence has deliberately been left out of both drafts rather
      than guessed at. If reporting is real, it belongs in the Second Reminder, and the
      Closeout then needs a line saying it has happened
- [ ] **Test that rich-text formatting survives into a sent email.** Opening Paragraph,
      Closing Paragraph and Sign-off were converted to Rich text on 11 Aug. Airtable stores
      rich text as Markdown and the send step renders Markdown, so bold and bullets *should*
      come through — but nobody has seen it work. Send one first reminder to a real address
      and look at what arrives
- [ ] **Put Gennaro Apicella's email back.** It was pointed at `dejackson@outlook.com` on
      11 Aug to test the closure branch end to end, and left there. Harmless while the data is
      fake; confusing if anyone mistakes it for real
- [ ] **Link nyriac.com to the Airtable intake form.** Link to it — do not build a form on
      the website that posts into Airtable, or the conflict check silently stops running
      on every intake
- [ ] From then on, treat everything in the base as confidential — see `AIRTABLE.md`

The website has its own outstanding list — contact details to verify, advisory PDFs, DNS
setup — in `CLAUDE.md`, separately.
