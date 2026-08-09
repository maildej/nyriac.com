# Airtable — what Dan needs to do

A working checklist, in priority order. Delete items as they are done; when the list is
empty, delete the file. The reasoning behind every item is in `AIRTABLE.md` — this file is
just the doing.

Almost everything here is **interface work in Airtable**, which the API cannot touch. That
is why it is yours rather than Claude's. Item 1 is the exception — it is a field type
change, which the API also cannot make.

**Base:** RIAC CMS Pilot · **Interface:** the one containing Case Viewer

> **Before you start:** interface layouts have **no version history**. A published mistake
> has to be unpicked by hand. Change one thing, look at it, then move on.

---

## 1. Turn the VTL `Citation` field into a formula

**Table:** NY VTL Offenses · **Field:** `Citation` (the first column)

This is the last piece of the charge-display work done on 9 August 2026. Everything else is
already live: the Penal Law picker, the short VTL names, and the way charges read on a case
all work now. Only the **VTL search box** is still showing the old text, and only this
change fixes it.

Right now the VTL picker offers `V.T.L. 1192.2 - 1 Prior Conviction Within 10 Years` — no
offence name at all, so it cannot be searched by name. After this it will read:

> `V.T.L. 1192.2 — DWI (0.08% BAC) — 1 Prior Conviction Within 10 Years (U Misd)`

**How:**

- [ ] Open **NY VTL Offenses**, click the **`Citation`** column header → **Edit field**
- [ ] Change the type from **Single line text** to **Formula**
- [ ] Paste this in:

```
"V.T.L. " & {Statute No.} & " — " & {Display Name} &
IF(
  {Classification},
  " (" & SWITCH({Classification},
    "A-I Felony", "A-I Fel",
    "A-II Felony", "A-II Fel",
    "B Felony", "B Fel",
    "C Felony", "C Fel",
    "D Felony", "D Fel",
    "E Felony", "E Fel",
    "A Misdemeanor", "A Misd",
    "B Misdemeanor", "B Misd",
    "Unclassified Misdemeanor", "U Misd",
    "Violation", "Viol",
    "Traffic Infraction", "Traffic Inf",
    "Non-criminal", "Non-crim",
    "N/A - Definition", "Definition",
    "Depends on Priors", "Class depends on priors",
    "Depends on Underlying Offense", "Class depends on underlying offense",
    "Varies Based on Sub-Section", "Class varies by sub-section",
    "Specific Penalty Laid Out In Statute", "See statute",
    "Other", "Other",
    {Classification}) & ")",
  ""
)
```

- [ ] Airtable will warn that data will be lost. **That is expected and safe.** The thing
      being lost is the typed citation text, and the formula rebuilds every one of the 36
      statute numbers exactly — checked against all 36 rows before this was written. The
      links from existing charges are held by internal ID and are not affected

**Then, once it is done:**

- [ ] Open the **Add A New Charge** popup on a test case and type `DWI` into the VTL box.
      Before this change it finds nothing; after it, it should find the DWI entries

**If it goes wrong,** change the type back to Single line text — but note the old typed
citations will not come back, so if you want to abandon this, tell Claude and the text can
be written back in from the two helper columns.

---

## 2. Finish the intake form

The three new fields exist but nothing can reach them yet, so the intake form is currently
collecting the *old* free-text office. It is short.

**The form is called "Attorney Intake Form", and it is the only form in the base.**

Find it in the **Data** tab → **Pending Intakes** table → the **view list down the left**,
below "Grid view". It does **not** appear in the Forms tab in the top navigation — see
`AIRTABLE.md` on why the two listings do not match.

⚠️ **Never delete this form.** The conflict check is bound to it by internal ID; delete it
and every intake stops being conflict-checked.

Then:

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

## 3. Delete the superseded fields

Each is safe — every case now carries its own office.

- [ ] **`Affiliation`** on **Attorneys & Requestors** (if not already done). This also
      removes the matching `Attorneys & Requestors` column from Agencies — that is the
      other end of the same link, and nothing uses it
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

## 5. Check the attorney popup

You built this already — worth confirming it covers:

- [ ] Attorney First Name, Attorney Last Name, Email Address, Cell Phone,
      Notes About Requestor
- [ ] **`Affiliation` is gone from it** once step 3 is done

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
- [ ] **Add a `Fake Entry?` filter to the EOIR Checks page.** It was deliberately left off
      so the page had something to show during testing; leave it off and the page lists
      test people for ever
- [ ] **Reset Espoir Mukendi's EOIR fields** if he survives the test-data clear-out — his
      result was set on 8 August 2026 to prove the automation works, not because anyone
      looked him up
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
