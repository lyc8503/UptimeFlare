import assert from 'node:assert/strict'
import test from 'node:test'

import { selectMonitorBatch } from '../worker/src/batch.ts'
import {
  allWebhookDeliveriesSucceeded,
  shouldSendDownNotification,
} from '../worker/src/notification.ts'
import { shouldPersistState } from '../worker/src/persistence.ts'
import {
  CompactedMonitorStateWrapper,
  setToStoreIfUnchanged,
} from '../worker/src/store.ts'

const monitors = Array.from({ length: 20 }, (_, index) => ({ id: `monitor-${index + 1}` }))

function addLatencyState(state, monitorId) {
  state.data.latency[monitorId] = {
    time: '00000000',
    ping: '0000',
    loc: { c: [1], v: ['TEST'] },
  }
}

test('checks every monitor when batching is not configured', () => {
  const selection = selectMonitorBatch(monitors, undefined, 0)

  assert.equal(selection.batched, false)
  assert.equal(selection.batchIndex, 0)
  assert.equal(selection.batchCount, 1)
  assert.deepEqual(selection.monitors, monitors)
})

test('invalid batch sizes preserve all-monitor behavior', () => {
  for (const batchSize of [0, -1, 1.5, Number.NaN, 20, 21]) {
    const selection = selectMonitorBatch(monitors, batchSize, 0)

    assert.equal(selection.batched, false)
    assert.deepEqual(selection.monitors, monitors)
  }
})

test('selects deterministic round-robin batches for the default every-minute schedule', () => {
  const first = selectMonitorBatch(monitors, 5, 0)
  const second = selectMonitorBatch(monitors, 5, 60_000)
  const third = selectMonitorBatch(monitors, 5, 2 * 60_000)
  const fourth = selectMonitorBatch(monitors, 5, 3 * 60_000)
  const wrapped = selectMonitorBatch(monitors, 5, 4 * 60_000)

  assert.deepEqual(first.monitors.map(({ id }) => id), [
    'monitor-1',
    'monitor-2',
    'monitor-3',
    'monitor-4',
    'monitor-5',
  ])
  assert.deepEqual(second.monitors.map(({ id }) => id), [
    'monitor-6',
    'monitor-7',
    'monitor-8',
    'monitor-9',
    'monitor-10',
  ])
  assert.equal(third.batchIndex, 2)
  assert.equal(fourth.batchIndex, 3)
  assert.deepEqual(fourth.monitors.map(({ id }) => id), [
    'monitor-16',
    'monitor-17',
    'monitor-18',
    'monitor-19',
    'monitor-20',
  ])
  assert.deepEqual(wrapped.monitors, first.monitors)
})

test('retries and delayed retries select the original scheduled batch', () => {
  const original = selectMonitorBatch(monitors, 5, 60_000)
  selectMonitorBatch(monitors, 5, 2 * 60_000)
  const delayedRetry = selectMonitorBatch(monitors, 5, 60_000)

  assert.deepEqual(delayedRetry, original)
})

test('allows a smaller final batch when monitors do not divide evenly', () => {
  const selection = selectMonitorBatch(monitors.slice(0, 12), 5, 2 * 60_000)

  assert.equal(selection.batchCount, 3)
  assert.equal(selection.batchIndex, 2)
  assert.deepEqual(selection.monitors.map(({ id }) => id), ['monitor-11', 'monitor-12'])
})

test('recalculates global counters conservatively when monitor state is missing', () => {
  const state = new CompactedMonitorStateWrapper(null)
  state.appendIncident('up', { start: [1], end: 2, error: ['dummy'] })
  state.appendIncident('down', { start: [3], end: null, error: ['timeout'] })
  state.appendIncident('removed', { start: [4], end: null, error: ['removed'] })
  addLatencyState(state, 'up')
  addLatencyState(state, 'down')

  state.recalculateOverallStatus(['up', 'down', 'unknown'])

  assert.equal(state.data.overallUp, 1)
  assert.equal(state.data.overallDown, 2)
  assert.equal(state.hasMonitorData('unknown'), false)
})

