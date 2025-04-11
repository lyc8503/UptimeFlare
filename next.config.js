/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    config.externals["cloudflare:sockets"] = "cloudflare:sockets"
    return config
  },
}

module.exports = nextConfig

if (process.env.NODE_ENV === 'development') {
  const { setupDevBindings } = require('@cloudflare/next-on-pages/next-dev')
  setupDevBindings({
    bindings: {
      UPTIMEFLARE_STATE: {
        type: 'kv',
        id: 'UPTIMEFLARE_STATE'
      }
    }
  })
}
