"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const Model = require("../Model.js")

describe("Model (Facade)", () => {
  describe("class exports", () => {
    it("exports all domain classes and constants", () => {
      assert.strictEqual(typeof Model.CalendarEvent, "function")
      assert.strictEqual(typeof Model.DateTimeUtils, "function")
      assert.strictEqual(typeof Model.TimezoneResolver, "function")
      assert.strictEqual(typeof Model.RecurrenceRule, "function")
      assert.strictEqual(typeof Model.RecurrenceExpander, "function")
      assert.strictEqual(typeof Model.MeetingLinkDetector, "function")
      assert.strictEqual(typeof Model.IcsParser, "function")
      assert.strictEqual(typeof Model.JsonStateParser, "function")
      assert.strictEqual(typeof Model.FeedConfigParser, "function")
      assert.strictEqual(typeof Model.ScheduleAggregator, "function")
      assert.strictEqual(typeof Model.DisplayFormatter, "function")
      assert.strictEqual(typeof Model.PanelNavigationModel, "function")
      assert.strictEqual(typeof Model.Constants, "object")
    })
  })

  describe("public API delegates", () => {
    it("delegates helper calls to appropriate domain classes", () => {
      assert.strictEqual(Model.toBoolean("true", false), true)
      assert.strictEqual(Model.meetLabel("https://meet.google.com/abc-defg-hij"), "Meet")

      const now = new Date(2026, 7, 28, 9, 0)
      const ev = new Model.CalendarEvent({
        title: "Team Standup",
        start: new Date(2026, 7, 28, 10, 0),
        end: new Date(2026, 7, 28, 10, 30),
        meetUrl: "https://meet.google.com/abc-defg-hij"
      })

      const state = Model.computeScheduleState([ev], now, { lookaheadDays: 3 })
      assert.strictEqual(state.nextMeeting.title, "Team Standup")
      assert.strictEqual(Model.heroHeaderMeta(ev), "30m  ·    Meet")
      assert.strictEqual(Model.barLabel(true, ev, now, 30), "  Team Standup · in 60 min")
    })
  })
})
