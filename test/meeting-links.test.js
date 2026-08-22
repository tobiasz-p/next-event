"use strict"

// Meeting-link detection: the VIDEO_PROVIDERS table, findMeetUrl(), meetLabel(),
// and the ICS properties a join link can arrive in.
//
// Several fixtures are modelled on real Outlook, Webex and GoTo invite bodies
// with identifiers replaced — the decoy links they carry (meetingOptions, dial-in
// helpers, Teams/Webex interop) are the reason the provider patterns restrict
// paths instead of matching on host alone.

const { describe, it } = require("node:test")
const assert = require("node:assert")
const M = require("../Model.js")

const NOW = new Date("2026-08-17T09:00:00Z")

let uid = 0

// Build a single-VEVENT feed from raw property lines.
function feed(lines) {
  uid++
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:test-" + uid,
    "DTSTART:20260817T140000Z",
    "DTEND:20260817T150000Z",
    "SUMMARY:Test Event",
    ...lines,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n")
}

function parseOne(lines) {
  const events = M.parseIcs(feed(lines), { now: NOW, lookaheadDays: 7 })
  assert.strictEqual(events.length, 1, "expected exactly one parsed event")
  return events[0]
}

describe("Zoom link detection", () => {
  it("finds a Zoom URL in LOCATION", () => {
    const ev = parseOne(["LOCATION:https://us02web.zoom.us/j/85512345678"])
    assert.strictEqual(ev.meetUrl, "https://us02web.zoom.us/j/85512345678")
  })

  it("preserves the ?pwd= query", () => {
    const ev = parseOne(["DESCRIPTION:Join Zoom Meeting\\nhttps://zoom.us/j/1234567890?pwd=aBcDeFgH"])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/j/1234567890?pwd=aBcDeFgH")
  })

  it("accepts vanity subdomains", () => {
    const ev = parseOne(["LOCATION:https://acmecorp.zoom.us/j/99988877766"])
    assert.strictEqual(ev.meetUrl, "https://acmecorp.zoom.us/j/99988877766")
  })

  it("accepts zoomgov.com (Zoom for Government)", () => {
    const ev = parseOne(["LOCATION:https://www.zoomgov.com/j/1616161616"])
    assert.strictEqual(ev.meetUrl, "https://www.zoomgov.com/j/1616161616")
  })

  it("accepts personal rooms (/my/)", () => {
    const ev = parseOne(["LOCATION:https://zoom.us/my/jane.doe"])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/my/jane.doe")
  })

  it("accepts webinars (/w/)", () => {
    const ev = parseOne(["LOCATION:https://zoom.us/w/84512345678"])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/w/84512345678")
  })
})

