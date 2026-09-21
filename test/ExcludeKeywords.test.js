"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { parseExcludeKeywords, matchesExcludeKeywords } = require("../Model.js")

describe("parseExcludeKeywords()", () => {
  it("splits on commas and trims each keyword", () => {
    assert.deepStrictEqual(parseExcludeKeywords(" Lunch , Focus time,OOO "), [
      "Lunch",
      "Focus time",
      "OOO"
    ])
  })

  it("ignores empty entries", () => {
    assert.deepStrictEqual(parseExcludeKeywords(",Lunch,, ,OOO,"), ["Lunch", "OOO"])
  })

  it("returns an empty list for empty, blank, or non-string input", () => {
    assert.deepStrictEqual(parseExcludeKeywords(""), [])
    assert.deepStrictEqual(parseExcludeKeywords("  , "), [])
    assert.deepStrictEqual(parseExcludeKeywords(null), [])
    assert.deepStrictEqual(parseExcludeKeywords(undefined), [])
  })
})

describe("matchesExcludeKeywords()", () => {
  it("matches a case-insensitive substring of the title", () => {
    assert.strictEqual(matchesExcludeKeywords("Team LUNCH break", ["lunch"]), true)
    assert.strictEqual(matchesExcludeKeywords("focus TIME", ["Focus time"]), true)
  })

  it("matches when any keyword matches", () => {
    assert.strictEqual(matchesExcludeKeywords("OOO all week", ["Lunch", "ooo"]), true)
  })

  it("does not match unrelated titles or an empty keyword list", () => {
    assert.strictEqual(matchesExcludeKeywords("Standup", ["Lunch"]), false)
    assert.strictEqual(matchesExcludeKeywords("Standup", []), false)
  })

  it("treats keywords literally (no regex)", () => {
    assert.strictEqual(matchesExcludeKeywords("Standup", ["st.*up"]), false)
    assert.strictEqual(matchesExcludeKeywords("a.b", ["a.b"]), true)
  })

  it("tolerates a missing title", () => {
    assert.strictEqual(matchesExcludeKeywords(null, ["Lunch"]), false)
  })
})