test('incident-only state remains unavailable until a complete check', () => {
  const state = new CompactedMonitorStateWrapper(null)
  state.appendIncident('checked', { start: [1], end: 1, error: ['dummy'] })
  state.recalculateOverallStatus(['checked'])

  assert.equal(state.hasMonitorData('checked'), false)
  assert.equal(state.data.overallUp, 0)
  assert.equal(state.data.overallDown, 1)

  addLatencyState(state, 'checked')
  state.recalculateOverallStatus(['checked'])
  assert.equal(state.hasMonitorData('checked'), true)
  assert.equal(state.data.overallUp, 1)
  assert.equal(state.data.overallDown, 0)
})

test('sends delayed DOWN on the first check at or after grace period and only once', () => {
  const base = {
    incidentStart: 0,
    gracePeriodMinutes: 2,
    skipErrorChangeNotification: false,
  }

  assert.equal(
    shouldSendDownNotification({
      ...base,
      currentTime: 0,
      notifiedIncidentStart: undefined,
      monitorStatusChanged: true,
    }),
    false
  )
  assert.equal(
    shouldSendDownNotification({
      ...base,
      currentTime: 119,
      notifiedIncidentStart: undefined,
      monitorStatusChanged: false,
    }),
    false
  )
  assert.equal(
    shouldSendDownNotification({
      ...base,
      currentTime: 120,
      notifiedIncidentStart: undefined,
      monitorStatusChanged: false,
    }),
    true
  )
  assert.equal(
    shouldSendDownNotification({
      ...base,
      currentTime: 480,
      notifiedIncidentStart: 0,
      monitorStatusChanged: false,
    }),
    false
  )
})

test('allows configured error-reason notifications after the initial DOWN', () => {
  const base = {
    currentTime: 240,
    incidentStart: 0,
    notifiedIncidentStart: 0,
    gracePeriodMinutes: 2,
    monitorStatusChanged: true,
  }

  assert.equal(
    shouldSendDownNotification({ ...base, skipErrorChangeNotification: false }),
    true
  )
  assert.equal(
    shouldSendDownNotification({ ...base, skipErrorChangeNotification: true }),
    false
  )
})

test('persists DOWN, recovery, and error-change notification state', () => {
  const state = new CompactedMonitorStateWrapper(null)
  state.markDownNotificationSent('monitor-1', 123)
  state.setPendingRecovery('monitor-1', 123, 456)
  state.setPendingErrorChange('monitor-1', 123, 400, 'connection reset')

  const restored = new CompactedMonitorStateWrapper(state.getCompactedStateStr())
  assert.equal(restored.wasDownNotificationSent('monitor-1', 123), true)
  assert.deepEqual(restored.getPendingRecovery('monitor-1'), {
    incidentStart: 123,
    recoveredAt: 456,
  })
  assert.deepEqual(restored.getPendingErrorChange('monitor-1'), {
    incidentStart: 123,
    changedAt: 400,
    reason: 'connection reset',
  })

  restored.clearPendingRecovery('monitor-1')
  restored.clearPendingErrorChange('monitor-1')
  restored.clearDownNotificationSent('monitor-1', 123)
  assert.equal(restored.getPendingRecovery('monitor-1'), undefined)
  assert.equal(restored.getPendingErrorChange('monitor-1'), undefined)
  assert.equal(restored.wasDownNotificationSent('monitor-1', 123), false)
})

