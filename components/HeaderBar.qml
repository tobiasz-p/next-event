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
  property bool cursorOnSettings: false
  property bool inSettingsView: false

  signal refreshRequested()
  signal refreshHovered(bool isHovered)
  signal settingsRequested()
  signal settingsHovered(bool isHovered)

  property alias refreshBtn: refreshButton
  property alias settingsBtn: settingsButton

  width: parent ? parent.width : 0
  height: Math.max(headingLabel.height, stampLabel.height, buttonRow.height)
  implicitHeight: height

  Text {
    id: headingLabel
    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    textFormat: Text.PlainText
    text: root.inSettingsView ? Model.SECTION_SETTINGS : Model.SECTION_EVENTS
    color: Qt.darker(root.contentForeground, Tokens.dimMuted)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
    font.letterSpacing: Tokens.sectionLetterSpacing
    font.bold: true
  }

  Text {
    id: stampLabel
    anchors.right: buttonRow.left
    anchors.rightMargin: Style.space(8)
    anchors.verticalCenter: parent.verticalCenter
    textFormat: Text.PlainText
    text: root.inSettingsView ? "" : root.statusText
    color: root.isError ? Color.urgent : Qt.darker(root.contentForeground, Tokens.dimMuted)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
  }

  Row {
    id: buttonRow
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    spacing: Style.space(4)

    PanelActionButton {
      id: refreshButton
      iconText: Model.ICON_REFRESH
      tooltipText: root.fetching ? Model.TOOLTIP_UPDATING : Model.TOOLTIP_REFRESH
      foreground: root.contentForeground
      fontFamily: root.contentFontFamily
      enabled: !root.fetching && !root.inSettingsView
      opacity: (root.fetching || root.inSettingsView) ? Tokens.fetchingOpacity : 1.0
      hasCursor: root.cursorOnRefresh
      onHovered: function(isHovered) { root.refreshHovered(isHovered) }
      onClicked: root.refreshRequested()
    }

    PanelActionButton {
      id: settingsButton
      iconText: Model.ICON_SETTINGS
      tooltipText: root.inSettingsView ? Model.TOOLTIP_BACK_SCHEDULE : Model.TOOLTIP_SETTINGS
      foreground: root.contentForeground
      hoverColor: root.inSettingsView ? Color.accent : root.contentForeground
      fontFamily: root.contentFontFamily
      hasCursor: root.cursorOnSettings || root.inSettingsView
      onHovered: function(isHovered) { root.settingsHovered(isHovered) }
      onClicked: root.settingsRequested()
    }
  }
}
