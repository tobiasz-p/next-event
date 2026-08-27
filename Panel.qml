import QtQuick
import QtQuick.Layouts
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// NextEvent details popup: the next meeting up top with a Join button,
// then the upcoming multi-day list. Also hosts setup instructions when unconfigured.
Panel {
  id: root
  moduleName: "tobiasz-p.next-event"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  readonly property bool inMeeting: hostWidget ? hostWidget.inMeeting : false
  readonly property bool fetching: hostWidget ? hostWidget.fetching : false
  readonly property bool lastFetchFailed: hostWidget ? hostWidget.lastFetchFailed : false
  readonly property int offlineFeedCount: hostWidget ? hostWidget.offlineFeedCount : 0
  readonly property bool showCalendarLabel: hostWidget ? hostWidget.showCalendarLabel : true
  readonly property bool useCalendarColors: hostWidget ? hostWidget.useCalendarColors : true

  property var scheduleGroups: []
  property var next: null
  property date now: hostWidget ? hostWidget.now : new Date()

  readonly property color contentForeground: bar ? bar.barForeground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  function open() {
    reload()
    root.controller.show()
  }

  function close() {
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.open()
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function reload() {
    if (!root.hostWidget) return
    root.scheduleGroups = root.hostWidget.scheduleGroups || []
    root.next = root.hostWidget.nextMeeting || null

    var configured = !!root.hostWidget.configured
    setupItem.visible = !configured
    heroItem.visible = configured && !!root.next
    emptyItem.visible = configured && root.scheduleGroups.length === 0
    scheduleItem.visible = configured && root.scheduleGroups.length > 0
    root.rebuildActionItems()
  }

  // Join / open-in-calendar hand off to the browser, so dismiss the panel
  // first — regardless of whether the trigger was a click, Enter, or the
  // m/o shortcut keys.
  function join(event) {
    root.close()
    if (root.hostWidget && event) root.hostWidget.openEvent(event)
  }

  function openInCalendar(event) {
    root.close()
    if (root.hostWidget && event) root.hostWidget.openCalendar(event)
  }

  function refreshNow() {
    if (root.hostWidget) root.hostWidget.refresh()
  }

  // ---- keyboard navigation ----
  // Flat cursor over actionable rows in visual order: refresh, hero
  // actions, then schedule rows. Fed by PanelKeyCatcher signals; keys
  // only reach this panel while it holds Wayland keyboard focus, so
  // nothing here shadows compositor-level omarchy bindings.
  property var actionItems: []
  property int cursorIndex: -1
  property bool cursorActive: false

  function rebuildActionItems() {
    var items = [{ kind: "refresh" }]
    if (heroItem.visible && root.next && root.next.meetUrl) items.push({ kind: "join" })
    if (heroItem.visible) items.push({ kind: "calendar" })
    for (var g = 0; g < root.scheduleGroups.length; g++) {
      var rows = root.scheduleGroups[g].items || []
      for (var r = 0; r < rows.length; r++) items.push({ kind: "event", groupIndex: g, rowIndex: r })
    }
    root.actionItems = items
    if (root.cursorIndex >= items.length) root.cursorIndex = items.length - 1
  }

  function moveCursor(delta) {
    if (root.actionItems.length === 0) return
    if (!root.cursorActive) {
      root.cursorActive = true
      root.cursorIndex = delta > 0 ? 0 : root.actionItems.length - 1
    } else {
      root.cursorIndex = Math.max(0, Math.min(root.actionItems.length - 1, root.cursorIndex + delta))
    }
    root.ensureCursorVisible()
  }

  function activateCursor() {
    if (!root.cursorActive || root.cursorIndex < 0 || root.cursorIndex >= root.actionItems.length) return
    var it = root.actionItems[root.cursorIndex]
    if (it.kind === "refresh") root.refreshNow()
    else if (it.kind === "join") root.join(root.next)
    else if (it.kind === "calendar") root.openInCalendar(root.next)
    else if (it.kind === "event") {
      var group = root.scheduleGroups[it.groupIndex]
      if (group) root.join(group.items[it.rowIndex])
    }
  }

  function cursorOn(kind, groupIndex, rowIndex) {
    if (!root.cursorActive || root.cursorIndex < 0 || root.cursorIndex >= root.actionItems.length) return false
    var it = root.actionItems[root.cursorIndex]
    if (it.kind !== kind) return false
    return groupIndex === undefined || (it.groupIndex === groupIndex && it.rowIndex === rowIndex)
  }

  // Mouse hover joins the same single-cursor model: hovering an actionable
  // item moves the cursor onto it, so exactly one highlight shows at a time.
  function pointCursorAt(kind, groupIndex, rowIndex) {
    for (var i = 0; i < root.actionItems.length; i++) {
      var it = root.actionItems[i]
      if (it.kind !== kind) continue
      if (groupIndex === undefined || (it.groupIndex === groupIndex && it.rowIndex === rowIndex)) {
        root.cursorActive = true
        root.cursorIndex = i
        return
      }
    }
  }

  function ensureCursorVisible() {
    if (!root.cursorActive || root.cursorIndex < 0 || root.cursorIndex >= root.actionItems.length) return
    var it = root.actionItems[root.cursorIndex]
    var target = null
    if (it.kind === "refresh") target = refreshBtn
    else if (it.kind === "join") target = joinBtn
    else if (it.kind === "calendar") target = openCalendarBtn
    else {
      var group = groupRepeater.itemAt(it.groupIndex)
      target = group ? group.rowAt(it.rowIndex) : null
    }
    if (!target) return
    var top = target.mapToItem(contentColumn, 0, 0).y
    var bottom = top + target.height
    if (top < scroll.contentY) scroll.contentY = Math.max(0, top)
    else if (bottom > scroll.contentY + scroll.height) scroll.contentY = bottom - scroll.height
  }

  onHostWidgetChanged: Qt.callLater(root.reload)

  onOpenedChanged: {
    if (opened) root.reload()
    else root.cursorActive = false
  }

  Connections {
    target: root.hostWidget
    function onMeetingDataChanged() { root.reload() }
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(360))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) { if (dy !== 0) root.moveCursor(dy) }
      onActivateRequested: root.activateCursor()
      onTextKey: function(t) {
        if (!root.hostWidget) return
        if (t === root.hostWidget.keyRefresh) root.refreshNow()
        else if (t === root.hostWidget.keyJoin && root.next && root.next.meetUrl) root.join(root.next)
        else if (t === root.hostWidget.keyCalendar && root.next) root.openInCalendar(root.next)
      }

      Flickable {
        id: scroll
        anchors.fill: parent
        contentWidth: scroll.width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height

        Column {
          id: contentColumn
          width: scroll.width
          spacing: Style.space(12)

          // ---- header: title, sync status, refresh
          Item {
            id: headerRow
            width: parent.width
            height: Math.max(headingLabel.height, stampLabel.height, refreshBtn.height)
            implicitHeight: height

            Text {
              id: headingLabel
              anchors.left: parent.left
              anchors.verticalCenter: parent.verticalCenter
              text: "EVENTS"
              color: Qt.darker(root.contentForeground, 1.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              font.letterSpacing: 1.2
              font.bold: true
            }

            Text {
              id: stampLabel
              anchors.right: refreshBtn.left
              anchors.rightMargin: Style.space(8)
              anchors.verticalCenter: parent.verticalCenter
              text: {
                if (root.fetching) return "Updating…"
                if (root.lastFetchFailed) return "Offline · Cached"
                if (root.offlineFeedCount > 0)
                  return root.offlineFeedCount + " calendar" + (root.offlineFeedCount > 1 ? "s" : "") + " offline · updated"
                if (root.hostWidget && root.hostWidget.configured)
                  return Model.formatUpdated(root.hostWidget.lastUpdated, root.now)
                return ""
              }
              color: (root.lastFetchFailed || root.offlineFeedCount > 0) ? Color.urgent : Qt.darker(root.contentForeground, 1.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
            }

            PanelActionButton {
              id: refreshBtn
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              iconText: ""
              tooltipText: root.fetching ? "Updating calendar…" : "Refresh calendar"
              foreground: root.contentForeground
              fontFamily: root.contentFontFamily
              enabled: !root.fetching
              opacity: root.fetching ? 0.6 : 1.0
              hasCursor: root.cursorOn("refresh")
              onHovered: function(isHovered) { if (isHovered) root.pointCursorAt("refresh") }
              onClicked: root.refreshNow()
            }
          }

          // ---- unconfigured: setup instructions
          Item {
            id: setupItem
            visible: false
            width: parent.width
            height: visible ? setupColumn.implicitHeight : 0
            implicitHeight: height

            Column {
              id: setupColumn
              width: parent.width
              spacing: Style.space(12)

              Column {
                width: parent.width
                spacing: Style.space(4)

                Text {
                  width: parent.width
                  text: "Connect Your Calendar"
                  color: root.contentForeground
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.subtitle
                  font.bold: true
                  wrapMode: Text.WordWrap
                }

                Text {
                  width: parent.width
                  text: "Choose the method that matches your calendar provider:"
                  color: Qt.darker(root.contentForeground, 1.35)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.bodySmall
                  wrapMode: Text.WordWrap
                }
              }

              // Option 1: Google Workspace / OAuth
              Column {
                width: parent.width
                spacing: Style.space(6)

                Text {
                  width: parent.width
                  text: "Option 1: Google Workspace / OAuth (Work accounts)"
                  color: Color.accent
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.body
                  font.bold: true
                  wrapMode: Text.WordWrap
                }

                Text {
                  width: parent.width
                  text: "If your organization disables private iCal URLs, run the interactive OAuth setup:"
                  color: Qt.darker(root.contentForeground, 1.35)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.caption
                  wrapMode: Text.WordWrap
                }

                BorderSurface {
                  width: parent.width
                  radius: Style.cornerRadius
                  color: Style.normalFillFor(root.contentForeground, Color.accent)
                  borderSpec: Border.controlSpec("normal", root.contentForeground, Color.accent)
                  implicitHeight: oauthCol.implicitHeight + Style.space(12)

                  Column {
                    id: oauthCol
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.verticalCenter: parent.verticalCenter
                    anchors.margins: Style.space(8)

                    Text {
                      width: parent.width
                      text: "~/.config/omarchy/plugins/tobiasz-p.next-event/sync/setup"
                      font.family: "monospace"
                      font.pixelSize: Style.font.caption
                      color: root.contentForeground
                      wrapMode: Text.WrapAnywhere
                    }
                  }
                }
              }

              // Option 2: iCal URL
              Column {
                width: parent.width
                spacing: Style.space(6)

                Text {
                  width: parent.width
                  text: "Option 2: Private iCal (.ics) Feed URL"
                  color: root.contentForeground
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.body
                  font.bold: true
                  wrapMode: Text.WordWrap
                }

                Text {
                  width: parent.width
                  text: "For personal Google Calendar, Outlook, iCloud, or Nextcloud:"
                  color: Qt.darker(root.contentForeground, 1.35)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.caption
                  wrapMode: Text.WordWrap
                }

                BorderSurface {
                  width: parent.width
                  radius: Style.cornerRadius
                  color: Style.normalFillFor(root.contentForeground, Color.accent)
                  borderSpec: Border.controlSpec("normal", root.contentForeground, Color.accent)
                  implicitHeight: icsCol.implicitHeight + Style.space(12)

                  Column {
                    id: icsCol
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.verticalCenter: parent.verticalCenter
                    anchors.margins: Style.space(8)

                    Text {
                      width: parent.width
                      text: "omarchy bar set tobiasz-p.next-event icsUrl '<iCal-url>'"
                      font.family: "monospace"
                      font.pixelSize: Style.font.caption
                      color: root.contentForeground
                      wrapMode: Text.WrapAnywhere
                    }
                  }
                }
              }
            }
          }

          // ---- next meeting hero
          Item {
            id: heroItem
            visible: false
            width: parent.width
            height: visible ? heroBlock.implicitHeight : 0
            implicitHeight: height

            BorderSurface {
              id: heroBlock
              width: parent.width
              radius: Style.cornerRadius
              color: root.inMeeting
                ? Style.selectedFillFor(root.contentForeground, Color.accent)
                : Style.normalFillFor(root.contentForeground, Color.accent)
              borderSpec: root.inMeeting
                ? Border.controlSpec("selected", root.contentForeground, Color.accent)
                : Border.none()
              implicitHeight: heroCol.implicitHeight + Style.space(20)

              Rectangle {
                id: heroColorStripe
                visible: root.useCalendarColors && !!(root.next && root.next.calendarColor)
                anchors.left: parent.left
                anchors.top: parent.top
                anchors.bottom: parent.bottom
                anchors.margins: Style.space(2)
                width: Style.space(3.5)
                radius: Style.cornerRadius * 0.5
                color: (root.next && root.next.calendarColor) ? root.next.calendarColor : Color.accent
              }

              Column {
                id: heroCol
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                anchors.leftMargin: Style.space(12)
                anchors.rightMargin: Style.space(12)
                spacing: Style.space(5)

                RowLayout {
                  width: parent.width

                  Text {
                    text: root.inMeeting ? "HAPPENING NOW" : "NEXT"
                    color: root.inMeeting ? Color.accent : Qt.darker(root.contentForeground, 1.5)
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                    font.letterSpacing: 1.2
                    font.bold: true
                  }

                  Item { Layout.fillWidth: true }

                  Rectangle {
                    id: heroTagPill
                    visible: root.showCalendarLabel && !!(root.next && (root.next.feedLabel || (root.useCalendarColors && root.next.calendarName)))
                    Layout.alignment: Qt.AlignVCenter
                    readonly property color calColor: (root.next && root.next.calendarColor) ? root.next.calendarColor : Color.accent
                    color: (root.useCalendarColors && root.next && root.next.calendarColor)
                      ? Qt.rgba(calColor.r, calColor.g, calColor.b, 0.22)
                      : Qt.rgba(0.5, 0.5, 0.5, 0.18)
                    radius: Style.cornerRadius * 0.5
                    implicitWidth: heroTagText.implicitWidth + Style.space(10)
                    implicitHeight: Style.space(16)

                    Text {
                      id: heroTagText
                      anchors.centerIn: parent
                      color: (root.useCalendarColors && root.next && root.next.calendarColor)
                        ? root.next.calendarColor
                        : (root.inMeeting ? Color.accent : Qt.darker(root.contentForeground, 1.3))
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.caption
                      text: root.next ? (root.next.feedLabel || root.next.calendarName || "") : ""
                    }
                  }

                  Text {
                    visible: !!root.next
                    text: {
                      var parts = []
                      var dur = root.next ? (root.next.allDay ? Model.LABEL_ALL_DAY : Model.formatDuration(root.next.start, root.next.end)) : ""
                      if (dur) parts.push(dur)
                      if (root.next) parts.push(root.next.meetUrl ? "  " + Model.meetLabel(root.next.meetUrl) : "󰃯  Event")
                      return parts.join("  ·  ")
                    }
                    color: root.inMeeting ? Color.accent : Qt.darker(root.contentForeground, 1.4)
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                  }
                }

                Text {
                  width: parent.width
                  text: root.next ? String(root.next.title || "(Untitled)") : ""
                  color: root.contentForeground
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.title
                  font.bold: true
                  wrapMode: Text.WordWrap
                }

                Text {
                  width: parent.width
                  text: root.next
                    ? Model.meetingTimeLabel(root.next.start, root.next.end, root.now, root.next.allDay)
                      + (Model.relativeStatus(root.next, root.now) ? " · " + Model.relativeStatus(root.next, root.now) : "")
                    : ""
                  color: Qt.darker(root.contentForeground, 1.35)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.bodySmall
                  wrapMode: Text.WordWrap
                }

                RowLayout {
                  width: parent.width
                  spacing: Style.space(8)

                  Button {
                    id: joinBtn
                    visible: !!(root.next && root.next.meetUrl)
                    Layout.fillWidth: true
                    text: "Join Meeting"
                    iconText: ""
                    selected: true
                    accent: Color.accent
                    fontFamily: root.contentFontFamily
                    fontSize: Style.font.bodySmall
                    iconSize: Style.font.bodySmall
                    horizontalPadding: Style.space(12)
                    verticalPadding: Style.space(7)
                    hasCursor: root.cursorOn("join")
                    onHovered: function(isHovered) { if (isHovered) root.pointCursorAt("join") }
                    onClicked: root.join(root.next)
                  }

                  Button {
                    id: openCalendarBtn
                    visible: !!root.next
                    Layout.fillWidth: true
                    text: "Open in Calendar"
                    iconText: "󰃯"
                    bordered: true
                    foreground: root.contentForeground
                    fontFamily: root.contentFontFamily
                    fontSize: Style.font.bodySmall
                    iconSize: Style.font.bodySmall
                    horizontalPadding: Style.space(12)
                    verticalPadding: Style.space(7)
                    hasCursor: root.cursorOn("calendar")
                    onHovered: function(isHovered) { if (isHovered) root.pointCursorAt("calendar") }
                    onClicked: root.openInCalendar(root.next)
                  }
                }
              }
            }
          }

          // ---- empty state
          Item {
            id: emptyItem
            visible: false
            width: parent.width
            height: visible ? emptyColumn.implicitHeight + Style.space(16) : 0
            implicitHeight: height

            Column {
              id: emptyColumn
              anchors.centerIn: parent
              spacing: Style.space(4)

              Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: "󰃲"
                color: Qt.darker(root.contentForeground, 1.6)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.display
              }

              Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: "No upcoming meetings"
                color: Qt.darker(root.contentForeground, 1.3)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.body
                font.bold: true
              }

              Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: "Your schedule is clear for the next few days."
                color: Qt.darker(root.contentForeground, 1.6)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
              }
            }
          }

          // ---- multi-day schedule list
          Item {
            id: scheduleItem
            visible: false
            width: parent.width
            height: visible ? scheduleColumn.implicitHeight : 0
            implicitHeight: height

            Column {
              id: scheduleColumn
              width: parent.width
              spacing: Style.space(10)

              Repeater {
                id: groupRepeater
                model: root.scheduleGroups

                Item {
                  id: groupItem
                  required property var modelData
                  required property int index
                  readonly property var group: modelData

                  function rowAt(rowIndex) { return eventRepeater.itemAt(rowIndex) }

                  width: parent.width
                  height: groupColumn.implicitHeight
                  implicitHeight: height

                  Column {
                    id: groupColumn
                    width: parent.width
                    spacing: Style.space(4)

                    PanelSeparator {
                      visible: groupItem.index > 0 || heroItem.visible
                      foreground: root.contentForeground
                      strength: 0.1
                    }

                    PanelSectionHeader {
                      text: groupItem.group.title
                      foreground: root.contentForeground
                      fontFamily: root.contentFontFamily
                      leftPadding: Style.space(4)
                    }

                    Repeater {
                      id: eventRepeater
                      model: groupItem.group.items

                      CursorSurface {
                        id: eventRow
                        required property int index
                        required property var modelData
                        readonly property var meeting: modelData

                        width: parent.width
                        implicitHeight: Math.max(Style.space(32), rowLayout.implicitHeight + Style.space(8))
                        hasCursor: root.cursorOn("event", groupItem.index, index)
                        foreground: root.contentForeground
                        accent: Color.accent

                        MouseArea {
                          id: rowMouse
                          anchors.fill: parent
                          hoverEnabled: true
                          cursorShape: Qt.PointingHandCursor
                          onEntered: root.pointCursorAt("event", groupItem.index, index)
                          onClicked: root.join(meeting)
                        }

                        RowLayout {
                          id: rowLayout
                          anchors.left: parent.left
                          anchors.right: parent.right
                          anchors.verticalCenter: parent.verticalCenter
                          anchors.leftMargin: Style.space(10)
                          anchors.rightMargin: Style.space(10)
                          spacing: Style.space(8)

                          Rectangle {
                            id: colorDot
                            visible: root.useCalendarColors && !!meeting.calendarColor
                            Layout.alignment: tagPill.visible ? Qt.AlignTop : Qt.AlignVCenter
                            Layout.topMargin: tagPill.visible ? Style.space(4) : 0
                            implicitWidth: Style.space(6)
                            implicitHeight: Style.space(6)
                            radius: width * 0.5
                            color: meeting.calendarColor || "transparent"
                          }

                          Text {
                            Layout.alignment: tagPill.visible ? Qt.AlignTop : Qt.AlignVCenter
                            Layout.topMargin: tagPill.visible ? Style.space(1) : 0
                            Layout.preferredWidth: Style.space(44)
                            text: meeting.allDay ? Model.LABEL_ALL_DAY : Model.hm(meeting.start)
                            color: Qt.darker(root.contentForeground, 1.3)
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.bodySmall
                            font.bold: true
                          }

                          ColumnLayout {
                            Layout.fillWidth: true
                            Layout.alignment: Qt.AlignVCenter
                            spacing: Style.space(2)

                            Rectangle {
                              id: tagPill
                              visible: root.showCalendarLabel && !!meeting.feedLabel
                              readonly property color pillCalColor: meeting.calendarColor || Color.accent
                              color: (root.useCalendarColors && meeting.calendarColor)
                                ? Qt.rgba(pillCalColor.r, pillCalColor.g, pillCalColor.b, 0.22)
                                : Qt.rgba(0.5, 0.5, 0.5, 0.18)
                              radius: Style.cornerRadius * 0.5
                              implicitWidth: Math.min(tagText.implicitWidth + Style.space(10), Style.space(220))
                              implicitHeight: Style.space(15)

                              Text {
                                id: tagText
                                anchors.centerIn: parent
                                width: parent.width - Style.space(6)
                                horizontalAlignment: Text.AlignHCenter
                                elide: Text.ElideRight
                                text: meeting.feedLabel || ""
                                color: (root.useCalendarColors && meeting.calendarColor)
                                  ? meeting.calendarColor
                                  : Qt.darker(root.contentForeground, 1.25)
                                font.family: root.contentFontFamily
                                font.pixelSize: Style.font.caption
                              }
                            }

                            Text {
                              Layout.fillWidth: true
                              text: meeting.title || "(Untitled)"
                              color: root.contentForeground
                              font.family: root.contentFontFamily
                              font.pixelSize: Style.font.body
                              elide: Text.ElideRight
                              maximumLineCount: 1
                            }
                          }

                          Text {
                            Layout.alignment: tagPill.visible ? Qt.AlignTop : Qt.AlignVCenter
                            Layout.topMargin: tagPill.visible ? Style.space(1) : 0
                            Layout.preferredWidth: Style.space(34)
                            horizontalAlignment: Text.AlignRight
                            text: meeting.allDay ? "" : Model.formatDuration(meeting.start, meeting.end)
                            color: Qt.darker(root.contentForeground, 1.6)
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.caption
                          }

                          Text {
                            Layout.alignment: tagPill.visible ? Qt.AlignTop : Qt.AlignVCenter
                            Layout.topMargin: tagPill.visible ? Style.space(1) : 0
                            Layout.preferredWidth: Style.space(16)
                            horizontalAlignment: Text.AlignRight
                            text: meeting.meetUrl ? "" : "󰃯"
                            color: meeting.meetUrl ? Color.accent : Qt.darker(root.contentForeground, 1.5)
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.bodySmall
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
