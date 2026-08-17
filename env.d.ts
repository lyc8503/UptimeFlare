declare global {
  interface CloudflareEnv {
    UPTIMEFLARE_D1: D1Database
    REMOTE_CHECKER_DO: DurableObjectNamespace
  }
}

export {}

