import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property var next: null
  property date now: new Date()
  property bool inMeeting: false
  property bool useCalendarColors: true
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family
  property bool cursorOnJoin: false
  property bool cursorOnCalendar: false

  signal joinRequested()
  signal calendarRequested()
  signal joinHovered(bool isHovered)
  signal calendarHovered(bool isHovered)

  property alias joinBtn: joinButton
  property alias openCalendarBtn: openCalendarButton

  width: parent ? parent.width : 0
  height: visible ? heroBlock.implicitHeight : 0
  implicitHeight: height

  BorderSurface {
    id: heroBlock
    width: parent.width
    radius: Style.cornerRadius
    color: root.inMeeting
      ? Style.selectedFillFor(root.contentForeground, Color.accent)
      : Style.normalFillFor(root.contentForeground, Color.accent)
    borderSpec: root.inMeeting
      ? Border.controlSpec("selected", root.contentForeground, Color.accent)
      : Border.none()
    implicitHeight: heroCol.implicitHeight + Style.space(20)

    Rectangle {
      id: heroColorStripe
      visible: root.useCalendarColors && !!(root.next && root.next.calendarColor)
      anchors.left: parent.left
      anchors.top: parent.top
      anchors.bottom: parent.bottom
      anchors.margins: Style.space(2)
      width: Style.space(3.5)
      radius: Style.cornerRadius * 0.5
      color: (root.next && root.next.calendarColor) ? root.next.calendarColor : Color.accent
    }

    Column {
      id: heroCol
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      anchors.leftMargin: Style.space(12)
      anchors.rightMargin: Style.space(12)
      spacing: Style.space(5)

      RowLayout {
        width: parent.width

        Text {
          text: root.inMeeting ? Model.SECTION_HAPPENING_NOW : Model.SECTION_NEXT
          color: root.inMeeting ? Color.accent : Qt.darker(root.contentForeground, Tokens.dimMuted)
          font.family: root.contentFontFamily
          font.pixelSize: Style.font.caption
          font.letterSpacing: Tokens.sectionLetterSpacing
          font.bold: true
        }

        Item { Layout.fillWidth: true }

        Text {
          visible: !!root.next
          text: Model.heroHeaderMeta(root.next)
          color: root.inMeeting ? Color.accent : Qt.darker(root.contentForeground, Tokens.dimCaption)
          font.family: root.contentFontFamily
          font.pixelSize: Style.font.caption
          font.bold: true
        }
      }

      Text {
        width: parent.width
        text: root.next ? (root.next.title || "(Untitled)") : ""
        color: root.contentForeground
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.bodyLarge
        font.bold: true
        wrapMode: Text.WordWrap
        maximumLineCount: 2
        elide: Text.ElideRight
      }

      Text {
        width: parent.width
        text: Model.heroTimeStatus(root.next, root.now)
        color: Qt.darker(root.contentForeground, Tokens.dimMeta)
        font.family: root.contentFontFamily
        font.pixelSize: Style.font.bodySmall
        wrapMode: Text.WordWrap
      }

      RowLayout {
        width: parent.width
        spacing: Style.space(8)

        Button {
          id: joinButton
          visible: !!(root.next && root.next.meetUrl)
          Layout.fillWidth: true
          text: Model.LABEL_JOIN_MEETING
          iconText: Model.ICON_MEETING_VIDEO
          selected: true
          accent: Color.accent
          fontFamily: root.contentFontFamily
          fontSize: Style.font.bodySmall
          iconSize: Style.font.bodySmall
          horizontalPadding: Style.space(12)
          verticalPadding: Style.space(7)
          hasCursor: root.cursorOnJoin
          onHovered: function(isHovered) { root.joinHovered(isHovered) }
          onClicked: root.joinRequested()
        }

        Button {
          id: openCalendarButton
          visible: !!root.next
          Layout.fillWidth: true
          text: Model.LABEL_OPEN_CALENDAR
          iconText: Model.ICON_CALENDAR_EVENT
          bordered: true
          foreground: root.contentForeground
          fontFamily: root.contentFontFamily
          fontSize: Style.font.bodySmall
          iconSize: Style.font.bodySmall
          horizontalPadding: Style.space(12)
          verticalPadding: Style.space(7)
          hasCursor: root.cursorOnCalendar
          onHovered: function(isHovered) { root.calendarHovered(isHovered) }
          onClicked: root.calendarRequested()
        }
      }
    }
  }
}
