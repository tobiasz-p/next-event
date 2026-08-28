"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { DisplayFormatter, CalendarEvent } = require("../Model.js")

describe("DisplayFormatter", () => {
  const now = new Date(2026, 7, 28, 9, 0, 0)

  const timedEvent = new CalendarEvent({
    uid: "e1",
    title: "Sprint Review",
    start: new Date(2026, 7, 28, 10, 0, 0),
    end: new Date(2026, 7, 28, 11, 0, 0),
    allDay: false,
    meetUrl: "https://meet.google.com/abc",
    feedLabel: "Work"
  })

  const allDayToday = new CalendarEvent({
    uid: "e2",
    title: "Hackathon",
    start: new Date(2026, 7, 28, 0, 0, 0),
    end: new Date(2026, 7, 29, 0, 0, 0),
    allDay: true
  })

  const allDayTmrw = new CalendarEvent({
    uid: "e3",
    title: "Offsite",
    start: new Date(2026, 7, 29, 0, 0, 0),
    end: new Date(2026, 7, 30, 0, 0, 0),
    allDay: true
  })

  describe("hm()", () => {
    it("formats hours and minutes with leading zero", () => {
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 9, 5, 0)), "09:05")
    })
  })

  describe("timeRange()", () => {
    it("formats timed range and all-day label", () => {
      assert.strictEqual(
        DisplayFormatter.timeRange(timedEvent.start, timedEvent.end, false),
        "10:00–11:00"
      )
      assert.strictEqual(
        DisplayFormatter.timeRange(allDayToday.start, allDayToday.end, true),
        "All day"
      )
    })
  })

  describe("formatLabel()", () => {
    it("formats upcoming timed event with relative minutes", () => {
      assert.strictEqual(
        DisplayFormatter.formatLabel(timedEvent, now, 30),
        "Sprint Review · in 60 min"
      )
    })

    it("formats today's all-day event", () => {
      assert.strictEqual(DisplayFormatter.formatLabel(allDayToday, now, 30), "Hackathon · All day")
    })

    it("formats tomorrow's all-day event", () => {
      assert.strictEqual(
        DisplayFormatter.formatLabel(allDayTmrw, now, 30),
        "Offsite · Tmrw All day"
      )
    })

    it("truncates long titles exceeding maxTitleLength", () => {
      const longEvent = new CalendarEvent({
        title: "Very Long Team Meeting With Many Words",
        start: new Date(2026, 7, 28, 10, 0, 0),
        end: new Date(2026, 7, 28, 11, 0, 0)
      })
      const label = DisplayFormatter.formatLabel(longEvent, now, 20)
      assert.strictEqual(label.length <= 20, true)
      assert.strictEqual(label.includes("…"), true)
    })
  })

  describe("barLabel()", () => {
    it("returns formatted icon and title when configured", () => {
      assert.strictEqual(
        DisplayFormatter.barLabel(true, timedEvent, now, 30),
        "  Sprint Review · in 60 min"
      )
    })

    it("returns empty string when unconfigured or without meeting", () => {
      assert.strictEqual(DisplayFormatter.barLabel(false, timedEvent, now, 30), "")
      assert.strictEqual(DisplayFormatter.barLabel(true, null, now, 30), "")
    })
  })

  describe("headerStatus()", () => {
    it("returns updating status while fetching", () => {
      assert.strictEqual(
        DisplayFormatter.headerStatus(true, false, 0, null, now, true),
        "updating…"
      )
    })

    it("returns offline status on fetch failure", () => {
      assert.strictEqual(
        DisplayFormatter.headerStatus(false, true, 0, null, now, true),
        "offline · cached"
      )
    })

    it("returns partial offline count if some feeds failed", () => {
      assert.strictEqual(
        DisplayFormatter.headerStatus(false, false, 2, null, now, true),
        "2 calendars offline · updated"
      )
    })
  })

  describe("tooltipLine()", () => {
    it("formats tooltip for upcoming event with feed label", () => {
      const tooltip = DisplayFormatter.tooltipLine(true, timedEvent, now, {
        lastFetchFailed: false,
        offlineFeedCount: 0,
        showCalendarLabel: true
      })
      assert.strictEqual(tooltip, "Work · Sprint Review · 10:00–11:00 (starts at 10:00)")
    })

    it("returns setup message when unconfigured", () => {
      assert.strictEqual(
        DisplayFormatter.tooltipLine(false, null, now, {}),
        "NextEvent — No calendar configured\nClick to set up"
      )
    })

    it("returns offline notice when fetch fails without events", () => {
      assert.strictEqual(
        DisplayFormatter.tooltipLine(true, null, now, { lastFetchFailed: true }),
        "NextEvent — No upcoming events (offline)"
      )
    })
  })

  describe("heroHeaderMeta()", () => {
    it("formats meta badge with duration and meeting provider", () => {
      assert.strictEqual(DisplayFormatter.heroHeaderMeta(timedEvent), "1h  ·    Meet")

      const zoomEvent = new CalendarEvent({
        start: new Date(2026, 7, 28, 10, 0, 0),
        end: new Date(2026, 7, 28, 11, 0, 0),
        meetUrl: "https://zoom.us/j/1234567890"
      })
      assert.strictEqual(DisplayFormatter.heroHeaderMeta(zoomEvent), "1h  ·    Zoom")
    })
  })

  describe("heroTimeStatus()", () => {
    it("formats meeting time and relative countdown status", () => {
      assert.strictEqual(
        DisplayFormatter.heroTimeStatus(timedEvent, now),
        "Today · 10:00–11:00 · starts at 10:00"
      )
    })
  })
})
