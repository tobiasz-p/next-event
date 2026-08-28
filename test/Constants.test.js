"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { Constants } = require("../Model.js")

describe("Constants", () => {
  describe("time arithmetic constants", () => {
    it("defines millisecond conversions correctly", () => {
      assert.strictEqual(Constants.MS_PER_SECOND, 1000)
      assert.strictEqual(Constants.SECONDS_PER_MINUTE, 60)
      assert.strictEqual(Constants.MINUTES_PER_HOUR, 60)
      assert.strictEqual(Constants.HOURS_PER_DAY, 24)
      assert.strictEqual(Constants.DAYS_PER_WEEK, 7)
      assert.strictEqual(Constants.MS_PER_MINUTE, 60000)
      assert.strictEqual(Constants.MS_PER_HOUR, 3600000)
      assert.strictEqual(Constants.MS_PER_DAY, 86400000)
    })
  })

  describe("default limits and configuration", () => {
    it("defines standard defaults and boundaries", () => {
      assert.strictEqual(Constants.DEFAULT_LOOKAHEAD_DAYS, 3)
      assert.strictEqual(Constants.DEFAULT_MAX_EVENTS, 80)
      assert.strictEqual(Constants.DEFAULT_MAX_ROWS, 20)
      assert.strictEqual(Constants.DEFAULT_MAX_MEETING_ROWS, 8)
      assert.strictEqual(Constants.DEFAULT_MAX_TITLE_LENGTH, 28)
      assert.strictEqual(Constants.MIN_MAX_TITLE_LENGTH, 8)
      assert.strictEqual(Constants.MIN_TITLE_CHARS, 3)
      assert.strictEqual(Constants.DEFAULT_REFRESH_MINUTES, 5)
      assert.strictEqual(Constants.DEFAULT_MAX_FEED_SIZE_MIB, 10)
      assert.strictEqual(
        Constants.DEFAULT_CALENDAR_URL_BASE,
        "https://calendar.google.com/calendar"
      )
      assert.strictEqual(Constants.DEFAULT_KEY_REFRESH, "r")
      assert.strictEqual(Constants.DEFAULT_KEY_JOIN, "m")
      assert.strictEqual(Constants.DEFAULT_KEY_CALENDAR, "o")
      assert.strictEqual(Constants.FETCH_TIMEOUT_SECONDS, 15)
      assert.strictEqual(Constants.BYTES_PER_MIB, 1048576)
    })
  })

  describe("UI glyphs and labels", () => {
    it("defines expected icon and section strings", () => {
      assert.strictEqual(Constants.ICON_MEETING_VIDEO, "")
      assert.strictEqual(Constants.ICON_CALENDAR_EVENT, "󰃯")
      assert.strictEqual(Constants.ICON_CALENDAR_EMPTY, "󰃲")
      assert.strictEqual(Constants.ICON_REFRESH, "")
      assert.strictEqual(Constants.SECTION_TODAY, "TODAY")
      assert.strictEqual(Constants.SECTION_TOMORROW, "TOMORROW")
      assert.strictEqual(Constants.SECTION_EVENTS, "EVENTS")
      assert.strictEqual(Constants.SECTION_HAPPENING_NOW, "HAPPENING NOW")
      assert.strictEqual(Constants.SECTION_NEXT, "NEXT")
      assert.strictEqual(Constants.LABEL_ALL_DAY, "All day")
      assert.strictEqual(Constants.LABEL_TODAY, "Today")
      assert.strictEqual(Constants.LABEL_TOMORROW, "Tomorrow")
      assert.strictEqual(Constants.LABEL_YESTERDAY, "Yesterday")
      assert.strictEqual(Constants.LABEL_UNTITLED, "(Untitled)")
      assert.strictEqual(Constants.LABEL_VIDEO_DEFAULT, "Video")
      assert.strictEqual(Constants.LABEL_JUST_NOW, "just now")
      assert.strictEqual(Constants.LABEL_JOIN_MEETING, "Join Meeting")
      assert.strictEqual(Constants.LABEL_OPEN_CALENDAR, "Open in Calendar")
      assert.strictEqual(Constants.LABEL_NO_MEETINGS, "No upcoming meetings")
      assert.strictEqual(
        Constants.LABEL_SCHEDULE_CLEAR,
        "Your schedule is clear for the next few days."
      )
      assert.strictEqual(Constants.LABEL_EMPTY_SCHEDULE_TITLE, "No upcoming meetings")
      assert.strictEqual(
        Constants.LABEL_EMPTY_SCHEDULE_SUBTITLE,
        "Your schedule is clear for the next few days."
      )
      assert.strictEqual(Constants.LABEL_EVENT_FALLBACK, "Event")
      assert.strictEqual(Constants.STATUS_UPDATING, "updating…")
      assert.strictEqual(Constants.STATUS_OFFLINE_CACHED, "offline · cached")
      assert.strictEqual(Constants.STATUS_OFFLINE, "offline")
    })
  })

  describe("setup and action identifiers", () => {
    it("defines setup strings and action identifiers", () => {
      assert.strictEqual(Constants.SOURCE_MODE_ICS, "ics")
      assert.strictEqual(Constants.SOURCE_MODE_JSON, "json")
      assert.strictEqual(Constants.ACTION_REFRESH, "refresh")
      assert.strictEqual(Constants.ACTION_JOIN, "join")
      assert.strictEqual(Constants.ACTION_CALENDAR, "calendar")
      assert.strictEqual(Constants.ACTION_EVENT, "event")
      assert.strictEqual(Constants.LABEL_SETUP_CONNECT_TITLE, "Connect Your Calendar")
      assert.strictEqual(
        Constants.LABEL_SETUP_CONNECT_SUBTITLE,
        "Choose the method that matches your calendar provider:"
      )
      assert.strictEqual(
        Constants.LABEL_SETUP_OPTION1_TITLE,
        "Option 1: Google Workspace / OAuth (Work accounts)"
      )
      assert.strictEqual(
        Constants.LABEL_SETUP_OPTION2_TITLE,
        "Option 2: Private iCal (.ics) Feed URL"
      )
    })
  })

  describe("video providers table", () => {
    it("contains meeting provider patterns", () => {
      assert.strictEqual(Array.isArray(Constants.VIDEO_PROVIDERS), true)
      assert.strictEqual(Constants.VIDEO_PROVIDERS.length >= 5, true)
    })
  })
})
