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
    it("formats hours and minutes with leading zero in 24-hour mode by default", () => {
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 9, 5, 0)), "09:05")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 0, 5, 0)), "00:05")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 13, 5, 0)), "13:05")
    })

    it("formats midnight, noon, and afternoon correctly in 12-hour mode", () => {
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 0, 0, 0), true), "12:00 AM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 0, 5, 0), true), "12:05 AM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 9, 5, 0), true), "9:05 AM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 12, 0, 0), true), "12:00 PM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 12, 5, 0), true), "12:05 PM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 13, 5, 0), true), "1:05 PM")
      assert.strictEqual(DisplayFormatter.hm(new Date(2026, 7, 28, 23, 59, 0), true), "11:59 PM")
    })

    it("returns empty string for null or invalid dates", () => {
      assert.strictEqual(DisplayFormatter.hm(null), "")
      assert.strictEqual(DisplayFormatter.hm(new Date(NaN), true), "")
    })
  })

  describe("timeRange()", () => {
    it("formats timed range and all-day label in 24-hour and 12-hour modes", () => {
      assert.strictEqual(
        DisplayFormatter.timeRange(timedEvent.start, timedEvent.end, false),
        "10:00–11:00"
      )
      assert.strictEqual(
        DisplayFormatter.timeRange(timedEvent.start, timedEvent.end, false, true),
        "10:00 AM–11:00 AM"
      )
      assert.strictEqual(
        DisplayFormatter.timeRange(
          new Date(2026, 7, 28, 13, 0, 0),
          new Date(2026, 7, 28, 14, 30, 0),
          false,
          true
        ),
        "1:00 PM–2:30 PM"
      )
      assert.strictEqual(
        DisplayFormatter.timeRange(allDayToday.start, allDayToday.end, true),
        "All day"
      )
      assert.strictEqual(
        DisplayFormatter.timeRange(allDayToday.start, allDayToday.end, true, true),
        "All day"
      )
      assert.strictEqual(DisplayFormatter.timeRange(null, null, false), "")
    })
  })

  describe("meetingTimeLabel()", () => {
    it("formats meeting time label in 24-hour and 12-hour modes", () => {
      assert.strictEqual(
        DisplayFormatter.meetingTimeLabel(timedEvent.start, timedEvent.end, now, false, false),
        "Today · 10:00–11:00"
      )
      assert.strictEqual(
        DisplayFormatter.meetingTimeLabel(timedEvent.start, timedEvent.end, now, false, true),
        "Today · 10:00 AM–11:00 AM"
      )
      assert.strictEqual(
        DisplayFormatter.meetingTimeLabel(allDayToday.start, allDayToday.end, now, true, true),
        "Today · All day"
      )
    })
  })

  describe("relativeStatus()", () => {
    it("formats relative countdown with start time in 24-hour and 12-hour modes", () => {
      assert.strictEqual(DisplayFormatter.relativeStatus(timedEvent, now, false), "starts at 10:00")
      assert.strictEqual(
        DisplayFormatter.relativeStatus(timedEvent, now, true),
        "starts at 10:00 AM"
      )

      const afternoonEvent = new CalendarEvent({
        start: new Date(2026, 7, 28, 14, 0, 0),
        end: new Date(2026, 7, 28, 15, 0, 0)
      })
      assert.strictEqual(
        DisplayFormatter.relativeStatus(afternoonEvent, now, false),
        "starts at 14:00"
      )
      assert.strictEqual(
        DisplayFormatter.relativeStatus(afternoonEvent, now, true),
        "starts at 2:00 PM"
      )

      const in5MinEvent = new CalendarEvent({
        start: new Date(2026, 7, 28, 9, 5, 0),
        end: new Date(2026, 7, 28, 10, 0, 0)
      })
      assert.strictEqual(DisplayFormatter.relativeStatus(in5MinEvent, now, true), "starts in 5 min")
    })
  })

  describe("formatLabel()", () => {
    it("formats upcoming timed event with relative minutes", () => {
      assert.strictEqual(
        DisplayFormatter.formatLabel(timedEvent, now, 30),
        "Sprint Review · in 60 min"
      )
    })

    it("formats future timed event with 24-hour and 12-hour formats", () => {
      const laterToday = new CalendarEvent({
        title: "Architecture Sync",
        start: new Date(2026, 7, 28, 14, 30, 0),
        end: new Date(2026, 7, 28, 15, 30, 0)
      })
      assert.strictEqual(
        DisplayFormatter.formatLabel(laterToday, now, 40, false),
        "Architecture Sync · 14:30"
      )
      assert.strictEqual(
        DisplayFormatter.formatLabel(laterToday, now, 40, true),
        "Architecture Sync · 2:30 PM"
      )

      const tomorrowMeeting = new CalendarEvent({
        title: "Design Review",
        start: new Date(2026, 7, 29, 13, 0, 0),
        end: new Date(2026, 7, 29, 14, 0, 0)
      })
      assert.strictEqual(
        DisplayFormatter.formatLabel(tomorrowMeeting, now, 40, false),
        "Design Review · Tmrw 13:00"
      )
      assert.strictEqual(
        DisplayFormatter.formatLabel(tomorrowMeeting, now, 40, true),
        "Design Review · Tmrw 1:00 PM"
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
    it("returns formatted icon and title when configured in 24h and 12h", () => {
      assert.strictEqual(
        DisplayFormatter.barLabel(true, timedEvent, now, 30, false),
        "  Sprint Review · in 60 min"
      )
      const laterEvent = new CalendarEvent({
        title: "Sprint Review",
        start: new Date(2026, 7, 28, 14, 0, 0),
        end: new Date(2026, 7, 28, 15, 0, 0),
        meetUrl: "https://meet.google.com/abc"
      })
      assert.strictEqual(
        DisplayFormatter.barLabel(true, laterEvent, now, 30, true),
        "  Sprint Review · 2:00 PM"
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

  describe("formatUpdated()", () => {
    it("formats recent updates in relative minutes or hours", () => {
      assert.strictEqual(DisplayFormatter.formatUpdated(now, now), "just now")
      assert.strictEqual(
        DisplayFormatter.formatUpdated(new Date(now.getTime() - 10 * 60000), now),
        "10m ago"
      )
      assert.strictEqual(
        DisplayFormatter.formatUpdated(new Date(now.getTime() - 3 * 3600000), now),
        "3h ago"
      )
    })

    it("formats updates older than 24 hours in 24h and 12h time format", () => {
      const oldDate = new Date(2026, 7, 25, 14, 30, 0)
      assert.strictEqual(DisplayFormatter.formatUpdated(oldDate, now, false), "14:30")
      assert.strictEqual(DisplayFormatter.formatUpdated(oldDate, now, true), "2:30 PM")
    })
  })

  describe("tooltipLine()", () => {
    it("formats tooltip for upcoming event with feed label in 24h and 12h", () => {
      const tooltip24 = DisplayFormatter.tooltipLine(true, timedEvent, now, {
        lastFetchFailed: false,
        offlineFeedCount: 0,
        showCalendarLabel: true,
        use12Hour: false
      })
      assert.strictEqual(tooltip24, "Work · Sprint Review · 10:00–11:00 (starts at 10:00)")

      const tooltip12 = DisplayFormatter.tooltipLine(true, timedEvent, now, {
        lastFetchFailed: false,
        offlineFeedCount: 0,
        showCalendarLabel: true,
        use12Hour: true
      })
      assert.strictEqual(tooltip12, "Work · Sprint Review · 10:00 AM–11:00 AM (starts at 10:00 AM)")
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

  describe("daySectionTitle()", () => {
    it("formats today, tomorrow, and future days with day and date", () => {
      assert.strictEqual(
        DisplayFormatter.daySectionTitle(new Date(2026, 7, 28, 12, 0, 0), now),
        "TODAY · FRI 28 AUG"
      )
      assert.strictEqual(
        DisplayFormatter.daySectionTitle(new Date(2026, 7, 29, 12, 0, 0), now),
        "TOMORROW · SAT 29 AUG"
      )
      assert.strictEqual(
        DisplayFormatter.daySectionTitle(new Date(2026, 7, 30, 12, 0, 0), now),
        "SUN 30 AUG"
      )
    })
  })

  describe("heroTimeStatus()", () => {
    it("formats meeting time and relative countdown status in 24h and 12h", () => {
      assert.strictEqual(
        DisplayFormatter.heroTimeStatus(timedEvent, now, false),
        "Today · 10:00–11:00 · starts at 10:00"
      )
      assert.strictEqual(
        DisplayFormatter.heroTimeStatus(timedEvent, now, true),
        "Today · 10:00 AM–11:00 AM · starts at 10:00 AM"
      )
    })
  })
})
