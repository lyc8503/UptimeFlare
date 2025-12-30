import { Env } from ".";

export async function getFromStore(env: Env, key: string): Promise<string | null> {
    const stmt = env.UPTIMEFLARE_D1.prepare("SELECT value FROM uptimeflare WHERE key = ?")
    const result = await stmt.bind(key).first<{ value: string }>()

    if (!result) {
        return await env.UPTIMEFLARE_STATE.get(key)
    }

    return result?.value || null
}

export async function setToStore(env: Env, key: string, value: string): Promise<void> {
    const stmt = env.UPTIMEFLARE_D1.prepare("INSERT INTO uptimeflare (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;")
    await stmt.bind(key, value).run()
}
