"use strict"

const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { MeetingLinkDetector } = require("../Model.js")

describe("MeetingLinkDetector", () => {
  describe("trimUrlPunctuation()", () => {
    it("strips trailing punctuation marks", () => {
      assert.strictEqual(
        MeetingLinkDetector.trimUrlPunctuation("https://meet.google.com/abc-defg-hij."),
        "https://meet.google.com/abc-defg-hij"
      )
      assert.strictEqual(
        MeetingLinkDetector.trimUrlPunctuation("https://meet.google.com/abc-defg-hij)"),
        "https://meet.google.com/abc-defg-hij"
      )
      assert.strictEqual(
        MeetingLinkDetector.trimUrlPunctuation("https://meet.google.com/abc-defg-hij,"),
        "https://meet.google.com/abc-defg-hij"
      )
    })
  })

  describe("findMeetUrl()", () => {
    it("extracts Google Meet URLs", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("Join at https://meet.google.com/xyz-abcd-efg today!"),
        "https://meet.google.com/xyz-abcd-efg"
      )
    })

    it("extracts standard Zoom URLs and preserves query params", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl(
          "Join Zoom Meeting https://zoom.us/j/1234567890?pwd=aBcDeFgH"
        ),
        "https://zoom.us/j/1234567890?pwd=aBcDeFgH"
      )
    })

    it("extracts Zoom vanity domains, zoomgov, personal rooms, and webinars", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://acmecorp.zoom.us/j/99988877766"),
        "https://acmecorp.zoom.us/j/99988877766"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://www.zoomgov.com/j/1616161616"),
        "https://www.zoomgov.com/j/1616161616"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://zoom.us/my/jane.doe"),
        "https://zoom.us/my/jane.doe"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://zoom.us/w/84512345678"),
        "https://zoom.us/w/84512345678"
      )
    })

    it("extracts Microsoft Teams join links while ignoring meetingOptions", () => {
      const body =
        "Microsoft Teams meeting\n" +
        "Click here to join the meeting <https://teams.microsoft.com/l/meetup-join/19%3ameeting_NmYxZTgz%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%2c%22Oid%22%3a%22def%22%7d>\n" +
        "Meeting options <https://teams.microsoft.com/meetingOptions/?organizerId=abc>"

      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl(body),
        "https://teams.microsoft.com/l/meetup-join/19%3ameeting_NmYxZTgz%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%2c%22Oid%22%3a%22def%22%7d"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl(
          "Meeting options <https://teams.microsoft.com/meetingOptions/?organizerId=abc>"
        ),
        null
      )
    })

    it("extracts Teams personal, US gov, and launcher links", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://teams.live.com/meet/9312345678901"),
        "https://teams.live.com/meet/9312345678901"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://gov.teams.microsoft.us/l/meetup-join/abc"),
        "https://gov.teams.microsoft.us/l/meetup-join/abc"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl(
          "https://teams.microsoft.com/dl/launcher/launcher.html?url=test"
        ),
        "https://teams.microsoft.com/dl/launcher/launcher.html?url=test"
      )
    })

    it("extracts Webex join and personal links while ignoring marketing URLs", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://company.webex.com/company/j.php?MTID=m123456"),
        "https://company.webex.com/company/j.php?MTID=m123456"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://acme.webex.com/meet/jane.doe"),
        "https://acme.webex.com/meet/jane.doe"
      )
      assert.strictEqual(MeetingLinkDetector.findMeetUrl("https://webex.com"), null)
      assert.strictEqual(MeetingLinkDetector.findMeetUrl("https://help.webex.com"), null)
    })

    it("extracts GoTo meeting and room links while ignoring pricing pages", () => {
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://meet.goto.com/119227189"),
        "https://meet.goto.com/119227189"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://www.gotomeet.me/CustomRoom"),
        "https://www.gotomeet.me/CustomRoom"
      )
      assert.strictEqual(
        MeetingLinkDetector.findMeetUrl("https://www.gotomeeting.com/pricing"),
        null
      )
    })

    it("returns null for text without meeting links", () => {
      assert.strictEqual(MeetingLinkDetector.findMeetUrl("Meeting in Conference Room B"), null)
      assert.strictEqual(MeetingLinkDetector.findMeetUrl(""), null)
      assert.strictEqual(MeetingLinkDetector.findMeetUrl(null), null)
    })
  })

  describe("meetLabel()", () => {
    it("returns 'Meet' for Google Meet URLs", () => {
      assert.strictEqual(
        MeetingLinkDetector.meetLabel("https://meet.google.com/xyz-abcd-efg"),
        "Meet"
      )
    })

    it("returns specific provider names for third-party video providers", () => {
      assert.strictEqual(
        MeetingLinkDetector.meetLabel("https://us02web.zoom.us/j/123456789"),
        "Zoom"
      )
      assert.strictEqual(
        MeetingLinkDetector.meetLabel("https://teams.microsoft.com/l/meetup-join/123"),
        "Teams"
      )
      assert.strictEqual(
        MeetingLinkDetector.meetLabel("https://acme.webex.com/meet/jane.doe"),
        "Webex"
      )
      assert.strictEqual(MeetingLinkDetector.meetLabel("https://meet.goto.com/119227189"), "GoTo")
    })

    it("falls back to 'Video' when URL is null or unrecognized", () => {
      assert.strictEqual(MeetingLinkDetector.meetLabel(null), "Video")
      assert.strictEqual(MeetingLinkDetector.meetLabel("https://example.com/custom"), "Video")
    })
  })
})
