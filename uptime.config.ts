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
        'User-Agent': 'Uptimeflare',
      },
      body: undefined,
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Monitor',
      method: 'GET',
      target: 'https://cloudflare.com',
      expectedCode: [200],
      timeout: 10000,
      headers: {
        'User-Agent': 'Uptimeflare',
      },
      body: undefined,
    },
    {
      id: 'blog',
      name: 'My Blog',
      method: 'GET',
      target: 'https://blog.lyc8503.site',
      timeout: 10000,
    },
    {
      id: 'pan',
      name: 'My Fileshare',
      method: 'GET',
      target: 'https://pan.lyc8503.site',
      timeout: 10000,
    },
    {
      id: 'server',
      name: 'My Aliyun Server',
      method: 'GET',
      target: 'https://server.lyc8503.site',
      timeout: 10000,
    },
    {
      id: 'homelab',
      name: 'HomeLab',
      method: 'GET',
      target: 'https://lyc8503.cn4.quickconnect.cn/webstation/hello.txt',
      timeout: 10000,
      headers: {
        Cookie: 'type=tunnel;',
      },
      responseKeyword: 'Hello',
    },
    {
      id: 'homessh',
      name: 'HomeSSH',
      method: 'TCP_PING',
      target: '20.24.87.148:22',
      timeout: 10000,
    },
    {
      id: 'broken-test',
      name: 'Ping 1.1.1.1',
      method: 'TCP_PING',
      target: '1.1.1.1:1234',
    },
    {
      id: '404test',
      name: '404-test',
      method: 'GET',
      target: 'https://www.baidu.com/404',
    },
    {
      id: '404test2',
      name: '404-test2',
      method: 'GET',
      target: 'https://www.baidu.com/404',
      expectedCodes: [404, 405],
    },
    {
      id: '404test3',
      name: '404-test3',
      method: 'GET',
      target: 'https://www.baidu.com/404',
      expectedCodes: [404],
      responseKeyword: 'Hello',
    },
  ],
}

export default config
