const pageConfig = {
  // Title for your status page
  title: "LinHome's Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://trite-goldenrod-cycle.glitch.me/', label: 'Fan' },
    { link: 'https://motley-hickory-brian.glitch.me/', label: 'Linbmv' },
    { link: 'mailto:ad@040103.xyz', label: 'Email Me', highlight: true },
  ],
}

const workerConfig = {
  // Write KV at most every 3 minutes unless the status changed.
  kvWriteCooldownMinutes: 3,
  notification: {
    appriseApiServer: "https://apprise.example.com/notify",
    recipientUrl: "tgram://bottoken/ChatID",
    timeZone: "Asia/Singapore",
    gracePeriod: 5,
  },
  // Define all your monitors here
  monitors: [
    {
      id: 'Gptonglitch_aa',
      name: 'Gptonglitch_aa',
      method: 'GET',
      target: 'https://admitted-marked-chicory.glitch.me/',
      tooltip: 'Monitor 1 - admitted-marked-chicory',
      statusPageLink: 'https://admitted-marked-chicory.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
    },
    // 其他 monitors...
  ],
  callbacks: {
    notification: {
      onStatusChange: async (
        env: any,
        monitor: any,
        isUp: boolean,
        timeIncidentStart: number,
        timeNow: number,
        reason: string
      ) => {
        // This callback will be called when there's a status change for any monitor
        // Write any Typescript code here
      },
      onIncident: async (
        env: any,
        monitor: any,
        timeIncidentStart: number,
        timeNow: number,
        reason: string
      ) => {
        // This callback will be called EVERY 1 MINUTE if there's an on-going incident for any monitor
        // Write any Typescript code here
      },
    }
  }
};

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
