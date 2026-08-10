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

## 4. Two-step delete for case notes  **[Dan]** to look, then **[Decide]**

Click delete → "are you sure?" → yes/no.

*Notes.* **Airtable has no way to build a custom "are you sure?" dialog.** You cannot
interpose a confirmation between a click and its effect in an interface. That constraint
applies to items 4 and 5 alike, and it is the only thing they have in common — see item 5,
which is otherwise a different problem.

**This one may already be solved.** Deleting a record is a recognised destructive action, so
Airtable generally prompts before it, and deleted records go to the base's trash and can be
restored for a period that depends on the plan. **Go and look at what it already does before
building anything** — this may be a checking job, not a building job.

If it turns out there is no prompt, the substitute is the same two-deliberate-edits pattern
described in item 5: a `Marked for deletion` checkbox plus a review view where deletions are
actually carried out. That is a different shape from what was asked for, so it is worth seeing
the real behaviour first.

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
- **(e)** Notes on issues relevant for immigration purposes — this is the existing
  `Charge Notes` field; only its visible description on the popup needs to change
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

## 11. The Court field on the case  **RESOLVED 10 Aug 2026**, one small piece left

Originally: "On Case Viewer → State Case Info, `Court` is not editable and there is no obvious
way to make it so."

**It was editable the whole time.** Tested by hand in the published interface: click the **×**
on the court's card to unlink it, which leaves a **+ Add record** button, and that opens the
searchable list of courts. Clunky compared with a dropdown, but it works, and Dan is content
with it. Nothing was changed to achieve this.

### The wrong turn, recorded so it is not repeated

The diagnosis said this was a forgotten inline-editing toggle needing a Publish. That was
wrong, and it was wrong for a reason worth knowing: **`isEditable` from the API does not mean
what it appears to for linked-record fields.** `Court` reports `isEditable: false` on the
Case Viewer, and so does every other linked field on every list page in this base. It is a
description of how the API renders list pages, not a statement about permissions. The full
note is in `AIRTABLE.md` under "`isEditable` from the API does NOT mean a linked field can be
re-linked".

**The lesson: for a linked-record field, the only reliable test is to open the published
interface and try it.** Not the designer preview, and not the API.

Two other guesses along the way were also wrong, both corrected by looking:

- The field is shown as a **Field**, not a linked-record View, so there was never an element
  to swap out.
- **There is no inline-creation risk here.** Typing a name matching no court returns nothing;
  it does not offer to create one. That is governed by the **"Add records through a form"**
  toggle, which is off — a *different* toggle from "Link / unlink records", whose gear offers
  only `All records` / `Specific records` and no creation option at all.

### Still outstanding: you cannot click through to a court  **[Dan]**

The one real gap. A court's card cannot be clicked to open the court and read its address,
phone, website, judicial district or county — useful things an attorney may well want.

- [ ] On the Case Viewer, select the **`Court`** field and turn **on** **"Click into record
      details"** under **User actions**. It was off in the designer on 10 Aug 2026, which is
      exactly why swapping a court works but inspecting one does not

Two things follow from turning it on:

- Clicking a court will open a **Courts record detail page**, which does not exist yet — so
  expect to choose which fields it shows. `Name`, `Address & Contact`, `Website`,
  `Judicial District` and `County` are the useful ones.
- **Editing a court from there changes it for every case linked to that court.** That is
  correct — court contact details genuinely are shared — but it is the same scope rule as
  agencies, and worth knowing before anyone corrects an address.

### Show every court with its county  **[Dan]** — one conversion, then done

**Why this came up.** The Courts picker searches `Name`, and 1,542 of the 1,551 names are
unique — but nine names belong to two courts each, and New York really does have two of each.
**Eight of those nine pairs sit in different RIAC regions:**

| Name | One is in | The other is in |
|---|---|---|
| Chester Town Court | Orange (**R4**) | Warren (**R3**) |
| Lewis Town Court | Essex (**R3**) | Lewis (**R2**) |
| Fremont Town Court | Sullivan (**R4**) | Steuben (**R1**) |
| Dickinson Town Court | Franklin (**R3**) | Broome (**R2**) |
| Ashland Town Court | Greene (**R4**) | Chemung (**R2**) |
| Franklin Town Court | Franklin (**R3**) | Delaware (**R2**) |
| Brighton Town Court | Franklin (**R3**) | Monroe (**R1**) |
| Albion Town Court | Orleans (**R1**) | Oswego (**R2**) |
| Greenville Town Court | Greene (R4) | Orange (R4) |

Since county and region are both lookups through the court, picking the wrong twin does not
merely mislabel a case — it files it with the wrong centre, and the two were indistinguishable
in a picker.

**DECIDED, 10 Aug 2026 — show the county on every court, not just the ambiguous ones.**

> `Alabama Town Court (Genesee County)`

