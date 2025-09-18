import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: "Sylphian's Uptime",
  links: [
    { link: 'https://github.com/Sylphian-Network/', label: 'GitHub' },
  ],
  group: {
    'Website': ['monitor'],
  },
}

const workerConfig: WorkerConfig = {
  kvWriteCooldownMinutes: 3,
  monitors: [
    {
      id: 'monitor',
      name: 'Sylphian.net',
      method: 'GET',
      target: 'https://sylphian.net',
      statusPageLink: 'https://sylphian.net',
      hideLatencyChart: false,
      expectedCodes: [200],
      timeout: 5000,
      headers: {
        'User-Agent': 'Sylphian-Uptimeflare',
      },
      responseKeyword: 'Community platform by XenForo',
      responseForbiddenKeyword: 'bad gateway',
    }
  ],
  notification: {
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

const maintenances: MaintenanceConfig[] = [
  {
    monitors: ['monitor'],
    title: 'Scheduled Maintenance',
    body: 'The server will be undergoing regular maintenance.',
    start: '2025-09-27T11:00:00.000Z',
    end: '2025-09-27T12:00:00.000Z',
    color: 'yellow',
  },
  {
    monitors: ['monitor'],
    title: 'Scheduled Maintenance',
    body: 'The server will be undergoing regular maintenance.',
    start: '2025-09-27T11:00:00.000Z',
    end: '2025-09-27T12:00:00.000Z',
    color: 'white',
  },
  {
    monitors: ['monitor'],
    title: 'Active Scheduled Maintenance',
    body: 'The server will be undergoing regular maintenance.',
    start: '2025-09-12T11:00:00.000Z',
    end: '2025-09-27T12:00:00.000Z',
    color: 'green',
  },
  {
    monitors: ['monitor'],
    title: 'Active Scheduled Maintenance',
    body: 'The server will be undergoing regular maintenance.',
    start: '2025-09-12T11:00:00.000Z',
    end: '2025-09-27T12:00:00.000Z',
    color: 'blue',
  }
]

export { pageConfig, workerConfig, maintenances }