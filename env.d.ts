declare global {
  interface CloudflareEnv {
    UPTIMEFLARE_D1: D1Database
    CF_ACCESS_TEAM_DOMAIN?: string
    CF_ACCESS_AUD?: string
  }
  namespace NodeJS {
    interface ProcessEnv {
      UPTIMEFLARE_D1: D1Database
      UPTIMEFLARE_STATE: KVNamespace
    }
  }
}

export {}
