"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert")
const M = require("../Model.js")

const NOW = new Date("2026-08-17T09:00:00Z")

describe("JSON calendar events parsing", () => {
  it("parses ISO 8601 timed events and preserves calendarColor", () => {
    const raw = JSON.stringify({
      version: 1,
      syncedAt: "2026-08-17T08:50:00Z",
      events: [
        {
          id: "ev-1",
          calendarId: "work@company.com",
          calendarName: "Work",
          color: "#4285f4",
          start: "2026-08-17T10:00:00Z",
          end: "2026-08-17T11:00:00Z",
          title: "Sprint Planning",
          meetingUrl: "https://meet.google.com/abc-defg-hij"
        },
        {
          id: "ev-2",
          calendarId: "personal@gmail.com",
          calendarName: "Personal",
          color: "#9a9cff",
          start: "2026-08-17T12:00:00Z",
          end: "2026-08-17T12:30:00Z",
          title: "Doctor Appointment"
        }
      ]
    })

    const parsed = M.parseJsonState(raw, { now: NOW, lookaheadDays: 3 })
    assert.strictEqual(parsed.events.length, 2)
    assert.strictEqual(parsed.syncedAt, "2026-08-17T08:50:00Z")

    const ev1 = parsed.events[0]
    assert.strictEqual(ev1.title, "Sprint Planning")
    assert.strictEqual(ev1.calendarColor, "#4285f4")
    assert.strictEqual(ev1.calendarName, "Work")
    assert.strictEqual(ev1.feedLabel, "Work")
    assert.strictEqual(ev1.meetUrl, "https://meet.google.com/abc-defg-hij")

    const ev2 = parsed.events[1]
    assert.strictEqual(ev2.title, "Doctor Appointment")
    assert.strictEqual(ev2.calendarColor, "#9a9cff")
    assert.strictEqual(ev2.calendarName, "Personal")
    assert.strictEqual(ev2.meetUrl, null)
  })

  it("filters out declined invitations", () => {
    const raw = {
      events: [
        {
          id: "ev-accepted",
          start: "2026-08-17T10:00:00Z",
          end: "2026-08-17T11:00:00Z",
          title: "Team Sync",
          responseStatus: "accepted",
          color: "#16a765"
        },
        {
          id: "ev-declined",
          start: "2026-08-17T10:00:00Z",
          end: "2026-08-17T11:00:00Z",
          title: "Optional Webinar",
          responseStatus: "declined",
          color: "#a47ae2"
        }
      ]
    }

    const events = M.parseJsonEvents(raw)
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].id || events[0].uid, "ev-accepted")
    assert.strictEqual(events[0].calendarColor, "#16a765")
  })

  it("extracts meeting links from description when meetingUrl is not directly set", () => {
    const raw = {
      events: [
        {
          id: "ev-desc-link",
          start: "2026-08-17T14:00:00Z",
          end: "2026-08-17T15:00:00Z",
          title: "Architecture Review",
          description: "Please join: https://meet.google.com/xyz-uvwx-rst",
          color: "#ff8800"
        }
      ]
    }

    const events = M.parseJsonEvents(raw)
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].meetUrl, "https://meet.google.com/xyz-uvwx-rst")
    assert.strictEqual(events[0].calendarColor, "#ff8800")
  })

  it("parses all-day events correctly", () => {
    const raw = {
      events: [
        {
          id: "ev-allday",
          start: "2026-08-17",
          end: "2026-08-18",
          allDay: true,
          title: "Company Holiday",
          color: "#e67c73"
        }
      ]
    }

    const events = M.parseJsonEvents(raw)
    assert.strictEqual(events.length, 1)
    assert.strictEqual(events[0].allDay, true)
    assert.strictEqual(events[0].calendarColor, "#e67c73")
  })

  it("retains calendar colors in buildUpcoming and buildScheduleGroups", () => {
    const rawEvents = [
      {
        id: "ev-1",
        calendarName: "Work",
        color: "#4285f4",
        start: "2026-08-17T10:00:00Z",
        end: "2026-08-17T11:00:00Z",
        title: "Work Meeting",
        meetingUrl: "https://meet.google.com/aaa-bbbb-ccc"
      },
      {
        id: "ev-2",
        calendarName: "Personal",
        color: "#9a9cff",
        start: "2026-08-18T09:00:00Z",
        end: "2026-08-18T10:00:00Z",
        title: "Personal Errands"
      }
    ]

    const parsed = M.parseJsonEvents(rawEvents)
    const upcoming = M.buildUpcoming(parsed, NOW, { lookaheadDays: 3 })
    assert.strictEqual(upcoming.length, 2)
    assert.strictEqual(upcoming[0].calendarColor, "#4285f4")
    assert.strictEqual(upcoming[1].calendarColor, "#9a9cff")

    const groups = M.buildScheduleGroups(parsed, NOW, { lookaheadDays: 3 })
    assert.strictEqual(groups.length, 2)
    assert.strictEqual(groups[0].title, "TODAY")
    assert.strictEqual(groups[0].items[0].calendarColor, "#4285f4")
    assert.strictEqual(groups[1].title, "TOMORROW")
    assert.strictEqual(groups[1].items[0].calendarColor, "#9a9cff")
  })
})
