# Airtable — what Dan needs to do

A working checklist, in priority order. Delete items as they are done; when the list is
empty, delete the file. The reasoning behind every item is in `AIRTABLE.md` — this file is
just the doing.

Everything here is **interface work in Airtable**, which the API cannot touch. That is why
it is yours rather than Claude's.

**Base:** RIAC CMS Pilot · **Interface:** the one containing Case Viewer

> **Before you start:** interface layouts have **no version history**. A published mistake
> has to be unpicked by hand. Change one thing, look at it, then move on.

---

## 1. Finish the intake form

The three new fields exist but nothing can reach them yet, so the intake form is currently
collecting the *old* free-text office. Do this first — it is short.

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

## 2. Delete the superseded fields

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

## 3. Finish the disposition change

Built, tested, and nearly finished — see `AIRTABLE.md`, "Disposition: a case note, not a
per-charge field". Done already: the three per-charge fields are deleted, and `Disposed?` is
on the Case Viewer (verified 9 August 2026, correctly read-only).

- [ ] *Optional, and genuinely cosmetic.* On the **Monthly Reminders** page, swap the
      displayed **`Last Contact on This Case (calc)`** for **`Last Attorney Contact`**.

      **The number that matters on that page is already right.** `Days Since Attorney
      Contact` is displayed there and was repointed at the combined figure, so the page
      already counts contact across related cases. Only the supporting date beside it is
      the narrower this-case-only version. Nothing on the page misleads anyone about who
      gets chased.

      **It is an interface page, not an automation.** Four things share almost the same
      name: the *Monthly reminders 1* and *2* **automations** (the machinery), the
      **Monthly Reminders** interface page (the review list of cases), and the **Run
      Monthly Reminders** interface page (the two buttons).

      Two traps found on 9 August 2026, both of which cost a round:

      1. **Selecting the list of cases gives you the wrong element.** The right-hand panel
         then reads **"Record list"**, which only ever offers Title, Field 1 and Field 2.
         The fields in question live on the **record detail** panel — select that instead.
      2. **The page is filtered to cases in the reminder batch, so it is empty most of the
         time.** With no record to show, the detail panel renders nothing and its field
         list cannot be reached. Tick **"Generate this month's list"** on Run Monthly
         Reminders first — that button drafts but **sends nothing** — then click a case.
         Re-generating afterwards clears the batch again.

- [ ] *Optional:* add **`Disposed?`** to the **Find a Case** grid so disposed cases can be
      filtered there too. Not currently on it.
- [x] Nothing needed on the Add Case Note popup — `Case Disposed` already appears there

---

## 4. Turn on the reminder queue

Built 9 August 2026 and ready to try — see `AIRTABLE.md`, "The review-and-send front end".
Nothing can send until you do step 2.

- [x] Publish the interface, and turn the "Send approved reminders" automation ON — done
      9 August 2026
- [ ] **Publish again.** The Reminder Queue page was rebuilt to carry the send tick-box in a
      second section beneath the list, so approving and sending happen on one screen. The old
      version is staged for removal and the new one is not live until you publish
- [ ] **Write the four email wordings** in Email Templates — `Standard chaser` (rung 1) has
      old text in it, and `Second chaser`, `Final warning` and `Closing notice` are empty
      shells. Until then a test email arrives nearly blank
- [ ] **Decide who an attorney is reported to**, so the rung 3 wording can be written
- [x] Tested end to end on case 6010, 9 August 2026 — email arrived, both notes logged, the
      BCC'd copy filed itself against the right case, approval cleared, ladder advanced
- [x] Diagnosed the one failure: "No MX record found for saoirse.devaney@example.com" — the
      fake test domain. Confirmed from run history that a bad address does **not** halt the
      batch, and that a failed case keeps its approval and retries
- [ ] **Untick `Approved to Send` on case 6022**, or every future send run will fail on it
      and be flagged "Failed to run". Its address can never receive mail
- [ ] Tell whoever works the queue the rule that needs no machinery: **after hitting send,
      anything still ticked did not go.** A successful send unticks itself; a failed one
      cannot
      for this. Expect **two** notes on the case — one tagged `Email Chaser Sent` (logged
      directly, and what the ladder counts) and one tagged `Email (filed)` (the BCC'd copy
      of the real email, filing itself as evidence). Also check the mail arrives, the
      approval unticks itself, and the case moves to rung 2
- [ ] Check the Reminder Queue page reads well. The full rules are the **field notes on
      `Reminder Stage`** (hover the ⓘ on that column); the page itself carries only the
      warning that cases stay listed even when the attorney has been in touch. If you want
      a proper paragraph on the page instead, it has to be added by hand — dashboards have
      no text element and the API can only write titles, capped at 255 characters
- [ ] **Change Tomasz Wielgus's email back** before real data goes in
- [ ] Once proven, retire the old batch machinery: `Reminder Due`, `In Reminder Batch`,
      `Reminder Email Draft`, `Reminder Email Subject`, the two `Reminder Control` buttons
      and the two `Monthly reminders` automations. **Not before** — until then there are two
      ways to send and they can disagree

---

## 5. The Add Related Party popup

Full specification in `AIRTABLE.md` under "Spec for the Add Related Party popup".

- [ ] Build a popup on **Case Parties** collecting: **`Party`** (required — a row with no
      person reads " — Witness"), `Role`, `Notes`. `Case` fills itself in
- [ ] Add a list of related parties beneath it on the Case Viewer
- [ ] Expect the button's own label to be unchangeable, as with "+ Add case"

---

## 6. Check the attorney popup

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
