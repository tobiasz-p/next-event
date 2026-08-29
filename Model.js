// ---------------------------------------------------------------------------
// Model.js — Domain entities, parsing, recurrence, timezones, and display logic
// ---------------------------------------------------------------------------

// --- Top-level constants (directly accessible on Model.* in QML) -----------

var MS_PER_SECOND = 1000
var MS_PER_MINUTE = 60000
var MS_PER_HOUR = 3600000
var MS_PER_DAY = 86400000
var MINUTES_PER_HOUR = 60
var SECONDS_PER_MINUTE = 60
var HOURS_PER_DAY = 24
var DAYS_PER_WEEK = 7

var DEFAULT_REFRESH_MINUTES = 5
var DEFAULT_LOOKAHEAD_DAYS = 3
var DEFAULT_MAX_TITLE_LENGTH = 28
var MIN_MAX_TITLE_LENGTH = 8
var MIN_TITLE_CHARS = 3
var DEFAULT_MAX_FEED_SIZE_MIB = 10
var FETCH_TIMEOUT_SECONDS = 15
var BYTES_PER_MIB = 1048576

var DEFAULT_MAX_EVENTS = 80
var DEFAULT_MAX_MEETING_ROWS = 8
var DEFAULT_MAX_ROWS = 20
var MAX_RRULE_STEPS = 20000
var TRANSITION_YEAR_MARGIN = 1

var DEFAULT_KEY_REFRESH = "r"
var DEFAULT_KEY_JOIN = "m"
var DEFAULT_KEY_CALENDAR = "o"
var DEFAULT_KEY_SETTINGS = ","

var SOURCE_MODE_ICS = "ics"
var SOURCE_MODE_JSON = "json"

var LABEL_TODAY = "Today"
var LABEL_TOMORROW = "Tomorrow"
var LABEL_YESTERDAY = "Yesterday"
var LABEL_ALL_DAY = "All day"
var LABEL_UNTITLED = "(Untitled)"
var LABEL_JUST_NOW = "just now"
var DEFAULT_EVENT_TITLE = "(Untitled)"
var DEFAULT_CALENDAR_URL_BASE = "https://calendar.google.com/calendar"
var RESPONSE_STATUS_DECLINED = "declined"

var SECTION_EVENTS = "EVENTS"
var SECTION_SETTINGS = "SETTINGS"
var SECTION_TODAY = "TODAY"
var SECTION_TOMORROW = "TOMORROW"
var SECTION_NEXT = "NEXT"
var SECTION_HAPPENING_NOW = "HAPPENING NOW"

var STATUS_UPDATING = "updating…"
var STATUS_OFFLINE_CACHED = "offline · cached"
var STATUS_OFFLINE = "offline"

var TOOLTIP_REFRESH = "Refresh calendar"
var TOOLTIP_SETTINGS = "Settings (,)"
var TOOLTIP_BACK_SCHEDULE = "Back to schedule"
var TOOLTIP_UPDATING = "Updating calendar…"

var ICON_REFRESH = ""
var ICON_SETTINGS = "󰒓"
var ICON_MEETING_VIDEO = ""
var ICON_CALENDAR_EVENT = "󰃯"
var ICON_CALENDAR_EMPTY = "󰃲"

var LABEL_JOIN_MEETING = "Join Meeting"
var LABEL_OPEN_CALENDAR = "Open in Calendar"

var LABEL_SETUP_CONNECT_TITLE = "Connect Your Calendar"
var LABEL_SETUP_CONNECT_SUBTITLE = "Choose the method that matches your calendar provider:"
var LABEL_SETUP_OPTION1_TITLE = "Option 1: Google Workspace / OAuth (Work accounts)"
var LABEL_SETUP_OPTION1_DESC =
  "If your organization disables private iCal URLs, run the interactive OAuth setup:"
var LABEL_SETUP_OPTION1_CMD = "~/.config/omarchy/plugins/tobiasz-p.next-event/sync/setup"
var LABEL_SETUP_OPTION2_TITLE = "Option 2: Private iCal (.ics) Feed URL"
var LABEL_SETUP_OPTION2_DESC = "For personal Google Calendar, Outlook, iCloud, or Nextcloud:"
var LABEL_SETUP_OPTION2_CMD = "omarchy bar set tobiasz-p.next-event icsUrl '<iCal-url>'"

var LABEL_NO_MEETINGS = "No upcoming meetings"
var LABEL_SCHEDULE_CLEAR = "Your schedule is clear for the next few days."
var LABEL_EMPTY_SCHEDULE_TITLE = "No upcoming meetings"
var LABEL_EMPTY_SCHEDULE_SUBTITLE = "Your schedule is clear for the next few days."

var LABEL_VIDEO_DEFAULT = "Video"
var LABEL_EVENT_FALLBACK = "Event"

var ACTION_REFRESH = "refresh"
var ACTION_SETTINGS = "settings"
var ACTION_JOIN = "join"
var ACTION_CALENDAR = "calendar"
var ACTION_EVENT = "event"

var WEEKDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
var WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
var MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
]

