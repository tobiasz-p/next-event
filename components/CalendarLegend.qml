import QtQuick
import qs.Commons
import qs.Ui

Item {
  id: root

  property var legend: []
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property bool useCalendarColors: true

  visible: legend && legend.length > 1
  width: parent ? parent.width : 0
  height: visible ? legendFlow.implicitHeight : 0
  implicitHeight: height

  Flow {
    id: legendFlow
    anchors.left: parent.left
    anchors.right: parent.right
    anchors.leftMargin: Style.space(10)
    anchors.rightMargin: Style.space(10)
    spacing: Style.space(12)

    Repeater {
      model: root.legend

      Row {
        required property var modelData
        spacing: Style.space(5)

        Rectangle {
          implicitWidth: Style.space(6)
          implicitHeight: Style.space(6)
          radius: width * 0.5
          color: (root.useCalendarColors && modelData.color) ? modelData.color : Qt.rgba(
            root.contentForeground.r,
            root.contentForeground.g,
            root.contentForeground.b,
            0.22
          )
        }

        Text {
          text: modelData.name || ""
          color: Qt.darker(root.contentForeground, 1.5)
          font.family: root.contentFontFamily
          font.pixelSize: Style.font.caption
          elide: Text.ElideRight
          maximumLineCount: 1
        }
      }
    }
  }
}
