import { connect } from 'cloudflare:sockets'
import config from '../../uptime.config'
import { fetchTimeout, getWorkerLocation } from './util'
import { MonitorState, MonitorTarget } from "../../uptime.types"

export interface Env {
	UPTIMEFLARE_STATE: KVNamespace
}

async function getStatus(monitor: MonitorTarget): Promise<{ ping: number; up: boolean; err: string }> {

	let status = {
		ping: 0,
		up: false,
		err: "Unknown"
	}

	const startTime = Date.now()

	if (monitor.method === "TCP_PING") {
		// TCP port endpoint monitor
		// TODO: TCP timeout
		try {
			const [hostname, port] = monitor.target.split(":")
			
			// Write "PING" and read response
			const socket = connect({ hostname: hostname, port: Number(port) })
			const reader = socket.readable.getReader()
			const writer = socket.writable.getWriter()
			await writer.write(new TextEncoder().encode("PING\n"))
			await reader.read()  // The read here is necessary to actually test the connection, however it may hang if the server doesn't respond
			await socket.close()

			// TODO: should throw an error here but it doesn't?
			await socket.closed
			
			console.log(`${monitor.name} connected to ${monitor.target}`)

			status.ping = Date.now() - startTime
			status.up = true
			status.err = ""
		} catch (e: Error | any) {
			console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
			status.up = false
			status.err = e.name + ": " + e.message
		}
	} else {
		// HTTP endpoint monitor
		try {
			const response = await fetchTimeout(monitor.target, monitor.timeout || 10000, {
				method: monitor.method,
				headers: monitor.headers,
				body: monitor.body
			})
			
			console.log(`${monitor.name} responded with ${response.status}`)
			status.ping = Date.now() - startTime
			status.up = true
			status.err = ""
		} catch (e: any) {
			console.log(`${monitor.name} errored with ${e.name}: ${e.message}`)
			if (e.name === "AbortError") {
				status.ping = monitor.timeout || 10000
				status.up = false
				status.err = `Timeout after ${status.ping}ms`
			} else {
				status.up = false
				status.err = e.name + ": " + e.message
			}
		}
	}

	return status
}


export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const workerLocation = await getWorkerLocation()
		console.log(`Running scheduled event on ${workerLocation}...`)

		// Read state, set init state if it doesn't exist
		let state = await env.UPTIMEFLARE_STATE.get("state", { type: 'json' }) as unknown as MonitorState || {
			lastUpdate: 0,
			overallUp: 0,
			overallDown: 0,
			incident: {},
			latency: {}
		} as MonitorState
		state.overallDown = 0
		state.overallUp = 0

		// Check each monitor
		// TODO: callback exception handler
		// TODO: advanced status check
		// TODO: concurrent status check
		for (const monitor of config.monitors) {
			console.log(`[${workerLocation}] Checking ${monitor.name}...`)

			const status = await getStatus(monitor)
			const currentTimeSecond = Math.round(Date.now() / 1000)

			// Update counters
			status.up ? state.overallUp++ : state.overallDown++

			// Update incidents
			let incidentList = state.incident[monitor.id] || []
			const lastIncident = incidentList.slice(-1)[0]
			const timeString = new Date().toLocaleString(config.dateLocale, { timeZone: config.timezone })

			if (status.up) {
				// Current status is up
				// close existing incident if any
				if (lastIncident && lastIncident.end === undefined) {
					lastIncident.end = currentTimeSecond
					await config.callback(`✔️${monitor.name} came back up at ${timeString} after ${Math.round((lastIncident.end - lastIncident.start.slice(-1)[0]) / 60)} minutes of downtime`)
				}
			} else {
				// Current status is down
				// open new incident if not already open
				if (lastIncident === undefined || lastIncident?.end !== undefined) {
					incidentList.push({
						start: [currentTimeSecond],
						end: undefined,
						error: [status.err]
					})
					await config.callback(`❌${monitor.name} went down at ${timeString} with error ${status.err}`)
				} else if (lastIncident && lastIncident.end === undefined && lastIncident.error.slice(-1)[0] !== status.err) {
					// append if the error message changes
					lastIncident.start.push(currentTimeSecond)
					lastIncident.error.push(status.err)
					await config.callback(`❌${monitor.name} is still down at ${timeString} with error ${status.err}`)
				}
			}
			state.incident[monitor.id] = incidentList
			
			// append to latency data
			let latencyLists = state.latency[monitor.id] || {
				recent: [],
				all: []
			}
			
			const record = {
				loc: workerLocation,
				ping: status.ping,
				time: currentTimeSecond
			}
			latencyLists.recent.push(record)
			if (latencyLists.all.length === 0 || currentTimeSecond - latencyLists.all[0].time > 60 * 60) {
				latencyLists.all.push(record)
			}
			
			// discard old data
			while (latencyLists.recent[0]?.time < currentTimeSecond - 12 * 60 * 60) {
				latencyLists.recent.shift()
			}
			while (latencyLists.all[0]?.time < currentTimeSecond - 90 * 24 * 60 * 60) {
				latencyLists.all.shift()
			}
			state.latency[monitor.id] = latencyLists
		}

		// Update state
		state.lastUpdate = Math.round(Date.now() / 1000)
		await env.UPTIMEFLARE_STATE.put("state", JSON.stringify(state))
	},
}
