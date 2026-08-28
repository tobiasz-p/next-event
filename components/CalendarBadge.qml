import QtQuick
import qs.Commons
import qs.Ui

Rectangle {
  id: root

  property string label: ""
  property color calendarColor: Color.accent
  property bool hasCalendarColor: false
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property int maxBadgeWidth: Style.space(220)

  visible: label !== ""
  color: hasCalendarColor
    ? Qt.rgba(calendarColor.r, calendarColor.g, calendarColor.b, 0.22)
    : Qt.rgba(0.5, 0.5, 0.5, 0.18)
  radius: Style.cornerRadius * 0.5
  implicitWidth: Math.min(badgeText.implicitWidth + Style.space(10), maxBadgeWidth)
  implicitHeight: Style.space(16)

  Text {
    id: badgeText
    anchors.centerIn: parent
    width: Math.max(0, parent.width - Style.space(6))
    horizontalAlignment: Text.AlignHCenter
    elide: Text.ElideRight
    text: root.label
    color: root.hasCalendarColor
      ? root.calendarColor
      : Qt.darker(root.contentForeground, 1.25)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
  }
}
