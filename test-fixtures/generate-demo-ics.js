#!/usr/bin/env node
"use strict"

const fs = require("node:fs")
const path = require("node:path")

function pad2(n) {
  return (n < 10 ? "0" : "") + n
}

function formatUtc(date) {
  return (
    date.getUTCFullYear() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    "T" +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    "Z"
  )
}

function formatDateOnly(date) {
  return "" + date.getFullYear() + pad2(date.getMonth() + 1) + pad2(date.getDate())
}

function generateDemoIcs() {
  const now = new Date()

  // 1. Live event happening RIGHT NOW
  const liveStart = new Date(now.getTime() - 25 * 60 * 1000)
  const liveEnd = new Date(now.getTime() + 35 * 60 * 1000)

  // 2. Upcoming today with Google Meet
  const meetStart = new Date(now.getTime() + 60 * 60 * 1000)
  const meetEnd = new Date(now.getTime() + 120 * 60 * 1000)

  // 3. Upcoming today with Zoom
  const zoomStart = new Date(now.getTime() + 150 * 60 * 1000)
  const zoomEnd = new Date(now.getTime() + 195 * 60 * 1000)

  // 4. Upcoming today with Microsoft Teams and decoy options link
  const teamsStart = new Date(now.getTime() + 240 * 60 * 1000)
  const teamsEnd = new Date(now.getTime() + 270 * 60 * 1000)

  // 5. Evening timed event without video link
  const eveningStart = new Date(now)
  eveningStart.setHours(20, 0, 0, 0)
  const eveningEnd = new Date(now)
  eveningEnd.setHours(21, 30, 0, 0)

  // 6. All-day event today
  const todayDateStr = formatDateOnly(now)
  const tmrwDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tmrwDateStr = formatDateOnly(tmrwDate)
  const day3Date = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const day3DateStr = formatDateOnly(day3Date)
  const day4Date = new Date(now.getTime() + 72 * 60 * 60 * 1000)

  // 7. Tomorrow timed with Webex
  const webexStart = new Date(tmrwDate)
  webexStart.setHours(10, 0, 0, 0)
  const webexEnd = new Date(tmrwDate)
  webexEnd.setHours(10, 45, 0, 0)

  // 8. Tomorrow timed with GoTo meeting
  const gotoStart = new Date(tmrwDate)
  gotoStart.setHours(14, 0, 0, 0)
  const gotoEnd = new Date(tmrwDate)
  gotoEnd.setHours(15, 0, 0, 0)

  // 9. Day 3 timed with long title & truncation
  const day3Start = new Date(day3Date)
  day3Start.setHours(11, 0, 0, 0)
  const day3End = new Date(day3Date)
  day3End.setHours(12, 30, 0, 0)

  // 10. Day 4 recurring sync
  const day4Start = new Date(day4Date)
  day4Start.setHours(9, 30, 0, 0)
  const day4End = new Date(day4Date)
  day4End.setHours(10, 0, 0, 0)

  const workIcs = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omarchy//NextEvent Visual Regression Fixture//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Work Calendar",
    "",
    "BEGIN:VEVENT",
    "UID:demo-live-now@next-event",
    "SUMMARY:Live Incident Response & Team Sync",
    "DTSTART:" + formatUtc(liveStart),
    "DTEND:" + formatUtc(liveEnd),
    "DESCRIPTION:Active incident sync room.\\nJoin video: https://meet.google.com/qrs-tuvw-xyz",
    "LOCATION:https://meet.google.com/qrs-tuvw-xyz",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-meet-today@next-event",
    "SUMMARY:Product Strategy & Roadmap Review",
    "DTSTART:" + formatUtc(meetStart),
    "DTEND:" + formatUtc(meetEnd),
    "DESCRIPTION:Quarterly review.\\nJoin Google Meet: https://meet.google.com/abc-defg-hij",
    "LOCATION:Room 402 / https://meet.google.com/abc-defg-hij",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-zoom-today@next-event",
    "SUMMARY:Architecture Advisory Board (Security & Infra)",
    "DTSTART:" + formatUtc(zoomStart),
    "DTEND:" + formatUtc(zoomEnd),
    "DESCRIPTION:External partner sync.\\nZoom: https://us02web.zoom.us/j/9876543210?pwd=SecurePassword123",
    "CONFERENCE:https://us02web.zoom.us/j/9876543210?pwd=SecurePassword123",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-teams-today@next-event",
    "SUMMARY:Client Demo & Executive Briefing",
    "DTSTART:" + formatUtc(teamsStart),
    "DTEND:" + formatUtc(teamsEnd),
    "DESCRIPTION:Click to join: <https://teams.microsoft.com/l/meetup-join/19%3ameeting_NmYxZTgz%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d>\\nMeeting options <https://teams.microsoft.com/meetingOptions/?organizerId=abc>",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-evening-today@next-event",
    "SUMMARY:Team Dinner & Social Gathering",
    "DTSTART:" + formatUtc(eveningStart),
    "DTEND:" + formatUtc(eveningEnd),
    "LOCATION:Downtown Bistro, 4th Avenue",
    "DESCRIPTION:In-person social event. No video link attached.",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-allday-today@next-event",
    "SUMMARY:Company Hackathon & Innovation Day",
    "DTSTART;VALUE=DATE:" + todayDateStr,
    "DTEND;VALUE=DATE:" + tmrwDateStr,
    "DESCRIPTION:Annual company-wide hackathon day.",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-webex-tmrw@next-event",
    "SUMMARY:Vendor Security Audit & Compliance",
    "DTSTART:" + formatUtc(webexStart),
    "DTEND:" + formatUtc(webexEnd),
    "DESCRIPTION:Join room: https://acme.webex.com/meet/jane.doe",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-goto-tmrw@next-event",
    "SUMMARY:Customer Success Onboarding",
    "DTSTART:" + formatUtc(gotoStart),
    "DTEND:" + formatUtc(gotoEnd),
    "DESCRIPTION:Join via GoTo: https://app.goto.com/meeting/119227189",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-allday-tmrw@next-event",
    "SUMMARY:Engineering Team Offsite & Planning",
    "DTSTART;VALUE=DATE:" + tmrwDateStr,
    "DTEND;VALUE=DATE:" + day3DateStr,
    "DESCRIPTION:Full-day planning workshop.",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-longtitle-day3@next-event",
    "SUMMARY:Strategic Cross-Functional Architecture & Infrastructure Modernization Committee",
    "DTSTART:" + formatUtc(day3Start),
    "DTEND:" + formatUtc(day3End),
    "DESCRIPTION:Deep dive modernization review.\\nJoin: https://meet.google.com/klm-nopq-rst",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-recurring-day4@next-event",
    "SUMMARY:Weekly Sprint Planning & Backlog Grooming",
    "DTSTART:" + formatUtc(day4Start),
    "DTEND:" + formatUtc(day4End),
    "RRULE:FREQ=WEEKLY;BYDAY=MO",
    "DESCRIPTION:Weekly team sync.\\nJoin: https://meet.google.com/uvw-xyza-bcd",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "END:VCALENDAR"
  ].join("\r\n")

  const personalIcs = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omarchy//NextEvent Personal Fixture//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Personal",
    "",
    "BEGIN:VEVENT",
    "UID:demo-personal-gym@next-event",
    "SUMMARY:Gym & Hypertrophy Training",
    "DTSTART:" + formatUtc(new Date(now.getTime() + 180 * 60 * 1000)),
    "DTEND:" + formatUtc(new Date(now.getTime() + 240 * 60 * 1000)),
    "LOCATION:CityFit Gym",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "BEGIN:VEVENT",
    "UID:demo-personal-reading@next-event",
    "SUMMARY:Daily Reading & Journaling",
    "DTSTART:" + formatUtc(new Date(now.getTime() + 300 * 60 * 1000)),
    "DTEND:" + formatUtc(new Date(now.getTime() + 330 * 60 * 1000)),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "",
    "END:VCALENDAR"
  ].join("\r\n")

  const outDir = path.resolve(__dirname)
  const workPath = path.join(outDir, "demo.ics")
  const personalPath = path.join(outDir, "personal-demo.ics")

  fs.writeFileSync(workPath, workIcs, "utf8")
  fs.writeFileSync(personalPath, personalIcs, "utf8")

  console.log("Successfully generated demo fixtures:")
  console.log("  Work calendar:     " + workPath)
  console.log("  Personal calendar: " + personalPath)
  console.log("\nTo test in Omarchy bar, run:")
  console.log(
    '  omarchy bar set tobiasz-p.next-event icsUrl "Work|file://' +
      workPath +
      ",Personal|file://" +
      personalPath +
      '"'
  )
}

generateDemoIcs()
