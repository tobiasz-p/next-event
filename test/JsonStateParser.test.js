"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { JsonStateParser } = require("../Model.js")

describe("JsonStateParser", () => {
  describe("parseJsonEvents()", () => {
    it("parses ISO 8601 timed events and preserves calendarColor", () => {
      const raw = JSON.stringify({
        events: [
          {
            id: "ev-1",
            title: "Sprint Planning",
            start: "2026-08-28T10:00:00Z",
            end: "2026-08-28T11:30:00Z",
            meetingUrl: "https://meet.google.com/abc-defg-hij",
            calendarName: "Work",
            color: "#4285f4"
          }
        ]
      })

      const events = JsonStateParser.parseJsonEvents(raw)
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0].title, "Sprint Planning")
      assert.strictEqual(events[0].calendarColor, "#4285f4")
      assert.strictEqual(events[0].allDay, false)
      assert.strictEqual(events[0].meetUrl, "https://meet.google.com/abc-defg-hij")
    })

    it("filters out declined invitations", () => {
      const raw = JSON.stringify([
        { title: "Accepted Meeting", start: "2026-08-28T10:00:00Z", responseStatus: "accepted" },
        { title: "Declined Meeting", start: "2026-08-28T11:00:00Z", responseStatus: "declined" }
      ])

      const events = JsonStateParser.parseJsonEvents(raw)
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0].title, "Accepted Meeting")
    })

    it("extracts meeting links from description when meetingUrl is not directly set", () => {
      const raw = JSON.stringify([
        {
          title: "1:1 Sync",
          start: "2026-08-28T14:00:00Z",
          description: "Join Zoom: https://us02web.zoom.us/j/123456789?pwd=test"
        }
      ])

      const events = JsonStateParser.parseJsonEvents(raw)
      assert.strictEqual(events[0].meetUrl, "https://us02web.zoom.us/j/123456789?pwd=test")
    })

    it("parses all-day events correctly", () => {
      const raw = JSON.stringify([
        {
          title: "Company Holiday",
          start: "2026-08-28",
          end: "2026-08-29"
        }
      ])

      const events = JsonStateParser.parseJsonEvents(raw)
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0].allDay, true)
    })
  })

  describe("parseJsonState()", () => {
    it("returns events array and syncedAt timestamp", () => {
      const raw = JSON.stringify({
        syncedAt: "2026-08-28T09:00:00Z",
        events: [{ title: "Team Meeting", start: "2026-08-28T10:00:00Z" }]
      })

      const state = JsonStateParser.parseJsonState(raw)
      assert.strictEqual(state.events.length, 1)
      assert.strictEqual(state.syncedAt, "2026-08-28T09:00:00Z")
    })

    it("handles invalid JSON gracefully", () => {
      const state = JsonStateParser.parseJsonState("invalid-json")
      assert.deepStrictEqual(state, { events: [], syncedAt: null })
    })
  })

  describe("serializeIcsCache()", () => {
    it("round-trips events through serializeIcsCache / parseJsonState", () => {
      const events = [
        {
          uid: "e1",
          title: "Standup",
          start: new Date("2026-08-28T10:00:00.000Z"),
          end: new Date("2026-08-28T10:15:00.000Z"),
          allDay: false,
          meetUrl: "https://meet.google.com/abc-defg-hij",
          feedLabel: "Work",
          calendarColor: "#4285f4",
          location: "Room A"
        }
      ]

      const raw = JsonStateParser.serializeIcsCache(events, new Date("2026-08-28T09:00:00.000Z"))
      const parsed = JsonStateParser.parseJsonState(raw)

      assert.strictEqual(parsed.syncedAt, "2026-08-28T09:00:00.000Z")
      assert.strictEqual(parsed.events.length, 1)
      assert.strictEqual(parsed.events[0].uid, "e1")
      assert.strictEqual(parsed.events[0].title, "Standup")
      assert.strictEqual(parsed.events[0].calendarColor, "#4285f4")
      assert.strictEqual(parsed.events[0].feedLabel, "Work")
      assert.strictEqual(parsed.events[0].meetUrl, "https://meet.google.com/abc-defg-hij")
      assert.strictEqual(parsed.events[0].start.toISOString(), "2026-08-28T10:00:00.000Z")
      assert.strictEqual(parsed.events[0].end.toISOString(), "2026-08-28T10:15:00.000Z")
    })

    it("does not persist feed URLs in the cache payload", () => {
      const raw = JsonStateParser.serializeIcsCache(
        [
          {
            title: "Secret",
            start: new Date("2026-08-28T10:00:00.000Z"),
            url: "https://calendar.google.com/calendar/ical/private-secret/basic.ics"
          }
        ],
        new Date("2026-08-28T09:00:00.000Z")
      )

      assert.strictEqual(raw.includes("private-secret"), false)
      assert.strictEqual(raw.includes("basic.ics"), false)
    })

    it("serializes an empty event list with a syncedAt timestamp", () => {
      const raw = JsonStateParser.serializeIcsCache(null, new Date("2026-08-28T09:00:00.000Z"))
      const parsed = JSON.parse(raw)
      assert.deepStrictEqual(parsed.events, [])
      assert.strictEqual(parsed.syncedAt, "2026-08-28T09:00:00.000Z")
    })
  })
})