describe("Teams link detection", () => {
  // A real Outlook invite body: the join link is wrapped in angle brackets, and
  // a meetingOptions link to the same host sits a few lines below it.
  const OUTLOOK_BODY =
    "DESCRIPTION:____________________________________\\n" +
    "Microsoft Teams meeting\\n" +
    "Click here to join the meeting" +
    "<https://teams.microsoft.com/l/meetup-join/19%3ameeting_NmYxZTgz%40thread.v2/0" +
    "?context=%7b%22Tid%22%3a%22abc%22%2c%22Oid%22%3a%22def%22%7d>\\n" +
    "Meeting ID: 123 456 789 012\\nPasscode: aBcDeF\\n" +
    "Learn More<https://aka.ms/JoinTeamsMeeting> | " +
    "Meeting options<https://teams.microsoft.com/meetingOptions/?organizerId=abc>\\n"

  it("extracts the join link from an Outlook invite body", () => {
    const ev = parseOne([OUTLOOK_BODY])
    assert.strictEqual(ev.meetUrl,
      "https://teams.microsoft.com/l/meetup-join/19%3ameeting_NmYxZTgz%40thread.v2/0" +
      "?context=%7b%22Tid%22%3a%22abc%22%2c%22Oid%22%3a%22def%22%7d")
  })

  // The path restriction earns its keep here: meetingOptions is on the same
  // host, so a domain-only pattern would happily "join" the settings page.
  it("does not mistake a meetingOptions link for a join link", () => {
    const ev = parseOne([
      "DESCRIPTION:Meeting options<https://teams.microsoft.com/meetingOptions/?organizerId=abc>"
    ])
    assert.strictEqual(ev.meetUrl, null)
  })

  // Modelled on a real corporate invite (identifiers replaced). The modern
  // short link is the one a human is told to click; the older l/meetup-join
  // form is demoted to "System reference" below it. Four decoys share the body:
  // a meetingOptions page on the same host, two dialin.teams.cloud.microsoft
  // links, an aka.ms redirect, and — the nasty one — a www.webex.com interop
  // link, which a host-only Webex pattern would happily treat as a meeting.
  const MODERN_INVITE =
    "DESCRIPTION:____________________________________\\n" +
    "Microsoft Teams meeting\\n" +
    "Join: https://teams.microsoft.com/meet/100000000000000?p=AbCdEfGhIjKlMnOpQr\\n" +
    "Meeting ID: 100 000 000 000 000\\nPasscode: a1b2c3d4\\n" +
    "________________________________\\n" +
    "Need help?<https://aka.ms/JoinTeamsMeeting?omkt=en-US> | " +
    "System reference<https://teams.microsoft.com/l/meetup-join/19%3ameeting_" +
    "AAAABBBBCCCCDDDD%40thread.v2/0?context=%7b%22Tid%22%3a%2200000000-0000-0000-0000-000000000000%22%7d>\\n" +
    "Dial in by phone\\n+1 555-000-0000\\,\\,000000000#<tel:+15550000000\\,\\,000000000> United States\\n" +
    "Find a local number<https://dialin.teams.cloud.microsoft/00000000-0000-0000-0000-000000000000?id=000000000>\\n" +
    "Join on a video conferencing device\\nTenant key: example@m.webex.com\\n" +
    "More info<https://www.webex.com/msteams?confid=0000000000&tenantkey=example&domain=m.webex.com>\\n" +
    "For organizers: Meeting options<https://teams.microsoft.com/meetingOptions/?organizerId=0000&tenantId=0000> | " +
    "Reset dial-in PIN<https://dialin.teams.cloud.microsoft/usp/pstnconferencing>\\n"

  it("picks the modern short join link out of a full invite body", () => {
    const ev = parseOne([MODERN_INVITE])
    assert.strictEqual(ev.meetUrl,
      "https://teams.microsoft.com/meet/100000000000000?p=AbCdEfGhIjKlMnOpQr")
  })

  it("ignores the Webex interop link inside a Teams invite", () => {
    // On its own, with no Teams link to outrank it, the interop page must still
    // not register as a Webex meeting.
    const ev = parseOne([
      "DESCRIPTION:More info<https://www.webex.com/msteams?confid=0000000000&tenantkey=example>"
    ])
    assert.strictEqual(ev.meetUrl, null)
  })

  it("ignores dial-in helper links on teams.cloud.microsoft", () => {
    const ev = parseOne([
      "DESCRIPTION:Find a local number<https://dialin.teams.cloud.microsoft/0000?id=1>"
    ])
    assert.strictEqual(ev.meetUrl, null)
  })

  it("accepts teams.live.com personal meetings", () => {
    const ev = parseOne(["LOCATION:https://teams.live.com/meet/9312345678901"])
    assert.strictEqual(ev.meetUrl, "https://teams.live.com/meet/9312345678901")
  })

  it("accepts government tenants on teams.microsoft.us", () => {
    const ev = parseOne(["LOCATION:https://dod.teams.microsoft.us/l/meetup-join/19%3ameeting_abc%40thread.v2/0"])
    assert.strictEqual(ev.meetUrl, "https://dod.teams.microsoft.us/l/meetup-join/19%3ameeting_abc%40thread.v2/0")
  })

  it("accepts a dl/launcher link", () => {
    const ev = parseOne(["LOCATION:https://teams.microsoft.com/dl/launcher/abc123?type=meetup-join"])
    assert.strictEqual(ev.meetUrl, "https://teams.microsoft.com/dl/launcher/abc123?type=meetup-join")
  })

  it("reads the X-MICROSOFT-SKYPETEAMSMEETINGURL property", () => {
    const ev = parseOne([
      "X-MICROSOFT-SKYPETEAMSMEETINGURL:https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz%40thread.v2/0"
    ])
    assert.strictEqual(ev.meetUrl,
      "https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz%40thread.v2/0")
  })
})

