// ---------------------------------------------------------------------------
// NextEvent — iCalendar parsing, recurrence expansion and display labels
//
// Everything here is pure (no Qt/Quickshell), so it is testable from plain
// node. Functions are declared at top level: QML `import "Model.js" as Model`
// exposes them directly.
// ---------------------------------------------------------------------------

// --- small helpers ---------------------------------------------------------

function pad2(n) { return (n < 10 ? "0" : "") + n }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// RFC 5545 line unfolding: CRLF followed by a single space or tab is a
// continuation of the previous line.
function unfoldIcs(raw) {
  var lines = String(raw || "").replace(/\r\n?/g, "\n").split("\n")
  var out = []
  var i = 0
  while (i < lines.length) {
    var line = lines[i].trim()
    if (!line) { i++; continue }
    while (i + 1 < lines.length) {
      var next = lines[i + 1]
      if (next.charAt(0) !== " " && next.charAt(0) !== "\t") break
      line += next.substring(1).trim()
      i++
    }
    out.push(line)
    i++
  }
  return out
}

// Decode RFC 5545 TEXT value escaping.
function unescapeIcs(value) {
  var s = String(value || "")
  var out = ""
  var i = 0
  while (i < s.length) {
    var ch = s.charAt(i)
    if (ch === "\\" && i + 1 < s.length) {
      var next = s.charAt(i + 1)
      if (next === "n" || next === "N") out += "\n"
      else if (next === "\\") out += "\\"
      else if (next === ",") out += ","
      else if (next === ";") out += ";"
      else out += next
      i += 2
      continue
    }
    out += ch
    i++
  }
  return out
}

// Decode RFC 6868 caret-encoding (^n, ^^, ^') used in some parameter values.
function caretDecode(s) {
  s = String(s || "")
  var out = ""
  var i = 0
  while (i < s.length) {
    if (s.charAt(i) === "^" && i + 1 < s.length) {
      var next = s.charAt(i + 1)
      if (next === "n") out += "\n"
      else if (next === "^") out += "^"
      else if (next === "'") out += "\""
      else out += "^" + next
      i += 2
      continue
    }
    out += s.charAt(i)
    i++
  }
  return out
}

// --- property / parameter parsing ------------------------------------------

var WEEKDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
var WEEKDAY_NAMES = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" }
var MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Split "NAME;PARAM=value;PARAM2=value2:body" into { name, params, value }.
function splitProperty(line) {
  var colon = line.indexOf(":")
  if (colon < 0) return null
  var head = line.substring(0, colon)
  var value = line.substring(colon + 1)
  var semi = head.indexOf(";")
  var name = (semi < 0 ? head : head.substring(0, semi)).trim().toUpperCase()
  var params = {}
  if (semi >= 0) {
    var rest = head.substring(semi + 1)
    var parts = splitParams(rest)
    for (var i = 0; i < parts.length; i++) params[parts[i].name] = parts[i].value
  }
  return { name: name, params: params, value: value }
}

function splitParams(s) {
  var out = []
  var i = 0
  var current = ""
  var inQuotes = false
  for (i = 0; i < s.length; i++) {
    var ch = s.charAt(i)
    if (ch === "\"") { inQuotes = !inQuotes; current += ch }
    else if (ch === ";" && !inQuotes) { out.push(current); current = "" }
    else current += ch
  }
  if (current) out.push(current)
  var result = []
  for (i = 0; i < out.length; i++) {
    var idx = out[i].indexOf("=")
    if (idx < 0) continue
    var name = out[i].substring(0, idx).trim().toUpperCase()
    var value = out[i].substring(idx + 1).trim()
    value = value.replace(/^"|"$/g, "")
    value = caretDecode(value)
    result.push({ name: name, value: value })
  }
  return result
}

// --- time/date helpers -----------------------------------------------------

function daysInMonthUTC(y, mo) {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate()
}

function dayKey(y, mo, d) { return y * 10000 + mo * 100 + d }

function keyToParts(key) {
  var y = Math.floor(key / 10000)
  var rest = key % 10000
  return { y: y, mo: Math.floor(rest / 100), d: rest % 100 }
}

