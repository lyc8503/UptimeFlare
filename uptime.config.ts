import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  // Title for your status page
  title: "海口希灵赛斯企业资源监控",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://xinnew.top', label: '企业门户' },
    { link: 'https://blog.csdn.net/qq_73252299?spm=1011.2124.3001.5343', label: '技术博客' },
    { link: 'https://work.weixin.qq.com/kfid/kfc5c60f929a2e703af', label: '获取定制方案', highlight: true },
  ],
  // [OPTIONAL] Group your monitors
  // If not specified, all monitors will be shown in a single list
  // If specified, monitors will be grouped and ordered, not-listed monitors will be invisble (but still monitored)
  group: {
    '🌐 企业服务集群': ['www.xinnew.top', 'mail.sec.hn.cn','sec.hn.cn','www.sec.hn.cn'],
    '🔐 合作业务集群': ['ms.sec.hn.cn','htc-ms.xinnew.top','chats.sec.hn.cn','zcz.xinnew.top','doraemon.xinnew.top'],
    '🛡️ 公共服务资源': ['gemini-sg.xinnew.top','gemini.xinnew.top','new-xl.xinnew.top','xl-d0h-server.xinnew.top'],
    '🌐 数据接口': ['passport.xinnew.top','69yun69.com','passport-us.sec.hn.cn', 'passport-sg.sec.hn.cn','doh.sec.hn.cn','ningmengyun.sec.hn.cn'],
  },
}

const workerConfig: WorkerConfig = {
  // Write KV at most every 3 minutes unless the status changed
  kvWriteCooldownMinutes: 3,
  // Enable HTTP Basic auth for status page & API by uncommenting the line below, format `<USERNAME>:<PASSWORD>`
  // passwordProtection: 'username:password',
  // Define all your monitors here
  monitors: [
    {
      id: 'www.xinnew.top',
      name: '全球门户网站',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://www.xinnew.top/',
      timeout: 10000,
    },
    {
      id: 'www.sec.hn.cn',
      name: '中国大陆门户网站',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://www.sec.hn.cn/',
      timeout: 10000,
    },
    {
      id: 'sec.hn.cn',
      name: '内容发布平台',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://sec.hn.cn/',
      timeout: 10000,
    },
    {
      id: 'gemini-sg.xinnew.top',
      name: 'GeminiAPI网关1（GET方式监测，0可用性属于正常现象，下方有数值曲线即表示正常）',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://gemini.xinnew.top',
      timeout: 10000,
    },
    {
      id: 'gemini.xinnew.top',
      name: 'GeminiAPI网关2（GET方式监测，0可用性属于正常现象，下方有数值曲线即表示正常）',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://gemini-sg.xinnew.top',
      timeout: 10000,
    },
    {
      id: 'ms.sec.hn.cn',
      name: '海口旅游职业学院iHAIKOU中国大陆站',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://ms.sec.hn.cn',
      timeout: 10000,
    },
    {
      id: 'htc-ms.xinnew.top',
      name: '海口旅游职业学院iHAIKOU国际站',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://htc-ms.xinnew.top',
      timeout: 10000,
    },
    {
      id: 'new-xl.xinnew.top',
      name: '实时新闻聚合服务',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://new-xl.xinnew.top/',
      timeout: 10000,
    },
    {
      id: 'xl-d0h-server.xinnew.top',
      name: 'DNS over HTTPS (DoH) Search 服务',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://xl-d0h-server.xinnew.top/',
      timeout: 10000,
    },
    {
      id: 'zcz.xinnew.top',
      name: 'ZCZ博客访问监测',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://zcz.xinnew.top/',
      timeout: 10000,
    },
    {
      id: 'chats.sec.hn.cn',
      name: '海口旅游职业学院AI智慧推荐官可用性监测',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://chats.sec.hn.cn:29467/ui/chat/7c45cd0ede07f829',
      timeout: 10000,
    },
    {
      id: 'passport-us.sec.hn.cn',
      name: '美国',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://passport-us.sec.hn.cn/#/login?redirect=/info/account',
      timeout: 10000,
    },
    {
      id: 'passport-sg.sec.hn.cn',
      name: '新加坡',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://passport-sg.sec.hn.cn/',
      timeout: 10000,
    },
    {
      id: '69yun69.com',
      name: '供应商监测',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://69yun69.com/auth/login',
      timeout: 10000,
    },
    {
      id: 'mail.sec.hn.cn',
      name: '企业邮箱服务',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://www.apple.com/hk/',
      timeout: 10000,
    },
    {
      id: 'doraemon.xinnew.top',
      name: 'CSY博客301网关',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://doraemon.xinnew.top',
      timeout: 10000,
    },
    {
      id: 'passport.xinnew.top',
      name: '数据跨境安全审查网关',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://passport.xinnew.top/',
      timeout: 10000,
    },
    {
      id: 'doh.sec.hn.cn',
      name: 'DOH核查',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'https://doh.sec.hn.cn/dns-query',
      timeout: 100,
    },
      {
      id: 'ningmengyun.sec.hn.cn',
      name: 'DOH核查',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'GET',
      // `target` should be `host:port` for tcp monitors
      target: 'http://ningmengyun.sec.hn.cn/',
      timeout: 100,
    },
  ],
  notification: {
    // [Optional] apprise API server URL
    // if not specified, no notification will be sent
    appriseApiServer: 'https://apprise.example.com/notify',
    // [Optional] recipient URL for apprise, refer to https://github.com/caronc/apprise
    // if not specified, no notification will be sent
    recipientUrl: 'tgram://bottoken/ChatID',
    // [Optional] timezone used in notification messages, default to "Etc/GMT"
    timeZone: 'Asia/Shanghai',
    // [Optional] grace period in minutes before sending a notification
    // notification will be sent only if the monitor is down for N continuous checks after the initial failure
    // if not specified, notification will be sent immediately
    gracePeriod: 5,
    // [Optional] disable notification for monitors with specified ids
    skipNotificationIds: ['foo_monitor', 'bar_monitor'],
  },
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

// You can define multiple maintenances here
// During maintenance, an alert will be shown at status page
// Also, related downtime notifications will be skipped (if any)
// Of course, you can leave it empty if you don't need this feature
// const maintenances: MaintenanceConfig[] = []
const maintenances: MaintenanceConfig[] = [
  {
    // [Optional] Monitor IDs to be affected by this maintenance
    monitors: ['foo_monitor', 'bar_monitor'],
    // [Optional] default to "Scheduled Maintenance" if not specified
    title: 'Test Maintenance',
    // Description of the maintenance, will be shown at status page
    body: 'This is a test maintenance, server software upgrade',
    // Start time of the maintenance, in UNIX timestamp or ISO 8601 format
    start: '2025-04-27T00:00:00+08:00',
    // [Optional] end time of the maintenance, in UNIX timestamp or ISO 8601 format
    // if not specified, the maintenance will be considered as on-going
    end: '2025-04-30T00:00:00+08:00',
    // [Optional] color of the maintenance alert at status page, default to "yellow"
    color: 'blue',
  },
]

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig, maintenances }
