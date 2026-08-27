const test = require("node:test")
const assert = require("node:assert/strict")
const Model = require("../Model.js")

test("prioritizes short/timed events over all-day events on the same day", () => {
  const now = new Date(2026, 7, 27, 8, 0, 0) // 2026-08-27 08:00:00

  const allDayEvent = {
    uid: "allday-1",
    title: "All Day Hackathon",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const shortEvent = {
    uid: "short-1",
    title: "Morning Standup",
    start: new Date(2026, 7, 27, 9, 30, 0),
    end: new Date(2026, 7, 27, 9, 45, 0),
    allDay: false
  }

  const events = [allDayEvent, shortEvent]

  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Morning Standup")
  assert.equal(upcoming[1].title, "All Day Hackathon")

  const todayList = Model.upcomingToday(events, now)
  assert.equal(todayList.length, 2)
  assert.equal(todayList[0].title, "Morning Standup")
  assert.equal(todayList[1].title, "All Day Hackathon")
})

test("chooses all-day event when there is no short event", () => {
  const now = new Date(2026, 7, 27, 8, 0, 0)

  const allDayEvent = {
    uid: "allday-1",
    title: "Company Holiday",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const events = [allDayEvent]

  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 1)
  assert.equal(upcoming[0].title, "Company Holiday")
})

test("switches to all-day event after short events for the day have finished", () => {
  const allDayEvent = {
    uid: "allday-1",
    title: "Company Holiday",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const shortEvent = {
    uid: "short-1",
    title: "Morning Standup",
    start: new Date(2026, 7, 27, 9, 30, 0),
    end: new Date(2026, 7, 27, 9, 45, 0),
    allDay: false
  }

  const events = [allDayEvent, shortEvent]

  // At 10:00 (after standup ended at 09:45)
  const afterStandup = new Date(2026, 7, 27, 10, 0, 0)
  const upcoming = Model.buildUpcoming(events, afterStandup, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 1)
  assert.equal(upcoming[0].title, "Company Holiday")
})

test("prioritizes today's all-day event over tomorrow's timed event", () => {
  const now = new Date(2026, 7, 27, 18, 0, 0) // today 18:00

  const todayAllDay = {
    uid: "allday-today",
    title: "Today All Day Event",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const tomorrowTimed = {
    uid: "timed-tmrw",
    title: "Tomorrow Morning Sync",
    start: new Date(2026, 7, 28, 9, 0, 0),
    end: new Date(2026, 7, 28, 10, 0, 0),
    allDay: false
  }

  const events = [tomorrowTimed, todayAllDay]
  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Today All Day Event")
  assert.equal(upcoming[1].title, "Tomorrow Morning Sync")
})

test("prioritizes tomorrow's timed event over tomorrow's all-day event", () => {
  const now = new Date(2026, 7, 27, 18, 0, 0)

  const tomorrowAllDay = {
    uid: "allday-tmrw",
    title: "Tomorrow All Day Event",
    start: new Date(2026, 7, 28, 0, 0, 0),
    end: new Date(2026, 7, 29, 0, 0, 0),
    allDay: true
  }

  const tomorrowTimed = {
    uid: "timed-tmrw",
    title: "Tomorrow Morning Sync",
    start: new Date(2026, 7, 28, 9, 0, 0),
    end: new Date(2026, 7, 28, 10, 0, 0),
    allDay: false
  }

  const events = [tomorrowAllDay, tomorrowTimed]
  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Tomorrow Morning Sync")
  assert.equal(upcoming[1].title, "Tomorrow All Day Event")
})

test("prioritizes short events over ongoing multi-day all-day events", () => {
  const now = new Date(2026, 7, 27, 10, 0, 0) // Thursday

  const multiDayAllDay = {
    uid: "multiday-1",
    title: "Multi-Day Conference",
    start: new Date(2026, 7, 25, 0, 0, 0), // started Tuesday
    end: new Date(2026, 7, 29, 0, 0, 0),   // ends Saturday
    allDay: true
  }

  const todayShortEvent = {
    uid: "short-today",
    title: "Afternoon Meeting",
    start: new Date(2026, 7, 27, 14, 0, 0),
    end: new Date(2026, 7, 27, 15, 0, 0),
    allDay: false
  }

  const events = [multiDayAllDay, todayShortEvent]
  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Afternoon Meeting")
  assert.equal(upcoming[1].title, "Multi-Day Conference")
})

test("formats labels appropriately for all-day events", () => {
  const now = new Date(2026, 7, 27, 10, 0, 0)

  const todayAllDay = {
    uid: "allday-1",
    title: "Hackathon",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const tmrwAllDay = {
    uid: "allday-2",
    title: "Offsite",
    start: new Date(2026, 7, 28, 0, 0, 0),
    end: new Date(2026, 7, 29, 0, 0, 0),
    allDay: true
  }

  assert.equal(Model.formatLabel(todayAllDay, now, 30), "Hackathon · All day")
  assert.equal(Model.formatLabel(tmrwAllDay, now, 30), "Offsite · Tmrw All day")
  assert.equal(Model.relativeStatus(todayAllDay, now), "")
  assert.equal(Model.timeRange(todayAllDay.start, todayAllDay.end, todayAllDay.allDay), "All day")
  assert.equal(Model.meetingTimeLabel(todayAllDay.start, todayAllDay.end, now, todayAllDay.allDay), "Today · All day")
  assert.equal(Model.meetingTimeLabel(tmrwAllDay.start, tmrwAllDay.end, now, tmrwAllDay.allDay), "Tomorrow · All day")
})

test("buildScheduleGroups orders timed events before all-day events within day groups", () => {
  const now = new Date(2026, 7, 27, 8, 0, 0)

  const allDay = {
    uid: "allday-1",
    title: "Hackathon",
    start: new Date(2026, 7, 27, 0, 0, 0),
    end: new Date(2026, 7, 28, 0, 0, 0),
    allDay: true
  }

  const timed1 = {
    uid: "timed-1",
    title: "Standup",
    start: new Date(2026, 7, 27, 9, 0, 0),
    end: new Date(2026, 7, 27, 9, 30, 0),
    allDay: false
  }

  const timed2 = {
    uid: "timed-2",
    title: "Retro",
    start: new Date(2026, 7, 27, 15, 0, 0),
    end: new Date(2026, 7, 27, 16, 0, 0),
    allDay: false
  }

  const groups = Model.buildScheduleGroups([allDay, timed2, timed1], now, { lookaheadDays: 3 })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].title, "TODAY")
  assert.equal(groups[0].items.length, 3)
  assert.equal(groups[0].items[0].title, "Standup")
  assert.equal(groups[0].items[1].title, "Retro")
  assert.equal(groups[0].items[2].title, "Hackathon")
})

test("parseIcs and buildUpcoming with ICS containing all-day and timed events", () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:allday-event@test
DTSTART;VALUE=DATE:20260824
DTEND;VALUE=DATE:20260825
SUMMARY:Conference Day
END:VEVENT
BEGIN:VEVENT
UID:timed-event@test
DTSTART:20260824T140000
DTEND:20260824T150000
SUMMARY:Project Sync
LOCATION:https://meet.google.com/abc-defg-hij
END:VEVENT
END:VCALENDAR`

  const now = new Date(2026, 7, 24, 10, 0, 0)
  const events = Model.parseIcs(ics, { now: now, lookaheadDays: 3 })
  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })

  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Project Sync")
  assert.equal(upcoming[1].title, "Conference Day")
})

test("identifies midnight-to-midnight datetime events as all-day events", () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:allday-midnight@test
DTSTART:20260824T000000
DTEND:20260825T000000
SUMMARY:Full Day Off
END:VEVENT
BEGIN:VEVENT
UID:timed-standup@test
DTSTART:20260824T100000
DTEND:20260824T103000
SUMMARY:Team Standup
END:VEVENT
END:VCALENDAR`

  const now = new Date(2026, 7, 24, 8, 0, 0)
  const events = Model.parseIcs(ics, { now: now, lookaheadDays: 3 })
  assert.equal(events[0].allDay, true)
  assert.equal(events[1].allDay, false)

  const upcoming = Model.buildUpcoming(events, now, { showOnlyWithVideoLink: false })
  assert.equal(upcoming.length, 2)
  assert.equal(upcoming[0].title, "Team Standup")
  assert.equal(upcoming[1].title, "Full Day Off")
})

test("does not treat short midnight-starting events as all-day", () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:timed-midnight@test
DTSTART:20260824T000000
DTEND:20260824T010000
SUMMARY:System Maintenance
END:VEVENT
END:VCALENDAR`

  const now = new Date(2026, 7, 23, 23, 0, 0)
  const events = Model.parseIcs(ics, { now: now, lookaheadDays: 3 })
  assert.equal(events[0].allDay, false)
})

test("does not treat 24-hour non-midnight events as all-day", () => {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:timed-hackathon@test
DTSTART:20260824T140000
DTEND:20260825T140000
SUMMARY:24h Hackathon
END:VEVENT
END:VCALENDAR`

  const now = new Date(2026, 7, 24, 10, 0, 0)
  const events = Model.parseIcs(ics, { now: now, lookaheadDays: 3 })
  assert.equal(events[0].allDay, false)
})

