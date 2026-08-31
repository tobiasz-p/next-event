import QtQuick
import qs.Commons
import qs.Ui

Item {
  id: root

  property string label: ""
  property string description: ""
  property int value: 0
  property int from: 0
  property int to: 100
  property int stepSize: 1
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  readonly property bool isEditing: valInput.activeFocus

  signal modified(int value)

  width: parent ? parent.width : 0
  height: Math.max(labelCol.implicitHeight, stepperRow.implicitHeight)
  implicitHeight: height

  Column {
    id: labelCol
    anchors.left: parent.left
    anchors.right: stepperRow.left
    anchors.rightMargin: Style.space(12)
    anchors.verticalCenter: parent.verticalCenter
    spacing: Style.space(2)

    Text {
      width: parent.width
      textFormat: Text.PlainText
      text: root.label
      color: root.contentForeground
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.bodySmall
      font.bold: true
      elide: Text.ElideRight
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
  }

  Row {
    id: stepperRow
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    spacing: Style.space(4)

    PanelActionButton {
      id: minusBtn
      anchors.verticalCenter: parent.verticalCenter
      iconText: "−"
      fontSize: Style.font.subtitle
      tooltipText: "Decrease"
      foreground: root.contentForeground
      fontFamily: root.contentFontFamily
      enabled: root.value > root.from
      opacity: enabled ? 1.0 : Tokens.fetchingOpacity
      onClicked: root.modified(Math.max(root.from, root.value - root.stepSize))
    }

    TextField {
      id: valInput
      anchors.verticalCenter: parent.verticalCenter
      width: Style.space(52)
      horizontalAlignment: Text.AlignHCenter
      text: String(root.value)
      foreground: root.contentForeground
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.body
      inputMethodHints: Qt.ImhDigitsOnly

      onEditingFinished: {
        var parsed = parseInt(text, 10)
        if (isNaN(parsed)) parsed = root.value
        var clamped = Math.max(root.from, Math.min(root.to, parsed))
        text = String(clamped)
        if (clamped !== root.value) root.modified(clamped)
      }

      Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
          text = String(root.value)
          focus = false
          event.accepted = true
        } else if (event.key === Qt.Key_Up) {
          root.modified(Math.min(root.to, root.value + root.stepSize))
          event.accepted = true
        } else if (event.key === Qt.Key_Down) {
          root.modified(Math.max(root.from, root.value - root.stepSize))
          event.accepted = true
        }
      }
    }

    PanelActionButton {
      id: plusBtn
      anchors.verticalCenter: parent.verticalCenter
      iconText: "+"
      fontSize: Style.font.subtitle
      tooltipText: "Increase"
      foreground: root.contentForeground
      fontFamily: root.contentFontFamily
      enabled: root.value < root.to
      opacity: enabled ? 1.0 : Tokens.fetchingOpacity
      onClicked: root.modified(Math.min(root.to, root.value + root.stepSize))
    }
  }
}
