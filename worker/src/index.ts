import { DurableObject } from 'cloudflare:workers'
import { MonitorTarget } from '../../types/config'
import { workerConfig } from '../../uptime.config'
import { doMonitor, getStatus } from './monitor'
import { formatAndNotify, getWorkerLocation } from './util'
import { CompactedMonitorStateWrapper, getFromStore, setToStoreIfUnchanged } from './store'
import { selectMonitorBatch } from './batch'
import { shouldSendDownNotification } from './notification'
import { shouldPersistState } from './persistence'
import pLimit from 'p-limit'

export interface Env {
  REMOTE_CHECKER_DO: DurableObjectNamespace<RemoteChecker>
  UPTIMEFLARE_D1: D1Database
}

async function persistStateWithRetry(
  env: Env,
  initialStoredValue: string | null,
  processedState: CompactedMonitorStateWrapper,
  processedMonitorIds: string[],
  currentTimeSecond: number
) {
  let expectedValue = initialStoredValue
  let candidate = processedState

  for (let attempt = 1; attempt <= 5; attempt++) {
    candidate.recalculateOverallStatus(workerConfig.monitors.map((monitor) => monitor.id))
    candidate.data.lastUpdate = Math.max(candidate.data.lastUpdate, currentTimeSecond)

    if (
      await setToStoreIfUnchanged(
        env,
        'state',
        candidate.getCompactedStateStr(),
        expectedValue
      )
    ) {
      return
    }

    console.log(`State changed concurrently; rebasing selected batch (attempt ${attempt}/5)...`)
    const latestValue = await getFromStore(env, 'state')
    const latestState = new CompactedMonitorStateWrapper(latestValue)
    for (const monitorId of processedMonitorIds) {
      latestState.copyMonitorStateFrom(processedState, monitorId)
    }
    expectedValue = latestValue
    candidate = latestState
  }

  throw new Error('Unable to persist monitor state after 5 concurrent update attempts')
}

