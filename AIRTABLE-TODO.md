# Airtable — what Dan needs to do

A working checklist, in priority order. Delete items as they are done; when the list is
empty, delete the file. The reasoning behind every item is in `AIRTABLE.md` — this file is
just the doing.

Everything here is **interface work in Airtable**, which the API cannot touch. That is why
it is yours rather than Claude's.

**Base:** RIAC CMS Pilot (`appwoHVXRp4vgfJB9`) · **Interface:** `pbdHwnz9pUuUshXzP`, the one
containing Case Viewer

> **Before you start:** interface layouts have **no version history**. A published mistake
> has to be unpicked by hand. Change one thing, look at it, then move on.

> **About the click-by-click steps below.** They are written from how the Airtable interface
> designer works, not from watching your screen — nobody has driven this browser. Airtable
> also renames its own buttons between releases. So where a step says "look for an option
> worded roughly like…", expect the wording to differ slightly and go by what the option
> *does*. If a step does not match what you see, stop and say so rather than guessing.

---

## 1. Finish the intake form

The three new fields exist but nothing can reach them yet, so the intake form is currently
collecting the *old* free-text office. Do this first — it is short.

Open the **Pending Intakes** table → the intake **form view** → then:

- [ ] Add **`Attorney's Office`** to the form
- [ ] On that field, **turn OFF the option allowing submitters to create new records**
      (wording is usually "Allow linking to new records" or similar). If this is left on,
      attorneys will invent agencies from a public form — the exact thing the picker exists
      to prevent
- [ ] Add **`Office Not Listed?`** (checkbox)
- [ ] Add **`Office Not Listed - Details`**, and set it to appear **only when
      `Office Not Listed?` is ticked**
- [ ] **Remove the old `Affiliation`** field from the form (do not delete the field yet —
      it still holds three test submissions)
- [ ] Submit one test intake and check that **Possible Conflict Matches** fills in. That
      confirms the conflict check still fires after the changes

---

## 2. Make client details editable again — the important one

Right now **no client detail can be edited from a case at all**, because the click-through
was removed and every client field on the case is a lookup, which can never be made
editable. Date of birth in particular now appears in every person picker, so a wrong one
cannot currently be corrected without opening the Parties table directly.

Do **2a before 2b**. Until the route exists, the client page cannot be reached to check
your work on it — and it is currently so unreachable that even the API cannot see it.

### 2a. Restore the route

The `Client Code` field is **not on the Case Viewer at all** at the moment, so this is an
add, not a re-configure.

- [ ] Open the interface, go to the **Case Viewer** page, click **Edit** (the pencil, top
      right) to enter the designer
- [ ] Click the record detail area to select it. A settings panel opens on the right with
      the list of fields shown on the page
- [ ] Find **`Client Code`** in the field list and switch it **on**
- [ ] Drag it to sit near the top, next to `Client Name` — someone looking for the client
      should find the link where the client's name already is
- [ ] Click the `Client Code` field itself to open its own settings. Look for an option
      worded roughly like **"Open record page"**, **"Allow opening record"** or
      **"Click behaviour"**, and set it so a single click opens the linked record
- [ ] **Do not** add a button, a confirmation step, or an "edit client details" control.
      The ceremony was the thing you disliked; the bare link is the whole feature
- [ ] **Look at it before publishing.** Then publish

### 2b. Add the missing fields to the client record page

Getting there: with 2a published, open any case on the Case Viewer and click the
**`Client Code`** chip. That opens the Parties record detail page. Click **Edit** to get
into its designer.

It currently offers only First, Last Name, Current immigration status, Date of current
immigration status, Client Flags, Immigration Docs Received and Case Info. Switch on:

- [ ] **`DoB`** ← put this near the top, directly under `Last Name`
- [ ] **`A Number`** ← and this, directly under `DoB`
- [ ] `Country`
- [ ] `Address`
- [ ] `Notes on Imm Status or History`
- [ ] `Immigration Docs Upload`
- [ ] `EOIR Result`
- [ ] `EOIR Results PDF`
- [ ] Check each one is **editable**, not read-only. Adding a field to a page does not by
      itself make it writable, and a read-only `DoB` fixes nothing
- [ ] **Look at it before publishing.** Then publish

**Then actually test it**, which is the only step that proves the job is done:

- [ ] Open a case on the Case Viewer
- [ ] Click through to the client
- [ ] **Change the date of birth and save**
- [ ] Go back to the case and confirm the new date shows there too — it is a lookup, so it
      should follow automatically
- [ ] Put the date of birth back

`DoB` is the right field to test with, because it is the one that appears in every person
picker. If editing it works, the whole route works.

---

## 3. Delete the superseded fields

- [x] ~~**`Affiliation`** on **Attorneys & Requestors**~~ — **done, 8 August 2026.**
      `Offices Acted For` was checked afterwards and still reports valid

