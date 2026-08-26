const test = require('node:test')
const assert = require('node:assert/strict')
const Model = require('../Model.js')

const date = (hour, minute = 5) => new Date(2024, 0, 2, hour, minute)

test('hm preserves 24-hour output by default', () => {
  assert.equal(Model.hm(date(0)), '00:05')
  assert.equal(Model.hm(date(13)), '13:05')
})

test('hm formats midnight, noon, and afternoon as 12-hour time', () => {
  assert.equal(Model.hm(date(0), true), '12:05 AM')
  assert.equal(Model.hm(date(12), true), '12:05 PM')
  assert.equal(Model.hm(date(13), true), '1:05 PM')
})

test('time ranges and labels accept 12-hour formatting', () => {
  assert.equal(Model.timeRange(date(9), date(10, 35), true), '9:05 AM–10:35 AM')
  assert.match(Model.meetingTimeLabel(date(13), date(14), date(13), true), /1:05 PM–2:05 PM/)
})
