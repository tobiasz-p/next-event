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
  readonly property string sourceMode: String(setting("sourceMode", icsFeeds.length > 0 ? Model.SOURCE_MODE_ICS : Model.SOURCE_MODE_JSON) || "").trim()
  readonly property int refreshMinutes: Math.max(1, parseInt(setting("refreshMinutes", Model.DEFAULT_REFRESH_MINUTES), 10) || Model.DEFAULT_REFRESH_MINUTES)
  readonly property int showDaysAhead: Math.max(1, parseInt(setting("showDaysAhead", Model.DEFAULT_LOOKAHEAD_DAYS), 10) || Model.DEFAULT_LOOKAHEAD_DAYS)
  readonly property int maxTitleLength: Math.max(Model.MIN_MAX_TITLE_LENGTH, parseInt(setting("maxTitleLength", Model.DEFAULT_MAX_TITLE_LENGTH), 10) || Model.DEFAULT_MAX_TITLE_LENGTH)
  readonly property string timeFormat: String(setting("timeFormat", Model.DEFAULT_TIME_FORMAT) || Model.DEFAULT_TIME_FORMAT).trim()
  readonly property bool use12Hour: Model.is12Hour(timeFormat)
  readonly property int maxFeedSizeMiB: Math.max(1, parseInt(setting("maxFeedSizeMiB", Model.DEFAULT_MAX_FEED_SIZE_MIB), 10) || Model.DEFAULT_MAX_FEED_SIZE_MIB)
  readonly property bool showOnlyWithVideoLink: Model.toBoolean(setting("showOnlyWithVideoLink", false), false)
  readonly property bool showCalendarLabel: Model.toBoolean(setting("showCalendarLabel", true), true)
  readonly property bool useCalendarColors: Model.toBoolean(setting("useCalendarColors", true), true)
  readonly property bool colorOnBar: Model.toBoolean(setting("colorOnBar", false), false)
  readonly property string browserCommand: String(setting("browserCommand", "") || "").trim()
  // Base for "Open in Calendar". Defaults to the signed-in account; set to
  // e.g. "https://calendar.google.com/calendar/u/2" to open a specific
  // account (matches the u/N in your browser's calendar URL).
  readonly property string calendarUrlBase: String(setting("calendarUrlBase", Model.DEFAULT_CALENDAR_URL_BASE) || "").trim()
  // Single-key panel shortcuts (text keys while the panel is focused).
  // Arrows and j/k/h/l are reserved by the shell's key catcher for
  // navigation, so those letters would be dead config here.
  readonly property string keyRefresh: Model.normalizeKey(setting("keyRefresh", Model.DEFAULT_KEY_REFRESH), Model.DEFAULT_KEY_REFRESH)
  readonly property string keySettings: Model.normalizeKey(setting("keySettings", Model.DEFAULT_KEY_SETTINGS), Model.DEFAULT_KEY_SETTINGS)
  readonly property string keyJoin: Model.normalizeKey(setting("keyJoin", Model.DEFAULT_KEY_JOIN), Model.DEFAULT_KEY_JOIN)
  readonly property string keyCalendar: Model.normalizeKey(setting("keyCalendar", Model.DEFAULT_KEY_CALENDAR), Model.DEFAULT_KEY_CALENDAR)

  // ---- internal limits
  readonly property int maxRawEvents: Model.DEFAULT_MAX_EVENTS
  readonly property int maxMeetingRows: Model.DEFAULT_MAX_MEETING_ROWS
  readonly property int maxScheduleRows: Model.DEFAULT_MAX_ROWS

  // ---- state
  property bool jsonLoaded: false
  readonly property bool configured: (sourceMode === Model.SOURCE_MODE_ICS ? icsFeeds.length > 0 : jsonLoaded) || (rawEvents && rawEvents.length > 0)
  onSourceModeChanged: {
    jsonLoaded = false
    fetchCalendar()
  }
  property var rawEvents: []
  property var meetings: []
  property var upcomingToday: []
  property var scheduleGroups: []
  property var calendarLegend: []
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
  property string currentFeedColor: ""
  property string feedOutput: ""

  readonly property string label: Model.barLabel(root.configured, root.nextMeeting, root.now, root.maxTitleLength, root.use12Hour)
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
    root.currentFeedColor = feed.color ? String(feed.color).trim() : ""
    root.feedOutput = ""
    if (!root.currentFeedUrl) {
      root.pendingFeeds.shift()
      root.startNextFetch()
      return
    }
    fetchProc.stdinEnabled = true
    fetchProc.command = ["curl", "-fsSL", "--max-time", String(Model.FETCH_TIMEOUT_SECONDS), "--max-filesize", String(root.maxFeedSizeMiB * Model.BYTES_PER_MIB), "-K", "-"]
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
        now: root.now,
        calendarColor: root.currentFeedColor,
        feedLabel: root.currentFeedLabel
      })
      for (var i = 0; i < events.length; i++) {
        if (root.currentFeedLabel) events[i].feedLabel = root.currentFeedLabel
        if (root.currentFeedColor) events[i].calendarColor = root.currentFeedColor
      }
      root.feedChunks.push(events)
    } else {
      root.failedFeeds.push(root.currentFeedUrl)
    }
    root.pendingFeeds.shift()
    root.feedOutput = ""
    root.startNextFetch()
  }

  function applyScheduleState(events, lastUpdatedDate) {
    root.rawEvents = events || []
    var state = Model.computeScheduleState(root.rawEvents, root.now, {
      lookaheadDays: root.showDaysAhead,
      showOnlyWithVideoLink: root.showOnlyWithVideoLink,
      maxMeetingRows: root.maxMeetingRows,
      maxScheduleRows: root.maxScheduleRows,
      feeds: root.icsFeeds
    })
    root.meetings = state.meetings
    root.upcomingToday = state.upcomingToday
    root.scheduleGroups = state.scheduleGroups
    root.nextMeeting = state.nextMeeting
    root.calendarLegend = state.calendarLegend || []
    if (lastUpdatedDate) root.lastUpdated = lastUpdatedDate
    root.meetingDataChanged()
  }

  function finishFetch() {
    root.offlineFeedCount = root.failedFeeds.length

    var allEvents = []
    for (var chunkIndex = 0; chunkIndex < root.feedChunks.length; chunkIndex++) {
      allEvents = allEvents.concat(root.feedChunks[chunkIndex])
    }
    var events = Model.dedupeEvents(allEvents)

    if (events.length === 0 && root.offlineFeedCount > 0 && root.feedChunks.length === 0) {
      // Every feed failed: no data at all.
      root.rawEvents = []
      root.lastFetchFailed = true
      root.meetingDataChanged()
      return
    }

    root.lastFetchFailed = false
    root.applyScheduleState(events, new Date())
  }

  function onJsonData(raw) {
    var text = String(raw || "").trim()
    if (!text) return
    var parsed = Model.parseJsonState(text, {
      lookaheadDays: root.showDaysAhead + 1,
      now: root.now
    })
    root.jsonLoaded = true
    root.lastFetchFailed = false
    root.applyScheduleState(parsed.events, parsed.syncedAt ? new Date(parsed.syncedAt) : new Date())
  }

  function refresh() {
    fetchCalendar()
  }

  function recalc() {
    root.applyScheduleState(root.rawEvents, null)
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
    text: root.label !== "" ? root.label : Model.ICON_CALENDAR_EMPTY
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

  readonly property string tooltipLine: Model.tooltipLine(root.configured, root.nextMeeting, root.now, {
    lastFetchFailed: root.lastFetchFailed,
    offlineFeedCount: root.offlineFeedCount,
    showCalendarLabel: root.showCalendarLabel,
    use12Hour: root.use12Hour
  })
}
