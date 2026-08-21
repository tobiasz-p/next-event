# AGENTS.md

Omarchy (Quickshell) bar-widget plugin that shows the next calendar event and
lets you click to join Google Meet. NOT a Node app — the runtime is QML.

## Architecture

- `manifest.json` is the plugin descriptor; `entryPoints.barWidget` = `BarWidget.qml`. `kinds: ["bar-widget"]`.
- QML layer: `BarWidget.qml` (bar widget, ~276 lines) and `Panel.qml` (agenda panel, ~532 lines). These own all Qt/Quickshell UI, fetching (Quickshell.Io), and widget settings.
- `Model.js` is the pure-JS core: iCalendar parsing, RRULE/DTSTART recurrence expansion, VTIMEZONE/DST handling, display labels. No Qt/Quickshell imports.
- Model.js is loaded two ways: QML does `import "Model.js" as Model`; a Node runtime does `require("./Model.js")`. Keep every function top-level (QML exposes them directly) and keep the `module.exports` guard at the bottom — the guard is what makes it require-able in Node.

## Critical runtime constraint

- QML's V4 engine has **no `Intl`**. Model.js must work without it. Timezone resolution order is: VTIMEZONE table → `Intl` if the engine has it → naive local fallback. Do not add `Intl`-dependent logic to Model.js without a fallback.
- TZID table (`TZ_TABLE`) is reset at the start of every `parseIcs`/`registerVTimezones`. A feed that drops a zone must not resolve against stale data; don't make the table accumulate across parses.
- Keep Model.js dependency-free (pure). The QML sandbox cannot load npm packages; runtime deps are not possible.

## Workflow conventions

- Contributions follow Conventional Commits (`feat:`, `fix:`, `docs:`, ...) and a strictly linear history (rebase, no merge commits). See README's Contributing section.
- Widget settings are configured via `omarchy bar set tobiasz-p.next-event <key> <value>`; defaults live in the README table (e.g. `icsUrl`, `refreshMinutes`, `showDaysAhead`).

## Releasing

- Merge all PRs **before** tagging. The marketplace verifies exact commit snapshots, which are immutable once published — a feature missing from a tagged release can only be fixed by cutting a new version, never by moving the tag.
- Semver from Conventional Commits: `fix:` → patch, `feat:` → minor, breaking → major.
- Bump `version` in `manifest.json`, commit as `chore: bump version to X.Y.Z`, then tag without the `v` prefix and push both:
  `git tag -a X.Y.Z -m "X.Y.Z" && git push origin main X.Y.Z`
- Create the GitHub release with notes covering changes since the previous tag:
  `gh release create X.Y.Z --title "X.Y.Z" --notes "..."`
- Ask for marketplace verification with a `[Verify]` issue on HANCORE-linux/omarchy-plugin-marketplace (verify-plugin.yml template): action "Verify and publish a newer upstream commit", plugin ID `tobiasz-p.next-event`, repo URL, and the full 40-char SHA of the release commit. A bot validates, runs a security baseline, then a maintainer applies `approved-and-verified` and publishes that exact snapshot.