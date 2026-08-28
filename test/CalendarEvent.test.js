"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { CalendarEvent } = require("../Model.js")

describe("CalendarEvent", () => {
  describe("constructor", () => {
    it("sets default property values when passed empty data", () => {
      const ev = new CalendarEvent()
      assert.strictEqual(ev.uid, null)
      assert.strictEqual(ev.title, "(Untitled)")
      assert.strictEqual(ev.start, null)
      assert.strictEqual(ev.end, null)
      assert.strictEqual(ev.allDay, false)
      assert.strictEqual(ev.meetUrl, null)
      assert.strictEqual(ev.location, "")
      assert.strictEqual(ev.description, "")
      assert.strictEqual(ev.calendarName, "")
      assert.strictEqual(ev.feedLabel, null)
      assert.strictEqual(ev.calendarColor, null)
      assert.strictEqual(ev.eventUrl, null)
    })
  })

  describe("isAllDay()", () => {
    it("returns true when allDay flag is explicitly true", () => {
      const ev = new CalendarEvent({ allDay: true })
      assert.strictEqual(ev.isAllDay(), true)
    })

    it("returns true for midnight-to-midnight 24-hour events", () => {
      const ev = new CalendarEvent({
        start: new Date(2026, 7, 28, 0, 0, 0),
        end: new Date(2026, 7, 29, 0, 0, 0)
      })
      assert.strictEqual(ev.isAllDay(), true)
    })

    it("returns false for daytime timed meetings", () => {
      const ev = new CalendarEvent({
        start: new Date(2026, 7, 28, 10, 0, 0),
        end: new Date(2026, 7, 28, 11, 30, 0)
      })
      assert.strictEqual(ev.isAllDay(), false)
    })

    it("returns false for a 24-hour event that starts at non-midnight hours", () => {
      const ev = new CalendarEvent({
        start: new Date(2026, 7, 28, 10, 0, 0),
        end: new Date(2026, 7, 29, 10, 0, 0)
      })
      assert.strictEqual(ev.isAllDay(), false)
    })
  })

  describe("duration()", () => {
    it("returns explicit durationMs if present", () => {
      const ev = new CalendarEvent({ durationMs: 45 * 60 * 1000 })
      assert.strictEqual(ev.duration(), 45 * 60 * 1000)
    })

    it("calculates difference between start and end", () => {
      const ev = new CalendarEvent({
        start: new Date(2026, 7, 28, 10, 0, 0),
        end: new Date(2026, 7, 28, 11, 30, 0)
      })
      assert.strictEqual(ev.duration(), 90 * 60 * 1000)
    })

    it("defaults to full day duration for all-day events without end date", () => {
      const ev = new CalendarEvent({ allDay: true })
      assert.strictEqual(ev.duration(), 24 * 60 * 60 * 1000)
    })
  })

  describe("isOngoing()", () => {
    const start = new Date(2026, 7, 28, 10, 0, 0)
    const end = new Date(2026, 7, 28, 11, 0, 0)
    const ev = new CalendarEvent({ start: start, end: end })

    it("returns false before start time", () => {
      assert.strictEqual(ev.isOngoing(new Date(2026, 7, 28, 9, 59, 59)), false)
    })

    it("returns true between start and end time", () => {
      assert.strictEqual(ev.isOngoing(new Date(2026, 7, 28, 10, 30, 0)), true)
    })

    it("returns false at or after end time", () => {
      assert.strictEqual(ev.isOngoing(new Date(2026, 7, 28, 11, 0, 0)), false)
    })
  })

  describe("isUpcoming()", () => {
    const start = new Date(2026, 7, 28, 10, 0, 0)
    const end = new Date(2026, 7, 28, 11, 0, 0)
    const ev = new CalendarEvent({ start: start, end: end })

    it("returns true while end time has not passed", () => {
      assert.strictEqual(ev.isUpcoming(new Date(2026, 7, 28, 9, 0, 0)), true)
      assert.strictEqual(ev.isUpcoming(new Date(2026, 7, 28, 10, 30, 0)), true)
    })

    it("returns false after event end time", () => {
      assert.strictEqual(ev.isUpcoming(new Date(2026, 7, 28, 11, 0, 1)), false)
    })
  })

  describe("calendarUrl()", () => {
    it("returns direct eventUrl when present", () => {
      const ev = new CalendarEvent({ eventUrl: "https://custom.cal/event/123" })
      assert.strictEqual(ev.calendarUrl(), "https://custom.cal/event/123")
    })

    it("formats google calendar /r path when fallback base URL is provided", () => {
      const ev = new CalendarEvent()
      assert.strictEqual(
        ev.calendarUrl("https://calendar.google.com/calendar"),
        "https://calendar.google.com/calendar/r"
      )
      assert.strictEqual(
        ev.calendarUrl("https://calendar.google.com/calendar/u/2/r"),
        "https://calendar.google.com/calendar/u/2/r"
      )
    })
  })
})
