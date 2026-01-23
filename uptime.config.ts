// This is a simplified example config file for quickstart
// Some not frequently used features are omitted/commented out here
// For a full-featured example, please refer to `uptime.config.full.ts`

// Don't edit this line
import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  // Title for your status page
  title: "PanSo 节点服务状态监测",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://panso.icu', label: '盘搜 PanSo' },
  ],
}

const workerConfig: WorkerConfig = {
  // Define all your monitors here
  monitors: [
    // Pangolin 监控
    {
      id: 'pangolin_monitor',
      name: 'Pangolin',
      method: 'GET',
      target: 'https://panso.icu',
      tooltip: 'Pangolin节点分发状态',
      statusPageLink: 'https://panso.icu',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },
    // EdgeOne 监控
    {
      id: 'edgeone_monitor',
      name: 'EdgeOne',
      method: 'GET',
      target: 'https://search.panso.icu',
      tooltip: 'EdgeOne节点分发状态',
      statusPageLink: 'https://search.panso.icu',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },
    // Cloudflare 监控
    {
      id: 'cloudflare_monitor',
      name: 'Cloudflare',
      method: 'GET',
      target: 'https://sea.lrchimedes.fun',
      tooltip: 'Cloudflare节点分发状态',
      statusPageLink: 'https://sea.lrchimedes.fun',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },
    // Vercel 监控
    {
      id: 'vercel_monitor',
      name: 'Vercel',
      method: 'GET',
      target: 'https://sea.panso.icu',
      tooltip: 'Vercel节点分发状态',
      statusPageLink: 'https://sea.panso.icu',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },
    // Netlify 监控
    {
      id: 'netlify_monitor',
      name: 'Netlify',
      method: 'GET',
      target: 'https://search.lrchimedes.cyou',
      tooltip: 'Netlify节点分发状态',
      statusPageLink: 'https://search.lrchimedes.cyou',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },   
     // Iepose-S 监控
    {
      id: 'iepose_s_monitor',
      name: 'Iepose-S',
      method: 'GET',
      target: 'https://sooo.iepose.cn',
      tooltip: 'Iepose-S节点分发状态',
      statusPageLink: 'https://sooo.iepose.cn',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
      responseKeyword: '<title>盘搜  - panso.icu 都在用的网盘资源搜索，资源多丨更新快丨无广告丨永久免费</title>',
    },
    // Iepose-L 监控 (第一个)
    {
      id: 'iepose_l_monitor_1',
      name: 'Iepose-L',
      method: 'GET',
      target: 'https://lrchime.iepose.cn',
      tooltip: 'Iepose-L节点分发状态',
      statusPageLink: 'https://lrchime.iepose.cn',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
      responseKeyword: '<title>盘搜  - panso.icu 都在用的网盘资源搜索，资源多丨更新快丨无广告丨永久免费</title>',
    },
    // 延迟测速 监控
    {
      id: 'speed_test_monitor',
      name: '延迟测速',
      method: 'GET',
      target: 'https://speed-t.lrchimedes.fun',
      tooltip: 'PanSo.icu各节点访问延迟测速',
      statusPageLink: 'https://speed-t.lrchimedes.fun',
      timeout: 48000,
      expectedCodes: [200, 201, 202, 203, 204, 205, 206],
    },
  ],
  // [Optional] Notification settings
  notification: {
    // [Optional] Notification webhook settings, if not specified, no notification will be sent
    // More info at Wiki: https://github.com/lyc8503/UptimeFlare/wiki/Setup-notification
    webhook: {
      // [Required] webhook URL (example: Telegram Bot API)
      url: 'https://api.telegram.org/bot123456:ABCDEF/sendMessage',
      // [Optional] HTTP method, default to 'GET' for payloadType=param, 'POST' otherwise
      // method: 'POST',
      // [Optional] headers to be sent
      // headers: {
      //   foo: 'bar',
      // },
      // [Required] Specify how to encode the payload
      // Should be one of 'param', 'json' or 'x-www-form-urlencoded'
      // 'param': append url-encoded payload to URL search parameters
      // 'json': POST json payload as body, set content-type header to 'application/json'
      // 'x-www-form-urlencoded': POST url-encoded payload as body, set content-type header to 'x-www-form-urlencoded'
      payloadType: 'x-www-form-urlencoded',
      // [Required] payload to be sent
      // $MSG will be replaced with the human-readable notification message
      payload: {
        chat_id: 12345678,
        text: '$MSG',
      },
      // [Optional] timeout calling this webhook, in millisecond, default to 5000
      timeout: 10000,
    },
    // [Optional] timezone used in notification messages, default to "Etc/GMT"
    timeZone: 'Asia/Shanghai',
    // [Optional] grace period in minutes before sending a notification
    // notification will be sent only if the monitor is down for N continuous checks after the initial failure
    // if not specified, notification will be sent immediately
    gracePeriod: 5,
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
    start: '2020-01-01T00:00:00+08:00',
    // [Optional] end time of the maintenance, in UNIX timestamp or ISO 8601 format
    // if not specified, the maintenance will be considered as on-going
    end: '2050-01-01T00:00:00+08:00',
    // [Optional] color of the maintenance alert at status page, default to "yellow"
    color: 'blue',
  },
]

// Don't edit this line
export { maintenances, pageConfig, workerConfig }
