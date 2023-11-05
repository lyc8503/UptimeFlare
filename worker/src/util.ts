async function getWorkerLocation() {
	const res = await fetch('https://cloudflare.com/cdn-cgi/trace')
	const text = await res.text()

	const colo = /^colo=(.*)$/m.exec(text)?.[1]
	return colo
}

const fetchTimeout = (
	url: string,
	ms: number,
	{ signal, ...options }: RequestInit<RequestInitCfProperties> | undefined = {}
): Promise<Response> => {
	const controller = new AbortController()
	const promise = fetch(url, { signal: controller.signal, ...options })
	if (signal) signal.addEventListener('abort', () => controller.abort())
	const timeout = setTimeout(() => controller.abort(), ms)
	return promise.finally(() => clearTimeout(timeout))
}

function withTimeout<T>(millis: number, promise: Promise<T>): Promise<T> {
	const timeout = new Promise<T>((resolve, reject) =>
		setTimeout(() => reject(new Error(`Promise timed out after ${millis}ms`)), millis)
	)

	return Promise.race([promise, timeout])
}

export { getWorkerLocation, fetchTimeout, withTimeout }
