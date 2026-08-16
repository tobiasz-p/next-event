# NextEvent

Next event, right in the bar — native to your Omarchy shell. Shows the next
upcoming event (e.g. `Daily in 15 min`, `Daily · 15 min left`) and lets you join
the Google Meet call with a single click.

<p align="center">
  <img src="preview.png" alt="NextEvent Overview" width="560">
  <br>
  <em>Active meeting with live countdown in bar, hero card with Google Meet action, and multi-day agenda</em>
</p>

## Screenshots

| Pre-Meeting / Upcoming | Setup & Onboarding Guide |
| :---: | :---: |
| <img src="assets/upcoming.png" alt="Upcoming Meeting" width="380"><br><sub><b>Pre-meeting state</b> with <code>NEXT</code> badge & countdown</sub> | <img src="assets/setup.png" alt="Setup Guide" width="380"><br><sub><b>Quick 3-step setup</b> with copy-pasteable command</sub> |

| Empty Schedule State | Full Multi-Day Agenda |
| :---: | :---: |
| <img src="assets/empty.png" alt="Empty Schedule" width="380"><br><sub><b>Zero-state</b> when your schedule is clear</sub> | <img src="assets/schedule.png" alt="Full Schedule" width="380"><br><sub><b>Grouped agenda</b> across today, tomorrow, and future days</sub> |

## Features

- Bar widget showing the next event: `Daily in 15 min`, `Daily · 15 min left`,
  `Daily · 14:00`, `Daily · Tmrw 14:00`, `Daily · Wed 14:00`
- Click to open a panel with the upcoming schedule; Join opens the Google Meet
  link in your browser
- Right-click on the widget: join the next meeting immediately
- Middle-click: refetch the calendar
- Recurring events (daily, weekly, monthly, yearly) are expanded, including
  exceptions and overrides (EXDATE / RECURRENCE-ID)
- Updates itself every few minutes; the countdown refreshes every 30 seconds

## Install

```sh
omarchy plugin add https://github.com/tobiasz-p/next-event.git --enable
```

Or manually: copy this folder into `~/.config/omarchy/plugins/tobiasz-p.next-event` and run

```sh
omarchy plugin enable tobiasz-p.next-event
```

## Remove

```sh
omarchy plugin remove tobiasz-p.next-event
```

## Supported Calendars

Currently, NextEvent supports **Google Calendar** (via private iCal/ICS feeds). Support for additional calendar providers (Outlook, Apple iCloud, CalDAV, and custom ICS feeds) will be added soon.

## Configure

The widget currently connects to a Google Calendar feed:

1. Open Google Calendar → Settings → the calendar you want → "Integrate
   calendar"
2. Copy the "Secret address in iCal format" URL
3. Set it on the widget:

```sh
omarchy bar set tobiasz-p.next-event icsUrl 'https://calendar.google.com/calendar/ical/xxxxx/private-xxxxxxxx/basic.ics'
```

Available settings (`omarchy bar set <widget> <key> <value>`):

| Key                   | Default | Description                                         |
| --------------------- | ------- | --------------------------------------------------- |
| `icsUrl`              | —       | Google Calendar private iCal URL (required)         |
| `refreshMinutes`      | `5`     | How often to refetch the feed                       |
| `showDaysAhead`       | `3`     | How many days ahead to list meetings                |
| `maxTitleLength`      | `28`    | Bar label truncation length                         |
| `showOnlyWithVideoLink` | `true` | Only show meetings that have a video link          |
| `browserCommand`      | `""`    | Command used to open the Meet URL (`xdg-open` by default) |
| `calendarUrlBase`     | `"https://calendar.google.com/calendar"` | Base URL for "Open in Calendar" (opens `/r` route; set e.g. `https://calendar.google.com/calendar/u/1` for multi-account) |

## Privacy

The calendar feed is fetched directly from Google by your machine. No external
service, no accounts, no telemetry.

## License

MIT
