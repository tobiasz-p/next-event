import QtQuick
import qs.Commons
import qs.Ui

Column {
  id: root

  property string title: ""
  property color titleColor: Color.accent
  property string description: ""
  property string command: ""
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  width: parent ? parent.width : 0
  spacing: Style.space(6)

  Text {
    width: parent.width
    textFormat: Text.PlainText
    text: root.title
    color: root.titleColor
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.body
    font.bold: true
    wrapMode: Text.WordWrap
  }

  Text {
    width: parent.width
    textFormat: Text.PlainText
    text: root.description
    color: Qt.darker(root.contentForeground, Tokens.dimMeta)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
    wrapMode: Text.WordWrap
  }

  BorderSurface {
    width: parent.width
    radius: Style.cornerRadius
    color: Style.normalFillFor(root.contentForeground, Color.accent)
    borderSpec: Border.controlSpec("normal", root.contentForeground, Color.accent)
    implicitHeight: commandCol.implicitHeight + Style.space(12)

    Column {
      id: commandCol
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      anchors.margins: Style.space(8)

      Text {
        width: parent.width
        textFormat: Text.PlainText
        text: root.command
        font.family: "monospace"
        font.pixelSize: Style.font.caption
        color: root.contentForeground
        wrapMode: Text.WrapAnywhere
      }
    }
  }
}