test('rebases monitor-scoped state without discarding another batch', () => {
  const firstBatch = new CompactedMonitorStateWrapper(null)
  firstBatch.appendIncident('monitor-1', { start: [1], end: 1, error: ['dummy'] })
  addLatencyState(firstBatch, 'monitor-1')
  firstBatch.setMonitorLastUpdate('monitor-1', 10)

  const secondBatch = new CompactedMonitorStateWrapper(null)
  secondBatch.appendIncident('monitor-2', { start: [2], end: null, error: ['timeout'] })
  addLatencyState(secondBatch, 'monitor-2')
  secondBatch.setMonitorLastUpdate('monitor-2', 11)

  const merged = new CompactedMonitorStateWrapper(firstBatch.getCompactedStateStr())
  assert.equal(merged.copyMonitorStateFrom(secondBatch, 'monitor-2'), true)
  assert.equal(merged.hasMonitorData('monitor-1'), true)
  assert.equal(merged.hasMonitorData('monitor-2'), true)

  const stale = new CompactedMonitorStateWrapper(firstBatch.getCompactedStateStr())
  stale.setMonitorLastUpdate('monitor-1', 9)
  assert.equal(merged.copyMonitorStateFrom(stale, 'monitor-1'), false)
  assert.equal(merged.data.monitorLastUpdate['monitor-1'], 10)

  const equalVersion = new CompactedMonitorStateWrapper(firstBatch.getCompactedStateStr())
  equalVersion.setIncident('monitor-1', 0, {
    start: [1],
    end: null,
    error: ['stale timeout'],
  })
  assert.equal(merged.copyMonitorStateFrom(equalVersion, 'monitor-1'), false)
  assert.equal(merged.getIncident('monitor-1', 0).end, 1)
})

test('preserves a delivered DOWN when a newer concurrent check already recovered', () => {
  const base = new CompactedMonitorStateWrapper(null)
  base.appendIncident('monitor-1', { start: [100], end: null, error: ['timeout'] })
  addLatencyState(base, 'monitor-1')
  base.setMonitorLastUpdate('monitor-1', 10)

  const deliveredDown = new CompactedMonitorStateWrapper(base.getCompactedStateStr())
  deliveredDown.markDownNotificationSent('monitor-1', 100)

  const recovered = new CompactedMonitorStateWrapper(base.getCompactedStateStr())
  recovered.setIncident('monitor-1', 0, { start: [100], end: 200, error: ['timeout'] })
  recovered.setMonitorLastUpdate('monitor-1', 20)

  assert.equal(recovered.copyMonitorStateFrom(deliveredDown, 'monitor-1'), true)
  assert.equal(recovered.getIncident('monitor-1', 0).end, 200)
  assert.equal(recovered.wasDownNotificationSent('monitor-1', 100), true)
  assert.deepEqual(recovered.getPendingRecovery('monitor-1'), {
    incidentStart: 100,
    recoveredAt: 200,
  })
})

test('D1 compare-and-set rejects a stale whole-state write', async () => {
  const db = {
    value: 'initial',
    prepare(sql) {
      return {
        bind: (...args) => ({
          run: async () => {
            if (sql.startsWith('UPDATE') && db.value === args[2]) {
              db.value = args[0]
              return { meta: { changes: 1 } }
            }
            return { meta: { changes: 0 } }
          },
        }),
      }
    },
  }
  const env = { UPTIMEFLARE_D1: db }

  assert.equal(await setToStoreIfUnchanged(env, 'state', 'batch-a', 'initial'), true)
  assert.equal(await setToStoreIfUnchanged(env, 'state', 'batch-b', 'initial'), false)
  assert.equal(db.value, 'batch-a')
})

test('notification marker changes bypass the non-batched write cooldown', () => {
  assert.equal(
    shouldPersistState({
      batched: false,
      statusChanged: false,
      notificationStateChanged: true,
      currentTime: 61,
      lastUpdate: 60,
      cooldownMinutes: 3,
    }),
    true
  )
})

test('webhook arrays are acknowledged only when every destination succeeds', () => {
  assert.equal(allWebhookDeliveriesSucceeded([]), false)
  assert.equal(allWebhookDeliveriesSucceeded([true, false]), false)
  assert.equal(allWebhookDeliveriesSucceeded([true, true]), true)
})
