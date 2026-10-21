import adminConfig from '../deploy/admin.json'

// The canonical origin is public configuration. Reject malformed redirect targets.
export function getAdminOrigin() {
  try {
    const url = new URL(adminConfig.adminOrigin)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return undefined
    return url.origin
  } catch {
    return undefined
  }
}
