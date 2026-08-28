"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { PanelNavigationModel, CalendarEvent } = require("../Model.js")

describe("PanelNavigationModel", () => {
  const nextMeeting = new CalendarEvent({
    uid: "m1",
    title: "Planning",
    start: new Date(2026, 7, 28, 10, 0),
    end: new Date(2026, 7, 28, 11, 0),
    meetUrl: "https://meet.google.com/abc"
  })

  const scheduleGroups = [{ key: 20260828, title: "TODAY", items: [nextMeeting] }]

  describe("rebuildActionItems()", () => {
    it("builds refresh, join, and calendar actions when hero is visible with meet link", () => {
      const nav = new PanelNavigationModel()
      const items = nav.rebuildActionItems(true, nextMeeting, scheduleGroups)
      assert.strictEqual(items.length, 4)
      assert.strictEqual(items[0].kind, "refresh")
      assert.strictEqual(items[1].kind, "join")
      assert.strictEqual(items[2].kind, "calendar")
      assert.strictEqual(items[3].kind, "event")
    })

    it("omits join action when meeting lacks video URL", () => {
      const nav = new PanelNavigationModel()
      const noMeet = new CalendarEvent({ uid: "m2", title: "Focus" })
      const items = nav.rebuildActionItems(true, noMeet, [])
      assert.strictEqual(items.length, 2)
      assert.strictEqual(items[0].kind, "refresh")
      assert.strictEqual(items[1].kind, "calendar")
    })
  })

  describe("moveCursor()", () => {
    it("navigates down and up through action items cleanly", () => {
      const nav = new PanelNavigationModel()
      nav.rebuildActionItems(true, nextMeeting, scheduleGroups)

      assert.strictEqual(nav.cursorActive, false)
      nav.moveCursor(1)
      assert.strictEqual(nav.cursorActive, true)
      assert.strictEqual(nav.cursorIndex, 0)

      nav.moveCursor(1)
      assert.strictEqual(nav.cursorIndex, 1)

      nav.moveCursor(-1)
      assert.strictEqual(nav.cursorIndex, 0)
    })
  })

  describe("activeItem()", () => {
    it("returns currently focused action descriptor or null when inactive", () => {
      const nav = new PanelNavigationModel()
      nav.rebuildActionItems(true, nextMeeting, scheduleGroups)
      assert.strictEqual(nav.activeItem(), null)

      nav.moveCursor(1)
      assert.strictEqual(nav.activeItem().kind, "refresh")
    })
  })

  describe("isCursorOn()", () => {
    it("checks if cursor is positioned on specific action kind and coordinates", () => {
      const nav = new PanelNavigationModel()
      nav.rebuildActionItems(true, nextMeeting, scheduleGroups)
      nav.moveCursor(1)

      assert.strictEqual(nav.isCursorOn("refresh"), true)
      assert.strictEqual(nav.isCursorOn("join"), false)
    })
  })

  describe("pointCursorAt()", () => {
    it("points cursor directly at specified kind and indices", () => {
      const nav = new PanelNavigationModel()
      nav.rebuildActionItems(true, nextMeeting, scheduleGroups)

      const idx = nav.pointCursorAt("event", 0, 0)
      assert.strictEqual(idx, 3)
      assert.strictEqual(nav.isCursorOn("event", 0, 0), true)
    })
  })
})
