"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { IcsParser } = require("../Model.js")

describe("IcsParser", () => {
  describe("unfoldIcs()", () => {
    it("unfolds lines starting with space or tab into single logical lines", () => {
      const raw = "URL:https://meet.google.com/\r\n abc-defg-hij\r\nLOCATION:Room A"
      const lines = IcsParser.unfoldIcs(raw)
      assert.deepStrictEqual(lines, ["URL:https://meet.google.com/abc-defg-hij", "LOCATION:Room A"])
    })
  })

  describe("unescapeIcs()", () => {
    it("decodes escaped commas, semicolons, backslashes, and newlines", () => {
      assert.strictEqual(
        IcsParser.unescapeIcs("Line1\\nLine2\\, with comma\\; and semi\\\\"),
        "Line1\nLine2, with comma; and semi\\"
      )
    })
  })

  describe("caretDecode()", () => {
    it("decodes caret-encoded characters into raw values", () => {
      assert.strictEqual(
        IcsParser.caretDecode("test^nnewline^'quote^^caret"),
        'test\nnewline"quote^caret'
      )
    })
  })

  describe("splitProperty()", () => {
    it("splits property name, parameters and value accurately", () => {
      const prop = IcsParser.splitProperty('DTSTART;TZID="Europe/Warsaw":20260828T100000')
      assert.strictEqual(prop.name, "DTSTART")
      assert.strictEqual(prop.params.TZID, "Europe/Warsaw")
      assert.strictEqual(prop.value, "20260828T100000")
    })
  })

  describe("parse()", () => {
    const NOW = new Date("2026-08-17T09:00:00Z")

    function feed(lines) {
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:test-event-1",
        "DTSTART:20260817T140000Z",
        "DTEND:20260817T150000Z",
        "SUMMARY:Test Event",
        ...lines,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n")
    }

    it("finds Meet link in DESCRIPTION", () => {
      const ics = feed(["DESCRIPTION:Join at https://meet.google.com/abc-defg-hij"])
      const events = IcsParser.parse(ics, { now: NOW })
      assert.strictEqual(events[0].meetUrl, "https://meet.google.com/abc-defg-hij")
    })

    it("finds Meet link in X-GOOGLE-CONFERENCE", () => {
      const ics = feed(["X-GOOGLE-CONFERENCE:https://meet.google.com/xyz-1234-abc"])
      const events = IcsParser.parse(ics, { now: NOW })
      assert.strictEqual(events[0].meetUrl, "https://meet.google.com/xyz-1234-abc")
    })

    it("finds Teams link in X-MICROSOFT-SKYPETEAMSMEETINGURL", () => {
      const ics = feed([
        "X-MICROSOFT-SKYPETEAMSMEETINGURL:https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz"
      ])
      const events = IcsParser.parse(ics, { now: NOW })
      assert.strictEqual(
        events[0].meetUrl,
        "https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz"
      )
    })

    it("reads Zoom link from CONFERENCE property (RFC 7986)", () => {
      const ics = feed(["CONFERENCE;VALUE=URI:https://zoom.us/j/123456789"])
      const events = IcsParser.parse(ics, { now: NOW })
      assert.strictEqual(events[0].meetUrl, "https://zoom.us/j/123456789")
    })

    it("prioritizes Google Meet when event carries multiple provider links", () => {
      const ics = feed([
        "LOCATION:https://zoom.us/j/123456789",
        "DESCRIPTION:Backup Meet link: https://meet.google.com/abc-defg-hij"
      ])
      const events = IcsParser.parse(ics, { now: NOW })
      assert.strictEqual(events[0].meetUrl, "https://meet.google.com/abc-defg-hij")
    })

    it("expands recurring VEVENT and applies EXDATE exclusions", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:daily-standup",
        "DTSTART:20260817T090000Z",
        "DTEND:20260817T093000Z",
        "RRULE:FREQ=DAILY;COUNT=5",
        "EXDATE:20260819T090000Z",
        "SUMMARY:Daily Standup",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n")

      const events = IcsParser.parse(ics, { now: NOW, lookaheadDays: 7 })
      assert.strictEqual(events.length, 4)
    })

    it("parses COLOR property and supports options.calendarColor and options.feedLabel", () => {
      const icsWithColor = feed(["COLOR:#ea4335"])
      const events1 = IcsParser.parse(icsWithColor, { now: NOW })
      assert.strictEqual(events1[0].calendarColor, "#ea4335")

      const icsPlain = feed([])
      const events2 = IcsParser.parse(icsPlain, {
        now: NOW,
        calendarColor: "#4285f4",
        feedLabel: "Work"
      })
      assert.strictEqual(events2[0].calendarColor, "#4285f4")
      assert.strictEqual(events2[0].feedLabel, "Work")
    })

    it("correctly includes rescheduled recurrence overrides (past instance moved forward)", () => {
      // Recurring weekly on Mondays (Aug 10, Aug 17, Aug 24).
      // Aug 10 was in the past relative to NOW (Aug 17 09:00Z).
      // The Aug 10 instance was rescheduled to Aug 18 (tomorrow).
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:recurring-sync",
        "DTSTART:20260810T100000Z",
        "DTEND:20260810T110000Z",
        "RRULE:FREQ=WEEKLY;COUNT=3",
        "SUMMARY:Weekly Sync",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:recurring-sync",
        "RECURRENCE-ID:20260810T100000Z",
        "DTSTART:20260818T140000Z",
        "DTEND:20260818T150000Z",
        "SUMMARY:Weekly Sync Rescheduled",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n")

      const events = IcsParser.parse(ics, { now: NOW, lookaheadDays: 7 })
      const rescheduled = events.find(e => e.title === "Weekly Sync Rescheduled")
      assert.ok(rescheduled, "Rescheduled override from past instance should be included")
      assert.strictEqual(rescheduled.start.toISOString(), "2026-08-18T14:00:00.000Z")
    })

    it("correctly includes rescheduled recurrence overrides (future instance moved earlier)", () => {
      // Recurring bi-weekly. Future instance Aug 31 moved earlier to Aug 19.
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:biweekly-board",
        "DTSTART:20260817T100000Z",
        "DTEND:20260817T110000Z",
        "RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3",
        "SUMMARY:Board Meeting",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:biweekly-board",
        "RECURRENCE-ID:20260831T100000Z",
        "DTSTART:20260819T100000Z",
        "DTEND:20260819T110000Z",
        "SUMMARY:Board Meeting Early",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n")

      // When lookaheadDays is only 3, Aug 31 is far beyond lookahead, but Aug 19 is within 3 days.
      const events = IcsParser.parse(ics, { now: NOW, lookaheadDays: 3 })
      const early = events.find(e => e.title === "Board Meeting Early")
      assert.ok(early, "Future instance moved earlier into view range should be present")
      assert.strictEqual(early.start.toISOString(), "2026-08-19T10:00:00.000Z")
    })

    it("suppresses master occurrence when overridden and ignores cancelled override", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:standup-cancel",
        "DTSTART:20260817T090000Z",
        "DTEND:20260817T093000Z",
        "RRULE:FREQ=DAILY;COUNT=3",
        "SUMMARY:Standup",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:standup-cancel",
        "RECURRENCE-ID:20260818T090000Z",
        "DTSTART:20260818T090000Z",
        "STATUS:CANCELLED",
        "SUMMARY:Standup",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n")

      const events = IcsParser.parse(ics, { now: NOW, lookaheadDays: 5 })
      const aug18 = events.filter(e => e.start.toISOString() === "2026-08-18T09:00:00.000Z")
      assert.strictEqual(aug18.length, 0, "Cancelled occurrence should not be present")
    })
  })

  // parse() must return only events overlapping today through the lookahead
  // horizon. Work feeds carry years of finished one-off meetings, and keeping
  // them all costs hundreds of MB in the shell's JS heap.
  describe("parse() lookahead window", () => {
    // 09:00 local on Mon 17 Aug 2026; event times below are floating (local).
    const NOW = new Date(2026, 7, 17, 9, 0, 0)

    function calendar(events) {
      return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events.flat(), "END:VCALENDAR"].join("\r\n")
    }

    function vevent(uid, lines) {
      return ["BEGIN:VEVENT", "UID:" + uid, ...lines, "END:VEVENT"]
    }

    function oneOff(title, start, end) {
      return vevent(title, ["DTSTART:" + start, "DTEND:" + end, "SUMMARY:" + title])
    }

    function titles(raw) {
      return IcsParser.parse(raw, { now: NOW, lookaheadDays: 3 })
        .map(e => e.title)
        .sort()
    }

    it("drops one-off events that ended before today", () => {
      const raw = calendar([
        oneOff("Last year", "20250817T100000", "20250817T110000"),
        oneOff("Yesterday", "20260816T100000", "20260816T110000"),
        oneOff("Today", "20260817T100000", "20260817T110000")
      ])
      assert.deepStrictEqual(titles(raw), ["Today"])
    })

    it("drops one-off events that start after the lookahead horizon", () => {
      const raw = calendar([
        oneOff("In window", "20260819T100000", "20260819T110000"),
        oneOff("Next month", "20260917T100000", "20260917T110000")
      ])
      assert.deepStrictEqual(titles(raw), ["In window"])
    })

    it("keeps events from earlier today and events still in progress", () => {
      const raw = calendar([
        oneOff("Early today", "20260817T070000", "20260817T080000"),
        oneOff("Multi-day", "20260815T090000", "20260818T090000")
      ])
      assert.deepStrictEqual(titles(raw), ["Early today", "Multi-day"])
    })

    it("keeps all-day events for today", () => {
      const raw = calendar([
        vevent("all-day", [
          "DTSTART;VALUE=DATE:20260817",
          "DTEND;VALUE=DATE:20260818",
          "SUMMARY:Holiday"
        ])
      ])
      assert.deepStrictEqual(titles(raw), ["Holiday"])
    })

    it("drops a past override whose instance and new time are both outside the window", () => {
      const raw = calendar([
        vevent("weekly", [
          "DTSTART:20250101T100000",
          "DTEND:20250101T110000",
          "RRULE:FREQ=WEEKLY;BYDAY=WE",
          "SUMMARY:Weekly"
        ]),
        vevent("weekly", [
          "RECURRENCE-ID:20250604T100000",
          "DTSTART:20250605T100000",
          "DTEND:20250605T110000",
          "SUMMARY:Weekly (moved last year)"
        ])
      ])
      assert.deepStrictEqual(titles(raw), ["Weekly"])
    })

    it("suppresses an in-window occurrence that was moved out of the window", () => {
      const raw = calendar([
        vevent("weekly", [
          "DTSTART:20250101T100000",
          "DTEND:20250101T110000",
          "RRULE:FREQ=WEEKLY;BYDAY=WE",
          "SUMMARY:Weekly"
        ]),
        vevent("weekly", [
          "RECURRENCE-ID:20260819T100000",
          "DTSTART:20260902T100000",
          "DTEND:20260902T110000",
          "SUMMARY:Weekly (moved out)"
        ])
      ])
      assert.deepStrictEqual(titles(raw), [])
    })

    it("keeps an override that moves an occurrence into the window", () => {
      const raw = calendar([
        vevent("weekly", [
          "DTSTART:20250101T100000",
          "DTEND:20250101T110000",
          "RRULE:FREQ=WEEKLY;BYDAY=WE",
          "SUMMARY:Weekly"
        ]),
        vevent("weekly", [
          "RECURRENCE-ID:20260819T100000",
          "DTSTART:20260819T150000",
          "DTEND:20260819T160000",
          "SUMMARY:Weekly (moved)"
        ])
      ])
      assert.deepStrictEqual(titles(raw), ["Weekly (moved)"])
    })

    it("keeps recurring occurrences inside the window", () => {
      const raw = calendar([
        vevent("standup", [
          "DTSTART:20250101T100000",
          "DTEND:20250101T110000",
          "RRULE:FREQ=DAILY",
          "SUMMARY:Standup"
        ])
      ])
      const events = IcsParser.parse(raw, { now: NOW, lookaheadDays: 3 })
      assert.ok(events.length >= 3, "expected daily occurrences across the window")
      for (const e of events) assert.strictEqual(e.title, "Standup")
    })

    it("ignores BEGIN:VEVENT text that is not on a line of its own", () => {
      const raw = calendar([
        vevent("quoted", [
          "DTSTART:20260817T100000",
          "DTEND:20260817T110000",
          "SUMMARY:Today",
          "DESCRIPTION:paste BEGIN:VEVENT here"
        ])
      ])
      assert.deepStrictEqual(titles(raw), ["Today"])
    })
  })
})
