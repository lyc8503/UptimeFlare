// Refer to https://github.com/lyc8503/UptimeFlare/wiki/Configuration for detailed information

const config = {
  dateLocale: 'zh-CN',
  timezone: 'Asia/Shanghai',
  page: {
    title: "lyc8503's Status Page",
    links: [
      { link: 'https://github.com/lyc8503', label: 'GitHub' },
      { link: 'https://blog.lyc8503.site/', label: 'Blog' },
      { link: 'mailto:me@lyc8503.site', label: 'Email Me', highlight: true },
    ],
  },
  callback: async (statusChangeMsg: string) => {
    // Add your own callback here
  },
  monitors: [
    {
      id: 'github',
      name: 'Github Monitor',
      method: 'GET',
      target: 'https://github.com'
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Monitor',
      method: 'GET',
      target: 'https://cloudflare.com',
      timeout: 5000,
      headers: {
        'User-Agent': 'Uptimeflare',
      }
    },
    {
      id: 'sshtest',
      name: 'SSH Server',
      method: 'TCP_PING',
      target: '1.1.1.1:22',
      timeout: 5000
    }
  ]
}

export default config
