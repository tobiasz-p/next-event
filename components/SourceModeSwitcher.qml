import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Row {
  id: root

  property string currentMode: Model.SOURCE_MODE_ICS
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal modeChanged(string mode)

  width: parent ? parent.width : 0
  spacing: Style.space(6)

  Button {
    width: (parent.width - parent.spacing) / 2
    text: "iCal Feeds (.ics)"
    iconText: "󰸗"
    bordered: true
    selected: root.currentMode === Model.SOURCE_MODE_ICS
    active: root.currentMode === Model.SOURCE_MODE_ICS
    foreground: root.contentForeground
    accent: Color.accent
    fontFamily: root.contentFontFamily
    fontSize: Style.font.caption
    horizontalPadding: Style.space(8)
    verticalPadding: Style.space(6)
    onClicked: root.modeChanged(Model.SOURCE_MODE_ICS)
  }

  Button {
    width: (parent.width - parent.spacing) / 2
    text: "Google OAuth"
    iconText: "󰊭"
    bordered: true
    selected: root.currentMode === Model.SOURCE_MODE_JSON
    active: root.currentMode === Model.SOURCE_MODE_JSON
    foreground: root.contentForeground
    accent: Color.accent
    fontFamily: root.contentFontFamily
    fontSize: Style.font.caption
    horizontalPadding: Style.space(8)
    verticalPadding: Style.space(6)
    onClicked: root.modeChanged(Model.SOURCE_MODE_JSON)
  }
}
