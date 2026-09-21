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

    it("includes afternoon events on the N-th day ahead when now is morning", () => {
      // now is 2026-08-28 09:00:00.
      // 1 day ahead is 2026-08-29.
      // An event at 15:00 on 2026-08-29 must be included with lookaheadDays: 1.
      const afternoonTmrw = new CalendarEvent({
        uid: "tmrw-afternoon",
        title: "Late Afternoon Sync",
        start: new Date(2026, 7, 29, 15, 0, 0),
        end: new Date(2026, 7, 29, 16, 0, 0)
      })
      const upcoming = ScheduleAggregator.buildUpcoming([afternoonTmrw], now, {
        lookaheadDays: 1
      })
      assert.strictEqual(upcoming.length, 1)
      assert.strictEqual(upcoming[0].title, "Late Afternoon Sync")
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

    describe("excludeKeywords", () => {
      const lunch = new CalendarEvent({
        uid: "lunch",
        title: "Team Lunch",
        start: new Date(2026, 7, 28, 12, 0, 0),
        end: new Date(2026, 7, 28, 13, 0, 0),
        meetUrl: "https://meet.google.com/lunch"
      })
      const focus = new CalendarEvent({
        uid: "focus",
        title: "Deep work",
        description: "Focus time block",
        location: "Lunch room",
        start: new Date(2026, 7, 29, 9, 0, 0),
        end: new Date(2026, 7, 29, 11, 0, 0)
      })
      const events = [todayTimed1, lunch, focus]

      it("leaves behavior unchanged by default", () => {
        const base = ScheduleAggregator.computeScheduleState(events, now, {})
        const empty = ScheduleAggregator.computeScheduleState(events, now, {
          excludeKeywords: ""
        })
        assert.deepStrictEqual(empty, base)
        assert.strictEqual(base.meetings.length, 3)
      })

      it("removes matching events from every bucket", () => {
        const state = ScheduleAggregator.computeScheduleState(events, now, {
          excludeKeywords: "lunch, ,STANDUP"
        })
        assert.deepStrictEqual(
          state.meetings.map(e => e.uid),
          ["focus"]
        )
        assert.strictEqual(state.nextMeeting.uid, "focus")
        assert.deepStrictEqual(state.upcomingToday, [])
        const grouped = state.scheduleGroups.flatMap(g => g.items.map(e => e.uid))
        assert.deepStrictEqual(grouped, ["focus"])
      })

      it("matches titles only, not description or location", () => {
        const state = ScheduleAggregator.computeScheduleState(events, now, {
          excludeKeywords: "Focus time,Lunch room"
        })
        assert.strictEqual(
          state.meetings.some(e => e.uid === "focus"),
          true
        )
      })

      it("drops the next meeting when its title is excluded", () => {
        const state = ScheduleAggregator.computeScheduleState([lunch], now, {
          excludeKeywords: "lunch"
        })
        assert.strictEqual(state.nextMeeting, null)
        assert.deepStrictEqual(state.meetings, [])
      })

      it("does not mutate the input events", () => {
        const input = [todayTimed1, lunch]
        ScheduleAggregator.computeScheduleState(input, now, { excludeKeywords: "lunch" })
        assert.strictEqual(input.length, 2)
      })
    })
  })
})
