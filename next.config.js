/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig

if (process.env.NODE_ENV === 'development') {
  const { setupDevBindings } = require('@cloudflare/next-on-pages/next-dev')

  // Get the repository name for KV namespace binding
  const path = require('path');
  let repoName = path.basename(process.cwd()) || 'uptimeflare';

  // Convert to lowercase for Cloudflare compatibility
  repoName = repoName.toLowerCase();

  setupDevBindings({
    bindings: {
      UPTIMEFLARE_STATE: {
        type: 'kv',
        id: 'UPTIMEFLARE_STATE'
      }
    }
  })
}
