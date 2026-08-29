"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { FeedConfigParser } = require("../Model.js")

describe("FeedConfigParser", () => {
  describe("splitIcsFeeds()", () => {
    it("parses comma-separated string feeds with optional labels", () => {
      const feeds = FeedConfigParser.splitIcsFeeds(
        "Work|https://cal.example.com/work.ics, https://cal.example.com/personal.ics"
      )
      assert.strictEqual(feeds.length, 2)
      assert.deepStrictEqual(feeds[0], { url: "https://cal.example.com/work.ics", label: "Work" })
      assert.deepStrictEqual(feeds[1], {
        url: "https://cal.example.com/personal.ics",
        label: undefined
      })
    })

    it("parses JSON list of feed objects", () => {
      const jsonFeeds = FeedConfigParser.splitIcsFeeds(
        '[{"url":"https://a.com","label":"A"},{"url":"https://b.com"}]'
      )
      assert.strictEqual(jsonFeeds.length, 2)
      assert.deepStrictEqual(jsonFeeds[0], { url: "https://a.com", label: "A" })
      assert.deepStrictEqual(jsonFeeds[1], { url: "https://b.com", label: undefined })
    })

    it("returns an empty array when input is empty or null", () => {
      assert.deepStrictEqual(FeedConfigParser.splitIcsFeeds(""), [])
      assert.deepStrictEqual(FeedConfigParser.splitIcsFeeds(null), [])
    })
  })

  describe("dedupeEvents()", () => {
    it("deduplicates events sharing the same UID and start time", () => {
      const e1 = { uid: "u1", start: new Date(2026, 7, 28, 10, 0), feedLabel: "A" }
      const e2 = { uid: "u1", start: new Date(2026, 7, 28, 10, 0), feedLabel: "B" }
      const e3 = { uid: "u1", start: new Date(2026, 7, 29, 10, 0), feedLabel: "A" }

      const deduped = FeedConfigParser.dedupeEvents([e1, e2, e3])
      assert.strictEqual(deduped.length, 2)
      assert.strictEqual(deduped[0], e1)
      assert.strictEqual(deduped[1], e3)
    })
  })

  describe("toBoolean()", () => {
    it("coerces strings, numbers, and booleans correctly with fallback", () => {
      assert.strictEqual(FeedConfigParser.toBoolean(true, false), true)
      assert.strictEqual(FeedConfigParser.toBoolean(false, true), false)
      assert.strictEqual(FeedConfigParser.toBoolean("true", false), true)
      assert.strictEqual(FeedConfigParser.toBoolean("false", true), false)
      assert.strictEqual(FeedConfigParser.toBoolean(1, false), true)
      assert.strictEqual(FeedConfigParser.toBoolean(0, true), false)
      assert.strictEqual(FeedConfigParser.toBoolean(undefined, true), true)
      assert.strictEqual(FeedConfigParser.toBoolean(null, false), false)
    })
  })

  describe("normalizeKey()", () => {
    it("accepts valid alphanumeric characters and punctuation and falls back on invalid values", () => {
      assert.strictEqual(FeedConfigParser.normalizeKey("r", "x"), "r")
      assert.strictEqual(FeedConfigParser.normalizeKey("R", "x"), "r")
      assert.strictEqual(FeedConfigParser.normalizeKey(",", "x"), ",")
      assert.strictEqual(FeedConfigParser.normalizeKey(";", "x"), ";")
      assert.strictEqual(FeedConfigParser.normalizeKey("Ctrl+R", "r"), "r")
      assert.strictEqual(FeedConfigParser.normalizeKey("", "r"), "r")
    })
  })
})
