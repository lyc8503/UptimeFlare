declare global {
	namespace NodeJS {
		interface ProcessEnv {
			UPTIMEFLARE_STATE: KVNamespace;
		}
	}
}

export {};
