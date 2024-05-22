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
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_ab',
      name: 'Gptonglitch_ab',
      method: 'GET',
      target: 'https://debonair-sly-sternum.glitch.me/',
      tooltip: 'Monitor 2 - debonair-sly-sternum',
      statusPageLink: 'https://debonair-sly-sternum.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_ac',
      name: 'Gptonglitch_ac',
      method: 'GET',
      target: 'https://inexpensive-internal-seatbelt.glitch.me/',
      tooltip: 'Monitor 3 - inexpensive-internal-seatbelt',
      statusPageLink: 'https://inexpensive-internal-seatbelt.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_ad',
      name: 'Gptonglitch_ad',
      method: 'GET',
      target: 'https://grandiose-ambiguous-slip.glitch.me/',
      tooltip: 'Monitor 4 - grandiose-ambiguous-slip',
      statusPageLink: 'https://grandiose-ambiguous-slip.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_ae',
      name: 'Gptonglitch_ae',
      method: 'GET',
      target: 'https://tundra-abiding-produce.glitch.me/',
      tooltip: 'Monitor 5 - tundra-abiding-produce',
      statusPageLink: 'https://tundra-abiding-produce.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_af',
      name: 'Gptonglitch_af',
      method: 'GET',
      target: 'https://jewel-opaque-sword.glitch.me/',
      tooltip: 'Monitor 6 - jewel-opaque-sword',
      statusPageLink: 'https://jewel-opaque-sword.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_ag',
      name: 'Gptonglitch_ag',
      method: 'GET',
      target: 'https://sideways-flashy-turret.glitch.me/',
      tooltip: 'Monitor 7 - sideways-flashy-turret',
      statusPageLink: 'https://sideways-flashy-turret.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_aofan',
      name: 'Gptonglitch_aofan',
      method: 'GET',
      target: 'https://trite-goldenrod-cycle.glitch.me/',
      tooltip: 'Monitor 8 - trite-goldenrod-cycle',
      statusPageLink: 'https://trite-goldenrod-cycle.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
    {
      id: 'Gptonglitch_linbmv',
      name: 'Gptonglitch_linbmv',
      method: 'GET',
      target: 'https://motley-hickory-brian.glitch.me/',
      tooltip: 'Monitor 9 - motley-hickory-brian',
      statusPageLink: 'https://motley-hickory-brian.glitch.me/',
      expectedCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 299],
      timeout: 10000,
      intervalSeconds: 299,
    },
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
        // Write any Types
