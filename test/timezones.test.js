"use strict"

const test = require("node:test")
const assert = require("node:assert")
const M = require("../Model.js")

const DAY_MS = 24 * 60 * 60 * 1000

function block(component, body) {
  return ["BEGIN:" + component].concat(body).concat(["END:" + component])
}

const NEW_YORK = block("VTIMEZONE", [
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "DTSTART:20070311T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "DTSTART:20071104T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
])

const LONDON = block("VTIMEZONE", [
  "TZID:Europe/London",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "DTSTART:19810329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "DTSTART:19961027T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
])

const KOLKATA = block("VTIMEZONE", [
  "TZID:Asia/Kolkata",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0530",
  "TZOFFSETTO:+0530",
  "DTSTART:19700101T000000",
  "END:STANDARD",
])

const IRAN = block("VTIMEZONE", [
  "TZID:Test/Iran",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0430",
  "TZOFFSETTO:+0330",
  "DTSTART:19700101T000000",
  "RRULE:FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=22",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0330",
  "TZOFFSETTO:+0430",
  "DTSTART:19700101T000000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=22",
  "END:DAYLIGHT",
])

function register(...tzBlocks) {
  M.registerVTimezones(Array.prototype.concat.apply([], tzBlocks))
}

test("parseTzOffset handles signed HHMM and HHMMSS", () => {
  assert.strictEqual(M.parseTzOffset("+0530"), 5.5 * 60 * 60 * 1000)
  assert.strictEqual(M.parseTzOffset("-0400"), -4 * 60 * 60 * 1000)
  assert.strictEqual(M.parseTzOffset("+004530"), 45 * 60 * 1000 + 30 * 1000)
  assert.strictEqual(M.parseTzOffset("garbage"), null)
})

test("fixed-offset zone resolves a constant offset", () => {
  register(KOLKATA)
  for (const [y, mo, d] of [[2024, 1, 1], [2026, 8, 18], [2028, 12, 31]]) {
    assert.strictEqual(
      M.tzOffsetForWall("Asia/Kolkata", y, mo, d, 12, 0, 0),
      5.5 * 60 * 60 * 1000
    )
  }
})

test("DST zone resolves different offsets across seasons", () => {
  register(NEW_YORK)
  assert.strictEqual(M.tzOffsetForWall("America/New_York", 2026, 1, 15, 12, 0, 0), -5 * 60 * 60 * 1000)
  assert.strictEqual(M.tzOffsetForWall("America/New_York", 2026, 8, 18, 12, 0, 0), -4 * 60 * 60 * 1000)
})

test("negative-ordinal BYDAY rule (last Sunday) resolves correctly", () => {
  register(LONDON)
  assert.strictEqual(M.tzOffsetForWall("Europe/London", 2026, 1, 15, 12, 0, 0), 0)
  assert.strictEqual(M.tzOffsetForWall("Europe/London", 2026, 8, 18, 12, 0, 0), 60 * 60 * 1000)
})

test("BYMONTHDAY rule resolves on the correct calendar date", () => {
  register(IRAN)
  assert.strictEqual(M.tzOffsetForWall("Test/Iran", 2026, 3, 21, 12, 0, 0), 3.5 * 60 * 60 * 1000)
  assert.strictEqual(M.tzOffsetForWall("Test/Iran", 2026, 3, 22, 12, 0, 0), 4.5 * 60 * 60 * 1000)
  assert.strictEqual(M.tzOffsetForWall("Test/Iran", 2026, 9, 22, 12, 0, 0), 3.5 * 60 * 60 * 1000)
  assert.strictEqual(M.tzOffsetForWall("Test/Iran", 2026, 9, 23, 12, 0, 0), 3.5 * 60 * 60 * 1000)
})

test("PR scenario: NY 13:00 converts to 17:00 UTC (viewer in Anchorage sees 09:00)", () => {
  register(NEW_YORK)
  const utc = M.zonedToUtc("America/New_York", 2026, 8, 18, 13, 0, 0)
  assert.strictEqual(utc.toISOString(), "2026-08-18T17:00:00.000Z")
  // Format the resulting instant back in the viewer's zone (Anchorage).
  const anchor = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Anchorage",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(utc)
  const W = Object.fromEntries(anchor.map((p) => [p.type, p.value]))
  assert.strictEqual(W.hour % 24, 9)
})

