"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { RecurrenceRule } = require("../Model.js")

describe("RecurrenceRule", () => {
  describe("parseByDay()", () => {
    it("parses weekday strings with positional ordinals", () => {
      const parsed = RecurrenceRule.parseByDay("-1SU,2MO")
      assert.strictEqual(parsed.length, 2)
      assert.deepStrictEqual(parsed[0], { ord: -1, day: 0 })
      assert.deepStrictEqual(parsed[1], { ord: 2, day: 1 })
    })
  })

  describe("parse()", () => {
    it("parses daily rule with frequency, interval, and count", () => {
      const rule = RecurrenceRule.parse("FREQ=DAILY;INTERVAL=2;COUNT=10")
      assert.strictEqual(rule.freq, "DAILY")
      assert.strictEqual(rule.interval, 2)
      assert.strictEqual(rule.count, 10)
    })

    it("parses weekly rule with BYDAY and UNTIL parameters", () => {
      const rule = RecurrenceRule.parse("FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z")
      assert.strictEqual(rule.freq, "WEEKLY")
      assert.strictEqual(rule.byday.length, 3)
      assert.deepStrictEqual(rule.byday[0], { ord: 0, day: 1 })
      assert.deepStrictEqual(rule.byday[1], { ord: 0, day: 3 })
      assert.deepStrictEqual(rule.byday[2], { ord: 0, day: 5 })
      assert.strictEqual(rule.until instanceof Date, true)
    })

    it("returns null when FREQ component is absent", () => {
      assert.strictEqual(RecurrenceRule.parse("INTERVAL=2"), null)
      assert.strictEqual(RecurrenceRule.parse(""), null)
    })
  })
})