const Worker = {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const workerLocation = (await getWorkerLocation()) || 'ERROR'
    console.log(`Running scheduled event on ${workerLocation}...`)

    // Create a wrapped MonitorState from stored compacted state
    const initialStoredState = await getFromStore(env, 'state')
    const state = new CompactedMonitorStateWrapper(initialStoredState)

    const monitorBatch = selectMonitorBatch(
      workerConfig.monitors,
      workerConfig.monitorBatchSize,
      event.scheduledTime
    )
    console.log(
      `Checking monitor batch ${monitorBatch.batchIndex + 1}/${monitorBatch.batchCount}: ${monitorBatch.monitors
        .map((monitor) => monitor.id)
        .join(', ')}`
    )

    let statusChanged = false
    let notificationStateChanged = false
    const currentTimeSecond = Math.round(Date.now() / 1000)

    // Parallel check multiple monitors
    // Max concurrent connection is 6 limited by Cloudflare Workers, we use 5 here to be safe
    type CheckResult = { id: string; location: string; status: { ping: number; up: boolean; err: string } }
    let checkQueue: Promise<CheckResult>[] = []
    let checkResult: Record<string, CheckResult> = {};
    const limit = pLimit(5);
    for (const monitor of monitorBatch.monitors) {
      checkQueue.push(limit(() => doMonitor(monitor, workerLocation, env)))
    }
    for (const result of await Promise.all(checkQueue)) {
      checkResult[result.id] = result
    }

    // Update each monitor's state based on check results
    for (const monitor of monitorBatch.monitors) {
      console.log(`Processing monitor result: ${monitor.name} (${monitor.id})`)

      let monitorStatusChanged = false
      const { location: checkLocation, status } = checkResult[monitor.id]

      // Retry recovery delivery independently from the current status. A
      // failed webhook remains pending until every configured destination
      // accepts it.
      const pendingRecovery = state.getPendingRecovery(monitor.id)
      if (pendingRecovery) {
        try {
          const recoverySent = await formatAndNotify(
            monitor,
            true,
            pendingRecovery.incidentStart,
            pendingRecovery.recoveredAt,
            'OK'
          )
          if (recoverySent) {
            state.clearPendingRecovery(monitor.id)
            state.clearDownNotificationSent(monitor.id, pendingRecovery.incidentStart)
            notificationStateChanged = true
          }
        } catch (e) {
          console.log(`Error retrying recovery notification for ${monitor.id}:`)
          console.log(e)
        }
      }

      const pendingErrorChange = state.getPendingErrorChange(monitor.id)
      if (pendingErrorChange) {
        try {
          const errorChangeSent = await formatAndNotify(
            monitor,
            false,
            pendingErrorChange.incidentStart,
            currentTimeSecond,
            pendingErrorChange.reason
          )
          if (errorChangeSent) {
            state.clearPendingErrorChange(monitor.id)
            notificationStateChanged = true
          }
        } catch (e) {
          console.log(`Error retrying error-change notification for ${monitor.id}:`)
          console.log(e)
        }
      }

      // Update incidents
      // Create a dummy incident to store the start time of the monitoring and simplify logic
      if (state.incidentLen(monitor.id) === 0) {
        state.appendIncident(monitor.id, {
          start: [currentTimeSecond],
          end: currentTimeSecond,
          error: ['dummy'],
        })
      }

      // Then lastIncident here must not be null
      let lastIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)

      if (status.up) {
        // Current status is up
        // close existing incident if any
        if (lastIncident.end === null) {
          lastIncident.end = currentTimeSecond
          // write back the modified last incident
          state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)

          monitorStatusChanged = true
          try {
            if (state.wasDownNotificationSent(monitor.id, lastIncident.start[0])) {
              state.setPendingRecovery(monitor.id, lastIncident.start[0], currentTimeSecond)
              notificationStateChanged = true
              const recoverySent = await formatAndNotify(
                monitor,
                true,
                lastIncident.start[0],
                currentTimeSecond,
                'OK'
              )
              if (recoverySent) {
                state.clearPendingRecovery(monitor.id)
                state.clearDownNotificationSent(monitor.id, lastIncident.start[0])
              }
            } else {
              console.log(
                `Skipping webhook UP notification for ${monitor.name}: no DOWN notification was sent`
              )
            }

            console.log('Calling config onStatusChange callback...')
            await workerConfig.callbacks?.onStatusChange?.(
              env,
              monitor,
              true,
              lastIncident.start[0],
              currentTimeSecond,
              'OK'
            )
          } catch (e) {
            console.log('Error calling callback: ')
            console.log(e)
          }
        }
      } else {
        // Current status is down
        // open new incident if not already open
        if (lastIncident.end !== null) {
          state.appendIncident(monitor.id, {
            start: [currentTimeSecond],
            end: null,
            error: [status.err],
          })
          monitorStatusChanged = true
        } else if (lastIncident.end === null && lastIncident.error.slice(-1)[0] !== status.err) {
          // append if the error message changes
          lastIncident.start.push(currentTimeSecond)
          lastIncident.error.push(status.err)

          // write back the modified last incident
          state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)
          monitorStatusChanged = true
        }

        const currentIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)
        try {
          if (
            shouldSendDownNotification({
              currentTime: currentTimeSecond,
              incidentStart: currentIncident.start[0],
              notifiedIncidentStart: state.data.notifiedIncidentStart?.[monitor.id],
              gracePeriodMinutes: workerConfig.notification?.gracePeriod,
              monitorStatusChanged,
              skipErrorChangeNotification:
                workerConfig.notification?.skipErrorChangeNotification ?? false,
            })
          ) {
            const isFollowupErrorChange =
              state.wasDownNotificationSent(monitor.id, currentIncident.start[0]) &&
              monitorStatusChanged &&
              currentIncident.start[0] !== currentTimeSecond
            if (isFollowupErrorChange) {
              state.setPendingErrorChange(
                monitor.id,
                currentIncident.start[0],
                currentTimeSecond,
                status.err
              )
              notificationStateChanged = true
            }

            const notificationSent = await formatAndNotify(
              monitor,
              false,
              currentIncident.start[0],
              currentTimeSecond,
              status.err
            )
            if (notificationSent) {
              if (!state.wasDownNotificationSent(monitor.id, currentIncident.start[0])) {
                notificationStateChanged = true
              }
              state.markDownNotificationSent(monitor.id, currentIncident.start[0])
              if (isFollowupErrorChange) {
                state.clearPendingErrorChange(monitor.id)
              }
            }
          } else {
            console.log(
              `DOWN notification not due for ${monitor.name} (down for ${
                currentTimeSecond - currentIncident.start[0]
              }s, changed ${monitorStatusChanged}, already sent ${state.wasDownNotificationSent(
                monitor.id,
                currentIncident.start[0]
              )})`
            )
          }

          if (monitorStatusChanged) {
            console.log('Calling config onStatusChange callback...')
            await workerConfig.callbacks?.onStatusChange?.(
              env,
              monitor,
              false,
              currentIncident.start[0],
              currentTimeSecond,
              status.err
            )
          }
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }

        try {
          console.log('Calling config onIncident callback...')
          await workerConfig.callbacks?.onIncident?.(
            env,
            monitor,
            currentIncident.start[0],
            currentTimeSecond,
            status.err
          )
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }
      }

      // append to latency data
      state.appendLatency(monitor.id, {
        loc: checkLocation,
        ping: status.ping,
        time: currentTimeSecond,
      })

      // discard old data
      while (state.getFirstLatency(monitor.id).time < currentTimeSecond - 12 * 60 * 60) {
        state.unshiftLatency(monitor.id)
      }

      // discard old incidents
      while (
        state.incidentLen(monitor.id) > 0 &&
        state.getIncident(monitor.id, 0).end &&
        state.getIncident(monitor.id, 0).end! < currentTimeSecond - 90 * 24 * 60 * 60
      ) {
        state.shiftIncident(monitor.id)
      }

      if (
        state.incidentLen(monitor.id) === 0 ||
        (state.getIncident(monitor.id, 0).start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
          state.getIncident(monitor.id, 0).error[0] != 'dummy')
      ) {
        // put the dummy incident back
        state.unshiftIncident(monitor.id, {
          start: [currentTimeSecond - 90 * 24 * 60 * 60],
          end: currentTimeSecond - 90 * 24 * 60 * 60,
          error: ['dummy'],
        })
      }

      state.setMonitorLastUpdate(monitor.id, Date.now())
      statusChanged ||= monitorStatusChanged
    }

    // Monitors outside this invocation's batch retain their incident and
    // latency history. Recalculate global counters from every monitor with
    // persisted state. Monitors that have not been checked yet count as
    // unavailable so the status page never presents unknown state as healthy.
    state.recalculateOverallStatus(workerConfig.monitors.map((monitor) => monitor.id))

    console.log(
      `statusChanged: ${statusChanged}, lastUpdate: ${state.data.lastUpdate}, currentTime: ${currentTimeSecond}`
    )
    // Update state
    // Batched checks must persist every selected batch so its results are not
    // lost. Non-batched checks retain the configured cooldown.
    if (
      shouldPersistState({
        batched: monitorBatch.batched,
        statusChanged,
        notificationStateChanged,
        currentTime: currentTimeSecond,
        lastUpdate: state.data.lastUpdate,
        cooldownMinutes: workerConfig.kvWriteCooldownMinutes,
      })
    ) {
      console.log('Updating state...')
      await persistStateWithRetry(
        env,
        initialStoredState,
        state,
        monitorBatch.monitors.map((monitor) => monitor.id),
        currentTimeSecond
      )
    } else {
      console.log('Skipping state update due to cooldown period.')
    }
  },
}

export default Worker

export class RemoteChecker extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async getLocationAndStatus(
    monitor: MonitorTarget
  ): Promise<{ location: string; status: { ping: number; up: boolean; err: string } }> {
    const colo = (await getWorkerLocation()) as string
    console.log(`Running remote checker (DurableObject) at ${colo}...`)
    const status = await getStatus(monitor)
    return {
      location: colo,
      status: status,
    }
  }

  async kill() {
    // Throwing an error in `blockConcurrencyWhile` will terminate the Durable Object instance
    // https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile
    this.ctx.blockConcurrencyWhile(async () => {
      throw 'killed'
    })
  }
}
