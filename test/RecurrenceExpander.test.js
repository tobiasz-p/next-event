"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { RecurrenceExpander, RecurrenceRule, TimezoneResolver } = require("../Model.js")

describe("RecurrenceExpander", () => {
  const tzResolver = new TimezoneResolver()
  const expander = new RecurrenceExpander(tzResolver)

  describe("expandOccurrences()", () => {
    it("generates daily occurrences up to count limit", () => {
      const startKey = 20260824
      const tzInfo = { utc: true, h: 9, mi: 0, s: 0 }
      const rule = RecurrenceRule.parse("FREQ=DAILY;INTERVAL=1;COUNT=5")

      const occs = expander.expandOccurrences(startKey, tzInfo, rule, 20260824, 7, 10)
      assert.strictEqual(occs.length, 5)
      assert.strictEqual(occs[0].toISOString(), "2026-08-24T09:00:00.000Z")
      assert.strictEqual(occs[4].toISOString(), "2026-08-28T09:00:00.000Z")
    })

    it("generates weekly occurrences only on specified BYDAY days", () => {
      const startKey = 20260824 // Monday
      const tzInfo = { utc: true, h: 10, mi: 0, s: 0 }
      const rule = RecurrenceRule.parse("FREQ=WEEKLY;BYDAY=TU,TH")

      const occs = expander.expandOccurrences(startKey, tzInfo, rule, 20260824, 7, 10)
      assert.strictEqual(occs.length, 2)
      assert.strictEqual(occs[0].toISOString(), "2026-08-25T10:00:00.000Z")
      assert.strictEqual(occs[1].toISOString(), "2026-08-27T10:00:00.000Z")
    })
  })
})