var VIDEO_PROVIDERS = [
  {
    re: /https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*/,
    label: "Meet"
  },
  {
    re: /https?:\/\/(?:[\w-]+\.)*(?:zoom\.us|zoomgov\.com)\/(?:j|w|s|my)\/[^\s"'<>]+/,
    label: "Zoom"
  },
  {
    re: /https?:\/\/(?:teams\.microsoft\.com|teams\.live\.com|(?:[\w-]+\.)?teams\.microsoft\.us)\/(?:l\/meetup-join|l\/meeting|meet|dl\/launcher)\/[^\s"'<>]+/,
    label: "Teams"
  },
  {
    re: /https?:\/\/(?:[\w-]+\.)*webex\.com\/(?:meet\/|join\/|[^\s"'<>]*j\.php\?)[^\s"'<>]+/,
    label: "Webex"
  },
  {
    re: /https?:\/\/(?:(?:meet\.goto\.com|(?:www\.)?gotomeet\.me)\/[^\s"'<>]+|(?:[\w-]+\.)*gotomeeting\.com\/join\/[^\s"'<>]+)/,
    label: "GoTo"
  }
]

var Constants = {
  MS_PER_SECOND: MS_PER_SECOND,
  MS_PER_MINUTE: MS_PER_MINUTE,
  MS_PER_HOUR: MS_PER_HOUR,
  MS_PER_DAY: MS_PER_DAY,
  MINUTES_PER_HOUR: MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE: SECONDS_PER_MINUTE,
  HOURS_PER_DAY: HOURS_PER_DAY,
  DAYS_PER_WEEK: DAYS_PER_WEEK,
  DEFAULT_REFRESH_MINUTES: DEFAULT_REFRESH_MINUTES,
  DEFAULT_LOOKAHEAD_DAYS: DEFAULT_LOOKAHEAD_DAYS,
  DEFAULT_MAX_TITLE_LENGTH: DEFAULT_MAX_TITLE_LENGTH,
  MIN_MAX_TITLE_LENGTH: MIN_MAX_TITLE_LENGTH,
  MIN_TITLE_CHARS: MIN_TITLE_CHARS,
  DEFAULT_MAX_FEED_SIZE_MIB: DEFAULT_MAX_FEED_SIZE_MIB,
  FETCH_TIMEOUT_SECONDS: FETCH_TIMEOUT_SECONDS,
  BYTES_PER_MIB: BYTES_PER_MIB,
  DEFAULT_MAX_EVENTS: DEFAULT_MAX_EVENTS,
  DEFAULT_MAX_MEETING_ROWS: DEFAULT_MAX_MEETING_ROWS,
  DEFAULT_MAX_ROWS: DEFAULT_MAX_ROWS,
  MAX_RRULE_STEPS: MAX_RRULE_STEPS,
  TRANSITION_YEAR_MARGIN: TRANSITION_YEAR_MARGIN,
  DEFAULT_KEY_REFRESH: DEFAULT_KEY_REFRESH,
  DEFAULT_KEY_SETTINGS: DEFAULT_KEY_SETTINGS,
  DEFAULT_KEY_JOIN: DEFAULT_KEY_JOIN,
  DEFAULT_KEY_CALENDAR: DEFAULT_KEY_CALENDAR,
  SOURCE_MODE_ICS: SOURCE_MODE_ICS,
  SOURCE_MODE_JSON: SOURCE_MODE_JSON,
  LABEL_TODAY: LABEL_TODAY,
  LABEL_TOMORROW: LABEL_TOMORROW,
  LABEL_YESTERDAY: LABEL_YESTERDAY,
  LABEL_ALL_DAY: LABEL_ALL_DAY,
  LABEL_UNTITLED: LABEL_UNTITLED,
  LABEL_JUST_NOW: LABEL_JUST_NOW,
  DEFAULT_EVENT_TITLE: DEFAULT_EVENT_TITLE,
  DEFAULT_CALENDAR_URL_BASE: DEFAULT_CALENDAR_URL_BASE,
  RESPONSE_STATUS_DECLINED: RESPONSE_STATUS_DECLINED,
  SECTION_EVENTS: SECTION_EVENTS,
  SECTION_SETTINGS: SECTION_SETTINGS,
  SECTION_TODAY: SECTION_TODAY,
  SECTION_TOMORROW: SECTION_TOMORROW,
  SECTION_NEXT: SECTION_NEXT,
  SECTION_HAPPENING_NOW: SECTION_HAPPENING_NOW,
  STATUS_UPDATING: STATUS_UPDATING,
  STATUS_OFFLINE_CACHED: STATUS_OFFLINE_CACHED,
  STATUS_OFFLINE: STATUS_OFFLINE,
  TOOLTIP_REFRESH: TOOLTIP_REFRESH,
  TOOLTIP_SETTINGS: TOOLTIP_SETTINGS,
  TOOLTIP_BACK_SCHEDULE: TOOLTIP_BACK_SCHEDULE,
  TOOLTIP_UPDATING: TOOLTIP_UPDATING,
  ICON_REFRESH: ICON_REFRESH,
  ICON_SETTINGS: ICON_SETTINGS,
  ICON_MEETING_VIDEO: ICON_MEETING_VIDEO,
  ICON_CALENDAR_EVENT: ICON_CALENDAR_EVENT,
  ICON_CALENDAR_EMPTY: ICON_CALENDAR_EMPTY,
  LABEL_JOIN_MEETING: LABEL_JOIN_MEETING,
  LABEL_OPEN_CALENDAR: LABEL_OPEN_CALENDAR,
  LABEL_SETUP_CONNECT_TITLE: LABEL_SETUP_CONNECT_TITLE,
  LABEL_SETUP_CONNECT_SUBTITLE: LABEL_SETUP_CONNECT_SUBTITLE,
  LABEL_SETUP_OPTION1_TITLE: LABEL_SETUP_OPTION1_TITLE,
  LABEL_SETUP_OPTION1_DESC: LABEL_SETUP_OPTION1_DESC,
  LABEL_SETUP_OPTION1_CMD: LABEL_SETUP_OPTION1_CMD,
  LABEL_SETUP_OPTION2_TITLE: LABEL_SETUP_OPTION2_TITLE,
  LABEL_SETUP_OPTION2_DESC: LABEL_SETUP_OPTION2_DESC,
  LABEL_SETUP_OPTION2_CMD: LABEL_SETUP_OPTION2_CMD,
  LABEL_NO_MEETINGS: LABEL_NO_MEETINGS,
  LABEL_SCHEDULE_CLEAR: LABEL_SCHEDULE_CLEAR,
  LABEL_EMPTY_SCHEDULE_TITLE: LABEL_EMPTY_SCHEDULE_TITLE,
  LABEL_EMPTY_SCHEDULE_SUBTITLE: LABEL_EMPTY_SCHEDULE_SUBTITLE,
  LABEL_VIDEO_DEFAULT: LABEL_VIDEO_DEFAULT,
  LABEL_EVENT_FALLBACK: LABEL_EVENT_FALLBACK,
  ACTION_REFRESH: ACTION_REFRESH,
  ACTION_SETTINGS: ACTION_SETTINGS,
  ACTION_JOIN: ACTION_JOIN,
  ACTION_CALENDAR: ACTION_CALENDAR,
  ACTION_EVENT: ACTION_EVENT,
  WEEKDAY: WEEKDAY,
  WEEKDAY_NAMES: WEEKDAY_NAMES,
  MONTH_NAMES_SHORT: MONTH_NAMES_SHORT,
  VIDEO_PROVIDERS: VIDEO_PROVIDERS
}

// ---------------------------------------------------------------------------
// DateTimeUtils: Date and time manipulation helpers
// ---------------------------------------------------------------------------

class DateTimeUtils {
  static pad2(number) {
    return (number < 10 ? "0" : "") + number
  }

  static isSameDay(dateA, dateB) {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    )
  }

  static daysInMonthUTC(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
  }

  static dayKey(year, month, day) {
    return year * 10000 + month * 100 + day
  }

  static keyToParts(key) {
    var year = Math.floor(key / 10000)
    var remainder = key % 10000
    return { y: year, mo: Math.floor(remainder / 100), d: remainder % 100 }
  }

  static addDaysToKey(key, daysToAdd) {
    var parts = DateTimeUtils.keyToParts(key)
    var date = new Date(Date.UTC(parts.y, parts.mo - 1, parts.d))
    date.setUTCDate(date.getUTCDate() + daysToAdd)
    return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
  }

  static weekdayOfKey(key) {
    var parts = DateTimeUtils.keyToParts(key)
    return new Date(Date.UTC(parts.y, parts.mo - 1, parts.d)).getUTCDay()
  }

  static startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  }

  static parseRfcDate(value, tzid, tzResolver) {
    var dateString = String(value || "").trim()
    var match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/.exec(dateString)
    if (!match) return null
    var year = parseInt(match[1], 10)
    var month = parseInt(match[2], 10)
    var day = parseInt(match[3], 10)
    var hours = match[4] ? parseInt(match[4], 10) : 0
    var minutes = match[5] ? parseInt(match[5], 10) : 0
    var seconds = match[6] ? parseInt(match[6], 10) : 0
    var isDateOnly = !match[4]
    if (dateString.indexOf("Z") >= 0) {
      return {
        date: new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds)),
        utc: true,
        allDay: isDateOnly
      }
    }
    if (tzid && tzResolver) {
      return {
        date: tzResolver.zonedToUtc(tzid, year, month, day, hours, minutes, seconds),
        utc: false,
        allDay: isDateOnly,
        tzid: tzid
      }
    }
    return {
      date: new Date(year, month - 1, day, hours, minutes, seconds),
      utc: false,
      allDay: isDateOnly
    }
  }

  static parseIsoDate(value) {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : { date: value, allDay: false }
    if (typeof value === "number") return { date: new Date(value), allDay: false }
    var dateString = String(value).trim()
    if (!dateString) return null
    var dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
    if (dateOnlyMatch) {
      var year = parseInt(dateOnlyMatch[1], 10)
      var monthIndex = parseInt(dateOnlyMatch[2], 10) - 1
      var day = parseInt(dateOnlyMatch[3], 10)
      return { date: new Date(year, monthIndex, day), allDay: true }
    }
    var parsedDate = new Date(dateString)
    if (isNaN(parsedDate.getTime())) return null
    return { date: parsedDate, allDay: false }
  }
}

// ---------------------------------------------------------------------------
// CalendarEvent domain entity
// ---------------------------------------------------------------------------

class CalendarEvent {
  constructor(data) {
    data = data || {}
    this.uid = data.uid || null
    this.title = data.title || DEFAULT_EVENT_TITLE
    this.start = data.start || null
    this.end = data.end || null
    this.allDay = data.allDay === true
    this.meetUrl = data.meetUrl || null
    this.location = data.location || ""
    this.description = data.description || ""
    this.calendarName = data.calendarName || ""
    this.feedLabel = data.feedLabel || null
    this.calendarColor = data.calendarColor || null
    this.eventUrl = data.eventUrl || null
    this.recurrenceId = data.recurrenceId
    this.rrule = data.rrule || null
    this.exdates = data.exdates || []
    this.durationMs = data.durationMs || 0
    this.tzid = data.tzid || null
    this.tzInfo = data.tzInfo || null
    this.tzEndInfo = data.tzEndInfo || null
    this.startKey = data.startKey || 0
  }

  isAllDay() {
    if (this.allDay === true) return true
    if (this.start && this.end) {
      var durationMs = this.end.getTime() - this.start.getTime()
      if (
        durationMs >= 23 * MS_PER_HOUR &&
        this.start.getHours() === 0 &&
        this.start.getMinutes() === 0 &&
        this.start.getSeconds() === 0 &&
        this.end.getHours() === 0 &&
        this.end.getMinutes() === 0 &&
        this.end.getSeconds() === 0
      ) {
        return true
      }
    }
    return false
  }

  duration() {
    if (this.durationMs > 0) return this.durationMs
    if (this.start && this.end && this.end.getTime() > this.start.getTime()) {
      return this.end.getTime() - this.start.getTime()
    }
    return this.isAllDay() ? MS_PER_DAY : MS_PER_HOUR
  }

  isOngoing(now) {
    if (!this.start || !this.end || this.isAllDay()) return false
    var nowTime = now.getTime()
    return nowTime >= this.start.getTime() && nowTime < this.end.getTime()
  }

  isUpcoming(now) {
    if (!this.end) return false
    return this.end.getTime() >= now.getTime()
  }

  calendarUrl(base) {
    if (this.eventUrl) return this.eventUrl
    var baseUrl = String(base || DEFAULT_CALENDAR_URL_BASE)
      .trim()
      .replace(/\/+$/, "")
    if (/\/r$/.test(baseUrl)) return baseUrl
    return baseUrl + "/r"
  }
}

// ---------------------------------------------------------------------------
// TimezoneResolver: VTIMEZONE and DST handling
// ---------------------------------------------------------------------------

class TimezoneResolver {
  constructor() {
    this.tzTable = {}
  }

  reset() {
    this.tzTable = {}
  }

  parseTzOffset(value) {
    var match = /^([+-])(\d{2})(\d{2})(\d{2})?$/.exec(String(value || "").trim())
    if (!match) return null
    var sign = match[1] === "-" ? -1 : 1
    var minutes = parseInt(match[2], 10) * MINUTES_PER_HOUR + parseInt(match[3], 10)
    var seconds = match[4] ? parseInt(match[4], 10) : 0
    return sign * (minutes * SECONDS_PER_MINUTE + seconds) * MS_PER_SECOND
  }

  registerVTimezones(lines) {
    this.reset()
    var tzid = null
    var inTimezone = false
    var observance = null
    var observanceList = null

    for (var i = 0; i < lines.length; i++) {
      var line = String(lines[i]).trim()
      if (!line) continue
      if (line === "BEGIN:VTIMEZONE") {
        inTimezone = true
        tzid = null
        observanceList = []
        continue
      }
      if (!inTimezone) continue
      if (line === "END:VTIMEZONE") {
        if (tzid && observanceList && observanceList.length) this.tzTable[tzid] = observanceList
        inTimezone = false
        tzid = null
        observanceList = null
        observance = null
        continue
      }
      if (line === "BEGIN:STANDARD" || line === "BEGIN:DAYLIGHT") {
        observance = { from: null, to: null, wall: null, rule: null }
        continue
      }
      if (line === "END:STANDARD" || line === "END:DAYLIGHT") {
        if (observance && observance.to !== null && observance.wall) {
          if (observance.from === null) observance.from = observance.to
          observanceList.push(observance)
        }
        observance = null
        continue
      }

      var prop = IcsParser ? IcsParser.splitProperty(line) : null
      if (!prop) {
        var colonIndex = line.indexOf(":")
        if (colonIndex < 0) continue
        var head = line.substring(0, colonIndex)
        var val = line.substring(colonIndex + 1)
        var semiIndex = head.indexOf(";")
        var name = (semiIndex < 0 ? head : head.substring(0, semiIndex)).trim().toUpperCase()
        prop = { name: name, value: val }
      }

      if (!observance) {
        if (prop.name === "TZID") tzid = prop.value.trim()
        continue
      }
      if (prop.name === "TZOFFSETFROM") observance.from = this.parseTzOffset(prop.value)
      else if (prop.name === "TZOFFSETTO") observance.to = this.parseTzOffset(prop.value)
      else if (prop.name === "DTSTART") {
        var wallMatch = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/.exec(prop.value.trim())
        if (wallMatch)
          observance.wall = {
            y: parseInt(wallMatch[1], 10),
            mo: parseInt(wallMatch[2], 10),
            d: parseInt(wallMatch[3], 10),
            h: wallMatch[4] ? parseInt(wallMatch[4], 10) : 0,
            mi: wallMatch[5] ? parseInt(wallMatch[5], 10) : 0,
            s: wallMatch[6] ? parseInt(wallMatch[6], 10) : 0
          }
      } else if (prop.name === "RRULE") {
        var recurrenceRule = { month: 0, weekday: -1, ord: 0, monthday: 0 }
        var segments = prop.value.split(";")
        for (var k = 0; k < segments.length; k++) {
          var keyValue = segments[k].split("=")
          var key = String(keyValue[0] || "").toUpperCase()
          var ruleValue = String(keyValue[1] || "").trim()
          if (key === "BYMONTH") recurrenceRule.month = parseInt(ruleValue, 10) || 0
          else if (key === "BYMONTHDAY") recurrenceRule.monthday = parseInt(ruleValue, 10) || 0
          else if (key === "BYDAY") {
            var byDayMatch = /^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(ruleValue.split(",")[0].trim())
            if (byDayMatch) {
              recurrenceRule.ord = byDayMatch[1] ? parseInt(byDayMatch[1], 10) : 1
              recurrenceRule.weekday = WEEKDAY[byDayMatch[2]]
            }
          }
        }
        if (recurrenceRule.month) observance.rule = recurrenceRule
      }
    }
  }

  nthWeekdayOfMonth(year, month, weekday, ord) {
    var daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    if (ord > 0) {
      var firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
      var day =
        1 + ((weekday - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK) + (ord - 1) * DAYS_PER_WEEK
      return day <= daysInMonth ? day : 0
    }
    if (ord < 0) {
      var lastDayOfWeek = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay()
      var reverseDay =
        daysInMonth -
        ((lastDayOfWeek - weekday + DAYS_PER_WEEK) % DAYS_PER_WEEK) +
        (ord + 1) * DAYS_PER_WEEK
      return reverseDay >= 1 ? reverseDay : 0
    }
    return 0
  }

  zoneTransitions(list, year) {
    var transitions = []
    for (var i = 0; i < list.length; i++) {
      var observance = list[i]
      if (!observance.rule) {
        transitions.push({
          wallMs: Date.UTC(
            observance.wall.y,
            observance.wall.mo - 1,
            observance.wall.d,
            observance.wall.h,
            observance.wall.mi,
            observance.wall.s
          ),
          from: observance.from,
          to: observance.to
        })
        continue
      }
      for (
        var currentYear = year - TRANSITION_YEAR_MARGIN;
        currentYear <= year + TRANSITION_YEAR_MARGIN;
        currentYear++
      ) {
        if (currentYear < observance.wall.y) continue
        var day = observance.rule.monthday
          ? Math.min(
              observance.rule.monthday,
              new Date(Date.UTC(currentYear, observance.rule.month, 0)).getUTCDate()
            )
          : this.nthWeekdayOfMonth(
              currentYear,
              observance.rule.month,
              observance.rule.weekday,
              observance.rule.ord
            )
        if (!day) continue
        transitions.push({
          wallMs: Date.UTC(
            currentYear,
            observance.rule.month - 1,
            day,
            observance.wall.h,
            observance.wall.mi,
            observance.wall.s
          ),
          from: observance.from,
          to: observance.to
        })
      }
    }
    transitions.sort(function (a, b) {
      return a.wallMs - b.wallMs
    })
    return transitions
  }

  tzOffsetForWall(tzid, year, month, day, hours, minutes, seconds) {
    var list = this.tzTable[tzid]
    if (!list || !list.length) return null
    var wallMs = Date.UTC(year, month - 1, day, hours, minutes, seconds)
    var transitions = this.zoneTransitions(list, year)
    if (!transitions.length) return null
    var offset = transitions[0].from
    for (var i = 0; i < transitions.length; i++) {
      if (wallMs >= transitions[i].wallMs) offset = transitions[i].to
      else break
    }
    return offset === null ? null : offset
  }

  zonedToUtc(tzid, year, month, day, hours, minutes, seconds) {
    var tableOffset = this.tzOffsetForWall(tzid, year, month, day, hours, minutes, seconds)
    if (tableOffset !== null)
      return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds) - tableOffset)
    try {
      if (typeof Intl === "undefined") throw new Error("no Intl")
      var guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
      var formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tzid,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      })
      var parts = formatter.formatToParts(guess)
      var partMap = {}
      for (var i = 0; i < parts.length; i++) partMap[parts[i].type] = parts[i].value
      var wall = new Date(
        Date.UTC(
          parseInt(partMap.year, 10),
          parseInt(partMap.month, 10) - 1,
          parseInt(partMap.day, 10),
          parseInt(partMap.hour, 10),
          parseInt(partMap.minute, 10),
          parseInt(partMap.second, 10)
        )
      )
      var diffOffset = wall.getTime() - guess.getTime()
      return new Date(guess.getTime() - diffOffset)
    } catch (_) {
      return new Date(year, month - 1, day, hours, minutes, seconds)
    }
  }
}