function addDaysToKey(key, n) {
  var p = keyToParts(key)
  var dt = new Date(Date.UTC(p.y, p.mo - 1, p.d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.getUTCFullYear() * 10000 + (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate()
}

function weekdayOfKey(key) {
  var p = keyToParts(key)
  return new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()
}

// --- VTIMEZONE offset table -------------------------------------------------
// QML's V4 engine has no Intl, so named zones must be resolved from the
// VTIMEZONE blocks the feed itself ships.

var TZ_TABLE = {}

function parseTzOffset(value) {
  var m = /^([+-])(\d{2})(\d{2})(\d{2})?$/.exec(String(value || "").trim())
  if (!m) return null
  var sign = m[1] === "-" ? -1 : 1
  var mins = parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
  var secs = m[4] ? parseInt(m[4], 10) : 0
  return sign * (mins * 60 + secs) * 1000
}

// Collect TZID -> observances from raw (already unfolded) ICS lines.
function registerVTimezones(lines) {
  var tzid = null
  var inTz = false
  var obs = null
  var list = null
  for (var i = 0; i < lines.length; i++) {
    var line = String(lines[i]).trim()
    if (!line) continue
    if (line === "BEGIN:VTIMEZONE") { inTz = true; tzid = null; list = []; continue }
    if (!inTz) continue
    if (line === "END:VTIMEZONE") {
      if (tzid && list && list.length) TZ_TABLE[tzid] = list
      inTz = false; tzid = null; list = null; obs = null
      continue
    }
    if (line === "BEGIN:STANDARD" || line === "BEGIN:DAYLIGHT") {
      obs = { daylight: line === "BEGIN:DAYLIGHT", from: null, to: null, wall: null, rule: null }
      continue
    }
    if (line === "END:STANDARD" || line === "END:DAYLIGHT") {
      if (obs && obs.to !== null && obs.wall) {
        if (obs.from === null) obs.from = obs.to
        list.push(obs)
      }
      obs = null
      continue
    }
    var prop = splitProperty(line)
    if (!prop) continue
    if (!obs) {
      if (prop.name === "TZID") tzid = prop.value.trim()
      continue
    }
    if (prop.name === "TZOFFSETFROM") obs.from = parseTzOffset(prop.value)
    else if (prop.name === "TZOFFSETTO") obs.to = parseTzOffset(prop.value)
    else if (prop.name === "DTSTART") {
      var w = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/.exec(prop.value.trim())
      if (w) obs.wall = {
        y: parseInt(w[1], 10), mo: parseInt(w[2], 10), d: parseInt(w[3], 10),
        h: w[4] ? parseInt(w[4], 10) : 0,
        mi: w[5] ? parseInt(w[5], 10) : 0,
        s: w[6] ? parseInt(w[6], 10) : 0
      }
    }
    else if (prop.name === "RRULE") {
      var r = { month: 0, weekday: -1, ord: 0, monthday: 0 }
      var segs = prop.value.split(";")
      for (var k = 0; k < segs.length; k++) {
        var kv = segs[k].split("=")
        var key = String(kv[0] || "").toUpperCase()
        var val = String(kv[1] || "").trim()
        if (key === "BYMONTH") r.month = parseInt(val, 10) || 0
        else if (key === "BYMONTHDAY") r.monthday = parseInt(val, 10) || 0
        else if (key === "BYDAY") {
          var bd = /^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(val.split(",")[0].trim())
          if (bd) {
            r.ord = bd[1] ? parseInt(bd[1], 10) : 1
            r.weekday = WEEKDAY[bd[2]]
          }
        }
      }
      if (r.month) obs.rule = r
    }
  }
}

function nthWeekdayOfMonth(y, mo, weekday, ord) {
  var dim = daysInMonthUTC(y, mo)
  if (ord > 0) {
    var firstDow = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay()
    var day = 1 + ((weekday - firstDow + 7) % 7) + (ord - 1) * 7
    return day <= dim ? day : 0
  }
  if (ord < 0) {
    var lastDow = new Date(Date.UTC(y, mo - 1, dim)).getUTCDay()
    var day2 = dim - ((lastDow - weekday + 7) % 7) + (ord + 1) * 7
    return day2 >= 1 ? day2 : 0
  }
  return 0
}

// Transition instants for a zone, expressed in that zone's wall clock (the
// space RFC 5545 observance DTSTARTs live in), for the years around `year`.
function zoneTransitions(list, year) {
  var out = []
  for (var i = 0; i < list.length; i++) {
    var obs = list[i]
    if (!obs.rule) {
      out.push({ wallMs: Date.UTC(obs.wall.y, obs.wall.mo - 1, obs.wall.d, obs.wall.h, obs.wall.mi, obs.wall.s), from: obs.from, to: obs.to })
      continue
    }
    for (var y = year - 1; y <= year + 1; y++) {
      if (y < obs.wall.y) continue
      var day = obs.rule.monthday
        ? Math.min(obs.rule.monthday, daysInMonthUTC(y, obs.rule.month))
        : nthWeekdayOfMonth(y, obs.rule.month, obs.rule.weekday, obs.rule.ord)
      if (!day) continue
      out.push({ wallMs: Date.UTC(y, obs.rule.month - 1, day, obs.wall.h, obs.wall.mi, obs.wall.s), from: obs.from, to: obs.to })
    }
  }
  out.sort(function (a, b) { return a.wallMs - b.wallMs })
  return out
}

// Offset in ms that applies to the given wall-clock time in `tzid`,
// or null when the zone is unknown.
function tzOffsetForWall(tzid, y, mo, d, h, mi, s) {
  var list = TZ_TABLE[tzid]
  if (!list || !list.length) return null
  var wallMs = Date.UTC(y, mo - 1, d, h, mi, s)
  var trans = zoneTransitions(list, y)
  if (!trans.length) return null
  var off = trans[0].from
  for (var i = 0; i < trans.length; i++) {
    if (wallMs >= trans[i].wallMs) off = trans[i].to
    else break
  }
  return off === null ? null : off
}

// Convert a "local" wall-clock { y, mo, d, h, mi, s } to a UTC Date.
// TZID resolution order: VTIMEZONE table, then Intl if the engine has it,
// then naive local handling as a last resort.
function zonedToUtc(tzid, y, mo, d, h, mi, s) {
  var tableOffset = tzOffsetForWall(tzid, y, mo, d, h, mi, s)
  if (tableOffset !== null) return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - tableOffset)
  try {
    if (typeof Intl === "undefined") throw new Error("no Intl")
    var guess = new Date(Date.UTC(y, mo - 1, d, h, mi, s))
    var formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23"
    })
    var parts = formatter.formatToParts(guess)
    var map = {}
    for (var i = 0; i < parts.length; i++) map[parts[i].type] = parts[i].value
    var wall = new Date(Date.UTC(
      parseInt(map.year, 10), parseInt(map.month, 10) - 1, parseInt(map.day, 10),
      parseInt(map.hour, 10), parseInt(map.minute, 10), parseInt(map.second, 10)))
    var offset = wall.getTime() - guess.getTime()
    return new Date(guess.getTime() - offset)
  } catch (e) {
    return new Date(y, mo - 1, d, h, mi, s)
  }
}

