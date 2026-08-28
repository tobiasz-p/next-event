import js from "@eslint/js"
import globals from "globals"
import eslintConfigPrettier from "eslint-config-prettier"

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        Qt: "readonly",
        Constants: "writable",
        CalendarEvent: "writable",
        DateTimeUtils: "writable",
        TimezoneResolver: "writable",
        RecurrenceRule: "writable",
        RecurrenceExpander: "writable",
        MeetingLinkDetector: "writable",
        IcsParser: "writable",
        JsonStateParser: "writable",
        FeedConfigParser: "writable",
        ScheduleAggregator: "writable",
        DisplayFormatter: "writable",
        PanelNavigationModel: "writable"
      }
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "no-undef": "error",
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      eqeqeq: ["error", "always", { null: "ignore" }]
    }
  },
  {
    ignores: ["node_modules/**", "package-lock.json", "*.log"]
  }
]