// ---------------------------------------------------------------------------
// RecurrenceRule value object
// ---------------------------------------------------------------------------

class RecurrenceRule {
  static parseByDay(value) {
    if (!value) return []
    var parsedDays = []
    var items = String(value || "").split(",")
    for (var i = 0; i < items.length; i++) {
      var match = /^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(items[i].trim())
      if (!match) continue
      parsedDays.push({ ord: match[1] ? parseInt(match[1], 10) : 0, day: WEEKDAY[match[2]] })
    }
    return parsedDays
  }

  static parse(value) {
    var rule = {
      freq: "",
      interval: 1,
      byday: [],
      bymonthday: [],
      bymonth: [],
      until: null,
      untilAllDay: false,
      count: 0,
      wkst: WEEKDAY.MO
    }
    var parts = String(value || "").split(";")
    for (var i = 0; i < parts.length; i++) {
      var equalsIndex = parts[i].indexOf("=")
      if (equalsIndex < 0) continue
      var paramName = parts[i].substring(0, equalsIndex).trim().toUpperCase()
      var paramValue = parts[i].substring(equalsIndex + 1).trim()
      if (paramName === "FREQ") rule.freq = paramValue
      else if (paramName === "INTERVAL") rule.interval = Math.max(1, parseInt(paramValue, 10) || 1)
      else if (paramName === "COUNT") rule.count = parseInt(paramValue, 10) || 0
      else if (paramName === "UNTIL") {
        var parsed = DateTimeUtils.parseRfcDate(paramValue, null)
        if (parsed) {
          rule.until = parsed.date
          rule.untilAllDay = parsed.allDay
        }
      } else if (paramName === "BYDAY") rule.byday = RecurrenceRule.parseByDay(paramValue)
      else if (paramName === "BYMONTHDAY") {
        var dayParts = paramValue.split(",")
        for (var j = 0; j < dayParts.length; j++) {
          var monthDayNum = parseInt(dayParts[j], 10)
          if (!isNaN(monthDayNum)) rule.bymonthday.push(monthDayNum)
        }
      } else if (paramName === "BYMONTH") {
        var monthParts = paramValue.split(",")
        for (var k = 0; k < monthParts.length; k++) {
          var monthNum = parseInt(monthParts[k], 10)
          if (!isNaN(monthNum)) rule.bymonth.push(monthNum)
        }
      } else if (paramName === "WKST")
        rule.wkst = WEEKDAY[paramValue] !== undefined ? WEEKDAY[paramValue] : WEEKDAY.MO
    }
    return rule.freq ? rule : null
  }
}

// ---------------------------------------------------------------------------
// RecurrenceExpander: occurrence expansion
// ---------------------------------------------------------------------------

class RecurrenceExpander {
  constructor(tzResolver) {
    this.tzResolver = tzResolver || null
  }

  expandOccurrences(startKey, tzInfo, rule, fromKey, lookaheadDays, maxOccurrences, tzResolver) {
    return RecurrenceExpander.expandOccurrences(
      startKey,
      tzInfo,
      rule,
      fromKey,
      lookaheadDays,
      maxOccurrences,
      tzResolver || this.tzResolver
    )
  }

  static nthWeekdayOfMonth(year, month, weekday, ord) {
    var daysInMonth = DateTimeUtils.daysInMonthUTC(year, month)
    var base = DateTimeUtils.dayKey(year, month, 1)
    if (ord > 0) {
      var first = DateTimeUtils.weekdayOfKey(base)
      var day = 1 + ((weekday - first + 7) % 7) + (ord - 1) * 7
      return day <= daysInMonth ? day : null
    }
    var last = DateTimeUtils.weekdayOfKey(DateTimeUtils.dayKey(year, month, daysInMonth))
    var dayNeg = daysInMonth - ((last - weekday + 7) % 7) + (ord + 1) * 7
    return dayNeg >= 1 ? dayNeg : null
  }

  static allWeekdaysOfMonth(year, month, weekday) {
    var daysInMonth = DateTimeUtils.daysInMonthUTC(year, month)
    var first = DateTimeUtils.weekdayOfKey(DateTimeUtils.dayKey(year, month, 1))
    var days = []
    for (var day = 1 + ((weekday - first + 7) % 7); day <= daysInMonth; day += 7) days.push(day)
    return days
  }

  static monthCandidates(year, month, rule, startKey, endKey, defaultDay) {
    var keys = []
    var daysInMonth = DateTimeUtils.daysInMonthUTC(year, month)
    var base = DateTimeUtils.dayKey(year, month, 1)

    function add(day) {
      var dayKey = base + day - 1
      if (dayKey >= startKey && dayKey <= endKey) keys.push(dayKey)
    }

    if (rule.bymonthday && rule.bymonthday.length) {
      for (var i = 0; i < rule.bymonthday.length; i++) {
        var monthDay = rule.bymonthday[i]
        var day = monthDay > 0 ? monthDay : daysInMonth + 1 + monthDay
        if (day >= 1 && day <= daysInMonth) add(day)
      }
    } else if (rule.byday && rule.byday.length) {
      for (var j = 0; j < rule.byday.length; j++) {
        var byDayItem = rule.byday[j]
        if (byDayItem.ord !== 0) {
          var matchedDay = RecurrenceExpander.nthWeekdayOfMonth(
            year,
            month,
            byDayItem.day,
            byDayItem.ord
          )
          if (matchedDay !== null) add(matchedDay)
        } else {
          var matchingDays = RecurrenceExpander.allWeekdaysOfMonth(year, month, byDayItem.day)
          for (var k = 0; k < matchingDays.length; k++) add(matchingDays[k])
        }
      }
    } else {
      add(Math.min(defaultDay, daysInMonth))
    }
    return keys
  }