function parseRfcDate(value, tzid) {
  var s = String(value || "").trim()
  var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/.exec(s)
  if (!m) return null
  var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10)
  var h = m[4] ? parseInt(m[4], 10) : 0
  var mi = m[5] ? parseInt(m[5], 10) : 0
  var sec = m[6] ? parseInt(m[6], 10) : 0
  var isDateOnly = !m[4]
  if (s.indexOf("Z") >= 0) return { date: new Date(Date.UTC(y, mo - 1, d, h, mi, sec)), utc: true, allDay: isDateOnly }
  if (tzid) return { date: zonedToUtc(tzid, y, mo, d, h, mi, sec), utc: false, allDay: isDateOnly, tzid: tzid }
  return { date: new Date(y, mo - 1, d, h, mi, sec), utc: false, allDay: isDateOnly }
}

// --- recurrence rules ------------------------------------------------------

function parseByDay(value) {
  var out = []
  var items = String(value || "").split(",")
  for (var i = 0; i < items.length; i++) {
    var m = /^(-?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(items[i].trim())
    if (!m) continue
    out.push({ ord: m[1] ? parseInt(m[1], 10) : 0, day: WEEKDAY[m[2]] })
  }
  return out
}

function parseRRule(value) {
  var rule = {
    freq: "", interval: 1, byday: [], bymonthday: [], bymonth: [],
    until: null, untilAllDay: false, count: 0, wkst: WEEKDAY.MO
  }
  var parts = String(value || "").split(";")
  for (var i = 0; i < parts.length; i++) {
    var idx = parts[i].indexOf("=")
    if (idx < 0) continue
    var name = parts[i].substring(0, idx).trim().toUpperCase()
    var val = parts[i].substring(idx + 1).trim()
    if (name === "FREQ") rule.freq = val
    else if (name === "INTERVAL") rule.interval = Math.max(1, parseInt(val, 10) || 1)
    else if (name === "COUNT") rule.count = parseInt(val, 10) || 0
    else if (name === "UNTIL") {
      var parsed = parseRfcDate(val, null)
      if (parsed) { rule.until = parsed.date; rule.untilAllDay = parsed.allDay }
    }
    else if (name === "BYDAY") rule.byday = parseByDay(val)
    else if (name === "BYMONTHDAY") {
      var md = val.split(",")
      for (var j = 0; j < md.length; j++) {
        var n = parseInt(md[j], 10)
        if (!isNaN(n)) rule.bymonthday.push(n)
      }
    }
    else if (name === "BYMONTH") {
      var mm = val.split(",")
      for (var k = 0; k < mm.length; k++) {
        var m = parseInt(mm[k], 10)
        if (!isNaN(m)) rule.bymonth.push(m)
      }
    }
    else if (name === "WKST") rule.wkst = WEEKDAY[val] !== undefined ? WEEKDAY[val] : WEEKDAY.MO
  }
  return rule
}

// --- per-month day candidates ----------------------------------------------

function nthWeekdayOfMonth(y, mo, weekday, ord) {
  var dim = daysInMonthUTC(y, mo)
  var base = dayKey(y, mo, 1)
  if (ord > 0) {
    var first = weekdayOfKey(base)
    var day = 1 + ((weekday - first + 7) % 7) + (ord - 1) * 7
    return day <= dim ? day : null
  }
  var last = weekdayOfKey(dayKey(y, mo, dim))
  var dayNeg = dim - ((last - weekday + 7) % 7) + (ord + 1) * 7
  return dayNeg >= 1 ? dayNeg : null
}

function allWeekdaysOfMonth(y, mo, weekday) {
  var dim = daysInMonthUTC(y, mo)
  var first = weekdayOfKey(dayKey(y, mo, 1))
  var out = []
  for (var day = 1 + ((weekday - first + 7) % 7); day <= dim; day += 7) out.push(day)
  return out
}

// Day keys within [startKey, endKey] that the rule's BY* parts select from
// the given month. `defaultDay` is DTSTART's day-of-month, used when the
// rule has no BY* constraints.
function monthCandidates(y, mo, rule, startKey, endKey, defaultDay) {
  var keys = []
  var dim = daysInMonthUTC(y, mo)
  var base = dayKey(y, mo, 1)

  function add(day) {
    var k = base + day - 1
    if (k >= startKey && k <= endKey) keys.push(k)
  }

  if (rule.bymonthday.length) {
    for (var i = 0; i < rule.bymonthday.length; i++) {
      var md = rule.bymonthday[i]
      var day = md > 0 ? md : dim + 1 + md
      if (day >= 1 && day <= dim) add(day)
    }
  } else if (rule.byday.length) {
    for (var j = 0; j < rule.byday.length; j++) {
      var bd = rule.byday[j]
      if (bd.ord !== 0) {
        var d = nthWeekdayOfMonth(y, mo, bd.day, bd.ord)
        if (d !== null) add(d)
      } else {
        var days = allWeekdaysOfMonth(y, mo, bd.day)
        for (var k = 0; k < days.length; k++) add(days[k])
      }
    }
  } else {
    add(Math.min(defaultDay, dim))
  }
  return keys
}

function dateForKey(key, tzInfo) {
  var p = keyToParts(key)
  if (tzInfo.utc) return new Date(Date.UTC(p.y, p.mo - 1, p.d, tzInfo.h, tzInfo.mi, tzInfo.s))
  if (tzInfo.tzid) return zonedToUtc(tzInfo.tzid, p.y, p.mo, p.d, tzInfo.h, tzInfo.mi, tzInfo.s)
  return new Date(p.y, p.mo - 1, p.d, tzInfo.h, tzInfo.mi, tzInfo.s)
}

function expandOccurrences(startKey, tzInfo, rule, fromKey, lookaheadDays, maxOccurrences) {
  var out = []
  var toKey = addDaysToKey(fromKey, lookaheadDays)
  var startParts = keyToParts(startKey)
  var MAX_STEPS = 20000

  function pushKey(key) {
    if (key < startKey || key < fromKey || key > toKey) return
    var date = dateForKey(key, tzInfo)
    if (!date) return
    if (rule.until) {
      var until = rule.until.getTime()
      if (rule.untilAllDay) until += 86400000 - 1
      if (date.getTime() > until) return
    }
    out.push(date)
  }

  // Every generated occurrence counts toward COUNT even when it lands before
  // the window; only occurrences inside the window go into `out`, which is
  // what maxOccurrences caps.
  function shouldStop() {
    return out.length >= maxOccurrences
  }

  var i, c, key, weekKey, seen = 0, guard = 0, done = false

  function emit(key) {
    if (rule.count > 0 && seen >= rule.count) { done = true; return }
    seen++
    pushKey(key)
    if (shouldStop()) done = true
  }

  if (rule.freq === "DAILY") {
    for (key = startKey; key <= toKey; key = addDaysToKey(key, rule.interval)) {
      if (++guard > MAX_STEPS) break
      var wd = weekdayOfKey(key)
      var hit = rule.byday.length === 0
      for (i = 0; i < rule.byday.length; i++) {
        if (rule.byday[i].day === wd) { hit = true; break }
      }
      if (!hit) continue
      emit(key)
      if (done) break
    }
  } else if (rule.freq === "WEEKLY") {
    // Anchor the first candidate week at the Monday on/before DTSTART so
    // BYDAY days are enumerated over each interval band; the startKey check
    // in pushKey drops anything before DTSTART.
    var firstWeek = addDaysToKey(startKey, -((weekdayOfKey(startKey) - WEEKDAY.MO + 7) % 7))
    var offsets = []
    if (rule.byday.length) {
      for (i = 0; i < rule.byday.length; i++)
        offsets.push((rule.byday[i].day - WEEKDAY.MO + 7) % 7)
    } else {
      offsets.push((weekdayOfKey(startKey) - WEEKDAY.MO + 7) % 7)
    }
    for (weekKey = firstWeek; weekKey <= toKey; weekKey = addDaysToKey(weekKey, rule.interval * 7)) {
      if (++guard > MAX_STEPS) break
      for (i = 0; i < offsets.length; i++) {
        var wk = addDaysToKey(weekKey, offsets[i])
        if (wk < startKey) continue
        emit(wk)
        if (done) break
      }
      if (done) break
    }
  } else if (rule.freq === "MONTHLY") {
    var idx = startParts.y * 12 + (startParts.mo - 1)
    for (var step = 0; step < MAX_STEPS; step++) {
      var y = Math.floor((idx + step * rule.interval) / 12)
      var mo = ((idx + step * rule.interval) % 12) + 1
      var candidates = monthCandidates(y, mo, rule, startKey, toKey, startParts.d)
      for (c = 0; c < candidates.length; c++) {
        emit(candidates[c])
        if (done) break
      }
      if (done) break
      if (dayKey(y, mo, daysInMonthUTC(y, mo)) > toKey) break
    }
  } else if (rule.freq === "YEARLY") {
    for (var yi = 0; yi < MAX_STEPS; yi++) {
      var yy = startParts.y + yi * rule.interval
      var months = rule.bymonth.length ? rule.bymonth : [startParts.mo]
      for (var mi = 0; mi < months.length; mi++) {
        var my = months[mi]
        var c2 = monthCandidates(yy, my, rule, startKey, toKey, startParts.d)
        for (c = 0; c < c2.length; c++) {
          emit(c2[c])
          if (done) break
        }
        if (done) break
      }
      if (done) break
      if (dayKey(yy, 12, 31) > toKey) break
    }
  }
  return out
}

// --- event block parsing ---------------------------------------------------

function findMeetUrl(text) {
  var m = /https:\/\/meet\.google\.com\/[a-z0-9][a-z0-9-]*/.exec(String(text || ""))
  return m ? m[0] : null
}

function parseEventBlock(block) {
  var ev = {
    uid: null, title: "", start: null, end: null, allDay: false, tzid: null,
    meetUrl: null, rrule: null, exdates: [],
    durationMs: 0, startKey: 0, tzInfo: null
  }
  var lines = block.lines
  var lastTzid = null
  for (var i = 0; i < lines.length; i++) {
    var prop = splitProperty(lines[i])
    if (!prop) continue
    var name = prop.name
    var value = prop.value
    if (name === "UID") ev.uid = value.trim()
    else if (name === "SUMMARY") ev.title = unescapeIcs(value)
    else if (name === "RECURRENCE-ID") {
      var rid = parseRfcDate(value, prop.params.TZID || lastTzid)
      if (rid) ev.recurrenceId = rid.date.getTime()
    }
    else if (name === "DTSTART" || name === "DTEND") {
      var tzid = prop.params.TZID || lastTzid
      var parsed = parseRfcDate(value, tzid)
      if (!parsed) continue
      if (name === "DTSTART") {
        ev.start = parsed.date
        ev.allDay = parsed.allDay
        ev.tzid = tzid
        var wall = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(value)
        ev.tzInfo = {
          utc: parsed.utc,
          tzid: tzid,
          h: wall ? parseInt(wall[4], 10) : 0,
          mi: wall ? parseInt(wall[5], 10) : 0,
          s: wall && wall[6] ? parseInt(wall[6], 10) : 0
        }
        ev.startKey = wall
          ? parseInt(wall[1], 10) * 10000 + parseInt(wall[2], 10) * 100 + parseInt(wall[3], 10)
          : parsed.date.getUTCFullYear() * 10000 + (parsed.date.getUTCMonth() + 1) * 100 + parsed.date.getUTCDate()
      } else {
        ev.end = parsed.date
      }
      lastTzid = tzid
    }
    else if (name === "RRULE") ev.rrule = parseRRule(value)
    else if (name === "LOCATION") ev.location = unescapeIcs(value)
    else if (name === "DESCRIPTION") ev.description = unescapeIcs(value)
    else if (name === "X-GOOGLE-CONFERENCE") ev.xConference = value.trim()
    else if (name === "EXDATE") {
      var parts = value.split(",")
      for (var j = 0; j < parts.length; j++) {
        var ex = parseRfcDate(parts[j], prop.params.TZID || lastTzid)
        if (ex) ev.exdates.push(ex.date.getTime())
      }
    }
  }

  if (!ev.uid || !ev.start) return null

  ev.meetUrl = findMeetUrl((ev.location || "") + " " + (ev.description || "") + " " + (ev.xConference || ""))
  if (ev.end && ev.end.getTime() > ev.start.getTime()) {
    ev.durationMs = ev.end.getTime() - ev.start.getTime()
  } else {
    ev.durationMs = ev.allDay ? 86400000 : 3600000
    ev.end = new Date(ev.start.getTime() + ev.durationMs)
  }
  return ev
}

function parseIcs(raw, options) {
  options = options || {}
  var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || 3)
  var maxOccurrences = Math.max(1, parseInt(options.maxEvents, 10) || 80)
  var now = options.now || new Date()
  var fromKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()

  var lines = unfoldIcs(raw)
  registerVTimezones(lines)
  var blocks = []
  var current = null
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (!line) continue
    if (line === "BEGIN:VEVENT") { current = []; blocks.push(current); continue }
    if (line === "END:VEVENT") { current = null; continue }
    if (current) current.push(line)
  }

  var parsed = []
  for (var b = 0; b < blocks.length; b++) {
    var ev = parseEventBlock({ lines: blocks[b] })
    if (ev) parsed.push(ev)
  }

  var masters = []
  var overrides = []
  for (var i2 = 0; i2 < parsed.length; i2++) {
    if (parsed[i2].recurrenceId !== undefined) overrides.push(parsed[i2])
    else masters.push(parsed[i2])
  }

  var overridesByUid = {}
  for (var i3 = 0; i3 < overrides.length; i3++) {
    var ov = overrides[i3]
    if (!ov.uid) continue
    overridesByUid[ov.uid] = overridesByUid[ov.uid] || []
    overridesByUid[ov.uid].push(ov)
  }

  var result = []
  for (var m = 0; m < masters.length; m++) {
    var master = masters[m]
    var occStarts
    if (master.rrule) {
      occStarts = expandOccurrences(master.startKey, master.tzInfo, master.rrule, fromKey, lookaheadDays, maxOccurrences)
    } else {
      occStarts = [master.start]
    }

    var exSet = {}
    for (var e = 0; e < (master.exdates || []).length; e++) exSet[master.exdates[e]] = true

    var ovByTime = {}
    var uidOverrides = overridesByUid[master.uid] || []
    for (var o = 0; o < uidOverrides.length; o++) {
      if (uidOverrides[o].recurrenceId !== undefined)
        ovByTime[uidOverrides[o].recurrenceId] = uidOverrides[o]
    }

    for (var c = 0; c < occStarts.length; c++) {
      var occStart = occStarts[c]
      var startMs = occStart.getTime()
      if (exSet[startMs]) continue
      var overrideEv = ovByTime[startMs] || null
      var src = overrideEv || master
      var startDate = overrideEv ? overrideEv.start : occStart
      var endDate = overrideEv ? overrideEv.end : new Date(startMs + master.durationMs)
      if (endDate.getTime() <= startDate.getTime())
        endDate = new Date(startDate.getTime() + 3600000)
      result.push({
        uid: master.uid,
        title: src.title,
        start: startDate,
        end: endDate,
        allDay: src.allDay === true,
        meetUrl: src.meetUrl || null,
        location: src.location || "",
        description: src.description || ""
      })
    }
  }
  return result
}

