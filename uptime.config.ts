const pageConfig = {
  // Title for your status page
  title: "lyc8503's Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://github.com/lyc8503', label: 'GitHub' },
    { link: 'https://blog.lyc8503.site/', label: 'Blog' },
    { link: 'mailto:me@lyc8503.site', label: 'Email Me', highlight: true },
  ],
}

const workerConfig = {
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
      checkLocationWorkerRoute: 'https://xxx.example.com',
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
  callbacks: {
    onStatusChange: async (
      id: string,
      name: string,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // This callback will be called when any monitor's status changed
      // Write any Typescript code here
      // Example implementation:
      // const timeString = new Date(timeNow * 1000).toLocaleString('zh-CN', {
      //   timeZone: 'Asia/Shanghai',
      // })
      // let statusChangeMsg
      // if (isUp) {
      //   statusChangeMsg = `✔️${name} came back up at ${timeString} after ${Math.round(
      //     (timeNow - timeIncidentStart) / 60
      //   )} minutes of downtime`
      // } else {
      //   statusChangeMsg = `❌${name} was down at ${timeString} with error ${reason}`
      // }
      // await fetch('https://api.example.com/callback?msg=' + statusChangeMsg)
    },
    onIncident: async (
      id: string,
      name: string,
      timeIncidentStart: number,
      timeNow: number,
      currentError: string
    ) => {
      // This callback will be called EVERY 2 MINTUES if there's an on-going incident for any monitor
      // Write any Typescript code here
    },
  },
}

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
