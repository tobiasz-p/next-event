import QtQuick
import qs.Commons
import qs.Ui

BorderSurface {
  id: root

  property int feedIndex: 0
  property string feedLabel: ""
  property string feedUrl: ""
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal labelModified(string newLabel)
  signal urlModified(string newUrl)
  signal removeRequested()

  readonly property bool isEditing: labelInput.activeFocus || urlInput.activeFocus

  implicitHeight: feedCardCol.implicitHeight + Style.space(16)
  radius: Style.cornerRadius
  color: Style.normalFillFor(root.contentForeground, Color.accent)
  borderSpec: Border.controlSpec("normal", root.contentForeground, Color.accent)

  Column {
    id: feedCardCol
    anchors.left: parent.left
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    anchors.margins: Style.space(8)
    spacing: Style.space(6)

    Item {
      width: parent.width
      height: Math.max(feedCardTitle.implicitHeight, deleteFeedBtn.height)

      Text {
        id: feedCardTitle
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        text: "Feed " + (root.feedIndex + 1) + (root.feedLabel ? (" · " + root.feedLabel) : "")
        color: root.contentForeground
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.caption
        font.bold: true
        elide: Text.ElideRight
        width: parent.width - deleteFeedBtn.width - Style.space(8)
      }

      PanelActionButton {
        id: deleteFeedBtn
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        iconText: "✕"
        fontSize: Style.font.caption
        hoverColor: Color.urgent
        tooltipText: "Remove feed"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.removeRequested()
      }
    }

    TextField {
      id: labelInput
      width: parent.width
      text: root.feedLabel
      placeholderText: "Label (e.g. Work, Personal, Team)"
      foreground: root.contentForeground
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.bodySmall
      onEditingFinished: root.labelModified(text.trim())
      Keys.onPressed: function(e) { if (e.key === Qt.Key_Escape) { focus = false; e.accepted = true } }
    }

    TextField {
      id: urlInput
      width: parent.width
      text: root.feedUrl
      placeholderText: "iCal (.ics) feed URL (https://...)"
      foreground: root.contentForeground
      font.family: root.contentFontFamily
      font.pixelSize: Style.font.bodySmall
      onEditingFinished: root.urlModified(text.trim())
      Keys.onPressed: function(e) { if (e.key === Qt.Key_Escape) { focus = false; e.accepted = true } }
    }
  }
}