// --- selection + labels ----------------------------------------------------

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function hm(date) {
  return pad2(date.getHours()) + ":" + pad2(date.getMinutes())
}

function shortStart(date) {
  return hm(date)
}

function timeRange(start, end) {
  if (!start) return ""
  return hm(start) + "–" + hm(end)
}

function meetingTimeLabel(start, end, now) {
  var labels = []
  if (isSameDay(start, now)) labels.push("Today")
  else if (isSameDay(start, new Date(now.getTime() + 86400000))) labels.push("Tomorrow")
  else {
    var dow = WEEKDAY_NAMES[start.getDay()]
    var mo = MONTH_NAMES_SHORT[start.getMonth()]
    labels.push(dow + " " + start.getDate() + " " + mo)
  }
  if (start && end) labels.push(timeRange(start, end))
  return labels.join(" · ")
}

function relativeStatus(next, now) {
  if (!next || !next.start || !next.end) return ""
  var start = next.start.getTime()
  var end = next.end.getTime()
  var t = now.getTime()
  if (t < start) {
    var mins = Math.max(1, Math.round((start - t) / 60000))
    return mins >= 60 ? "starts at " + hm(next.start) : "starts in " + mins + " min"
  }
  if (t < end) {
    var left = Math.max(1, Math.round((end - t) / 60000))
    if (left <= 1) return "1 min left"
    if (left < 60) return left + " min left"
    var h = Math.floor(left / 60)
    var m = left % 60
    return (m > 0 ? h + "h " + m + "m" : h + "h") + " left"
  }
  return ""
}

