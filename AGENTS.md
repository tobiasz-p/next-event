# AGENTS.md

Omarchy (Quickshell) bar-widget plugin that shows the next calendar event and
lets you click to join Google Meet. NOT a Node app — the runtime is QML.

## Architecture

- `manifest.json` is the plugin descriptor; `entryPoints.barWidget` = `BarWidget.qml`. `kinds: ["bar-widget"]`.
- QML layer: `BarWidget.qml` (bar widget, ~276 lines) and `Panel.qml` (agenda panel, ~532 lines). These own all Qt/Quickshell UI, fetching (Quickshell.Io), and widget settings.
- `Model.js` is the pure-JS core: iCalendar parsing, RRULE/DTSTART recurrence expansion, VTIMEZONE/DST handling, display labels. No Qt/Quickshell imports.
- Model.js is imported two ways: QML does `import "Model.js" as Model`; Node does `require("./Model.js")` for tests. Keep every function top-level (QML exposes them directly) and keep the `module.exports` guard at the bottom — the guard is what makes it require-able in Node.

## Critical runtime constraint

- QML's V4 engine has **no `Intl`**. Model.js must work without it. Timezone resolution order is: VTIMEZONE table → `Intl` if the engine has it → naive local fallback. Do not add `Intl`-dependent logic to Model.js without a fallback (there is a dedicated test simulating the no-Intl engine).
- TZID table (`TZ_TABLE`) is reset at the start of every `parseIcs`/`registerVTimezones`. A feed that drops a zone must not resolve against stale data — this is a tested invariant; don't make the table accumulate across parses.
- Keep Model.js dependency-free (pure). The QML sandbox cannot load npm packages; runtime deps are not possible.

## Tests

```sh
npm test          # node --test "test/*.test.js"
```

Only one suite: `test/timezones.test.js`. It covers `parseTzOffset`, VTIMEZONE
DST transitions (BYDAY incl. negative ordinals, BYMONTHDAY), `zonedToUtc`
round-trips against the system tz database, no-Intl fallback, per-parse table
reset, and end-to-end `parseIcs` with `TZID` events. Add new model logic to
this file using the existing `block()`/`register()` helpers. No lint,
formatter, or typecheck is configured.

## Workflow conventions

- Contributions follow Conventional Commits (`feat:`, `fix:`, `docs:`, ...) and a strictly linear history (rebase, no merge commits). See README's Contributing section.
- Widget settings are configured via `omarchy bar set tobiasz-p.next-event <key> <value>`; defaults live in the README table (e.g. `icsUrl`, `refreshMinutes`, `showDaysAhead`).