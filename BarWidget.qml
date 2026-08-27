import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

// NextEvent — the next event, right in the bar.
//
// Left click opens the meeting list; right click joins the next meeting;
// middle click refetches the calendar. When there is nothing actionable
// (no feed configured, or no upcoming meeting) the widget shrinks to a
// muted camera glyph that still opens the panel — which is where the
// setup instructions live.
BarWidget {
  id: root
  moduleName: "tobiasz-p.next-event"

  // ---- settings (shell.json layout entry, `omarchy bar set`)
  // icsUrl is a feed list: "url", "url1,url2", "label|url" per feed
  // (comma-separated), or a JSON array of strings / { url, label } objects.
  readonly property var icsFeeds: Model.splitIcsFeeds(setting("icsUrl", ""))
  readonly property string eventsJsonPath: String(setting("eventsJsonPath", (Quickshell.env("HOME") || "") + "/.local/state/omarchy/calendar-events.json") || "").trim()
  readonly property string sourceMode: icsFeeds.length > 0 ? "ics" : "json"
  readonly property int refreshMinutes: Math.max(1, parseInt(setting("refreshMinutes", 5), 10) || 5)
  readonly property int showDaysAhead: Math.max(1, parseInt(setting("showDaysAhead", 3), 10) || 3)
  readonly property int maxTitleLength: Math.max(8, parseInt(setting("maxTitleLength", 28), 10) || 28)
  readonly property int maxFeedSizeMiB: Math.max(1, parseInt(setting("maxFeedSizeMiB", 10), 10) || 10)
  readonly property bool showOnlyWithVideoLink: {
    var v = setting("showOnlyWithVideoLink", false)
    if (v === undefined || v === null) return false
    if (v === true || v === 1 || v === "1" || v === "true") return true
    if (v === false || v === 0 || v === "0" || v === "false") return false
    return false
  }
  readonly property bool showCalendarLabel: {
    var v = setting("showCalendarLabel", true)
    if (v === undefined || v === null) return true
    if (v === false || v === 0 || v === "0" || v === "false") return false
    return true
  }
  readonly property bool useCalendarColors: {
    var v = setting("useCalendarColors", true)
    if (v === undefined || v === null) return true
    if (v === false || v === 0 || v === "0" || v === "false") return false
    return true
  }
  readonly property bool colorOnBar: {
    var v = setting("colorOnBar", false)
    if (v === undefined || v === null) return false
    if (v === true || v === 1 || v === "1" || v === "true") return true
    if (v === false || v === 0 || v === "0" || v === "false") return false
    return false
  }
  readonly property string browserCommand: String(setting("browserCommand", "") || "").trim()
  // Base for "Open in Calendar". Defaults to the signed-in account; set to
  // e.g. "https://calendar.google.com/calendar/u/2" to open a specific
  // account (matches the u/N in your browser's calendar URL).
  readonly property string calendarUrlBase: String(setting("calendarUrlBase", "https://calendar.google.com/calendar") || "").trim()
  // Single-key panel shortcuts (text keys while the panel is focused).
  // Arrows and j/k/h/l are reserved by the shell's key catcher for
  // navigation, so those letters would be dead config here.
  readonly property string keyRefresh: Model.normalizeKey(setting("keyRefresh", "r"), "r")
  readonly property string keyJoin: Model.normalizeKey(setting("keyJoin", "m"), "m")
  readonly property string keyCalendar: Model.normalizeKey(setting("keyCalendar", "o"), "o")

  // ---- internal limits
  readonly property int maxRawEvents: 80
  readonly property int maxMeetingRows: 8
  readonly property int maxScheduleRows: 20

  // ---- state
  property bool jsonLoaded: false
  readonly property bool configured: (icsFeeds.length > 0) || jsonLoaded || (rawEvents && rawEvents.length > 0)
  onSourceModeChanged: { jsonLoaded = false }
  property var rawEvents: []
  property var meetings: []
  property var upcomingToday: []
  property var scheduleGroups: []
  property var nextMeeting: null
  property date lastUpdated: new Date(0)
  property bool lastFetchFailed: false
  // Number of feeds that failed on the last fetch while *some* succeeded;
  // 0 means all known feeds responded. Used for a partial-offline status.
  property int offlineFeedCount: 0
  readonly property bool fetching: fetchProc.running || syncProc.running
  property date now: new Date()

  // Internal fetch-loop state (populated by fetchCalendar).
  property var pendingFeeds: []
  property var feedChunks: []
  property var failedFeeds: []
  property string currentFeedUrl: ""
  property string currentFeedLabel: ""
  property string feedOutput: ""

  readonly property string label: configured && nextMeeting
    ? (nextMeeting.meetUrl ? "  " : "󰃯  ") + Model.formatLabel(nextMeeting, root.now, maxTitleLength)
    : ""
  readonly property bool inMeeting: nextMeeting
    && !nextMeeting.allDay
    && nextMeeting.start && nextMeeting.end
    && root.now.getTime() >= nextMeeting.start.getTime()
    && root.now.getTime() < nextMeeting.end.getTime()

  // ---- actions
  function openMeetingUrl(url) {
    if (!url) return
    var quote = Util.shellQuote(url)
    if (browserCommand !== "") bar.run(browserCommand + " " + quote)
    else bar.run("xdg-open " + quote)
  }

  function joinMeeting(event) {
    if (event && event.meetUrl) openMeetingUrl(event.meetUrl)
  }

  function openCalendar(event) {
    var url = Model.eventCalendarUrl(event, root.calendarUrlBase)
    if (url) openMeetingUrl(url)
  }

  function openEvent(event) {
    if (!event) return
    if (event.meetUrl) openMeetingUrl(event.meetUrl)
    else openCalendar(event)
  }

  // The feed URL is a credential (e.g. Google's "secret address in iCal
  // format"), so it must never appear in a process argument list where every
  // local user can read it. curl gets each URL over stdin as a `-K -` config
  // line. Feeds are fetched one at a time so a single offline feed doesn't
  // take down the whole widget: the rest still render, and the failed count is
  // surfaced as a partial-offline status.
  function fetchCalendar() {
    if (root.sourceMode === "ics") {
      if (!root.configured || fetchProc.running) return
      root.pendingFeeds = root.icsFeeds.slice()
      root.feedChunks = []
      root.failedFeeds = []
      root.offlineFeedCount = 0
      if (root.pendingFeeds.length === 0) {
        root.lastFetchFailed = false
        root.meetingDataChanged()
        return
      }
      root.startNextFetch()
    } else {
      if (!syncProc.running) syncProc.running = true
    }
  }

  function startNextFetch() {
    if (root.pendingFeeds.length === 0) {
      root.finishFetch()
      return
    }
    var feed = root.pendingFeeds[0]
    root.currentFeedUrl = String(feed.url || "").trim()
    root.currentFeedLabel = feed.label ? String(feed.label).trim() : ""
    root.feedOutput = ""
    if (!root.currentFeedUrl) {
      root.pendingFeeds.shift()
      root.startNextFetch()
      return
    }
    fetchProc.stdinEnabled = true
    fetchProc.command = ["curl", "-fsSL", "--max-time", "15", "--max-filesize", String(root.maxFeedSizeMiB * 1024 * 1024), "-K", "-"]
    fetchProc.running = true
  }

  // Accumulate one parsed feed's events (tagged with its label) and continue.
  function onFeedStreamFinished(text) {
    root.feedOutput = String(text || "")
  }

  function onFeedExited(exitCode) {
    var raw = root.feedOutput.trim()
    if (exitCode === 0 && raw) {
      var events = Model.parseIcs(raw, {
        lookaheadDays: root.showDaysAhead + 1,
        maxEvents: 80,
        now: root.now
      })
      if (root.currentFeedLabel) {
        for (var i = 0; i < events.length; i++) events[i].feedLabel = root.currentFeedLabel
      }
      root.feedChunks.push(events)
    } else {
      root.failedFeeds.push(root.currentFeedUrl)
    }
    root.pendingFeeds.shift()
    root.feedOutput = ""
    root.startNextFetch()
  }

  function finishFetch() {
    root.offlineFeedCount = root.failedFeeds.length

    var all = []
    for (var c = 0; c < root.feedChunks.length; c++) {
      all = all.concat(root.feedChunks[c])
    }
    var events = Model.dedupeEvents(all)
    root.rawEvents = events

    if (events.length === 0 && root.offlineFeedCount > 0 && root.feedChunks.length === 0) {
      // Every feed failed: no data at all.
      root.lastFetchFailed = true
      root.meetingDataChanged()
      return
    }

    root.meetings = Model.buildUpcoming(events, root.now, {
      lookaheadDays: root.showDaysAhead,
      showOnlyWithVideoLink: root.showOnlyWithVideoLink,
      maxRows: root.maxMeetingRows
    })
    root.upcomingToday = Model.upcomingToday(events, root.now)
    root.scheduleGroups = Model.buildScheduleGroups(events, root.now, {
      lookaheadDays: root.showDaysAhead,
      maxRows: root.maxScheduleRows
    })
    root.nextMeeting = root.meetings.length > 0 ? root.meetings[0] : null
    root.lastUpdated = new Date()
    root.lastFetchFailed = false
    root.meetingDataChanged()
  }

  function onJsonData(raw) {
    var text = String(raw || "").trim()
    if (!text) return
    var parsed = Model.parseJsonState(text, {
      lookaheadDays: root.showDaysAhead + 1,
      now: root.now
    })
    root.jsonLoaded = true
    root.rawEvents = parsed.events
    root.meetings = Model.buildUpcoming(root.rawEvents, root.now, {
      lookaheadDays: root.showDaysAhead,
      showOnlyWithVideoLink: root.showOnlyWithVideoLink,
      maxRows: root.maxMeetingRows
    })
    root.upcomingToday = Model.upcomingToday(root.rawEvents, root.now)
    root.scheduleGroups = Model.buildScheduleGroups(root.rawEvents, root.now, {
      lookaheadDays: root.showDaysAhead,
      maxRows: root.maxScheduleRows
    })
    root.nextMeeting = root.meetings.length > 0 ? root.meetings[0] : null
    root.lastUpdated = parsed.syncedAt ? new Date(parsed.syncedAt) : new Date()
    root.lastFetchFailed = false
    root.meetingDataChanged()
  }


  function refresh() {
    fetchCalendar()
  }

  function recalc() {
    if (root.rawEvents && root.rawEvents.length > 0) {
      root.meetings = Model.buildUpcoming(root.rawEvents, root.now, {
        lookaheadDays: root.showDaysAhead,
        showOnlyWithVideoLink: root.showOnlyWithVideoLink,
        maxRows: root.maxMeetingRows
      })
      root.upcomingToday = Model.upcomingToday(root.rawEvents, root.now)
      root.scheduleGroups = Model.buildScheduleGroups(root.rawEvents, root.now, {
        lookaheadDays: root.showDaysAhead,
        maxRows: root.maxScheduleRows
      })
      root.nextMeeting = root.meetings.length > 0 ? root.meetings[0] : null
    } else {
      root.nextMeeting = root.meetings.length > 0 ? root.meetings[0] : null
    }
    root.meetingDataChanged()
  }

  signal meetingDataChanged()

  // ---- panel plumbing (shape contract for shell.summon/hide/toggle)
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function open() {
    if (panelLoader.item) panelLoader.item.open()
  }

  function close() {
    if (panelLoader.item) panelLoader.item.close()
  }

  function toggle() {
    if (panelLoader.item) panelLoader.item.toggle()
  }

  function closeForPopoutSwitch() {
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: {
    injectPanel()
    root.recalc()
    Qt.callLater(root.fetchCalendar)
  }
  onMeetingDataChanged: {
    if (panelLoader.item) panelLoader.item.reload()
  }

  // Refetch the calendar on a schedule.
  Timer {
    id: refreshTimer
    interval: root.refreshMinutes * 60 * 1000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.fetchCalendar()
  }

  // Keep the countdown fresh.
  Timer {
    id: nowTimer
    interval: 30 * 1000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: {
      root.now = new Date()
      root.recalc()
    }
  }

  FileView {
    id: jsonFileView
    path: root.sourceMode === "json" ? root.eventsJsonPath : ""
    watchChanges: true
    printErrors: false
    onLoaded: root.onJsonData(text())
    onLoadFailed: function(error) {
      console.warn("NextEvent: eventsJson load failed: " + error + " path=" + root.eventsJsonPath)
    }
    onFileChanged: reload()
  }

  Process {
    id: syncProc
    command: [Qt.resolvedUrl("sync/next-event-sync").toString().replace("file://", "")]
    onExited: function(exitCode) {
      if (exitCode !== 0) {
        console.warn("next-event-sync exited with code", exitCode)
      } else {
        jsonFileView.reload()
      }
    }
  }

  Component.onCompleted: {
    Qt.callLater(root.fetchCalendar)
  }

  Process {
    id: fetchProc
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.onFeedStreamFinished(text)
    }
    onStarted: {
      fetchProc.write("url = \"" + root.currentFeedUrl.replace(/([\\"])/g, "\\$1") + "\"\n")
      fetchProc.stdinEnabled = false
    }
    onExited: function(exitCode) {
      root.onFeedExited(exitCode)
    }
  }

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.label !== "" ? root.label : "󰃲"
    foreground: root.useCalendarColors && root.colorOnBar && root.nextMeeting && root.nextMeeting.calendarColor
      ? root.nextMeeting.calendarColor
      : (root.bar ? root.bar.barForeground : Color.foreground)
    labelVisible: true
    hasVisualContent: true
    dimmed: root.label === ""
    active: root.inMeeting
    useActiveColor: !(root.useCalendarColors && root.colorOnBar)
    horizontalMargin: 8.75
    verticalPadding: 8.75
    tooltipText: root.tooltipLine

    onPressed: function(b) {
      if (b === Qt.RightButton) {
        if (root.nextMeeting && root.nextMeeting.meetUrl) root.joinMeeting(root.nextMeeting)
        else root.toggle()
      } else if (b === Qt.MiddleButton) {
        root.refresh()
      } else {
        root.toggle()
      }
    }
  }

  readonly property string tooltipLine: {
    if (!root.configured) return "NextEvent — No calendar configured\nClick to set up"
    if (!root.nextMeeting) {
      if (root.lastFetchFailed) return "NextEvent — No upcoming events (offline)"
      if (root.offlineFeedCount > 0)
        return "NextEvent — No upcoming events · " + root.offlineFeedCount + " calendar" + (root.offlineFeedCount > 1 ? "s" : "") + " offline"
      return "NextEvent — No upcoming events"
    }
    var title = root.nextMeeting.title || "(Untitled)"
    var range = Model.timeRange(root.nextMeeting.start, root.nextMeeting.end, root.nextMeeting.allDay)
    var status = Model.relativeStatus(root.nextMeeting, root.now)
    var line = title + " · " + range + (status ? " (" + status + ")" : "")
    if (root.showCalendarLabel && root.nextMeeting.feedLabel) line = root.nextMeeting.feedLabel + " · " + line
    if (root.lastFetchFailed) line += " · Offline"
    else if (root.offlineFeedCount > 0) line += " · " + root.offlineFeedCount + " calendar" + (root.offlineFeedCount > 1 ? "s" : "") + " offline"
    return line
  }
}