function dayLabel(start, now) {
  var oneDay = 86400000
  var dayDiff = Math.round((startOfDay(start) - startOfDay(now)) / oneDay)
  if (dayDiff === 0) return "Today"
  if (dayDiff === 1) return "Tmrw"
  if (dayDiff === -1) return "Yest"
  if (dayDiff > 1 && dayDiff < 7) return WEEKDAY_NAMES[start.getDay()]
  var dow = WEEKDAY_NAMES[start.getDay()]
  var mo = MONTH_NAMES_SHORT[start.getMonth()]
  return dow + " " + start.getDate() + " " + mo
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatLabel(next, now, maxTitleLength) {
  if (!next || !next.start) return ""
  var title = String(next.title || "(Untitled)")
  var limit = Math.max(8, parseInt(maxTitleLength, 10) || 28)
  var suffix
  var start = next.start.getTime()
  var end = next.end ? next.end.getTime() : start
  var t = now.getTime()
  if (t >= start && t < end) {
    var minsLeft = Math.max(1, Math.round((end - t) / 60000))
    if (minsLeft <= 1) {
      suffix = " · 1 min left"
    } else if (minsLeft < 60) {
      suffix = " · " + minsLeft + " min left"
    } else {
      var h = Math.floor(minsLeft / 60)
      var m = minsLeft % 60
      suffix = " · " + (m > 0 ? h + "h " + m + "m" : h + "h") + " left"
    }
  } else if (start - t <= 60 * 60000 && start > t) {
    var mins = Math.max(1, Math.round((start - t) / 60000))
    suffix = mins <= 1 ? " · in a min" : " · in " + mins + " min"
  } else {
    suffix = " · " + hm(next.start)
    if (!isSameDay(next.start, now)) suffix = " · " + dayLabel(next.start, now) + " " + hm(next.start)
  }
  var titleLimit = Math.max(3, limit - suffix.length)
  if (title.length > titleLimit) title = title.slice(0, Math.max(1, titleLimit - 1)) + "…"
  return title + suffix
}

function compareUpcoming(a, b) {
  var av = a.start.getTime(), bv = b.start.getTime()
  if (av !== bv) return av - bv
  var bd = (b.end ? b.end.getTime() : bv) - bv
  var ad = (a.end ? a.end.getTime() : av) - av
  if (ad !== bd) return bd - ad
  return String(a.title || "").localeCompare(String(b.title || ""))
}

function buildUpcoming(events, now, options) {
  options = options || {}
  var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || 3)
  var showOnlyWithVideoLink = options.showOnlyWithVideoLink !== false
  var maxRows = Math.max(1, parseInt(options.maxRows, 10) || 20)
  var t = now.getTime()
  var horizon = t + lookaheadDays * 86400000

  var upcoming = []
  for (var i = 0; i < events.length; i++) {
    var ev = events[i]
    if (!ev.start || !ev.end) continue
    if (ev.end.getTime() < t) continue
    if (ev.start.getTime() > horizon) continue
    if (showOnlyWithVideoLink && !ev.meetUrl) continue
    upcoming.push(ev)
  }

  upcoming.sort(compareUpcoming)

  if (upcoming.length > maxRows) upcoming = upcoming.slice(0, maxRows)
  return upcoming
}

