const pageConfig = {
  title: "凌云·LinYun 服务状态",
  links: [
    { link: 'https://www.linyunlink.top/links/', label: '友情链接'},
    { link: 'https://www.linyunlink.top/', label: '博客', highlight: true },
  ],
}

const workerConfig = {
  // Write KV at most every 3 minutes unless the status changed.
  kvWriteCooldownMinutes: 10,
  // Define all your monitors here
  monitors: [
    // ==========[凌云服务监控]==========
    {
      id: 'linyun_blog_monitor',
      name: '凌云·LinYun 博客',
      method: 'GET',
      target: 'https://www.linyunlink.top/',
      tooltip: '凌云·LinYun 博客',
      statusPageLink: 'https://www.linyunlink.top/',
    },
    {
      id: 'linyun_twikoo_monitor',
      name: '凌云·LinYun Twikoo评论系统',
      method: 'POST',
      target: 'https://twikoo.linyunlink.top/',
      tooltip: '凌云·LinYun Twikoo 评论服务后端',
      statusPageLink: 'https://twikoo.linyunlink.top/',
    },
    {
      id: 'linyun_image_monitor',
      name: '凌云·LinYun 图片托管站',
      method: 'GET',
      target: 'https://image.linyunlink.top/',
      tooltip: '凌云·LinYun 图片托管站',
      statusPageLink: 'https://image.linyunlink.top/',
    }
  ],
  callbacks: {
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

      // This will not follow the grace period settings and will be called immediately when the status changes
      // You need to handle the grace period manually if you want to implement it
    },
    onIncident: async (
      env: any,
      monitor: any,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // This callback will be called EVERY 1 MINTUE if there's an on-going incident for any monitor
      // Write any Typescript code here
    },
  },
}

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