  static dateForKey(key, tzInfo, tzResolver) {
    var parts = DateTimeUtils.keyToParts(key)
    if (!tzInfo) return new Date(parts.y, parts.mo - 1, parts.d)
    if (tzInfo.utc)
      return new Date(Date.UTC(parts.y, parts.mo - 1, parts.d, tzInfo.h, tzInfo.mi, tzInfo.s))
    if (tzInfo.tzid && tzResolver)
      return tzResolver.zonedToUtc(
        tzInfo.tzid,
        parts.y,
        parts.mo,
        parts.d,
        tzInfo.h,
        tzInfo.mi,
        tzInfo.s
      )
    return new Date(parts.y, parts.mo - 1, parts.d, tzInfo.h, tzInfo.mi, tzInfo.s)
  }

  static expandOccurrences(
    startKey,
    tzInfo,
    rule,
    fromKey,
    lookaheadDays,
    maxOccurrences,
    tzResolver
  ) {
    var occurrences = []
    var toKey = DateTimeUtils.addDaysToKey(fromKey, lookaheadDays)
    var startParts = DateTimeUtils.keyToParts(startKey)

    function pushKey(key) {
      if (key < startKey || key < fromKey || key > toKey) return
      var date = RecurrenceExpander.dateForKey(key, tzInfo, tzResolver)
      if (!date) return
      if (rule.until) {
        var untilTime = rule.until.getTime()
        if (rule.untilAllDay) untilTime += MS_PER_DAY - 1
        if (date.getTime() > untilTime) return
      }
      occurrences.push(date)
    }

    function shouldStop() {
      return maxOccurrences && occurrences.length >= maxOccurrences
    }

    var i,
      candidateIdx,
      key,
      weekKey,
      seen = 0,
      guard = 0,
      done = false

    function emit(candidateKey) {
      if (rule.count > 0 && seen >= rule.count) {
        done = true
        return
      }
      seen++
      pushKey(candidateKey)
      if (shouldStop()) done = true
    }

    if (rule.freq === "DAILY") {
      for (
        key = startKey;
        key <= toKey;
        key = DateTimeUtils.addDaysToKey(key, rule.interval || 1)
      ) {
        if (++guard > MAX_RRULE_STEPS) break
        var weekday = DateTimeUtils.weekdayOfKey(key)
        var hit = !rule.byday || rule.byday.length === 0
        if (rule.byday) {
          for (i = 0; i < rule.byday.length; i++) {
            if (rule.byday[i].day === weekday) {
              hit = true
              break
            }
          }
        }
        if (!hit) continue
        emit(key)
        if (done) break
      }
    } else if (rule.freq === "WEEKLY") {
      var firstWeek = DateTimeUtils.addDaysToKey(
        startKey,
        -((DateTimeUtils.weekdayOfKey(startKey) - WEEKDAY.MO + 7) % 7)
      )
      var offsets = []
      if (rule.byday && rule.byday.length) {
        for (i = 0; i < rule.byday.length; i++)
          offsets.push((rule.byday[i].day - WEEKDAY.MO + 7) % 7)
      } else {
        offsets.push((DateTimeUtils.weekdayOfKey(startKey) - WEEKDAY.MO + 7) % 7)
      }
      for (
        weekKey = firstWeek;
        weekKey <= toKey;
        weekKey = DateTimeUtils.addDaysToKey(weekKey, (rule.interval || 1) * 7)
      ) {
        if (++guard > MAX_RRULE_STEPS) break
        for (i = 0; i < offsets.length; i++) {
          var weekDayKey = DateTimeUtils.addDaysToKey(weekKey, offsets[i])
          if (weekDayKey < startKey) continue
          emit(weekDayKey)
          if (done) break
        }
        if (done) break
      }
    } else if (rule.freq === "MONTHLY") {
      var startMonthIdx = startParts.y * 12 + (startParts.mo - 1)
      var endMonthIdx = Math.floor(toKey / 10000) * 12 + (Math.floor((toKey % 10000) / 100) - 1)
      for (var absMo = startMonthIdx; absMo <= endMonthIdx; absMo += rule.interval || 1) {
        if (++guard > MAX_RRULE_STEPS) break
        var currentYear = Math.floor(absMo / 12)
        var currentMonth = (absMo % 12) + 1
        var candidates = RecurrenceExpander.monthCandidates(
          currentYear,
          currentMonth,
          rule,
          startKey,
          toKey,
          startParts.d
        )
        for (candidateIdx = 0; candidateIdx < candidates.length; candidateIdx++) {
          emit(candidates[candidateIdx])
          if (done) break
        }
        if (done) break
        if (
          DateTimeUtils.dayKey(
            currentYear,
            currentMonth,
            DateTimeUtils.daysInMonthUTC(currentYear, currentMonth)
          ) > toKey
        )
          break
      }
    } else if (rule.freq === "YEARLY") {
      for (var yearOffset = 0; yearOffset < MAX_RRULE_STEPS; yearOffset++) {
        var targetYear = startParts.y + yearOffset * (rule.interval || 1)
        var months = rule.bymonth && rule.bymonth.length ? rule.bymonth : [startParts.mo]
        for (var monthIdx = 0; monthIdx < months.length; monthIdx++) {
          var targetMonth = months[monthIdx]
          var yearlyCandidates = RecurrenceExpander.monthCandidates(
            targetYear,
            targetMonth,
            rule,
            startKey,
            toKey,
            startParts.d
          )
          for (candidateIdx = 0; candidateIdx < yearlyCandidates.length; candidateIdx++) {
            emit(yearlyCandidates[candidateIdx])
            if (done) break
          }
          if (done) break
        }
        if (done) break
        if (DateTimeUtils.dayKey(targetYear, 12, 31) > toKey) break
      }
    }
    return occurrences
  }
}

// ---------------------------------------------------------------------------
// MeetingLinkDetector: provider detection
// ---------------------------------------------------------------------------

class MeetingLinkDetector {
  static trimUrlPunctuation(url) {
    return String(url || "").replace(/[.,;:!?)\]]+$/, "")
  }

  static findMeetUrl(text) {
    var content = String(text || "")
    var providers = VIDEO_PROVIDERS || []
    for (var i = 0; i < providers.length; i++) {
      var match = providers[i].re.exec(content)
      if (match) return MeetingLinkDetector.trimUrlPunctuation(match[0])
    }
    return null
  }

  static meetLabel(url) {
    if (!url) return LABEL_VIDEO_DEFAULT || "Video"
    var urlString = String(url)
    var providers = VIDEO_PROVIDERS || []
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].re.test(urlString)) return providers[i].label
    }
    return LABEL_VIDEO_DEFAULT || "Video"
  }
}

// ---------------------------------------------------------------------------
// IcsParser: iCalendar feed parsing
// ---------------------------------------------------------------------------

