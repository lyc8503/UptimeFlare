

const config = {
  dateLocale: "zh-CN",
  timezone: "Asia/Shanghai",
  page: {
    title: "lyc8503's Status Page"
  },
  callback: async (statusChangeMsg: string) => {
    await fetch('https://server.lyc8503.site/wepush?key=wepushkey&msg=' + statusChangeMsg)
  },
  monitors: [
    {
      id: 'github',
      name: 'Github Monitor',
      method: 'GET',
      target: 'https://github.com',
      expectedCode: [200],
      timeout: 10000,
      headers: {
        "User-Agent": "Uptimeflare"
      },
      body: undefined
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Monitor',
      method: 'GET',
      target: 'https://cloudflare.com',
      expectedCode: [200],
      timeout: 10000,
      headers: {
        "User-Agent": "Uptimeflare"
      },
      body: undefined
    },
    {
      id: 'blog',
      name: 'My Blog',
      method: 'GET',
      target: 'https://blog.lyc8503.site',
      timeout: 10000
    },
    {
      id: 'pan',
      name: 'My Fileshare',
      method: 'GET',
      target: 'https://pan.lyc8503.site',
      timeout: 10000
    },
    {
      id: 'server',
      name: 'My Aliyun Server',
      method: 'GET',
      target: 'https://server.lyc8503.site',
      timeout: 10000
    },
    {
      id: 'broken-test',
      name: 'Ping 1.1.1.1',
      method: 'TCP_PING',
      target: '1.1.1.1:1234'
    },
  ]
} 

export default config
