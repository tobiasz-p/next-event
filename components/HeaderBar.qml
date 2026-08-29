import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property string statusText: ""
  property bool isError: false
  property bool fetching: false
  property bool cursorOnRefresh: false

  signal refreshRequested()
  signal refreshHovered(bool isHovered)

  property alias refreshBtn: refreshButton

  width: parent ? parent.width : 0
  height: Math.max(headingLabel.height, stampLabel.height, refreshButton.height)
  implicitHeight: height

  Text {
    id: headingLabel
    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    text: Model.SECTION_EVENTS
    color: Qt.darker(root.contentForeground, Tokens.dimMuted)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
    font.letterSpacing: Tokens.sectionLetterSpacing
    font.bold: true
  }

  Text {
    id: stampLabel
    anchors.right: refreshButton.left
    anchors.rightMargin: Style.space(8)
    anchors.verticalCenter: parent.verticalCenter
    text: root.statusText
    color: root.isError ? Color.urgent : Qt.darker(root.contentForeground, Tokens.dimMuted)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
  }

  PanelActionButton {
    id: refreshButton
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    iconText: Model.ICON_REFRESH
    tooltipText: root.fetching ? Model.TOOLTIP_UPDATING : Model.TOOLTIP_REFRESH
    foreground: root.contentForeground
    fontFamily: root.contentFontFamily
    enabled: !root.fetching
    opacity: root.fetching ? Tokens.fetchingOpacity : 1.0
    hasCursor: root.cursorOnRefresh
    onHovered: function(isHovered) { root.refreshHovered(isHovered) }
    onClicked: root.refreshRequested()
  }
}