function formatDuration(start, end) {
  if (!start || !end) return ""
  var mins = Math.round((end.getTime() - start.getTime()) / 60000)
  if (mins <= 0) return ""
  if (mins < 60) return mins + "m"
  var h = Math.floor(mins / 60)
  var m = mins % 60
  return m > 0 ? h + "h " + m + "m" : h + "h"
}

function daySectionTitle(date, now) {
  var oneDay = 86400000
  var diff = Math.round((startOfDay(date) - startOfDay(now)) / oneDay)
  if (diff === 0) return "TODAY"
  if (diff === 1) return "TOMORROW"
  var dow = WEEKDAY_NAMES[date.getDay()].toUpperCase()
  var mo = MONTH_NAMES_SHORT[date.getMonth()].toUpperCase()
  return dow + " " + date.getDate() + " " + mo
}

// Group upcoming events into day sections (TODAY, TOMORROW, DOW DD MMM)
function buildScheduleGroups(events, now, options) {
  options = options || {}
  var lookaheadDays = Math.max(1, parseInt(options.lookaheadDays, 10) || 3)
  var maxRows = Math.max(1, parseInt(options.maxRows, 10) || 20)
  var t = now.getTime()
  var horizon = t + lookaheadDays * 86400000

  var valid = []
  for (var i = 0; i < (events || []).length; i++) {
    var ev = events[i]
    if (!ev.start || !ev.end) continue
    if (ev.end.getTime() < t) continue
    if (ev.start.getTime() > horizon) continue
    valid.push(ev)
  }
  valid.sort(compareUpcoming)
  if (valid.length > maxRows) valid = valid.slice(0, maxRows)

  var groups = []
  var map = {}
  for (var j = 0; j < valid.length; j++) {
    var item = valid[j]
    var key = dayKey(item.start.getFullYear(), item.start.getMonth() + 1, item.start.getDate())
    if (!map[key]) {
      var grp = {
        key: key,
        title: daySectionTitle(item.start, now),
        items: []
      }
      map[key] = grp
      groups.push(grp)
    }
    map[key].items.push(item)
  }
  return groups
}