class IcsParser {
  static unfoldIcs(raw) {
    var rawLines = String(raw || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
    var unfoldedLines = []
    var lineIndex = 0
    while (lineIndex < rawLines.length) {
      var line = rawLines[lineIndex].trim()
      if (!line) {
        lineIndex++
        continue
      }
      while (lineIndex + 1 < rawLines.length) {
        var nextLine = rawLines[lineIndex + 1]
        if (nextLine.charAt(0) !== " " && nextLine.charAt(0) !== "\t") break
        line += nextLine.substring(1).trim()
        lineIndex++
      }
      unfoldedLines.push(line)
      lineIndex++
    }
    return unfoldedLines
  }

  static caretDecode(text) {
    var inputString = String(text || "")
    var decoded = ""
    var index = 0
    while (index < inputString.length) {
      if (inputString.charAt(index) === "^" && index + 1 < inputString.length) {
        var nextChar = inputString.charAt(index + 1)
        if (nextChar === "n") decoded += "\n"
        else if (nextChar === "^") decoded += "^"
        else if (nextChar === "'") decoded += '"'
        else decoded += "^" + nextChar
        index += 2
        continue
      }
      decoded += inputString.charAt(index)
      index++
    }
    return decoded
  }

  static unescapeIcs(text) {
    var inputString = String(text || "")
    var unescaped = ""
    var index = 0
    while (index < inputString.length) {
      var char = inputString.charAt(index)
      if (char === "\\" && index + 1 < inputString.length) {
        var nextChar = inputString.charAt(index + 1)
        if (nextChar === "n" || nextChar === "N") unescaped += "\n"
        else if (nextChar === "\\") unescaped += "\\"
        else if (nextChar === ",") unescaped += ","
        else if (nextChar === ";") unescaped += ";"
        else unescaped += nextChar
        index += 2
        continue
      }
      unescaped += char
      index++
    }
    return unescaped
  }

  static splitParams(paramString) {
    var paramTokens = []
    var index
    var currentToken = ""
    var inQuotes = false
    for (index = 0; index < paramString.length; index++) {
      var char = paramString.charAt(index)
      if (char === '"') {
        inQuotes = !inQuotes
        currentToken += char
      } else if (char === ";" && !inQuotes) {
        paramTokens.push(currentToken)
        currentToken = ""
      } else currentToken += char
    }
    if (currentToken) paramTokens.push(currentToken)

    var result = []
    for (index = 0; index < paramTokens.length; index++) {
      var equalsIndex = paramTokens[index].indexOf("=")
      if (equalsIndex < 0) continue
      var paramName = paramTokens[index].substring(0, equalsIndex).trim().toUpperCase()
      var paramValue = paramTokens[index].substring(equalsIndex + 1).trim()
      paramValue = paramValue.replace(/^"|"$/g, "")
      paramValue = IcsParser.caretDecode(paramValue)
      result.push({ name: paramName, value: paramValue })
    }
    return result
  }

  static splitProperty(line) {
    var colonIndex = line.indexOf(":")
    if (colonIndex < 0) return null
    var head = line.substring(0, colonIndex)
    var value = line.substring(colonIndex + 1)
    var semiIndex = head.indexOf(";")
    var name = (semiIndex < 0 ? head : head.substring(0, semiIndex)).trim().toUpperCase()
    var params = {}
    if (semiIndex >= 0) {
      var rest = head.substring(semiIndex + 1)
      var paramList = IcsParser.splitParams(rest)
      for (var i = 0; i < paramList.length; i++) params[paramList[i].name] = paramList[i].value
    }
    return { name: name, params: params, value: value }
  }

  static parseEventBlock(block, tzResolver) {
    var event = {
      uid: null,
      title: "",
      start: null,
      end: null,
      allDay: false,
      tzid: null,
      meetUrl: null,
      rrule: null,
      exdates: [],
      durationMs: 0,
      startKey: 0,
      tzInfo: null
    }
    var lines = block.lines
    var lastTzid = null

    for (var i = 0; i < lines.length; i++) {
      var prop = IcsParser.splitProperty(lines[i])
      if (!prop) continue
      var propName = prop.name
      var propValue = prop.value
      if (propName === "UID") event.uid = propValue.trim()
      else if (propName === "SUMMARY") event.title = IcsParser.unescapeIcs(propValue)
      else if (propName === "RECURRENCE-ID") {
        var recurrenceParsed = DateTimeUtils.parseRfcDate(
          propValue,
          prop.params.TZID || lastTzid,
          tzResolver
        )
        if (recurrenceParsed) event.recurrenceId = recurrenceParsed.date.getTime()
      } else if (propName === "DTSTART" || propName === "DTEND") {
        var tzid = prop.params.TZID || lastTzid
        var dateParsed = DateTimeUtils.parseRfcDate(propValue, tzid, tzResolver)
        if (!dateParsed) continue
        if (propName === "DTSTART") {
          event.start = dateParsed.date
          event.allDay = dateParsed.allDay
          event.tzid = tzid
          var wallMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(propValue)
          event.tzInfo = {
            utc: dateParsed.utc,
            tzid: tzid,
            h: wallMatch ? parseInt(wallMatch[4], 10) : 0,
            mi: wallMatch ? parseInt(wallMatch[5], 10) : 0,
            s: wallMatch && wallMatch[6] ? parseInt(wallMatch[6], 10) : 0
          }
          event.startKey = wallMatch
            ? parseInt(wallMatch[1], 10) * 10000 +
              parseInt(wallMatch[2], 10) * 100 +
              parseInt(wallMatch[3], 10)
            : dateParsed.date.getUTCFullYear() * 10000 +
              (dateParsed.date.getUTCMonth() + 1) * 100 +
              dateParsed.date.getUTCDate()
        } else {
          event.end = dateParsed.date
          var wallEndMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(propValue)
          event.tzEndInfo = {
            utc: dateParsed.utc,
            tzid: tzid,
            h: wallEndMatch ? parseInt(wallEndMatch[4], 10) : 0,
            mi: wallEndMatch ? parseInt(wallEndMatch[5], 10) : 0,
            s: wallEndMatch && wallEndMatch[6] ? parseInt(wallEndMatch[6], 10) : 0
          }
        }
        lastTzid = tzid
      } else if (propName === "RRULE") event.rrule = RecurrenceRule.parse(propValue)
      else if (propName === "LOCATION") event.location = IcsParser.unescapeIcs(propValue)
      else if (propName === "DESCRIPTION") event.description = IcsParser.unescapeIcs(propValue)
      else if (
        propName === "X-GOOGLE-CONFERENCE" ||
        propName === "X-MICROSOFT-SKYPETEAMSMEETINGURL"
      )
        event.xConference = (event.xConference ? event.xConference + " " : "") + propValue.trim()
      else if (propName === "CONFERENCE")
        event.conference = (event.conference ? event.conference + " " : "") + propValue.trim()
      else if (propName === "EXDATE") {
        var exdateParts = propValue.split(",")
        for (var j = 0; j < exdateParts.length; j++) {
          var exdateParsed = DateTimeUtils.parseRfcDate(
            exdateParts[j],
            prop.params.TZID || lastTzid,
            tzResolver
          )
          if (exdateParsed) event.exdates.push(exdateParsed.date.getTime())
        }
      }
    }

    if (!event.uid || !event.start) return null

    var linkCandidate =
      (event.location || "") +
      " " +
      (event.description || "") +
      " " +
      (event.xConference || "") +
      " " +
      (event.conference || "")
    event.meetUrl = MeetingLinkDetector.findMeetUrl(linkCandidate)

    if (event.end && event.end.getTime() > event.start.getTime()) {
      event.durationMs = event.end.getTime() - event.start.getTime()
    } else {
      event.durationMs = event.allDay ? MS_PER_DAY : MS_PER_HOUR
      event.end = new Date(event.start.getTime() + event.durationMs)
    }

    if (!event.allDay && event.start && event.end) {
      var eventDurationMs = event.end.getTime() - event.start.getTime()
      var startIsMidnight = event.tzInfo
        ? event.tzInfo.h === 0 && event.tzInfo.mi === 0 && event.tzInfo.s === 0
        : event.start.getHours() === 0 &&
          event.start.getMinutes() === 0 &&
          event.start.getSeconds() === 0
      var endIsMidnight = event.tzEndInfo
        ? event.tzEndInfo.h === 0 && event.tzEndInfo.mi === 0 && event.tzEndInfo.s === 0
        : event.end.getHours() === 0 && event.end.getMinutes() === 0 && event.end.getSeconds() === 0
      if (eventDurationMs >= 23 * 3600000 && startIsMidnight && endIsMidnight) {
        event.allDay = true
        event.durationMs = eventDurationMs
      }
    }
    return event
  }

  static parse(raw, options) {
    options = options || {}
    var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || DEFAULT_LOOKAHEAD_DAYS)
    var maxOccurrences = Math.max(1, parseInt(options.maxEvents, 10) || DEFAULT_MAX_EVENTS)
    var now = options.now || new Date()
    var fromKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()

    var tzResolver = options.tzResolver || new TimezoneResolver()

    var lines = IcsParser.unfoldIcs(raw)
    if (tzResolver && typeof tzResolver.registerVTimezones === "function") {
      tzResolver.registerVTimezones(lines)
    }
    var blocks = []
    var currentBlock = null
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim()
      if (!line) continue
      if (line === "BEGIN:VEVENT") {
        currentBlock = []
        blocks.push(currentBlock)
        continue
      }
      if (line === "END:VEVENT") {
        currentBlock = null
        continue
      }
      if (currentBlock) currentBlock.push(line)
    }

    var parsedEvents = []
    for (var blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      var parsedEv = IcsParser.parseEventBlock({ lines: blocks[blockIndex] }, tzResolver)
      if (parsedEv) parsedEvents.push(parsedEv)
    }

    var masters = []
    var overrides = []
    for (var i2 = 0; i2 < parsedEvents.length; i2++) {
      if (parsedEvents[i2].recurrenceId !== undefined) overrides.push(parsedEvents[i2])
      else masters.push(parsedEvents[i2])
    }

    var overridesByUid = {}
    for (var i3 = 0; i3 < overrides.length; i3++) {
      var override = overrides[i3]
      if (!override.uid) continue
      overridesByUid[override.uid] = overridesByUid[override.uid] || []
      overridesByUid[override.uid].push(override)
    }

    var result = []
    for (var masterIndex = 0; masterIndex < masters.length; masterIndex++) {
      var master = masters[masterIndex]
      var occurrenceStarts
      if (master.rrule) {
        occurrenceStarts = RecurrenceExpander.expandOccurrences(
          master.startKey,
          master.tzInfo,
          master.rrule,
          fromKey,
          lookaheadDays,
          maxOccurrences,
          tzResolver
        )
      } else {
        occurrenceStarts = [master.start]
      }

      var exdateSet = {}
      for (var exIndex = 0; exIndex < (master.exdates || []).length; exIndex++)
        exdateSet[master.exdates[exIndex]] = true

      var overridesByTime = {}
      var uidOverrides = overridesByUid[master.uid] || []
      for (var overrideIndex = 0; overrideIndex < uidOverrides.length; overrideIndex++) {
        if (uidOverrides[overrideIndex].recurrenceId !== undefined)
          overridesByTime[uidOverrides[overrideIndex].recurrenceId] = uidOverrides[overrideIndex]
      }

      for (var occIndex = 0; occIndex < occurrenceStarts.length; occIndex++) {
        var occStart = occurrenceStarts[occIndex]
        var startMs = occStart.getTime()
        if (exdateSet[startMs]) continue
        var overrideEvent = overridesByTime[startMs] || null
        var source = overrideEvent || master
        var startDate = overrideEvent ? overrideEvent.start : occStart
        var endDate = overrideEvent ? overrideEvent.end : new Date(startMs + master.durationMs)
        if (endDate.getTime() <= startDate.getTime())
          endDate = new Date(startDate.getTime() + MS_PER_HOUR)
        result.push({
          uid: master.uid,
          title: source.title,
          start: startDate,
          end: endDate,
          allDay: source.allDay === true,
          meetUrl: source.meetUrl || null,
          location: source.location || "",
          description: source.description || ""
        })
      }
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// JsonStateParser: Omarchy JSON calendar events parser
// ---------------------------------------------------------------------------

class JsonStateParser {
  static parseJsonEvents(raw) {
    var jsonDocument = null
    if (typeof raw === "string") {
      try {
        jsonDocument = JSON.parse(raw)
      } catch (_) {
        return []
      }
    } else if (raw && typeof raw === "object") {
      jsonDocument = raw
    }
    if (!jsonDocument) return []

    var rawList
    if (Array.isArray(jsonDocument)) {
      rawList = jsonDocument
    } else if (Array.isArray(jsonDocument.events)) {
      rawList = jsonDocument.events
    } else {
      return []
    }

    var parsedEvents = []
    for (var i = 0; i < rawList.length; i++) {
      var item = rawList[i]
      if (!item) continue
      if (item.responseStatus === RESPONSE_STATUS_DECLINED) continue

      var startParsed = DateTimeUtils.parseIsoDate(item.start)
      if (!startParsed) continue
      var startDate = startParsed.date

      var endParsed = DateTimeUtils.parseIsoDate(item.end)
      var endDate = endParsed ? endParsed.date : null

      var allDay = item.allDay === true || startParsed.allDay === true
      if (!endDate || endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate.getTime() + (allDay ? MS_PER_DAY : MS_PER_HOUR))
      }

      var meetUrl = item.meetingUrl || item.meetUrl || null
      if (!meetUrl) {
        meetUrl = MeetingLinkDetector.findMeetUrl(
          (item.location || "") + " " + (item.description || "")
        )
      }

      parsedEvents.push({
        uid: item.id || item.uid || "json-event-" + i,
        title: item.title || item.summary || DEFAULT_EVENT_TITLE,
        start: startDate,
        end: endDate,
        allDay: allDay,
        meetUrl: meetUrl || null,
        location: item.location || "",
        description: item.description || "",
        calendarName: item.calendarName || "",
        feedLabel: item.feedLabel || item.calendarName || null,
        calendarColor: item.color || item.calendarColor || null,
        eventUrl: item.eventUrl || null
      })
    }
    return parsedEvents
  }

  static parseJsonState(raw, options) {
    var jsonDocument = null
    if (typeof raw === "string") {
      try {
        jsonDocument = JSON.parse(raw)
      } catch (_) {
        return { events: [], syncedAt: null }
      }
    } else if (raw && typeof raw === "object") {
      jsonDocument = raw
    }
    if (!jsonDocument) return { events: [], syncedAt: null }
    var events = JsonStateParser.parseJsonEvents(jsonDocument, options)
    return { events: events, syncedAt: jsonDocument.syncedAt || null }
  }
}

// ---------------------------------------------------------------------------
// FeedConfigParser: feed URLs configuration, normalization, and deduplication
// ---------------------------------------------------------------------------

class FeedConfigParser {
  static normalizeKey(value, fallback) {
    var keyStr = String(value == null ? "" : value)
      .trim()
      .toLowerCase()
    return /^[a-z0-9,;.:_/-]$/.test(keyStr) ? keyStr : fallback
  }

