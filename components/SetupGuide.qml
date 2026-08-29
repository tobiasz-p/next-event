import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  width: parent ? parent.width : 0
  height: visible ? setupColumn.implicitHeight : 0
  implicitHeight: height

  Column {
    id: setupColumn
    width: parent.width
    spacing: Style.space(12)

    Column {
      width: parent.width
      spacing: Style.space(4)

      Text {
        width: parent.width
        text: Model.LABEL_SETUP_CONNECT_TITLE
        color: root.contentForeground
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.subtitle
        font.bold: true
        wrapMode: Text.WordWrap
      }

      Text {
        width: parent.width
        text: Model.LABEL_SETUP_CONNECT_SUBTITLE
        color: Qt.darker(root.contentForeground, Tokens.dimMeta)
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.bodySmall
        wrapMode: Text.WordWrap
      }
    }

    // Option 1: Google Workspace / OAuth
    SetupCard {
      title: Model.LABEL_SETUP_OPTION1_TITLE
      titleColor: Color.accent
      description: Model.LABEL_SETUP_OPTION1_DESC
      command: Model.LABEL_SETUP_OPTION1_CMD
      contentForeground: root.contentForeground
      contentFontFamily: root.contentFontFamily
    }

    // Option 2: iCal URL
    SetupCard {
      title: Model.LABEL_SETUP_OPTION2_TITLE
      titleColor: root.contentForeground
      description: Model.LABEL_SETUP_OPTION2_DESC
      command: Model.LABEL_SETUP_OPTION2_CMD
      contentForeground: root.contentForeground
      contentFontFamily: root.contentFontFamily
    }
  }
}
