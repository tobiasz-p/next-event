import QtQuick
import qs.Commons
import qs.Ui
import "../Model.js" as Model

Item {
  id: root

  property var hostWidget: null
  property color contentForeground: Color.foreground
  property string contentFontFamily: Style.font.family

  signal settingChanged(string key, var value)
  signal closeRequested()

  property var feedsList: []
  readonly property string currentSourceMode: root.hostWidget ? root.hostWidget.sourceMode : Model.SOURCE_MODE_ICS

  function loadFeedsFromHost() {
    if (!root.hostWidget) return
    var raw = root.hostWidget.setting("icsUrl", "")
    var parsed = Model.splitIcsFeeds(raw)
    var list = []
    for (var i = 0; i < parsed.length; i++) {
      list.push({
        label: parsed[i].label ? String(parsed[i].label) : "",
        url: parsed[i].url ? String(parsed[i].url) : ""
      })
    }
    root.feedsList = list
  }

  function serializeAndPersistFeeds() {
    var parts = []
    for (var i = 0; i < root.feedsList.length; i++) {
      var item = root.feedsList[i]
      var u = String((item && item.url) || "").trim()
      if (!u) continue
      var l = String((item && item.label) || "").trim()
      if (l) parts.push(l + "|" + u)
      else parts.push(u)
    }
    root.settingChanged("icsUrl", parts.join(","))
  }

  function addFeed() {
    var copy = root.feedsList.slice()
    copy.push({ label: "", url: "" })
    root.feedsList = copy
  }

  function removeFeed(idx) {
    var copy = root.feedsList.slice()
    copy.splice(idx, 1)
    root.feedsList = copy
    serializeAndPersistFeeds()
  }

  function updateFeedLabel(idx, newLabel) {
    if (idx < 0 || idx >= root.feedsList.length) return
    var copy = root.feedsList.slice()
    copy[idx] = { label: newLabel, url: copy[idx].url }
    root.feedsList = copy
    serializeAndPersistFeeds()
  }

  function updateFeedUrl(idx, newUrl) {
    if (idx < 0 || idx >= root.feedsList.length) return
    var copy = root.feedsList.slice()
    copy[idx] = { label: copy[idx].label, url: newUrl }
    root.feedsList = copy
    serializeAndPersistFeeds()
  }

  function feedsHaveFocus() {
    for (var i = 0; i < feedsRepeater.count; i++) {
      var item = feedsRepeater.itemAt(i)
      if (item && item.isEditing) return true
    }
    return false
  }

  onHostWidgetChanged: loadFeedsFromHost()
  onVisibleChanged: if (visible) loadFeedsFromHost()
  Component.onCompleted: loadFeedsFromHost()

  readonly property bool isEditing: daysAheadStepper.isEditing
    || refreshMinStepper.isEditing
    || maxTitleStepper.isEditing
    || maxFeedSizeStepper.isEditing
    || eventsJsonField.isEditing
    || calendarUrlField.isEditing
    || browserCmdField.isEditing
    || keyRefreshInput.isEditing
    || keySettingsInput.isEditing
    || keyJoinInput.isEditing
    || keyCalendarInput.isEditing
    || feedsHaveFocus()

  width: parent ? parent.width : 0
  height: visible ? settingsColumn.implicitHeight : 0
  implicitHeight: height

  Column {
    id: settingsColumn
    width: parent.width
    spacing: Style.space(14)

    // =========================================================================
    // 1. Calendar Source & Feeds
    // =========================================================================
    Column {
      width: parent.width
      spacing: Style.space(10)

      PanelSectionHeader {
        text: "CALENDAR SOURCE"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
      }

      SourceModeSwitcher {
        currentMode: root.currentSourceMode
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModeChanged: function(m) { root.settingChanged("sourceMode", m) }
      }

      // ---- ICS Mode View ----
      Column {
        visible: root.currentSourceMode === Model.SOURCE_MODE_ICS
        width: parent.width
        spacing: Style.space(8)

        Item {
          width: parent.width
          height: Math.max(feedSubHeader.height, addFeedBtn.height)

          Text {
            id: feedSubHeader
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: "CONFIGURED FEEDS"
            color: Qt.darker(root.contentForeground, Tokens.dimMuted)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.caption
            font.letterSpacing: Tokens.sectionLetterSpacing
            font.bold: true
          }

          Button {
            id: addFeedBtn
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            iconText: "+"
            text: "Add Feed"
            bordered: true
            foreground: root.contentForeground
            accent: Color.accent
            fontFamily: root.contentFontFamily
            fontSize: Style.font.caption
            horizontalPadding: Style.space(8)
            verticalPadding: Style.space(4)
            onClicked: root.addFeed()
          }
        }

        Text {
          visible: root.feedsList.length === 0
          width: parent.width
          text: "No ICS feeds added yet. Click \"+ Add Feed\" to add calendar URLs (Google Calendar, Outlook, iCloud, Proton, Nextcloud)."
          color: Qt.darker(root.contentForeground, Tokens.dimMeta)
          font.family: root.contentFontFamily
          font.pixelSize: Style.font.caption
          wrapMode: Text.WordWrap
        }

        Repeater {
          id: feedsRepeater
          model: root.feedsList

          FeedCard {
            required property var modelData
            required property int index

            width: settingsColumn.width
            feedIndex: index
            feedLabel: modelData.label || ""
            feedUrl: modelData.url || ""
            contentForeground: root.contentForeground
            contentFontFamily: root.contentFontFamily

            onLabelModified: function(val) { root.updateFeedLabel(index, val) }
            onUrlModified: function(val) { root.updateFeedUrl(index, val) }
            onRemoveRequested: root.removeFeed(index)
          }
        }
      }

      // ---- OAuth / JSON Mode View ----
      SettingField {
        id: eventsJsonField
        visible: root.currentSourceMode === Model.SOURCE_MODE_JSON
        width: parent.width
        label: "Events JSON state path"
        description: "Local state file synced with Google Calendar via OAuth background service."
        text: root.hostWidget ? String(root.hostWidget.setting("eventsJsonPath", root.hostWidget.eventsJsonPath || "")) : ""
        placeholderText: "~/.local/state/omarchy/calendar-events.json"
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(val) { root.settingChanged("eventsJsonPath", val) }
      }
    }

    PanelSeparator {
      foreground: root.contentForeground
      strength: Tokens.separatorGroup
    }

    // =========================================================================
    // 2. Agenda & Lookahead (Steppers)
    // =========================================================================
    Column {
      width: parent.width
      spacing: Style.space(12)

      PanelSectionHeader {
        text: "AGENDA & LOOKAHEAD"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
      }

      SettingStepper {
        id: daysAheadStepper
        label: "Lookahead days"
        description: "Days ahead to show in schedule"
        from: 1
        to: 30
        stepSize: 1
        value: root.hostWidget ? root.hostWidget.showDaysAhead : Model.DEFAULT_LOOKAHEAD_DAYS
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(v) { root.settingChanged("showDaysAhead", v) }
      }

      SettingStepper {
        id: refreshMinStepper
        label: "Refresh interval"
        description: "Minutes between automatic ICS calendar refetches"
        from: 1
        to: 120
        stepSize: 1
        value: root.hostWidget ? root.hostWidget.refreshMinutes : Model.DEFAULT_REFRESH_MINUTES
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(v) { root.settingChanged("refreshMinutes", v) }
      }

      SettingStepper {
        id: maxTitleStepper
        label: "Max bar title length"
        description: "Maximum character length for the event title in the bar"
        from: 8
        to: 100
        stepSize: 1
        value: root.hostWidget ? root.hostWidget.maxTitleLength : Model.DEFAULT_MAX_TITLE_LENGTH
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(v) { root.settingChanged("maxTitleLength", v) }
      }

      SettingStepper {
        id: maxFeedSizeStepper
        label: "Max feed size"
        description: "Maximum download limit (MiB) for each calendar feed"
        from: 1
        to: 100
        stepSize: 1
        value: root.hostWidget ? root.hostWidget.maxFeedSizeMiB : Model.DEFAULT_MAX_FEED_SIZE_MIB
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(v) { root.settingChanged("maxFeedSizeMiB", v) }
      }
    }

    PanelSeparator {
      foreground: root.contentForeground
      strength: Tokens.separatorGroup
    }

    // =========================================================================
    // 3. Display Options
    // =========================================================================
    Column {
      width: parent.width
      spacing: Style.space(8)

      PanelSectionHeader {
        text: "DISPLAY OPTIONS"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
      }

      Toggle {
        width: parent.width
        label: "Video meetings only in bar"
        description: "Only show upcoming events on the bar if they carry a video call link"
        checked: root.hostWidget ? root.hostWidget.showOnlyWithVideoLink : false
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.settingChanged("showOnlyWithVideoLink", !checked)
      }

      Toggle {
        width: parent.width
        label: "Show calendar badges"
        description: "Show feed name badge on events and in tooltips"
        checked: root.hostWidget ? root.hostWidget.showCalendarLabel : true
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.settingChanged("showCalendarLabel", !checked)
      }

      Toggle {
        width: parent.width
        label: "Use calendar colors"
        description: "Tint event badges and indicators with calendar feed colors"
        checked: root.hostWidget ? root.hostWidget.useCalendarColors : true
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.settingChanged("useCalendarColors", !checked)
      }

      Toggle {
        width: parent.width
        label: "Tint bar widget text"
        description: "Tint the bar label using the next meeting's calendar color"
        checked: root.hostWidget ? root.hostWidget.colorOnBar : false
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.settingChanged("colorOnBar", !checked)
      }

      Toggle {
        width: parent.width
        label: "12-hour time format"
        description: "Display times using 12-hour AM/PM format instead of 24-hour clock"
        checked: root.hostWidget ? root.hostWidget.use12Hour : false
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
        onClicked: root.settingChanged("timeFormat", checked ? Model.TIME_FORMAT_24 : Model.TIME_FORMAT_12)
      }
    }

    PanelSeparator {
      foreground: root.contentForeground
      strength: Tokens.separatorGroup
    }

    // =========================================================================
    // 4. Actions & Integrations
    // =========================================================================
    Column {
      width: parent.width
      spacing: Style.space(8)

      PanelSectionHeader {
        text: "ACTIONS & INTEGRATIONS"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
      }

      SettingField {
        id: calendarUrlField
        width: parent.width
        label: "Calendar base URL"
        description: "Base URL for \"Open in Calendar\" (e.g. append /u/1 for multi-account)."
        text: root.hostWidget ? String(root.hostWidget.setting("calendarUrlBase", Model.DEFAULT_CALENDAR_URL_BASE)) : Model.DEFAULT_CALENDAR_URL_BASE
        placeholderText: "https://calendar.google.com/calendar"
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(val) { root.settingChanged("calendarUrlBase", val) }
      }

      SettingField {
        id: browserCmdField
        width: parent.width
        label: "Browser command"
        description: "Custom command used to open meeting and calendar URLs (defaults to xdg-open)."
        text: root.hostWidget ? String(root.hostWidget.setting("browserCommand", "")) : ""
        placeholderText: "xdg-open"
        contentForeground: root.contentForeground
        contentFontFamily: root.contentFontFamily
        onModified: function(val) { root.settingChanged("browserCommand", val) }
      }
    }

    PanelSeparator {
      foreground: root.contentForeground
      strength: Tokens.separatorGroup
    }

    // =========================================================================
    // 5. Panel Shortcuts
    // =========================================================================
    Column {
      width: parent.width
      spacing: Style.space(8)

      PanelSectionHeader {
        text: "PANEL SHORTCUTS"
        foreground: root.contentForeground
        fontFamily: root.contentFontFamily
      }

      Grid {
        width: parent.width
        columns: 2
        columnSpacing: Style.space(12)
        rowSpacing: Style.space(8)

        SettingKeyInput {
          id: keyRefreshInput
          width: (parent.width - parent.columnSpacing) / 2
          label: "Refresh key"
          key: root.hostWidget ? root.hostWidget.keyRefresh : Model.DEFAULT_KEY_REFRESH
          defaultKey: Model.DEFAULT_KEY_REFRESH
          contentForeground: root.contentForeground
          contentFontFamily: root.contentFontFamily
          onModified: function(k) { root.settingChanged("keyRefresh", k) }
        }

        SettingKeyInput {
          id: keySettingsInput
          width: (parent.width - parent.columnSpacing) / 2
          label: "Settings key"
          key: root.hostWidget ? root.hostWidget.keySettings : Model.DEFAULT_KEY_SETTINGS
          defaultKey: Model.DEFAULT_KEY_SETTINGS
          contentForeground: root.contentForeground
          contentFontFamily: root.contentFontFamily
          onModified: function(k) { root.settingChanged("keySettings", k) }
        }

        SettingKeyInput {
          id: keyJoinInput
          width: (parent.width - parent.columnSpacing) / 2
          label: "Join key"
          key: root.hostWidget ? root.hostWidget.keyJoin : Model.DEFAULT_KEY_JOIN
          defaultKey: Model.DEFAULT_KEY_JOIN
          contentForeground: root.contentForeground
          contentFontFamily: root.contentFontFamily
          onModified: function(k) { root.settingChanged("keyJoin", k) }
        }

        SettingKeyInput {
          id: keyCalendarInput
          width: (parent.width - parent.columnSpacing) / 2
          label: "Calendar key"
          key: root.hostWidget ? root.hostWidget.keyCalendar : Model.DEFAULT_KEY_CALENDAR
          defaultKey: Model.DEFAULT_KEY_CALENDAR
          contentForeground: root.contentForeground
          contentFontFamily: root.contentFontFamily
          onModified: function(k) { root.settingChanged("keyCalendar", k) }
        }
      }
    }
  }
}