// Every event still to happen today, from now until end of the day.
// No video-link filter, no row cap — this is the panel's "today" list.
function upcomingToday(events, now) {
  var t = now.getTime()
  var endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)
  var eod = endOfDay.getTime()

  var out = []
  for (var i = 0; i < events.length; i++) {
    var ev = events[i]
    if (!ev.start || !ev.end) continue
    if (ev.end.getTime() < t) continue
    if (ev.start.getTime() > eod) continue
    out.push(ev)
  }

  out.sort(compareUpcoming)
  return out
}

// Google Calendar link for an event.
// Always opens the main calendar view at `/r` (e.g. `https://calendar.google.com/calendar/u/1/r`).
function eventCalendarUrl(ev, base) {
  var b = String(base || "https://calendar.google.com/calendar").trim().replace(/\/+$/, "")
  if (/\/r$/.test(b)) return b
  return b + "/r"
}

function formatUpdated(date, now) {
  if (!date || isNaN(date.getTime()) || date.getTime() <= 0) return ""
  var mins = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return mins + "m ago"
  var hours = Math.floor(mins / 60)
  if (hours < 24) return hours + "h ago"
  return hm(date)
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    unfoldIcs: unfoldIcs,
    unescapeIcs: unescapeIcs,
    parseRfcDate: parseRfcDate,
    parseRRule: parseRRule,
    parseIcs: parseIcs,
    formatLabel: formatLabel,
    formatDuration: formatDuration,
    formatUpdated: formatUpdated,
    meetingTimeLabel: meetingTimeLabel,
    relativeStatus: relativeStatus,
    dayLabel: dayLabel,
    daySectionTitle: daySectionTitle,
    buildUpcoming: buildUpcoming,
    buildScheduleGroups: buildScheduleGroups,
    upcomingToday: upcomingToday,
    eventCalendarUrl: eventCalendarUrl,
    hm: hm,
    timeRange: timeRange,
    registerVTimezones: registerVTimezones,
    tzOffsetForWall: tzOffsetForWall,
    zonedToUtc: zonedToUtc
  }
}
