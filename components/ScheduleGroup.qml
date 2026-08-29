import QtQuick
import qs.Commons
import qs.Ui

Item {
  id: root

  property var group: null
  property int groupIndex: 0
  property bool showSeparator: false
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property bool useCalendarColors: true
  property bool use12Hour: false
  property var cursorChecker: null
  property int cursorIndex: -1
  property bool cursorActive: false

  signal eventClicked(var meeting)
  signal eventHovered(int groupIndex, int rowIndex)

  function rowAt(rowIndex) {
    return eventRepeater.itemAt(rowIndex)
  }

  width: parent ? parent.width : 0
  height: groupColumn.implicitHeight
  implicitHeight: height

  Column {
    id: groupColumn
    width: parent.width
    spacing: Style.space(4)

    PanelSeparator {
      visible: root.showSeparator
      foreground: root.contentForeground
      strength: Tokens.separatorGroup
    }

    PanelSectionHeader {
      text: root.group ? root.group.title : ""
      foreground: root.contentForeground
      fontFamily: root.contentFontFamily
      leftPadding: Style.space(4)
    }

    Repeater {
      id: eventRepeater
      model: root.group ? root.group.items : []

      ScheduleRow {
        required property int index
        required property var modelData

        meeting: modelData
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        useCalendarColors: root.useCalendarColors
        use12Hour: root.use12Hour
        hasCursor: (root.cursorActive && root.cursorChecker)
          ? root.cursorChecker("event", root.groupIndex, index)
          : false

        onHovered: root.eventHovered(root.groupIndex, index)
        onClicked: root.eventClicked(meeting)
      }
    }
  }
}
