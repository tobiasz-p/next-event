"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { DateTimeUtils } = require("../Model.js")

describe("DateTimeUtils", () => {
  describe("pad2()", () => {
    it("pads single digit numbers with a leading zero", () => {
      assert.strictEqual(DateTimeUtils.pad2(5), "05")
      assert.strictEqual(DateTimeUtils.pad2(0), "00")
    })

    it("leaves double digit numbers unchanged", () => {
      assert.strictEqual(DateTimeUtils.pad2(12), "12")
      assert.strictEqual(DateTimeUtils.pad2(59), "59")
    })
  })

  describe("isSameDay()", () => {
    it("returns true when two dates share the same calendar day", () => {
      const d1 = new Date(2026, 7, 28, 10, 0, 0)
      const d2 = new Date(2026, 7, 28, 18, 30, 0)
      assert.strictEqual(DateTimeUtils.isSameDay(d1, d2), true)
    })

    it("returns false when two dates fall on different calendar days", () => {
      const d1 = new Date(2026, 7, 28, 10, 0, 0)
      const d3 = new Date(2026, 7, 29, 10, 0, 0)
      assert.strictEqual(DateTimeUtils.isSameDay(d1, d3), false)
    })
  })

  describe("daysInMonthUTC()", () => {
    it("calculates days in non-leap and leap months correctly", () => {
      assert.strictEqual(DateTimeUtils.daysInMonthUTC(2026, 2), 28)
      assert.strictEqual(DateTimeUtils.daysInMonthUTC(2024, 2), 29)
      assert.strictEqual(DateTimeUtils.daysInMonthUTC(2026, 8), 31)
      assert.strictEqual(DateTimeUtils.daysInMonthUTC(2026, 9), 30)
    })
  })

  describe("dayKey()", () => {
    it("encodes year, month, and day into an integer date key", () => {
      assert.strictEqual(DateTimeUtils.dayKey(2026, 8, 28), 20260828)
    })
  })

  describe("keyToParts()", () => {
    it("decodes integer date key into year, month, and day components", () => {
      assert.deepStrictEqual(DateTimeUtils.keyToParts(20260828), { y: 2026, mo: 8, d: 28 })
    })
  })

  describe("addDaysToKey()", () => {
    it("advances or rewinds date key across month and year boundaries", () => {
      assert.strictEqual(DateTimeUtils.addDaysToKey(20260828, 4), 20260901)
      assert.strictEqual(DateTimeUtils.addDaysToKey(20260901, -4), 20260828)
    })
  })

  describe("weekdayOfKey()", () => {
    it("computes correct day of the week for given date key", () => {
      // 2026-08-28 is Friday (day 5)
      assert.strictEqual(DateTimeUtils.weekdayOfKey(20260828), 5)
    })
  })

  describe("startOfDay()", () => {
    it("returns midnight timestamp for a given date", () => {
      const d = new Date(2026, 7, 28, 15, 30, 45)
      const startMs = DateTimeUtils.startOfDay(d)
      const start = new Date(startMs)
      assert.strictEqual(start.getHours(), 0)
      assert.strictEqual(start.getMinutes(), 0)
      assert.strictEqual(start.getSeconds(), 0)
      assert.strictEqual(start.getDate(), 28)
    })
  })

  describe("parseRfcDate()", () => {
    it("parses trailing Z date-times as UTC", () => {
      const parsed = DateTimeUtils.parseRfcDate("20260828T143000Z")
      assert.strictEqual(parsed.utc, true)
      assert.strictEqual(parsed.allDay, false)
      assert.strictEqual(parsed.date.toISOString(), "2026-08-28T14:30:00.000Z")
    })

    it("parses 8-digit date strings as all-day events", () => {
      const parsed = DateTimeUtils.parseRfcDate("20260828")
      assert.strictEqual(parsed.allDay, true)
      assert.strictEqual(parsed.date.getFullYear(), 2026)
      assert.strictEqual(parsed.date.getMonth(), 7)
      assert.strictEqual(parsed.date.getDate(), 28)
    })

    it("returns null for malformed or empty date strings", () => {
      assert.strictEqual(DateTimeUtils.parseRfcDate(""), null)
      assert.strictEqual(DateTimeUtils.parseRfcDate(null), null)
      assert.strictEqual(DateTimeUtils.parseRfcDate("invalid-date"), null)
    })
  })

  describe("parseIsoDate()", () => {
    it("parses YYYY-MM-DD as all-day", () => {
      const parsed = DateTimeUtils.parseIsoDate("2026-08-28")
      assert.strictEqual(parsed.allDay, true)
      assert.strictEqual(parsed.date.getFullYear(), 2026)
      assert.strictEqual(parsed.date.getMonth(), 7)
      assert.strictEqual(parsed.date.getDate(), 28)
    })

    it("parses full ISO date-time strings as timed events", () => {
      const parsed = DateTimeUtils.parseIsoDate("2026-08-28T14:30:00Z")
      assert.strictEqual(parsed.allDay, false)
      assert.strictEqual(parsed.date.toISOString(), "2026-08-28T14:30:00.000Z")
    })

    it("handles Date instances and epoch timestamps", () => {
      const d = new Date("2026-08-28T14:30:00Z")
      assert.strictEqual(DateTimeUtils.parseIsoDate(d).date.getTime(), d.getTime())
      assert.strictEqual(DateTimeUtils.parseIsoDate(d.getTime()).date.getTime(), d.getTime())
    })

    it("returns null for null, empty, or unparseable input", () => {
      assert.strictEqual(DateTimeUtils.parseIsoDate(null), null)
      assert.strictEqual(DateTimeUtils.parseIsoDate(""), null)
      assert.strictEqual(DateTimeUtils.parseIsoDate("not-a-date"), null)
    })
  })
})