describe("Webex link detection", () => {
  it("accepts a hosted-site j.php link", () => {
    const ev = parseOne(["LOCATION:https://acme.webex.com/acme/j.php?MTID=m0123456789abcdef"])
    assert.strictEqual(ev.meetUrl, "https://acme.webex.com/acme/j.php?MTID=m0123456789abcdef")
  })

  it("accepts a personal room", () => {
    const ev = parseOne(["LOCATION:https://acme.webex.com/meet/jane.doe"])
    assert.strictEqual(ev.meetUrl, "https://acme.webex.com/meet/jane.doe")
  })

  it("accepts a /join/ link", () => {
    const ev = parseOne(["LOCATION:https://acme.webex.com/join/jane.doe"])
    assert.strictEqual(ev.meetUrl, "https://acme.webex.com/join/jane.doe")
  })

  it("does not match a bare webex.com marketing link", () => {
    const ev = parseOne(["DESCRIPTION:See https://www.webex.com/pricing for plans"])
    assert.strictEqual(ev.meetUrl, null)
  })

  it("does not match the help site", () => {
    assert.strictEqual(M.findMeetUrl("https://help.webex.com"), null)
    assert.strictEqual(M.findMeetUrl("https://help.webex.com/"), null)
  })

  // Modelled on a real corporate invite (identifiers replaced). The join link
  // carries a site segment before j.php, and the body also contains a SIP dial
  // address on the same host and a help.webex.com link — neither is a meeting.
  it("picks the join link out of a full invite body", () => {
    const ev = parseOne([
      "DESCRIPTION:More ways to join:\\n\\nJoin from the meeting link\\n" +
      "https://example.webex.com/example/j.php?MTID=m00000000000000000000000000000000\\n\\n" +
      "Join by meeting number\\nMeeting number (access code): 2541 422 4390\\n" +
      "Meeting password: Xxxxxxxxxxx\\n" +
      "Join from a video system or application\\nDial 25414224390@example.webex.com\\n" +
      "Need help? Go to https://help.webex.com"
    ])
    assert.strictEqual(ev.meetUrl,
      "https://example.webex.com/example/j.php?MTID=m00000000000000000000000000000000")
  })
})

describe("GoTo link detection", () => {
  it("accepts a meet.goto.com link", () => {
    const ev = parseOne([
      "DESCRIPTION:You can join this meeting from your computer\\, tablet\\, or smartphone.\\n" +
      "https://meet.goto.com/119227189\\n\\nYou can also dial in using your phone.\\n" +
      "US: +1 312 757 3121\\nAccess Code: 119-227-189"
    ])
    assert.strictEqual(ev.meetUrl, "https://meet.goto.com/119227189")
  })

  it("accepts the legacy gotomeeting.com/join form", () => {
    const ev = parseOne(["LOCATION:https://global.gotomeeting.com/join/119227189"])
    assert.strictEqual(ev.meetUrl, "https://global.gotomeeting.com/join/119227189")
  })

  it("accepts a gotomeet.me personal room", () => {
    const ev = parseOne(["LOCATION:https://www.gotomeet.me/example.person"])
    assert.strictEqual(ev.meetUrl, "https://www.gotomeet.me/example.person")
  })

  it("does not match a gotomeeting.com marketing page", () => {
    assert.strictEqual(M.findMeetUrl("https://www.gotomeeting.com/pricing"), null)
  })
})

describe("URL boundary handling", () => {
  it("stops at the quote inside an HTML anchor", () => {
    const ev = parseOne(['DESCRIPTION:<a href="https://us06web.zoom.us/j/123456?pwd=xyz">Join</a>'])
    assert.strictEqual(ev.meetUrl, "https://us06web.zoom.us/j/123456?pwd=xyz")
  })

  it("strips a trailing sentence period", () => {
    const ev = parseOne(["DESCRIPTION:Please join at https://zoom.us/j/9876543210."])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/j/9876543210")
  })

  it("strips a trailing close-paren", () => {
    const ev = parseOne(["DESCRIPTION:Dial in (https://zoom.us/j/5551112222) or call."])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/j/5551112222")
  })

  // RFC 5545 folding: continuation lines begin with a single space. Feeds wrap
  // at 75 octets, so any Zoom URL carrying a pwd arrives folded.
  it("reassembles a folded long URL", () => {
    const ev = parseOne([
      "DESCRIPTION:Join Zoom Meeting\\nhttps://us02web.zoom.us/j/8551234",
      " 5678?pwd=VGhpc0lzQVRlc3RQYXNzd29yZA"
    ])
    assert.strictEqual(ev.meetUrl,
      "https://us02web.zoom.us/j/85512345678?pwd=VGhpc0lzQVRlc3RQYXNzd29yZA")
  })

  it("does not treat a bare domain mention as a link", () => {
    const ev = parseOne(["LOCATION:Discussion about zoom.us pricing"])
    assert.strictEqual(ev.meetUrl, null)
  })
})

