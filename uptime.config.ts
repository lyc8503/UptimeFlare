const config = {
  // Your locale for server-side callback. (client-side will always follow browser settings)
  dateLocale: 'zh-CN',
  // Your timezone for server-side callback. (client-side will always follow browser settings)
  timezone: 'Asia/Shanghai',
  page: {
    // Title for your status page
    title: "lyc8503's Status Page",
    // Links shown at the header of your status page, could set `highlight` to `true`
    links: [
      { link: 'https://github.com/lyc8503', label: 'GitHub' },
      { link: 'https://blog.lyc8503.site/', label: 'Blog' },
      { link: 'mailto:me@lyc8503.site', label: 'Email Me', highlight: true },
    ],
  },
  callback: async (statusChangeMsg: string) => {
    // Write any typescript here
    // Example `statusChangeMsg` string:
    // "❌My Blog went down at 2023/11/18 14:08:59 with error Timeout after 10000ms"
    // "✔️My Blog came back up at 2023/11/18 14:10:48 after 2 minutes of downtime"
    // Example:
    // await fetch('https://api.example.com/callback?msg=' + statusChangeMsg)
  },
  // Define all your monitors here
  monitors: [
    // Example HTTP Monitor
    {
      // `id` should be unique, history will be kept if the `id` remains constant
      id: 'foo_monitor',
      // `name` is used at status page and callback message
      name: 'My API Monitor',
      // `method` should be a valid HTTP Method
      method: 'POST',
      // `target` is a valid URL
      target: 'https://example.com',
      // [OPTIONAL] `tooltip` is only used at status page to show a tooltip
      tooltip: 'This is a tooltip for this monitor',
      // [OPTIONAL] `expectedCodes` is an array of acceptable HTTP response codes, if not specified, default to 2xx
      expectedCodes: [200],
      // [OPTIONAL] `timeout` in millisecond, if not specified, default to 10000
      timeout: 10000,
      // [OPTIONAL] headers to be sent
      headers: {
        'User-Agent': 'Uptimeflare',
        Authorization: 'Bearer YOUR_TOKEN_HERE',
      },
      // [OPTIONAL] body to be sent
      body: 'Hello, world!',
      // [OPTIONAL] if specified, the response must contains the keyword to be considered as operational.
      responseKeyword: 'success',
      // [OPTIONAL] if specified, the check will run in your specified region,
      // refer to docs https://github.com/lyc8503/UptimeFlare/wiki/Geo-specific-checks-setup before setting this value
      checkLocationWorkerRoute: 'https://xxx.example.com'
    },
    // Example TCP Monitor
    {
      id: 'test_tcp_monitor',
      name: 'Example TCP Monitor',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      target: '1.2.3.4:22',
      tooltip: 'My production server SSH',
      timeout: 5000,
    },
  ],
}

// Don't forget this, otherwise compilation fails.
export default config
