import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  width: parent ? parent.width : 0
  height: visible ? emptyColumn.implicitHeight + Style.space(16) : 0
  implicitHeight: height

  Column {
    id: emptyColumn
    anchors.centerIn: parent
    spacing: Style.space(4)

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: Model.ICON_CALENDAR_EMPTY
      color: Qt.darker(root.contentForeground, 1.6)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.display
    }

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: Model.LABEL_NO_MEETINGS
      color: Qt.darker(root.contentForeground, 1.3)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.body
      font.bold: true
    }

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: Model.LABEL_SCHEDULE_CLEAR
      color: Qt.darker(root.contentForeground, 1.6)
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.caption
    }
  }
}
