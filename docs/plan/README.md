# How the build is run

**Opus plans, Sonnet builds.** Opus writes and reviews these task sheets. Sonnet (or any session) picks up
one sheet and does it without needing earlier chat history. Each sheet is self-contained: goal, files to
read, steps, checks, and what not to touch.

## Rules for a worker session
1. Read `CLAUDE.md`, then only the task sheet you were given and the files it lists. Don't read the whole repo.
2. Do the steps in order. If a step's assumption turns out wrong (a column is missing, a file has a different
   shape), stop and write what you found under **Findings** in the sheet. Don't invent a workaround.
3. Run the checks at the bottom. All must pass before you commit.
4. Tick the sheet's status in the table below and commit with the task id in the message (`T1.2: ...`).
5. Never commit raw data files, `.env` or anything with personal data.

## Rules for the planner (Opus)
- Before a milestone starts, write its sheets. After each sheet is done, review the diff and the Findings,
  then adjust the next sheets.
- Keep each sheet small enough for one session: one importer, one page, one calculation.

## Status

| Task | Sheet | Status |
| --- | --- | --- |
| M0 | Setup (PR #1) | Done |
| T1.1 | [Profile the DLD files](M1-T1.1-profile-files.md) | Done (see docs/datasets.md) |
| T1.2 | [Load communities](M1-T1.2-load-communities.md) | Done |
| T1.3 | [Import sales and rents](M1-T1.3-import-sales-rents.md) | Code done, real files pending |
| T1.4 | [Matching test](M1-T1.4-matching-test.md) | After T1.2, T1.3; needs a footprint source |
