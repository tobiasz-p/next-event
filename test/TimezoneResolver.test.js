"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { TimezoneResolver } = require("../Model.js")

describe("TimezoneResolver", () => {
  const tz = new TimezoneResolver()
  const icsLines = [
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Warsaw",
    "BEGIN:STANDARD",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "END:DAYLIGHT",
    "END:VTIMEZONE"
  ]

  describe("parseTzOffset()", () => {
    it("parses positive offset strings into milliseconds", () => {
      assert.strictEqual(tz.parseTzOffset("+0200"), 2 * 3600 * 1000)
      assert.strictEqual(tz.parseTzOffset("+0530"), (5 * 3600 + 30 * 60) * 1000)
    })

    it("parses negative offset strings into milliseconds", () => {
      assert.strictEqual(tz.parseTzOffset("-0500"), -5 * 3600 * 1000)
    })

    it("returns null for malformed offsets", () => {
      assert.strictEqual(tz.parseTzOffset("invalid"), null)
      assert.strictEqual(tz.parseTzOffset(""), null)
    })
  })

  describe("registerVTimezones()", () => {
    it("registers VTIMEZONE transition rules from feed lines", () => {
      tz.registerVTimezones(icsLines)
      assert.strictEqual(Array.isArray(tz.tzTable["Europe/Warsaw"]), true)
      assert.strictEqual(tz.tzTable["Europe/Warsaw"].length, 2)
    })
  })

  describe("zonedToUtc()", () => {
    it("resolves daylight savings time (UTC+2) correctly in summer", () => {
      tz.registerVTimezones(icsLines)
      const summer = tz.zonedToUtc("Europe/Warsaw", 2026, 7, 15, 12, 0, 0)
      assert.strictEqual(summer.toISOString(), "2026-07-15T10:00:00.000Z")
    })

    it("resolves standard time (UTC+1) correctly in winter", () => {
      tz.registerVTimezones(icsLines)
      const winter = tz.zonedToUtc("Europe/Warsaw", 2026, 12, 15, 12, 0, 0)
      assert.strictEqual(winter.toISOString(), "2026-12-15T11:00:00.000Z")
    })

    it("resets previous timezones on new registration", () => {
      tz.registerVTimezones(icsLines)
      assert.strictEqual(!!tz.tzTable["Europe/Warsaw"], true)
      tz.registerVTimezones([])
      assert.strictEqual(tz.tzTable["Europe/Warsaw"], undefined)
    })

    it("falls back to naive local time when Intl is unavailable and VTIMEZONE is missing", () => {
      const origIntl = global.Intl
      try {
        global.Intl = undefined
        const date = tz.zonedToUtc("NonExistent/Zone", 2026, 8, 28, 10, 0, 0)
        assert.strictEqual(date.getFullYear(), 2026)
        assert.strictEqual(date.getMonth(), 7)
        assert.strictEqual(date.getDate(), 28)
        assert.strictEqual(date.getHours(), 10)
      } finally {
        global.Intl = origIntl
      }
    })
  })
})
