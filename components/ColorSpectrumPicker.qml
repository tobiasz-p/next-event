import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property string selectedColor: "#4285f4"
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal colorSelected(string hexColor)

  readonly property bool isEditing: hexInput.activeFocus

  width: parent ? parent.width : 0
  height: pickerCol.implicitHeight
  implicitHeight: height

  Column {
    id: pickerCol
    width: parent.width
    spacing: Style.space(6)

    RowLayout {
      id: colorRow
      width: parent.width
      spacing: Style.space(6)

      Repeater {
        model: Model.CALENDAR_COLOR_PALETTE

        Rectangle {
          required property string modelData
          Layout.alignment: Qt.AlignVCenter
          implicitWidth: Style.space(16)
          implicitHeight: Style.space(16)
          radius: width * 0.5
          color: modelData
          border.width: (root.selectedColor && root.selectedColor.toLowerCase() === modelData.toLowerCase()) ? Style.space(2) : 0
          border.color: root.contentForeground

          MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: {
              hexInput.text = modelData
              root.colorSelected(modelData)
            }
          }
        }
      }

      Rectangle {
        id: customColorPreview
        Layout.alignment: Qt.AlignVCenter
        implicitWidth: Style.space(16)
        implicitHeight: Style.space(16)
        radius: width * 0.5
        readonly property string previewColor: {
          var t = hexInput.text.trim()
          if (Model.isValidHexColor(t)) return t
          if (root.selectedColor && Model.isValidHexColor(root.selectedColor)) return root.selectedColor
          return ""
        }
        visible: previewColor !== "" && !Model.CALENDAR_COLOR_PALETTE.some(function(c) {
          return c.toLowerCase() === previewColor.toLowerCase()
        })
        color: previewColor || "transparent"
        border.width: Style.space(2)
        border.color: root.contentForeground
      }

      TextField {
        id: hexInput
        Layout.alignment: Qt.AlignVCenter
        Layout.preferredWidth: Style.space(70)
        text: root.selectedColor
        placeholderText: "#HEX"
        foreground: root.contentForeground
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.caption
        onTextChanged: {
          var val = text.trim()
          if (Model.isValidHexColor(val)) root.colorSelected(val)
        }
        onEditingFinished: {
          var val = text.trim()
          if (Model.isValidHexColor(val)) root.colorSelected(val)
          else text = root.selectedColor
        }
        Keys.onPressed: function(e) { if (e.key === Qt.Key_Escape) { focus = false; e.accepted = true } }
      }
    }

    Rectangle {
      id: spectrumBox
      width: parent.width
      height: Style.space(42)
      radius: Style.cornerRadius * 0.5
      clip: true
      border.width: 1
      border.color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, Tokens.separatorGroup)

      Rectangle {
        anchors.fill: parent
        gradient: Gradient {
          orientation: Gradient.Horizontal
          GradientStop { position: 0.00; color: "#ff0000" }
          GradientStop { position: 0.17; color: "#ffff00" }
          GradientStop { position: 0.33; color: "#00ff00" }
          GradientStop { position: 0.50; color: "#00ffff" }
          GradientStop { position: 0.67; color: "#0000ff" }
          GradientStop { position: 0.83; color: "#ff00ff" }
          GradientStop { position: 1.00; color: "#ff0000" }
        }
      }

      Rectangle {
        anchors.fill: parent
        gradient: Gradient {
          orientation: Gradient.Vertical
          GradientStop { position: 0.00; color: "#00ffffff" }
          GradientStop { position: 1.00; color: "#ffffffff" }
        }
      }

      readonly property var hsv: Model.hexToHsv(root.selectedColor)
      readonly property real thumbX: Math.max(0, Math.min(width, hsv.h * width))
      readonly property real thumbY: Math.max(0, Math.min(height, (1.0 - hsv.s) * height))

      Rectangle {
        id: thumb
        x: spectrumBox.thumbX - width * 0.5
        y: spectrumBox.thumbY - height * 0.5
        width: Style.space(12)
        height: Style.space(12)
        radius: width * 0.5
        color: "transparent"
        border.width: Style.space(2)
        border.color: "#000000"

        Rectangle {
          anchors.fill: parent
          anchors.margins: Style.space(1)
          radius: width * 0.5
          color: "transparent"
          border.width: Style.space(1)
          border.color: "#ffffff"
        }
      }

      MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.CrossCursor

        function pickAt(mouse) {
          var clampedX = Math.max(0, Math.min(spectrumBox.width, mouse.x))
          var clampedY = Math.max(0, Math.min(spectrumBox.height, mouse.y))
          var h = clampedX / (spectrumBox.width || 1)
          var s = 1.0 - (clampedY / (spectrumBox.height || 1))
          var hex = Model.hsvToHex(h, s, 1.0)
          hexInput.text = hex
          root.colorSelected(hex)
        }

        onPressed: function(mouse) { pickAt(mouse) }
        onPositionChanged: function(mouse) { if (pressed) pickAt(mouse) }
      }
    }
  }
}