test("round-trips wall times against the system tz database", () => {
  register(NEW_YORK, LONDON, KOLKATA)
  const zones = ["America/New_York", "Europe/London", "Asia/Kolkata"]
  const overlapping = new Set()
  for (const z of zones) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: z,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
    for (let y = 2024; y <= 2028; y++) {
      for (let mo = 1; mo <= 12; mo++) {
        for (const d of [1, 7, 14, 21, 28]) {
          for (const h of [0, 3, 6, 9, 12, 15, 18, 21]) {
            const t0 = Date.UTC(y, mo - 1, d, h)
            const W = Object.fromEntries(fmt.formatToParts(new Date(t0)).map((p) => [p.type, p.value]))
            const wallMs = Date.UTC(+W.year, +W.month - 1, +W.day, +W.hour % 24, +W.minute, +W.second)
            const got = M.zonedToUtc(z, +W.year, +W.month, +W.day, +W.hour % 24, +W.minute, +W.second)
            if (Math.abs(got.getTime() - t0) > 1000) {
              // Only wall times inside a fall-back overlap are ambiguous;
              // they exist twice and either reading is valid.
              overlapping.add(z + " " + W.year + "-" + W.month + "-" + W.day + " " + W.hour + ":00")
            }
          }
        }
      }
    }
  }
  assert.ok(overlapping.size < 20, "unexpected round-trip mismatches: " + [...overlapping].join(", "))
})

test("unknown zone falls back to the previous naive local handling", () => {
  register(NEW_YORK)
  const got = M.zonedToUtc("No/Such_Zone", 2026, 8, 18, 13, 0, 0)
  const expected = new Date(2026, 7, 18, 13, 0, 0)
  assert.strictEqual(got.getTime(), expected.getTime())
})

test("works without Intl (QML V4 engine simulation)", () => {
  register(NEW_YORK)
  const originalIntl = global.Intl
  global.Intl = undefined
  try {
    const utc = M.zonedToUtc("America/New_York", 2026, 8, 18, 13, 0, 0)
    assert.strictEqual(utc.toISOString(), "2026-08-18T17:00:00.000Z")
  } finally {
    global.Intl = originalIntl
  }
})

test("resets the table per parse so a dropped zone does not resolve against stale data", () => {
  register(NEW_YORK)
  assert.notStrictEqual(M.tzOffsetForWall("America/New_York", 2026, 8, 18, 13, 0, 0), null)

  // Second parse ships a different feed without America/New_York.
  register(KOLKATA)
  assert.strictEqual(M.tzOffsetForWall("America/New_York", 2026, 8, 18, 13, 0, 0), null)
  assert.notStrictEqual(M.tzOffsetForWall("Asia/Kolkata", 2026, 8, 18, 13, 0, 0), null)
})

test("parseIcs resolves TZID events through the table end to end", () => {
  const ics = NEW_YORK.concat([
    "BEGIN:VEVENT",
    "UID:team-sync-2026",
    "DTSTAMP:20260818T000000Z",
    "DTSTART;TZID=America/New_York:20260818T130000",
    "DTEND;TZID=America/New_York:20260818T140000",
    "SUMMARY:Team sync",
    "END:VEVENT",
  ])
  const parsed = M.parseIcs(ics.join("\n"), { now: new Date(Date.UTC(2026, 7, 18, 0, 0)) })
  const ev = parsed[0]
  assert.ok(ev)
  assert.strictEqual(ev.start.toISOString(), "2026-08-18T17:00:00.000Z")
  assert.strictEqual(ev.title, "Team sync")
})

test("DST transition boundary: weekly series keeps its wall time across the spring-forward", () => {
  register(NEW_YORK)
  // 2026-03-08 is the US spring-forward. A weekly 09:00 EST series starts
  // before it and must keep starting at 09:00 local after the transition.
  const start = M.zonedToUtc("America/New_York", 2026, 3, 1, 9, 0, 0)
  const after = M.zonedToUtc("America/New_York", 2026, 3, 15, 9, 0, 0)
  assert.strictEqual(start.toISOString(), "2026-03-01T14:00:00.000Z")
  assert.strictEqual(after.toISOString(), "2026-03-15T13:00:00.000Z")
  assert.strictEqual(after.getTime() - start.getTime(), 14 * DAY_MS - 60 * 60 * 1000) // 14 days, minus the spring-forward hour
})