describe("CONFERENCE property (RFC 7986)", () => {
  it("reads a Zoom link from CONFERENCE", () => {
    const ev = parseOne(["CONFERENCE;VALUE=URI;FEATURE=VIDEO;LABEL=Join:https://zoom.us/j/5550001111"])
    assert.strictEqual(ev.meetUrl, "https://zoom.us/j/5550001111")
  })

  it("reads a Meet link from CONFERENCE", () => {
    const ev = parseOne(["CONFERENCE;VALUE=URI;FEATURE=VIDEO:https://meet.google.com/abc-defg-hij"])
    assert.strictEqual(ev.meetUrl, "https://meet.google.com/abc-defg-hij")
  })
})

describe("provider priority", () => {
  it("resolves to Meet when an event carries both", () => {
    const ev = parseOne([
      "LOCATION:https://us02web.zoom.us/j/85512345678",
      "DESCRIPTION:Backup: https://meet.google.com/abc-defg-hij"
    ])
    assert.strictEqual(ev.meetUrl, "https://meet.google.com/abc-defg-hij")
  })
})

describe("Google Meet regressions", () => {
  it("still finds a Meet link in DESCRIPTION", () => {
    const ev = parseOne(["DESCRIPTION:https://meet.google.com/abc-defg-hij"])
    assert.strictEqual(ev.meetUrl, "https://meet.google.com/abc-defg-hij")
  })

  it("still finds a Meet link in X-GOOGLE-CONFERENCE", () => {
    const ev = parseOne(["X-GOOGLE-CONFERENCE:https://meet.google.com/xyz-1234-abc"])
    assert.strictEqual(ev.meetUrl, "https://meet.google.com/xyz-1234-abc")
  })

  it("leaves a link-free event with null meetUrl", () => {
    const ev = parseOne(["LOCATION:Conference Room B"])
    assert.strictEqual(ev.meetUrl, null)
  })
})

describe("meetLabel", () => {
  it("labels Meet and the other providers", () => {
    assert.strictEqual(M.meetLabel("https://meet.google.com/abc-defg-hij"), "Meet")
    assert.strictEqual(M.meetLabel("https://zoom.us/j/5550001111"), "Video")
    assert.strictEqual(M.meetLabel("https://teams.live.com/meet/9312345678901"), "Video")
    assert.strictEqual(M.meetLabel("https://acme.webex.com/meet/jane.doe"), "Video")
    assert.strictEqual(M.meetLabel("https://meet.goto.com/119227189"), "Video")
  })

  it("falls back to a neutral word so the badge never renders empty", () => {
    assert.strictEqual(M.meetLabel(null), "Video")
    assert.strictEqual(M.meetLabel("https://example.com/whatever"), "Video")
  })
})

describe("showOnlyWithVideoLink filter", () => {
  it("keeps a Zoom event and drops a link-free one", () => {
    const events = M.parseIcs([
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:a", "DTSTART:20260817T140000Z", "DTEND:20260817T150000Z",
      "SUMMARY:Zoom Standup", "LOCATION:https://zoom.us/j/111", "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:b", "DTSTART:20260817T160000Z", "DTEND:20260817T170000Z",
      "SUMMARY:Desk Lunch", "LOCATION:Kitchen", "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n"), { now: NOW, lookaheadDays: 7 })

    const filtered = M.buildUpcoming(events, NOW, {
      lookaheadDays: 3, showOnlyWithVideoLink: true
    })
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].title, "Zoom Standup")
  })
})
