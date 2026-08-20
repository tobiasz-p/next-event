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
  }

  function join(event) {
    if (root.hostWidget && event) root.hostWidget.openEvent(event)
  }

  function openInCalendar(event) {
    if (root.hostWidget && event) root.hostWidget.openCalendar(event)
  }

  function refreshNow() {
    if (root.hostWidget) root.hostWidget.refresh()
  }

  onHostWidgetChanged: Qt.callLater(root.reload)

  onOpenedChanged: if (opened) root.reload()

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
                if (root.hostWidget && root.hostWidget.configured)
                  return Model.formatUpdated(root.hostWidget.lastUpdated, root.now)
                return ""
              }
              color: root.lastFetchFailed ? Color.urgent : Qt.darker(root.contentForeground, 1.5)
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

                  Text {
                    visible: !!root.next
                    text: {
                      var parts = []
                      var dur = root.next ? Model.formatDuration(root.next.start, root.next.end) : ""
                      if (dur) parts.push(dur)
                      if (root.next) parts.push(root.next.meetUrl ? "  Meet" : "󰃯  Event")
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
                    ? Model.meetingTimeLabel(root.next.start, root.next.end, root.now)
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

                      Rectangle {
                        id: eventRow
                        required property var modelData
                        readonly property var meeting: modelData

                        width: parent.width
                        radius: Style.cornerRadius
                        color: rowMouse.containsMouse
                          ? Style.hoverFillFor(root.contentForeground, Color.accent)
                          : "transparent"
                        implicitHeight: Math.max(Style.space(32), rowLayout.implicitHeight + Style.space(8))

                        MouseArea {
                          id: rowMouse
                          anchors.fill: parent
                          hoverEnabled: true
                          cursorShape: Qt.PointingHandCursor
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

                          Text {
                            Layout.alignment: Qt.AlignVCenter
                            Layout.preferredWidth: Style.space(44)
                            text: Model.hm(meeting.start)
                            color: Qt.darker(root.contentForeground, 1.3)
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.bodySmall
                            font.bold: true
                          }

                          Text {
                            Layout.fillWidth: true
                            Layout.alignment: Qt.AlignVCenter
                            text: meeting.title || "(Untitled)"
                            color: root.contentForeground
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.body
                            elide: Text.ElideRight
                            maximumLineCount: 1
                          }

                          Text {
                            Layout.alignment: Qt.AlignVCenter
                            Layout.preferredWidth: Style.space(34)
                            horizontalAlignment: Text.AlignRight
                            text: Model.formatDuration(meeting.start, meeting.end)
                            color: Qt.darker(root.contentForeground, 1.6)
                            font.family: root.contentFontFamily
                            font.pixelSize: Style.font.caption
                          }

                          Text {
                            Layout.alignment: Qt.AlignVCenter
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