- [x] ~~**`Attorneys & Requestors` on Agencies**~~ — **done, 8 August 2026.**
      Deleting `Affiliation` was expected to remove this column too, as the other end of the
      same link. It did not — Airtable **converted it to plain text**, freezing 50 stale
      attorney names across the 124 agency records. Deleted by hand.
      Checked afterwards: Agencies still holds its real link to cases
      (`State Case Info & RIAC Progress`, the far side of `Attorney's Office`), and
      `Offices Acted For` still reports valid

- [ ] **`Affiliation`** on **Pending Intakes**, *after* the three test submissions are
      cleared.
      **NEVER convert this field to a linked record.** Airtable would create a new agency
      for every value it cannot match — including "Test Submission Two - Genesee PD (test)"
      — and the API cannot delete them

- [ ] `CrimeTime` on **NY VTL Offenses** — dead field, CrimeTime covers Penal Law only

---

## 4. The Add Related Party popup

Full specification in `AIRTABLE.md` under "Spec for the Add Related Party popup".

- [ ] Build a popup on **Case Parties** collecting: **`Party`** (required — a row with no
      person reads " — Witness"), `Role`, `Notes`. `Case` fills itself in
- [ ] Add a list of related parties beneath it on the Case Viewer
- [ ] Expect the button's own label to be unchangeable, as with "+ Add case"

---

## 5. The attorney record page

**There is already a detail page for attorneys — `Person Detail` (`pag2b5hvAL08En50y`).
Do not build a second one.** It already carries all six fields you wanted. The work is
making it usable, not creating it.

Getting there: open a case on the Case Viewer and click the **`Attorney`** chip.

- [ ] Confirm clicking an attorney from a case actually opens this page in one click. If it
      does not, fix it the same way as `Client Code` in 2a
- [ ] Confirm it shows: Attorney First Name, Attorney Last Name, Email Address, Cell Phone,
      Notes About Requestor
- [ ] **Make those five editable.** Every field on this page is currently read-only, so the
      page is a dead end — there is nowhere to correct an attorney's email or phone number
- [ ] Confirm **`Affiliation` is gone from it.** The field was deleted on 8 August, so it
      should have vanished by itself — worth an eye
- [ ] Add **`Offices Acted For`** to the page, and leave it **read-only**. It is a rollup of
      every office the attorney has actually acted for, gathered from their cases, and it
      maintains itself
- [ ] **Look at it before publishing.** Then publish

### Do not label anything as the attorney's "usual office"

An attorney has **no office** in this database any more, and nothing on this page should
suggest otherwise. The office is recorded per case, in `Attorney's Office` on the case, and
that is the only place it can be edited.

The old arrangement — a usual office on the attorney plus a per-case override — was removed
on purpose. Its hazard was precisely that someone looking at one case could click through to
the attorney, correct the office sitting there, and silently rewrite it on every other case
that attorney had, with nothing on screen saying the edit reached past the case in front of
them. Reintroducing a "usual office" label would reintroduce that.

If a note on the page would help, say where the office *is*, not what it used to be:

> The office is recorded on each case, in **Attorney's Office**. The list below shows every
> office this attorney has acted for, gathered from their cases — it updates itself and
> cannot be edited here.

---

## Optional — only if you want the test data to look realistic

Three cases have two attorneys from two different offices, which would not happen in real
life. The data is correct as recorded; this is cosmetic.

- [ ] 6017 Josefina Almonte-Vidal · 6024 Bekim Gjonbalaj · 6041 Leonel Ayestas

---

## Before this goes live

Do not start these until testing is finished.

- [ ] **Delete all test data.** Filter on **`Fake Entry?`** and clear it in: Parties,
      State Case Info & RIAC Progress, Case Parties, Attorneys & Requestors, Case Charges
- [ ] Delete the three test intakes in Pending Intakes
- [ ] Review who can see the base, the interfaces, and any shared links
- [ ] **Switch the reminder emails to Outlook.** They currently send from Airtable's own
      mail server; the "Send the chaser" step needs swapping to the Microsoft Outlook send
      action so mail comes from the real RIAC address
- [ ] **Link nyriac.com to the Airtable intake form.** Link to it — do not build a form on
      the website that posts into Airtable, or the conflict check silently stops running
      on every intake
- [ ] From then on, treat everything in the base as confidential — see `AIRTABLE.md`

The website has its own outstanding list (contact details to verify, advisory PDFs, DNS
setup) — that is in `CLAUDE.md`, separately.

---

## Done on 8 August 2026 (via the API, no interface work involved)

- Renamed `Notes on Imm Status or HIstory` → **`Notes on Imm Status or History`** on Parties.
  Safe: Airtable references fields by internal ID, so the case table's `Immigration Notes`
  lookup and every filter carried on working untouched
