"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { FeedConfigParser } = require("../Model.js")

describe("FeedConfigParser", () => {
  describe("splitIcsFeeds()", () => {
    it("parses comma-separated string feeds with optional labels and assigns palette colors", () => {
      const feeds = FeedConfigParser.splitIcsFeeds(
        "Work|https://cal.example.com/work.ics, https://cal.example.com/personal.ics"
      )
      assert.strictEqual(feeds.length, 2)
      assert.deepStrictEqual(feeds[0], {
        url: "https://cal.example.com/work.ics",
        label: "Work",
        color: "#4285f4"
      })
      assert.deepStrictEqual(feeds[1], {
        url: "https://cal.example.com/personal.ics",
        label: undefined,
        color: "#34a853"
      })
    })

    it("parses custom colors in pipe format for label+color or color-only", () => {
      const feeds = FeedConfigParser.splitIcsFeeds(
        "Work|#ea4335|https://cal.example.com/work.ics, #06b6d4|https://cal.example.com/other.ics"
      )
      assert.strictEqual(feeds.length, 2)
      assert.deepStrictEqual(feeds[0], {
        url: "https://cal.example.com/work.ics",
        label: "Work",
        color: "#ea4335"
      })
      assert.deepStrictEqual(feeds[1], {
        url: "https://cal.example.com/other.ics",
        label: undefined,
        color: "#06b6d4"
      })
    })

    it("parses JSON list of feed objects with explicit or default colors", () => {
      const jsonFeeds = FeedConfigParser.splitIcsFeeds(
        '[{"url":"https://a.com","label":"A","color":"#ea4335"},{"url":"https://b.com"}]'
      )
      assert.strictEqual(jsonFeeds.length, 2)
      assert.deepStrictEqual(jsonFeeds[0], { url: "https://a.com", label: "A", color: "#ea4335" })
      assert.deepStrictEqual(jsonFeeds[1], {
        url: "https://b.com",
        label: undefined,
        color: "#34a853"
      })
    })

    it("returns an empty array when input is empty or null", () => {
      assert.deepStrictEqual(FeedConfigParser.splitIcsFeeds(""), [])
      assert.deepStrictEqual(FeedConfigParser.splitIcsFeeds(null), [])
    })
  })

  describe("isValidHexColor()", () => {
    it("validates 3, 6, and 8 character hex colors", () => {
      assert.strictEqual(FeedConfigParser.isValidHexColor("#fff"), true)
      assert.strictEqual(FeedConfigParser.isValidHexColor("#4285f4"), true)
      assert.strictEqual(FeedConfigParser.isValidHexColor("#4285f4ff"), true)
      assert.strictEqual(FeedConfigParser.isValidHexColor("4285f4"), false)
      assert.strictEqual(FeedConfigParser.isValidHexColor("#xyz"), false)
      assert.strictEqual(FeedConfigParser.isValidHexColor(null), false)
      assert.strictEqual(FeedConfigParser.isValidHexColor(""), false)
    })
  })

  describe("pickCalendarColor()", () => {
    it("picks deterministic palette colors based on index or seed", () => {
      assert.strictEqual(FeedConfigParser.pickCalendarColor("", 0), "#4285f4")
      assert.strictEqual(FeedConfigParser.pickCalendarColor("", 1), "#34a853")
      assert.strictEqual(typeof FeedConfigParser.pickCalendarColor("Work"), "string")
      assert.strictEqual(FeedConfigParser.pickCalendarColor("Work").startsWith("#"), true)
    })
  })

  describe("hsvToHex() and hexToHsv()", () => {
    it("converts HSV coordinates to Hex strings accurately", () => {
      assert.strictEqual(FeedConfigParser.hsvToHex(0, 1, 1), "#ff0000")
      assert.strictEqual(FeedConfigParser.hsvToHex(1 / 3, 1, 1), "#00ff00")
      assert.strictEqual(FeedConfigParser.hsvToHex(2 / 3, 1, 1), "#0000ff")
      assert.strictEqual(FeedConfigParser.hsvToHex(0, 0, 1), "#ffffff")
      assert.strictEqual(FeedConfigParser.hsvToHex(0, 0, 0), "#000000")
    })

    it("converts Hex strings to HSV coordinates", () => {
      const red = FeedConfigParser.hexToHsv("#ff0000")
      assert.strictEqual(red.h, 0)
      assert.strictEqual(red.s, 1)
      assert.strictEqual(red.v, 1)

      const white = FeedConfigParser.hexToHsv("#ffffff")
      assert.strictEqual(white.s, 0)
      assert.strictEqual(white.v, 1)

      const fallback = FeedConfigParser.hexToHsv("invalid")
      assert.deepStrictEqual(fallback, { h: 0, s: 1, v: 1 })
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

  describe("parseTimeFormat() and is12Hour()", () => {
    it("parses valid 12-hour values and flags 12-hour mode", () => {
      assert.strictEqual(FeedConfigParser.parseTimeFormat("12"), "12")
      assert.strictEqual(FeedConfigParser.parseTimeFormat(12), "12")

      assert.strictEqual(FeedConfigParser.is12Hour("12"), true)
      assert.strictEqual(FeedConfigParser.is12Hour(12), true)
    })

    it("falls back to 24-hour mode for all other values", () => {
      assert.strictEqual(FeedConfigParser.parseTimeFormat("24"), "24")
      assert.strictEqual(FeedConfigParser.parseTimeFormat(24), "24")
      assert.strictEqual(FeedConfigParser.parseTimeFormat("auto"), "24")
      assert.strictEqual(FeedConfigParser.parseTimeFormat(false), "24")
      assert.strictEqual(FeedConfigParser.parseTimeFormat(null), "24")
      assert.strictEqual(FeedConfigParser.parseTimeFormat(undefined), "24")

      assert.strictEqual(FeedConfigParser.is12Hour("24"), false)
      assert.strictEqual(FeedConfigParser.is12Hour(24), false)
      assert.strictEqual(FeedConfigParser.is12Hour(false), false)
      assert.strictEqual(FeedConfigParser.is12Hour(null), false)
      assert.strictEqual(FeedConfigParser.is12Hour(undefined), false)
    })
  })
})
