pragma Singleton
import QtQuick

QtObject {
  readonly property real dimLabel: 1.3
  readonly property real dimMeta: 1.35
  readonly property real dimCaption: 1.4
  readonly property real dimMuted: 1.5
  readonly property real dimGhost: 1.6

  readonly property real badgeColorAlpha: 0.22
  readonly property real badgeNeutralAlpha: 0.18

  readonly property real separatorGroup: 0.10
  readonly property real separatorLegend: 0.07

  readonly property real sectionLetterSpacing: 1.2

  readonly property real dotSize: 6
  readonly property real barWidth: 2.5
  readonly property real barHeight: 16

  readonly property real colTime: 44
  readonly property real colDuration: 34
  readonly property real colIcon: 16

  readonly property real fetchingOpacity: 0.6
}
