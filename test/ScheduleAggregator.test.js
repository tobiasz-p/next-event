"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { ScheduleAggregator, CalendarEvent } = require("../Model.js")

describe("ScheduleAggregator", () => {
  const now = new Date(2026, 7, 28, 9, 0, 0)

  const todayAllDay = new CalendarEvent({
    uid: "all-day-1",
    title: "Hackathon",
    start: new Date(2026, 7, 28, 0, 0, 0),
    end: new Date(2026, 7, 29, 0, 0, 0),
    allDay: true
  })

  const todayTimed1 = new CalendarEvent({
    uid: "timed-1",
    title: "Daily Standup",
    start: new Date(2026, 7, 28, 10, 0, 0),
    end: new Date(2026, 7, 28, 10, 30, 0),
    allDay: false,
    meetUrl: "https://meet.google.com/abc"
  })

  const todayTimed2 = new CalendarEvent({
    uid: "timed-2",
    title: "Design Review",
    start: new Date(2026, 7, 28, 14, 0, 0),
    end: new Date(2026, 7, 28, 15, 0, 0),
    allDay: false
  })

  const tmrwTimed = new CalendarEvent({
    uid: "tmrw-timed",
    title: "Saturday Sync",
    start: new Date(2026, 7, 29, 10, 0, 0),
    end: new Date(2026, 7, 29, 11, 0, 0),
    allDay: false
  })

  const tmrwAllDay = new CalendarEvent({
    uid: "tmrw-all-day",
    title: "Offsite",
    start: new Date(2026, 7, 29, 0, 0, 0),
    end: new Date(2026, 7, 30, 0, 0, 0),
    allDay: true
  })

  describe("compareUpcoming()", () => {
    it("prioritizes short/timed events over all-day events on the same day", () => {
      const cmp = ScheduleAggregator.compareUpcoming(todayTimed1, todayAllDay, now)
      assert.strictEqual(cmp < 0, true)
    })

    it("prioritizes today's all-day event over tomorrow's timed event", () => {
      const cmp = ScheduleAggregator.compareUpcoming(todayAllDay, tmrwTimed, now)
      assert.strictEqual(cmp < 0, true)
    })

    it("prioritizes tomorrow's timed event over tomorrow's all-day event", () => {
      const cmp = ScheduleAggregator.compareUpcoming(tmrwTimed, tmrwAllDay, now)
      assert.strictEqual(cmp < 0, true)
    })
  })

  describe("buildUpcoming()", () => {
    it("orders timed meetings before all-day events when both exist today", () => {
      const events = [todayAllDay, todayTimed1, todayTimed2]
      const upcoming = ScheduleAggregator.buildUpcoming(events, now, {
        showOnlyWithVideoLink: false
      })
      assert.strictEqual(upcoming[0].title, "Daily Standup")
      assert.strictEqual(upcoming[1].title, "Design Review")
      assert.strictEqual(upcoming[2].title, "Hackathon")
    })

    it("switches to ongoing all-day event after timed meetings finish for the day", () => {
      const events = [todayAllDay, todayTimed1]
      const afterStandup = new Date(2026, 7, 28, 11, 0, 0)
      const upcoming = ScheduleAggregator.buildUpcoming(events, afterStandup, {
        showOnlyWithVideoLink: false
      })
      assert.strictEqual(upcoming[0].title, "Hackathon")
    })

    it("filters out link-free events when showOnlyWithVideoLink is true", () => {
      const events = [todayAllDay, todayTimed1, todayTimed2]
      const upcoming = ScheduleAggregator.buildUpcoming(events, now, {
        showOnlyWithVideoLink: true
      })
      assert.strictEqual(upcoming.length, 1)
      assert.strictEqual(upcoming[0].title, "Daily Standup")
    })
  })

  describe("upcomingToday()", () => {
    it("returns only upcoming events happening before midnight today", () => {
      const events = [todayTimed1, tmrwTimed]
      const todayList = ScheduleAggregator.upcomingToday(events, now)
      assert.strictEqual(todayList.length, 1)
      assert.strictEqual(todayList[0].title, "Daily Standup")
    })
  })

  describe("buildScheduleGroups()", () => {
    it("buckets events into day groups and orders timed events before all-day events", () => {
      const events = [todayAllDay, todayTimed1, tmrwTimed]
      const groups = ScheduleAggregator.buildScheduleGroups(events, now, { lookaheadDays: 3 })
      assert.strictEqual(groups.length, 2)
      assert.strictEqual(groups[0].title, "TODAY · FRI 28 AUG")
      assert.strictEqual(groups[0].items[0].title, "Daily Standup")
      assert.strictEqual(groups[0].items[1].title, "Hackathon")
      assert.strictEqual(groups[1].title, "TOMORROW · SAT 29 AUG")
      assert.strictEqual(groups[1].items[0].title, "Saturday Sync")
    })
  })

  describe("buildCalendarLegend()", () => {
    it("deduplicates calendars from events and preserves their colors", () => {
      const events = [
        { feedLabel: "Work", calendarColor: "#4285f4" },
        { feedLabel: "Work", calendarColor: "#4285f4" },
        { calendarName: "Personal", calendarColor: "#34a853" }
      ]
      const legend = ScheduleAggregator.buildCalendarLegend(events, [])
      assert.deepStrictEqual(legend, [
        { name: "Work", color: "#4285f4" },
        { name: "Personal", color: "#34a853" }
      ])
    })

    it("appends feed config labels for feeds without events", () => {
      const events = [{ feedLabel: "Work", calendarColor: "#4285f4" }]
      const feeds = [{ label: "Work" }, { label: "Holidays" }]
      const legend = ScheduleAggregator.buildCalendarLegend(events, feeds)
      assert.deepStrictEqual(legend, [
        { name: "Work", color: "#4285f4" },
        { name: "Holidays", color: null }
      ])
    })

    it("handles empty or non-array inputs gracefully", () => {
      assert.deepStrictEqual(ScheduleAggregator.buildCalendarLegend(null, null), [])
      assert.deepStrictEqual(ScheduleAggregator.buildCalendarLegend([], []), [])
    })
  })

  describe("computeScheduleState()", () => {
    it("computes schedule bundle with next meeting, upcoming today, day groups, and calendar legend", () => {
      const events = [todayTimed1, tmrwTimed]
      const state = ScheduleAggregator.computeScheduleState(events, now, {
        lookaheadDays: 3,
        feeds: [{ label: "Work" }]
      })
      assert.strictEqual(state.nextMeeting.title, "Daily Standup")
      assert.strictEqual(state.meetings.length, 2)
      assert.strictEqual(state.upcomingToday.length, 1)
      assert.strictEqual(state.scheduleGroups.length, 2)
      assert.strictEqual(state.calendarLegend.length, 1)
      assert.strictEqual(state.calendarLegend[0].name, "Work")
    })
  })
})
