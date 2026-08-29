import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model
import "components"

// NextEvent details popup: the next meeting up top with a Join button,
// then the upcoming multi-day list. Also hosts setup instructions when unconfigured.
Panel {
  id: root
  moduleName: "tobiasz-p.next-event"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  readonly property bool inMeeting: hostWidget ? hostWidget.inMeeting : false
  readonly property bool fetching: hostWidget ? hostWidget.fetching : false
  readonly property bool lastFetchFailed: hostWidget ? hostWidget.lastFetchFailed : false
  readonly property int offlineFeedCount: hostWidget ? hostWidget.offlineFeedCount : 0
  readonly property bool useCalendarColors: hostWidget ? hostWidget.useCalendarColors : true

  property var scheduleGroups: []
  property var calendarLegend: []
  property var next: null
  property date now: hostWidget ? hostWidget.now : new Date()
  property bool inSettingsView: false

  readonly property color contentForeground: bar ? bar.barForeground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  function open() {
    root.inSettingsView = false
    reload()
    root.controller.show()
  }

  function close() {
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.open()
  }

  function toggleSettingsView() {
    root.inSettingsView = !root.inSettingsView
    root.reload()
  }

  function persistSettings(values) {
    var entry = { id: root.moduleName }
    var current = (root.hostWidget && root.hostWidget.settings) ? root.hostWidget.settings : (root.settings || {})
    for (var existing in current) if (existing !== "id") entry[existing] = current[existing]
    for (var key in values) entry[key] = values[key]

    root.settings = entry
    if (root.hostWidget && "settings" in root.hostWidget) root.hostWidget.settings = entry
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entry)
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function reload() {
    if (!root.hostWidget) return
    root.scheduleGroups = root.hostWidget.scheduleGroups || []
    root.calendarLegend = root.hostWidget.calendarLegend || []
    root.next = root.hostWidget.nextMeeting || null

    var configured = !!root.hostWidget.configured
    setupGuide.visible = !root.inSettingsView && !configured
    heroCard.visible = !root.inSettingsView && configured && !!root.next
    emptySchedule.visible = !root.inSettingsView && configured && root.scheduleGroups.length === 0
    scheduleContainer.visible = !root.inSettingsView && configured && root.scheduleGroups.length > 0
    settingsView.visible = root.inSettingsView
    headerBar.inSettingsView = root.inSettingsView
    root.rebuildActionItems()
  }

  // Join / open-in-calendar hand off to the browser, so dismiss the panel first.
  function join(event) {
    root.close()
    if (root.hostWidget && event) root.hostWidget.openEvent(event)
  }

  function openInCalendar(event) {
    root.close()
    if (root.hostWidget && event) root.hostWidget.openCalendar(event)
  }

  function refreshNow() {
    if (root.hostWidget) root.hostWidget.refresh()
  }

  // ---- keyboard & hover navigation ----
  readonly property var navModel: new Model.PanelNavigationModel()
  property var actionItems: []
  property int cursorIndex: -1
  property bool cursorActive: false

  function rebuildActionItems() {
    root.actionItems = navModel.rebuildActionItems(heroCard.visible, root.next, root.scheduleGroups, root.inSettingsView)
    root.cursorIndex = navModel.cursorIndex
    root.cursorActive = navModel.cursorActive
  }

  function moveCursor(delta) {
    root.cursorIndex = navModel.moveCursor(delta)
    root.cursorActive = navModel.cursorActive
    root.ensureCursorVisible()
  }

  function activateCursor() {
    var activeItem = navModel.activeItem()
    if (!activeItem) return
    if (activeItem.kind === "refresh") root.refreshNow()
    else if (activeItem.kind === "settings") root.toggleSettingsView()
    else if (activeItem.kind === "join") root.join(root.next)
    else if (activeItem.kind === "calendar") root.openInCalendar(root.next)
    else if (activeItem.kind === "event") {
      var group = root.scheduleGroups[activeItem.groupIndex]
      if (group) root.join(group.items[activeItem.rowIndex])
    }
  }

  function cursorOn(kind, groupIndex, rowIndex) {
    if (!root.cursorActive || root.cursorIndex < 0 || root.cursorIndex >= root.actionItems.length) return false
    var it = root.actionItems[root.cursorIndex]
    if (!it || it.kind !== kind) return false
    if (groupIndex !== undefined && it.groupIndex !== groupIndex) return false
    if (rowIndex !== undefined && it.rowIndex !== rowIndex) return false
    return true
  }

  function pointCursorAt(kind, groupIndex, rowIndex) {
    var idx = navModel.pointCursorAt(kind, groupIndex, rowIndex)
    root.cursorIndex = navModel.cursorIndex
    root.cursorActive = navModel.cursorActive
    return idx
  }

  function ensureCursorVisible() {
    var activeItem = navModel.activeItem()
    if (!activeItem) return
    var target = null
    if (activeItem.kind === "refresh") target = headerBar.refreshBtn
    else if (activeItem.kind === "settings") target = headerBar.settingsBtn
    else if (activeItem.kind === "join") target = heroCard.joinBtn
    else if (activeItem.kind === "calendar") target = heroCard.openCalendarBtn
    else {
      var group = groupRepeater.itemAt(activeItem.groupIndex)
      target = group ? group.rowAt(activeItem.rowIndex) : null
    }
    if (!target) return
    var top = target.mapToItem(contentColumn, 0, 0).y
    var bottom = top + target.height
    if (top < scroll.contentY) scroll.contentY = Math.max(0, top)
    else if (bottom > scroll.contentY + scroll.height) scroll.contentY = bottom - scroll.height
  }

  onHostWidgetChanged: Qt.callLater(root.reload)

  onOpenedChanged: {
    if (opened) {
      root.inSettingsView = false
      root.reload()
    } else {
      root.cursorActive = false
      if (root.navModel) root.navModel.cursorActive = false
    }
  }

  Connections {
    target: root.hostWidget
    function onMeetingDataChanged() { root.reload() }
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(360))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      blocked: root.inSettingsView && settingsView.isEditing
      onCloseRequested: {
        if (root.inSettingsView) {
          root.inSettingsView = false
          root.reload()
        } else {
          root.close()
        }
      }
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(deltaX, deltaY) { if (!root.inSettingsView && deltaY !== 0) root.moveCursor(deltaY) }
      onActivateRequested: if (!root.inSettingsView) root.activateCursor()
      onTextKey: function(key) {
        if (!root.hostWidget) return
        if (key === root.hostWidget.keySettings) root.toggleSettingsView()
        else if (!root.inSettingsView) {
          if (key === root.hostWidget.keyRefresh) root.refreshNow()
          else if (key === root.hostWidget.keyJoin && root.next && root.next.meetUrl) root.join(root.next)
          else if (key === root.hostWidget.keyCalendar && root.next) root.openInCalendar(root.next)
        }
      }

      Flickable {
        id: scroll
        anchors.fill: parent
        contentWidth: scroll.width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height

        Column {
          id: contentColumn
          width: scroll.width
          spacing: Style.space(12)

          HeaderBar {
            id: headerBar
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
            statusText: Model.headerStatus(
              root.fetching,
              root.lastFetchFailed,
              root.offlineFeedCount,
              root.hostWidget ? root.hostWidget.lastUpdated : null,
              root.now,
              root.hostWidget && root.hostWidget.configured,
              root.hostWidget ? root.hostWidget.use12Hour : false
            )
            isError: root.lastFetchFailed || root.offlineFeedCount > 0
            fetching: root.fetching
            inSettingsView: root.inSettingsView
            cursorOnRefresh: root.cursorOn("refresh")
            cursorOnSettings: root.cursorOn("settings")
            onRefreshRequested: root.refreshNow()
            onSettingsRequested: root.toggleSettingsView()
            onRefreshHovered: function(isHovered) { if (isHovered) root.pointCursorAt("refresh") }
            onSettingsHovered: function(isHovered) { if (isHovered) root.pointCursorAt("settings") }
          }

          SettingsView {
            id: settingsView
            visible: false
            hostWidget: root.hostWidget
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
            onSettingChanged: function(key, val) {
              var update = {}
              update[key] = val
              root.persistSettings(update)
            }
            onCloseRequested: root.toggleSettingsView()
          }

          SetupGuide {
            id: setupGuide
            visible: false
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
          }

          HeroCard {
            id: heroCard
            visible: false
            next: root.next
            now: root.now
            inMeeting: root.inMeeting
            useCalendarColors: root.useCalendarColors
            use12Hour: root.hostWidget ? root.hostWidget.use12Hour : false
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
            cursorOnJoin: root.cursorOn("join")
            cursorOnCalendar: root.cursorOn("calendar")
            onJoinRequested: root.join(root.next)
            onCalendarRequested: root.openInCalendar(root.next)
            onJoinHovered: function(isHovered) { if (isHovered) root.pointCursorAt("join") }
            onCalendarHovered: function(isHovered) { if (isHovered) root.pointCursorAt("calendar") }
          }

          EmptySchedule {
            id: emptySchedule
            visible: false
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
          }

          Item {
            id: scheduleContainer
            visible: false
            width: parent.width
            height: visible ? scheduleColumn.implicitHeight : 0
            implicitHeight: height

            Column {
              id: scheduleColumn
              width: parent.width
              spacing: Style.space(10)

              Repeater {
                id: groupRepeater
                model: root.scheduleGroups

                ScheduleGroup {
                  required property var modelData
                  required property int index

                  group: modelData
                  groupIndex: index
                  showSeparator: index > 0 || heroCard.visible
                  contentForeground: root.contentForeground
                  contentFontFamily: root.contentFontFamily
                  useCalendarColors: root.useCalendarColors
                  use12Hour: root.hostWidget ? root.hostWidget.use12Hour : false
                  cursorChecker: root.cursorOn
                  cursorIndex: root.cursorIndex
                  cursorActive: root.cursorActive

                  onEventClicked: function(meeting) { root.join(meeting) }
                  onEventHovered: function(groupIndex, rowIndex) { root.pointCursorAt("event", groupIndex, rowIndex) }
                }
              }
            }
          }

          PanelSeparator {
            visible: !root.inSettingsView && root.useCalendarColors && root.calendarLegend && root.calendarLegend.length > 1
            foreground: root.contentForeground
            strength: Tokens.separatorLegend
          }

          CalendarLegend {
            visible: !root.inSettingsView && root.useCalendarColors && root.calendarLegend && root.calendarLegend.length > 1
            legend: root.calendarLegend
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily
            useCalendarColors: root.useCalendarColors
          }
        }
      }
    }
  }
}