  static toBoolean(value, fallback) {
    if (value === true || value === 1 || value === "1" || value === "true") return true
    if (value === false || value === 0 || value === "0" || value === "false") return false
    return fallback === true
  }

  static feedsFromArray(arr) {
    var feeds = []
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i]
      if (item == null) continue
      if (typeof item === "string") {
        var rawFeed = item.trim()
        if (!rawFeed) continue
        var bar = rawFeed.indexOf("|")
        if (bar >= 0)
          feeds.push({
            url: rawFeed.slice(bar + 1).trim(),
            label: rawFeed.slice(0, bar).trim() || undefined
          })
        else feeds.push({ url: rawFeed, label: undefined })
      } else {
        var url = String(item.url == null ? "" : item.url).trim()
        if (!url) continue
        var label = item.label == null ? undefined : String(item.label).trim() || undefined
        feeds.push({ url: url, label: label })
      }
    }
    return feeds
  }

  static splitIcsFeeds(raw) {
    if (Array.isArray(raw)) return FeedConfigParser.feedsFromArray(raw)

    var text = String(raw == null ? "" : raw).trim()
    if (!text) return []

    if (text.charAt(0) === "[") {
      try {
        var parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return FeedConfigParser.feedsFromArray(parsed)
      } catch (_) {
        // Fallback to CSV parsing if JSON parse fails
      }
    }

    var parts = text.split(",")
    var feeds = []
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim()
      if (!part) continue
      var barIndex = part.indexOf("|")
      if (barIndex >= 0) {
        feeds.push({
          url: part.slice(barIndex + 1).trim(),
          label: part.slice(0, barIndex).trim() || undefined
        })
      } else {
        feeds.push({ url: part, label: undefined })
      }
    }
    return feeds
  }

  static dedupeEvents(events) {
    if (!Array.isArray(events)) return events || []
    var seen = {}
    var deduped = []
    for (var i = 0; i < events.length; i++) {
      var event = events[i]
      var key = (event.uid || "") + "@" + (event.start ? event.start.getTime() : 0)
      if (seen[key]) continue
      seen[key] = true
      deduped.push(event)
    }
    return deduped
  }
}

// ---------------------------------------------------------------------------
// ScheduleAggregator: sorting, filtering, day grouping, and state computation
// ---------------------------------------------------------------------------

class ScheduleAggregator {
  static isEventAllDay(event) {
    if (!event) return false
    if (event.allDay === true) return true
    if (typeof event.isAllDay === "function" && event.isAllDay()) return true
    if (event.start && event.end) {
      var durationMs = event.end.getTime() - event.start.getTime()
      if (
        durationMs >= 23 * 3600000 &&
        event.start.getHours() === 0 &&
        event.start.getMinutes() === 0 &&
        event.start.getSeconds() === 0 &&
        event.end.getHours() === 0 &&
        event.end.getMinutes() === 0 &&
        event.end.getSeconds() === 0
      ) {
        return true
      }
    }
    return false
  }

  static compareUpcoming(eventA, eventB, now) {
    var todayMs = typeof now === "number" ? now : DateTimeUtils.startOfDay(now || new Date())
    var dayA = Math.max(DateTimeUtils.startOfDay(eventA.start), todayMs)
    var dayB = Math.max(DateTimeUtils.startOfDay(eventB.start), todayMs)
    if (dayA !== dayB) return dayA - dayB

    var aAllDay = ScheduleAggregator.isEventAllDay(eventA)
    var bAllDay = ScheduleAggregator.isEventAllDay(eventB)
    if (aAllDay !== bAllDay) return aAllDay ? 1 : -1

    var startA = eventA.start.getTime()
    var startB = eventB.start.getTime()
    if (startA !== startB) return startA - startB

    var durationB = (eventB.end ? eventB.end.getTime() : startB) - startB
    var durationA = (eventA.end ? eventA.end.getTime() : startA) - startA
    if (durationA !== durationB) return durationB - durationA

    return String(eventA.title || "").localeCompare(String(eventB.title || ""))
  }

  static buildUpcoming(events, now, options) {
    now = now || new Date()
    options = options || {}
    var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || DEFAULT_LOOKAHEAD_DAYS)
    var showOnlyWithVideoLink = options.showOnlyWithVideoLink === true
    var maxRows = Math.max(1, parseInt(options.maxRows, 10) || DEFAULT_MAX_ROWS)
    var nowMs = now.getTime()
    var horizonMs = nowMs + lookaheadDays * MS_PER_DAY

    var upcoming = []
    for (var i = 0; i < (events || []).length; i++) {
      var event = events[i]
      if (!event.start || !event.end) continue
      if (event.end.getTime() < nowMs) continue
      if (event.start.getTime() > horizonMs) continue
      if (showOnlyWithVideoLink && !event.meetUrl) continue
      upcoming.push(event)
    }

    upcoming.sort(function (a, b) {
      return ScheduleAggregator.compareUpcoming(a, b, now)
    })
    if (upcoming.length > maxRows) upcoming = upcoming.slice(0, maxRows)
    return upcoming
  }

  static upcomingToday(events, now) {
    now = now || new Date()
    var nowMs = now.getTime()
    var endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    var endOfDayMs = endOfDay.getTime()

    var todayEvents = []
    for (var i = 0; i < (events || []).length; i++) {
      var event = events[i]
      if (!event.start || !event.end) continue
      if (event.end.getTime() < nowMs) continue
      if (event.start.getTime() > endOfDayMs) continue
      todayEvents.push(event)
    }

    todayEvents.sort(function (a, b) {
      return ScheduleAggregator.compareUpcoming(a, b, now)
    })
    return todayEvents
  }

  static buildScheduleGroups(events, now, options) {
    now = now || new Date()
    options = options || {}
    var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || DEFAULT_LOOKAHEAD_DAYS)
    var maxRows = Math.max(1, parseInt(options.maxRows, 10) || DEFAULT_MAX_ROWS)
    var nowMs = now.getTime()
    var horizonMs = nowMs + lookaheadDays * MS_PER_DAY

    var validEvents = []
    for (var i = 0; i < (events || []).length; i++) {
      var event = events[i]
      if (!event.start || !event.end) continue
      if (event.end.getTime() < nowMs) continue
      if (event.start.getTime() > horizonMs) continue
      validEvents.push(event)
    }
    validEvents.sort(function (a, b) {
      return ScheduleAggregator.compareUpcoming(a, b, now)
    })
    if (validEvents.length > maxRows) validEvents = validEvents.slice(0, maxRows)

    var groups = []
    var groupMap = {}
    for (var j = 0; j < validEvents.length; j++) {
      var item = validEvents[j]
      var groupDate = item.start.getTime() < nowMs ? now : item.start
      var dayKey = DateTimeUtils.dayKey(
        groupDate.getFullYear(),
        groupDate.getMonth() + 1,
        groupDate.getDate()
      )
      if (!groupMap[dayKey]) {
        var group = {
          key: dayKey,
          title: DisplayFormatter.daySectionTitle(groupDate, now),
          items: []
        }
        groupMap[dayKey] = group
        groups.push(group)
      }
      groupMap[dayKey].items.push(item)
    }
    return groups
  }

  static buildCalendarLegend(events, feeds) {
    var seen = {}
    var legend = []
    if (Array.isArray(events)) {
      for (var i = 0; i < events.length; i++) {
        var event = events[i]
        var name = event.feedLabel || event.calendarName || ""
        if (!name) continue
        var color = event.calendarColor || null
        if (seen[name]) continue
        seen[name] = true
        legend.push({ name: name, color: color })
      }
    }
    if (Array.isArray(feeds)) {
      for (var j = 0; j < feeds.length; j++) {
        var feed = feeds[j]
        var feedLabel = feed && feed.label ? String(feed.label).trim() : ""
        if (!feedLabel || seen[feedLabel]) continue
        seen[feedLabel] = true
        legend.push({ name: feedLabel, color: null })
      }
    }
    return legend
  }

  static computeScheduleState(events, now, options) {
    events = events || []
    now = now || new Date()
    options = options || {}
    var lookaheadDays = options.lookaheadDays || DEFAULT_LOOKAHEAD_DAYS
    var showOnlyWithVideoLink = options.showOnlyWithVideoLink === true
    var maxMeetingRows = options.maxMeetingRows || DEFAULT_MAX_ROWS
    var maxScheduleRows = options.maxScheduleRows || DEFAULT_MAX_ROWS

    var meetings = ScheduleAggregator.buildUpcoming(events, now, {
      lookaheadDays: lookaheadDays,
      showOnlyWithVideoLink: showOnlyWithVideoLink,
      maxRows: maxMeetingRows
    })

    var upcomingTodayList = ScheduleAggregator.upcomingToday(events, now)

    var scheduleGroups = ScheduleAggregator.buildScheduleGroups(events, now, {
      lookaheadDays: lookaheadDays,
      maxRows: maxScheduleRows
    })

    var calendarLegend = ScheduleAggregator.buildCalendarLegend(events, options.feeds)

    return {
      meetings: meetings,
      upcomingToday: upcomingTodayList,
      scheduleGroups: scheduleGroups,
      nextMeeting: meetings.length > 0 ? meetings[0] : null,
      calendarLegend: calendarLegend
    }
  }
}

