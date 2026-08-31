import QtQuick
import qs.Commons
import qs.Ui

Column {
  id: root

  property string label: ""
  property string description: ""
  property string text: ""
  property string placeholderText: ""
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal modified(string value)

  readonly property bool isEditing: inputField.activeFocus
  property alias field: inputField

  width: parent ? parent.width : 0
  spacing: Style.space(3)

  Text {
    visible: root.label !== ""
    textFormat: Text.PlainText
    text: root.label
    color: root.contentForeground
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.bodySmall
    font.bold: true
  }

  Text {
    visible: root.description !== ""
    width: parent.width
    textFormat: Text.PlainText
    text: root.description
    color: Qt.darker(root.contentForeground, Tokens.dimMeta)
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
    wrapMode: Text.WordWrap
  }

  TextField {
    id: inputField
    width: parent.width
    text: root.text
    placeholderText: root.placeholderText
    foreground: root.contentForeground
    font.family: root.contentFontFamily
    onEditingFinished: root.modified(text.trim())
    Keys.onPressed: function(event) {
      if (event.key === Qt.Key_Escape) {
        focus = false
        event.accepted = true
      }
    }
  }
}
