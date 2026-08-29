import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Ui
import "../Model.js" as Model

CursorSurface {
  id: root

  property var meeting: null
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property bool useCalendarColors: true

  signal clicked()
  signal hovered()

  width: parent ? parent.width : 0
  implicitHeight: Math.max(Style.space(32), rowLayout.implicitHeight + Style.space(8))
  foreground: root.contentForeground
  accent: Color.accent

  MouseArea {
    id: rowMouse
    anchors.fill: parent
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onEntered: root.hovered()
    onClicked: root.clicked()
  }

  RowLayout {
    id: rowLayout
    anchors.left: parent.left
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    anchors.leftMargin: Style.space(10)
    anchors.rightMargin: Style.space(10)
    spacing: Style.space(8)

    Item {
      id: indicatorContainer
      visible: root.useCalendarColors && !!(root.meeting && root.meeting.calendarColor)
      Layout.alignment: Qt.AlignVCenter
      implicitWidth: Style.space(6)
      implicitHeight: Style.space(16)

      Rectangle {
        id: colorDot
        anchors.centerIn: parent
        width: (root.meeting && root.meeting.allDay) ? Style.space(6) : Style.space(2.5)
        height: (root.meeting && root.meeting.allDay) ? Style.space(6) : Style.space(16)
        radius: width * 0.5
        color: (root.meeting && root.meeting.calendarColor) ? root.meeting.calendarColor : "transparent"
      }
    }

    Text {
      id: timeLabel
      Layout.alignment: Qt.AlignVCenter
      Layout.preferredWidth: Style.space(44)
      text: root.meeting ? (root.meeting.allDay ? Model.LABEL_ALL_DAY.toUpperCase() : Model.hm(root.meeting.start)) : ""
      color: Qt.darker(root.contentForeground, 1.3)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.bodySmall
      font.bold: true
    }

    Text {
      Layout.fillWidth: true
      Layout.alignment: Qt.AlignVCenter
      text: root.meeting ? (root.meeting.title || "(Untitled)") : ""
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
      text: root.meeting ? (root.meeting.allDay ? "" : Model.formatDuration(root.meeting.start, root.meeting.end)) : ""
      color: Qt.darker(root.contentForeground, 1.6)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.caption
    }

    Text {
      Layout.alignment: Qt.AlignVCenter
      Layout.preferredWidth: Style.space(16)
      horizontalAlignment: Text.AlignRight
      text: (root.meeting && root.meeting.meetUrl) ? Model.ICON_MEETING_VIDEO : Model.ICON_CALENDAR_EVENT
      color: (root.meeting && root.meeting.meetUrl) ? Color.accent : Qt.darker(root.contentForeground, 1.5)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.bodySmall
    }
  }
}