That fixes the nine pairs as a side effect, and pays for itself everywhere else: searching
`Genesee` now finds every court in that county, which the picker could not do before. An
earlier fix that tagged only the 18 duplicates by hand has been **reverted** — the names are
back to plain, ready for the conversion below.

**Every one of the 1,551 courts has a county** (checked 10 Aug 2026), so no court will be left
without a suffix.

#### What Dan does

**Table:** Courts · **Field:** `Name` (the first column)

- [ ] Click the **`Name`** column header → **Duplicate field**, and choose to **copy the
      values** with it. Rename that copy **`Court Name (original)`**. *This is the safety copy,
      and it must exist before the next step — converting a text field to a formula destroys
      what was typed in it.*
- [ ] Now click **`Name`** → **Edit field** → change the type to **Formula**, and paste:

```
{Court Name (original)} &
IF(
  {County},
  " (" &
  IF(
    FIND("(", ARRAYJOIN({County}, ", ")),
    SUBSTITUTE(SUBSTITUTE(ARRAYJOIN({County}, ", "), " (", " County, "), ")", ""),
    ARRAYJOIN({County}, ", ") & " County"
  ) & ")",
  ""
)
```

- [ ] Accept the data-loss warning — the thing being lost is the typed name, which is already
      safe in `Court Name (original)`
- [ ] Spot-check three: an ordinary court, one of the nine duplicated names, and a New York
      City court

#### Why the formula looks more complicated than "add the county"

Three counties are not stored as bare names — `Kings (Brooklyn)`, `New York (Manhattan)` and
`Richmond (Staten Island)` carry the borough. Appending " County" naively would give
`(Kings (Brooklyn) County)`, brackets inside brackets, on every New York City court. The inner
`IF` spots the bracket and rearranges instead:

| County as stored | Court reads |
|---|---|
| Genesee | `Alabama Town Court (Genesee County)` |
| St. Lawrence | `Massena Town Court (St. Lawrence County)` |
| Kings (Brooklyn) | `Kings Criminal Court (Kings County, Brooklyn)` |

So both `Kings` and `Brooklyn` still find the court.

#### Consequences worth knowing

- **Every case's `Court Name` gains the county too**, since it is a lookup of this field. That
  is an improvement, and no case had to be touched to get it.
- **It is self-maintaining.** Correct a court's county and its name follows; add a new court
  and it is labelled automatically. That is the advantage over the hand-tagging approach that
  was reverted.
- **If a loader script is ever written for Courts, it must not write `Name`** — it is a formula
  now, and `Court Name (original)` is what would need loading instead.

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
- [ ] **Check the form asks for first and last name in separate boxes.** The conflict check
      matches on surname OR date of birth, and if `Client Last Name` arrives empty then
      *every person on file* matches and the check becomes noise. Two of the three intakes on
      file have both name boxes empty, which may just be how those test rows were made
- [ ] Submit one test intake and check that **Possible Conflict Matches** fills in, and that
      the surname landed in **`Client Last Name`**. That confirms the conflict check still
      fires after the changes, and that names are arriving split

## 16. Delete the superseded fields  **[Dan]**

The API cannot delete fields. Each of these is safe — every case now carries its own office.

- [ ] **`Affiliation`** on **Attorneys & Requestors**. This also removes the matching
      `Attorneys & Requestors` column from Agencies — the other end of the same link, unused
- [ ] **`Affiliation`** on **Pending Intakes**, *after* the three test submissions are cleared.
      **NEVER convert this field to a linked record.** Airtable would create a new agency for
      every value it cannot match — including "Test Submission Two - Genesee PD (test)" — and
      the API cannot delete them
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
- [ ] **Confirm both chaser systems are meant to be there.** Two are deployed and both send
      real email: `Send approved reminders` (the four-rung one behind the Reminder Queue
      page) and `Monthly reminders 1 and 2` (the batch one behind Monthly Reminders and Run
      Monthly Reminders). **This may well be deliberate** — Dan thinks a workflow was
      designed around it — so do not retire either without checking. What needs confirming
      is that it is clear which does what, because they are started by different tick-boxes
      and ticking the wrong one would chase the same attorneys twice. If both are keepers,
      say so on the Reminder Queue page so nobody wonders later
- [ ] **Switch the reminder emails to Outlook.** They currently send from Airtable's own
      mail server; the "Send the chaser" step needs swapping to the Microsoft Outlook send
      action so mail comes from the real RIAC address. **Both** systems send, so both need
      swapping if both survive the item above
- [ ] **Link nyriac.com to the Airtable intake form.** Link to it — do not build a form on
      the website that posts into Airtable, or the conflict check silently stops running
      on every intake
- [ ] From then on, treat everything in the base as confidential — see `AIRTABLE.md`

The website has its own outstanding list — contact details to verify, advisory PDFs, DNS
setup — in `CLAUDE.md`, separately.