// ---------------------------------------------------------------------------
// DisplayFormatter: display strings, labels, and timer formatting
// ---------------------------------------------------------------------------

class DisplayFormatter {
  static isEventAllDay(event) {
    return ScheduleAggregator.isEventAllDay(event)
  }

  static hm(date) {
    if (!date || isNaN(date.getTime())) return ""
    return DateTimeUtils.pad2(date.getHours()) + ":" + DateTimeUtils.pad2(date.getMinutes())
  }

  static timeRange(start, end, allDay) {
    if (allDay) return LABEL_ALL_DAY
    if (!start) return ""
    return DisplayFormatter.hm(start) + "–" + DisplayFormatter.hm(end)
  }

  static dayLabel(start, now) {
    var dayDiff = Math.round(
      (DateTimeUtils.startOfDay(start) - DateTimeUtils.startOfDay(now)) / MS_PER_DAY
    )
    if (dayDiff === 0) return LABEL_TODAY
    if (dayDiff === 1) return "Tmrw"
    if (dayDiff === -1) return LABEL_YESTERDAY
    if (dayDiff > 1 && dayDiff < DAYS_PER_WEEK) return WEEKDAY_NAMES[start.getDay()]
    var dayOfWeek = WEEKDAY_NAMES[start.getDay()]
    var monthName = MONTH_NAMES_SHORT[start.getMonth()]
    return dayOfWeek + " " + start.getDate() + " " + monthName
  }

  static daySectionTitle(date, now) {
    var diff = Math.round(
      (DateTimeUtils.startOfDay(date) - DateTimeUtils.startOfDay(now)) / MS_PER_DAY
    )
    var dayOfWeek = WEEKDAY_NAMES[date.getDay()].toUpperCase()
    var monthName = MONTH_NAMES_SHORT[date.getMonth()].toUpperCase()
    var formattedDate = dayOfWeek + " " + date.getDate() + " " + monthName
    if (diff === 0) return SECTION_TODAY + " · " + formattedDate
    if (diff === 1) return SECTION_TOMORROW + " · " + formattedDate
    return formattedDate
  }

  static meetingTimeLabel(start, end, now, allDay) {
    var isAllDay = DisplayFormatter.isEventAllDay({ start: start, end: end, allDay: allDay })
    var labels = []
    if (DateTimeUtils.isSameDay(start, now)) labels.push(LABEL_TODAY)
    else if (DateTimeUtils.isSameDay(start, new Date(now.getTime() + MS_PER_DAY)))
      labels.push(LABEL_TOMORROW)
    else {
      var dayOfWeek = WEEKDAY_NAMES[start.getDay()]
      var monthName = MONTH_NAMES_SHORT[start.getMonth()]
      labels.push(dayOfWeek + " " + start.getDate() + " " + monthName)
    }
    if (isAllDay) {
      labels.push(LABEL_ALL_DAY)
    } else if (start && end) {
      labels.push(DisplayFormatter.timeRange(start, end, false))
    }
    return labels.join(" · ")
  }

  static relativeStatus(next, now) {
    if (!next || !next.start || !next.end || DisplayFormatter.isEventAllDay(next)) return ""
    var start = next.start.getTime()
    var end = next.end.getTime()
    var nowMs = now.getTime()
    if (nowMs < start) {
      var minutes = Math.max(1, Math.round((start - nowMs) / MS_PER_MINUTE))
      return minutes >= MINUTES_PER_HOUR
        ? "starts at " + DisplayFormatter.hm(next.start)
        : "starts in " + minutes + " min"
    }
    if (nowMs < end) {
      var minutesLeft = Math.max(1, Math.round((end - nowMs) / MS_PER_MINUTE))
      if (minutesLeft <= 1) return "1 min left"
      if (minutesLeft < MINUTES_PER_HOUR) return minutesLeft + " min left"
      var hours = Math.floor(minutesLeft / MINUTES_PER_HOUR)
      var remainingMinutes = minutesLeft % MINUTES_PER_HOUR
      return (remainingMinutes > 0 ? hours + "h " + remainingMinutes + "m" : hours + "h") + " left"
    }
    return ""
  }

  static formatLabel(next, now, maxTitleLength) {
    if (!next || !next.start) return ""
    var title = String(next.title || LABEL_UNTITLED)
    var limit = Math.max(
      MIN_MAX_TITLE_LENGTH,
      parseInt(maxTitleLength, 10) || DEFAULT_MAX_TITLE_LENGTH
    )
    var suffix
    var start = next.start.getTime()
    var end = next.end ? next.end.getTime() : start
    var nowMs = now.getTime()

    if (DisplayFormatter.isEventAllDay(next)) {
      if (DateTimeUtils.isSameDay(next.start, now) || (nowMs >= start && nowMs < end)) {
        suffix = " · " + LABEL_ALL_DAY
      } else {
        suffix = " · " + DisplayFormatter.dayLabel(next.start, now) + " " + LABEL_ALL_DAY
      }
    } else if (nowMs >= start && nowMs < end) {
      var minutesLeft = Math.max(1, Math.round((end - nowMs) / MS_PER_MINUTE))
      if (minutesLeft <= 1) {
        suffix = " · 1 min left"
      } else if (minutesLeft < MINUTES_PER_HOUR) {
        suffix = " · " + minutesLeft + " min left"
      } else {
        var hours = Math.floor(minutesLeft / MINUTES_PER_HOUR)
        var remainingMinutes = minutesLeft % MINUTES_PER_HOUR
        suffix =
          " · " +
          (remainingMinutes > 0 ? hours + "h " + remainingMinutes + "m" : hours + "h") +
          " left"
      }
    } else if (start - nowMs <= MS_PER_HOUR && start > nowMs) {
      var minutesBefore = Math.max(1, Math.round((start - nowMs) / MS_PER_MINUTE))
      suffix = minutesBefore <= 1 ? " · in a min" : " · in " + minutesBefore + " min"
    } else {
      suffix = " · " + DisplayFormatter.hm(next.start)
      if (!DateTimeUtils.isSameDay(next.start, now))
        suffix =
          " · " + DisplayFormatter.dayLabel(next.start, now) + " " + DisplayFormatter.hm(next.start)
    }
    var titleLimit = Math.max(MIN_TITLE_CHARS, limit - suffix.length)
    if (title.length > titleLimit) title = title.slice(0, Math.max(1, titleLimit - 1)) + "…"
    return title + suffix
  }

  static formatDuration(start, end) {
    if (!start || !end) return ""
    var minutes = Math.round((end.getTime() - start.getTime()) / MS_PER_MINUTE)
    if (minutes <= 0) return ""
    if (minutes < MINUTES_PER_HOUR) return minutes + "m"
    var hours = Math.floor(minutes / MINUTES_PER_HOUR)
    var remainingMinutes = minutes % MINUTES_PER_HOUR
    return remainingMinutes > 0 ? hours + "h " + remainingMinutes + "m" : hours + "h"
  }

  static formatUpdated(date, now) {
    if (!date || isNaN(date.getTime()) || date.getTime() <= 0) return ""
    var minutesAgo = Math.floor((now.getTime() - date.getTime()) / MS_PER_MINUTE)
    if (minutesAgo < 1) return LABEL_JUST_NOW
    if (minutesAgo < MINUTES_PER_HOUR) return minutesAgo + "m ago"
    var hoursAgo = Math.floor(minutesAgo / MINUTES_PER_HOUR)
    if (hoursAgo < HOURS_PER_DAY) return hoursAgo + "h ago"
    return DisplayFormatter.hm(date)
  }

  static eventCalendarUrl(event, base) {
    if (event && event.eventUrl) return event.eventUrl
    var baseUrl = String(base || DEFAULT_CALENDAR_URL_BASE)
      .trim()
      .replace(/\/+$/, "")
    if (/\/r$/.test(baseUrl)) return baseUrl
    return baseUrl + "/r"
  }

  static heroHeaderMeta(next) {
    if (!next) return ""
    var parts = []
    var isAllDay = DisplayFormatter.isEventAllDay(next)
    var durationLabel = isAllDay
      ? LABEL_ALL_DAY
      : DisplayFormatter.formatDuration(next.start, next.end)
    if (durationLabel) parts.push(durationLabel)
    parts.push(
      next.meetUrl
        ? ICON_MEETING_VIDEO + "  " + MeetingLinkDetector.meetLabel(next.meetUrl)
        : ICON_CALENDAR_EVENT + "  " + LABEL_EVENT_FALLBACK
    )
    return parts.join("  ·  ")
  }

  static heroTimeStatus(next, now) {
    if (!next) return ""
    var isAllDay = DisplayFormatter.isEventAllDay(next)
    var label = DisplayFormatter.meetingTimeLabel(next.start, next.end, now, isAllDay)
    var status = DisplayFormatter.relativeStatus(next, now)
    return status ? label + " · " + status : label
  }

  static barLabel(configured, nextMeeting, now, maxTitleLength) {
    if (!configured || !nextMeeting) return ""
    var icon = nextMeeting.meetUrl ? ICON_MEETING_VIDEO + "  " : ICON_CALENDAR_EVENT + "  "
    return icon + DisplayFormatter.formatLabel(nextMeeting, now, maxTitleLength)
  }

  static headerStatus(fetching, lastFetchFailed, offlineFeedCount, lastUpdated, now, configured) {
    if (fetching) return STATUS_UPDATING
    if (lastFetchFailed) return STATUS_OFFLINE_CACHED
    if (offlineFeedCount > 0) {
      return (
        offlineFeedCount + " calendar" + (offlineFeedCount > 1 ? "s" : "") + " offline · updated"
      )
    }
    if (configured && lastUpdated) {
      return DisplayFormatter.formatUpdated(lastUpdated, now)
    }
    return ""
  }

