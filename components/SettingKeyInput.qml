import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Column {
  id: root

  property string label: ""
  property string key: ""
  property string defaultKey: ""
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal modified(string key)

  readonly property bool isEditing: inputField.activeFocus
  property alias field: inputField

  spacing: Style.space(3)

  Text {
    text: root.label
    color: root.contentForeground
    font.family: root.contentFontFamily
    font.pixelSize: Style.font.caption
    font.bold: true
  }

  TextField {
    id: inputField
    width: parent.width
    maximumLength: 1
    text: root.key || root.defaultKey
    placeholderText: root.defaultKey
    foreground: root.contentForeground
    font.family: root.contentFontFamily
    horizontalAlignment: Text.AlignHCenter
    onEditingFinished: root.modified(Model.normalizeKey(text, root.defaultKey))
    Keys.onPressed: function(event) {
      if (event.key === Qt.Key_Escape) {
        focus = false
        event.accepted = true
      }
    }
  }
}
