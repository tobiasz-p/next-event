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
  readonly property string icsUrl: String(setting("icsUrl", "") || "").trim()
  readonly property int refreshMinutes: Math.max(1, parseInt(setting("refreshMinutes", 5), 10) || 5)
  readonly property int showDaysAhead: Math.max(1, parseInt(setting("showDaysAhead", 3), 10) || 3)
  readonly property int maxTitleLength: Math.max(8, parseInt(setting("maxTitleLength", 28), 10) || 28)
  readonly property bool showOnlyWithVideoLink: {
    var v = setting("showOnlyWithVideoLink", true)
    if (v === undefined || v === null) return true
    if (v === true || v === 1 || v === "1") return true
    if (v === false || v === 0 || v === "0") return false
    return String(v).toLowerCase() !== "false"
  }
  readonly property string browserCommand: String(setting("browserCommand", "") || "").trim()
  // Base for "Open in Calendar". Defaults to the signed-in account; set to
  // e.g. "https://calendar.google.com/calendar/u/2" to open a specific
  // account (matches the u/N in your browser's calendar URL).
  readonly property string calendarUrlBase: String(setting("calendarUrlBase", "https://calendar.google.com/calendar") || "").trim()

  // ---- state
  readonly property bool configured: icsUrl !== ""
  property var rawEvents: []
  property var meetings: []
  property var upcomingToday: []
  property var scheduleGroups: []
  property var nextMeeting: null
  property date lastUpdated: new Date(0)
  property bool lastFetchFailed: false
  readonly property bool fetching: fetchProc.running
  property date now: new Date()

  readonly property string label: configured && nextMeeting
    ? (nextMeeting.meetUrl ? "  " : "󰃯  ") + Model.formatLabel(nextMeeting, root.now, maxTitleLength)
    : ""
  readonly property bool inMeeting: nextMeeting
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
  // local user can read it. curl gets it over stdin as a `-K -` config line.
  function fetchCalendar() {
    if (!root.configured || fetchProc.running) return
    fetchProc.stdinEnabled = true
    fetchProc.command = ["curl", "-fsSL", "--max-time", "15", "-K", "-"]
    fetchProc.running = true
  }

  function refresh() {
    fetchCalendar()
  }

  function onCalendarData(raw) {
    var text = String(raw || "").trim()
    if (!text) {
      root.lastFetchFailed = true
      root.meetingDataChanged()
      return
    }
    var events = Model.parseIcs(text, {
      lookaheadDays: root.showDaysAhead + 1,
      maxEvents: 80,
      now: root.now
    })
    root.rawEvents = events
    root.meetings = Model.buildUpcoming(events, root.now, {
      lookaheadDays: root.showDaysAhead,
      showOnlyWithVideoLink: root.showOnlyWithVideoLink,
      maxRows: 8
    })
    root.upcomingToday = Model.upcomingToday(events, root.now)
    root.scheduleGroups = Model.buildScheduleGroups(events, root.now, {
      lookaheadDays: root.showDaysAhead,
      maxRows: 20
    })
    root.nextMeeting = root.meetings.length > 0 ? root.meetings[0] : null
    root.lastUpdated = new Date()
    root.lastFetchFailed = false
    root.meetingDataChanged()
  }

  function onCalendarError(exitCode) {
    root.lastFetchFailed = true
    root.meetingDataChanged()
  }

  function recalc() {
    if (root.rawEvents && root.rawEvents.length > 0) {
      root.meetings = Model.buildUpcoming(root.rawEvents, root.now, {
        lookaheadDays: root.showDaysAhead,
        showOnlyWithVideoLink: root.showOnlyWithVideoLink,
        maxRows: 8
      })
      root.upcomingToday = Model.upcomingToday(root.rawEvents, root.now)
      root.scheduleGroups = Model.buildScheduleGroups(root.rawEvents, root.now, {
        lookaheadDays: root.showDaysAhead,
        maxRows: 20
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

  Process {
    id: fetchProc
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root.onCalendarData(text)
    }
    onStarted: {
      fetchProc.write("url = \"" + root.icsUrl.replace(/([\\"])/g, "\\$1") + "\"\n")
      fetchProc.stdinEnabled = false
    }
    onExited: function(exitCode) {
      if (exitCode !== 0) root.onCalendarError(exitCode)
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
    labelVisible: true
    hasVisualContent: true
    dimmed: root.label === ""
    active: root.inMeeting
    useActiveColor: false
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
    if (!root.nextMeeting) return "NextEvent — No upcoming events" + (root.lastFetchFailed ? " (offline)" : "")
    var title = root.nextMeeting.title || "(Untitled)"
    var range = Model.timeRange(root.nextMeeting.start, root.nextMeeting.end)
    var status = Model.relativeStatus(root.nextMeeting, root.now)
    var line = title + " · " + range + (status ? " (" + status + ")" : "")
    if (root.lastFetchFailed) line += " · Offline"
    return line
  }
}