  static tooltipLine(configured, nextMeeting, now, options) {
    options = options || {}
    var lastFetchFailed = options.lastFetchFailed === true
    var offlineFeedCount = options.offlineFeedCount || 0
    var showCalendarLabel = options.showCalendarLabel !== false

    if (!configured) return "NextEvent — No calendar configured\nClick to set up"
    if (!nextMeeting) {
      if (lastFetchFailed) return "NextEvent — No upcoming events (offline)"
      if (offlineFeedCount > 0) {
        return (
          "NextEvent — No upcoming events · " +
          offlineFeedCount +
          " calendar" +
          (offlineFeedCount > 1 ? "s" : "") +
          " offline"
        )
      }
      return "NextEvent — No upcoming events"
    }
    var title = nextMeeting.title || LABEL_UNTITLED
    var isAllDay = DisplayFormatter.isEventAllDay(nextMeeting)
    var range = DisplayFormatter.timeRange(nextMeeting.start, nextMeeting.end, isAllDay)
    var status = DisplayFormatter.relativeStatus(nextMeeting, now)
    var line = title + " · " + range + (status ? " (" + status + ")" : "")
    if (showCalendarLabel && nextMeeting.feedLabel) line = nextMeeting.feedLabel + " · " + line
    if (lastFetchFailed) line += " · " + STATUS_OFFLINE
    else if (offlineFeedCount > 0)
      line +=
        " · " + offlineFeedCount + " calendar" + (offlineFeedCount > 1 ? "s" : "") + " offline"
    return line
  }
}

// ---------------------------------------------------------------------------
// PanelNavigationModel: keyboard navigation
// ---------------------------------------------------------------------------

class PanelNavigationModel {
  constructor() {
    this.actionItems = []
    this.cursorIndex = -1
    this.cursorActive = false
  }

  rebuildActionItems(heroVisible, nextMeeting, scheduleGroups, inSettingsView) {
    if (inSettingsView) {
      this.actionItems = [{ kind: ACTION_SETTINGS }]
      if (this.cursorIndex >= this.actionItems.length)
        this.cursorIndex = this.actionItems.length - 1
      return this.actionItems
    }
    var items = [{ kind: ACTION_REFRESH }, { kind: ACTION_SETTINGS }]
    if (heroVisible && nextMeeting && nextMeeting.meetUrl) items.push({ kind: ACTION_JOIN })
    if (heroVisible && nextMeeting) items.push({ kind: ACTION_CALENDAR })
    if (scheduleGroups && scheduleGroups.length) {
      for (var groupIndex = 0; groupIndex < scheduleGroups.length; groupIndex++) {
        var rows = scheduleGroups[groupIndex].items || []
        for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          items.push({ kind: ACTION_EVENT, groupIndex: groupIndex, rowIndex: rowIndex })
        }
      }
    }
    this.actionItems = items
    if (this.cursorIndex >= items.length) this.cursorIndex = items.length - 1
    return items
  }

  moveCursor(delta) {
    if (this.actionItems.length === 0) return this.cursorIndex
    if (!this.cursorActive) {
      this.cursorActive = true
      this.cursorIndex = delta > 0 ? 0 : this.actionItems.length - 1
    } else {
      this.cursorIndex = Math.max(
        0,
        Math.min(this.actionItems.length - 1, this.cursorIndex + delta)
      )
    }
    return this.cursorIndex
  }

  pointCursorAt(kind, groupIndex, rowIndex) {
    for (var i = 0; i < this.actionItems.length; i++) {
      var item = this.actionItems[i]
      if (item.kind !== kind) continue
      if (
        groupIndex === undefined ||
        (item.groupIndex === groupIndex && item.rowIndex === rowIndex)
      ) {
        this.cursorActive = true
        this.cursorIndex = i
        return i
      }
    }
    return -1
  }

  isCursorOn(kind, groupIndex, rowIndex) {
    if (!this.cursorActive || this.cursorIndex < 0 || this.cursorIndex >= this.actionItems.length)
      return false
    var currentItem = this.actionItems[this.cursorIndex]
    if (currentItem.kind !== kind) return false
    return (
      groupIndex === undefined ||
      (currentItem.groupIndex === groupIndex && currentItem.rowIndex === rowIndex)
    )
  }

  activeItem() {
    if (!this.cursorActive || this.cursorIndex < 0 || this.cursorIndex >= this.actionItems.length)
      return null
    return this.actionItems[this.cursorIndex]
  }
}

// --- Public API Functions (exposed directly to QML) ------------------------

function parseIcs(text, options) {
  return IcsParser.parse(text, options)
}
function parseJsonEvents(items, options) {
  return JsonStateParser.parseJsonEvents(items, options)
}
function parseJsonState(rawText, options) {
  return JsonStateParser.parseJsonState(rawText, options)
}

function splitIcsFeeds(raw) {
  return FeedConfigParser.splitIcsFeeds(raw)
}
function dedupeEvents(events) {
  return FeedConfigParser.dedupeEvents(events)
}
function normalizeKey(value, fallback) {
  return FeedConfigParser.normalizeKey(value, fallback)
}
function toBoolean(value, fallback) {
  return FeedConfigParser.toBoolean(value, fallback)
}

function buildUpcoming(events, now, options) {
  return ScheduleAggregator.buildUpcoming(events, now, options)
}
function upcomingToday(events, now) {
  return ScheduleAggregator.upcomingToday(events, now)
}
function buildScheduleGroups(events, now, options) {
  return ScheduleAggregator.buildScheduleGroups(events, now, options)
}
function buildCalendarLegend(events, feeds) {
  return ScheduleAggregator.buildCalendarLegend(events, feeds)
}
function computeScheduleState(events, now, options) {
  return ScheduleAggregator.computeScheduleState(events, now, options)
}

function findMeetUrl(text) {
  return MeetingLinkDetector.findMeetUrl(text)
}
function meetLabel(url) {
  return MeetingLinkDetector.meetLabel(url)
}

function eventCalendarUrl(event, base) {
  return DisplayFormatter.eventCalendarUrl(event, base)
}
function formatLabel(next, now, maxTitleLength) {
  return DisplayFormatter.formatLabel(next, now, maxTitleLength)
}
function relativeStatus(next, now) {
  return DisplayFormatter.relativeStatus(next, now)
}
function timeRange(start, end, allDay) {
  return DisplayFormatter.timeRange(start, end, allDay)
}
function meetingTimeLabel(start, end, now, allDay) {
  return DisplayFormatter.meetingTimeLabel(start, end, now, allDay)
}
function barLabel(configured, nextMeeting, now, maxTitleLength) {
  return DisplayFormatter.barLabel(configured, nextMeeting, now, maxTitleLength)
}
function headerStatus(fetching, lastFetchFailed, offlineFeedCount, lastUpdated, now, configured) {
  return DisplayFormatter.headerStatus(
    fetching,
    lastFetchFailed,
    offlineFeedCount,
    lastUpdated,
    now,
    configured
  )
}
function tooltipLine(configured, nextMeeting, now, options) {
  return DisplayFormatter.tooltipLine(configured, nextMeeting, now, options)
}
function heroHeaderMeta(next) {
  return DisplayFormatter.heroHeaderMeta(next)
}
function heroTimeStatus(next, now) {
  return DisplayFormatter.heroTimeStatus(next, now)
}
function hm(date) {
  return DisplayFormatter.hm(date)
}
function formatDuration(start, end) {
  return DisplayFormatter.formatDuration(start, end)
}
function formatUpdated(date, now) {
  return DisplayFormatter.formatUpdated(date, now)
}
function dayLabel(start, now) {
  return DisplayFormatter.dayLabel(start, now)
}
function daySectionTitle(date, now) {
  return DisplayFormatter.daySectionTitle(date, now)
}
function isEventAllDay(event) {
  return ScheduleAggregator.isEventAllDay(event)
}

// --- Module Exports Guard for Node.js --------------------------------------

if (typeof module !== "undefined" && module.exports) {
  var exportedFacade = {
    // Classes
    Constants: Constants,
    CalendarEvent: CalendarEvent,
    DateTimeUtils: DateTimeUtils,
    TimezoneResolver: TimezoneResolver,
    RecurrenceRule: RecurrenceRule,
    RecurrenceExpander: RecurrenceExpander,
    MeetingLinkDetector: MeetingLinkDetector,
    IcsParser: IcsParser,
    JsonStateParser: JsonStateParser,
    FeedConfigParser: FeedConfigParser,
    ScheduleAggregator: ScheduleAggregator,
    DisplayFormatter: DisplayFormatter,
    PanelNavigationModel: PanelNavigationModel,

    // Public API functions
    parseIcs: parseIcs,
    parseJsonEvents: parseJsonEvents,
    parseJsonState: parseJsonState,
    splitIcsFeeds: splitIcsFeeds,
    dedupeEvents: dedupeEvents,
    normalizeKey: normalizeKey,
    toBoolean: toBoolean,
    buildUpcoming: buildUpcoming,
    upcomingToday: upcomingToday,
    buildScheduleGroups: buildScheduleGroups,
    buildCalendarLegend: buildCalendarLegend,
    computeScheduleState: computeScheduleState,
    findMeetUrl: findMeetUrl,
    meetLabel: meetLabel,
    eventCalendarUrl: eventCalendarUrl,
    formatLabel: formatLabel,
    relativeStatus: relativeStatus,
    timeRange: timeRange,
    meetingTimeLabel: meetingTimeLabel,
    barLabel: barLabel,
    headerStatus: headerStatus,
    tooltipLine: tooltipLine,
    heroHeaderMeta: heroHeaderMeta,
    heroTimeStatus: heroTimeStatus,
    hm: hm,
    formatDuration: formatDuration,
    formatUpdated: formatUpdated,
    dayLabel: dayLabel,
    daySectionTitle: daySectionTitle,
    isEventAllDay: isEventAllDay
  }

  for (var constantKey in Constants) {
    if (Object.prototype.hasOwnProperty.call(Constants, constantKey)) {
      exportedFacade[constantKey] = Constants[constantKey]
    }
  }

  module.exports = exportedFacade
}
