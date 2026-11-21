// Cottage's status page: what we check and what we've posted.
// A push to main deploys it (see README.md). Field reference: uptime.config.full.ts.
//
// Don't edit this line
import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Cottage status',
  // Buttons on the right of the header.
  links: [
    { link: 'https://cottage.host', label: 'cottage.host' },
    { link: 'https://app.cottage.host', label: 'Your dashboard', highlight: true },
  ],
  // Sections, in order. Every monitor below should appear in exactly one.
  group: {
    Cottage: ['website', 'dashboard'],
    'Apps by region': ['apps-us-east'],
  },
}

const workerConfig: WorkerConfig = {
  // Checks run every minute from Cloudflare's network (the location nearest the worker).
  // The targets go live at launch; until then the page isn't deployed.
  monitors: [
    {
      id: 'website',
      name: 'Website',
      tooltip: 'cottage.host: pricing, the app catalog and docs',
      method: 'GET',
      target: 'https://cottage.host',
      statusPageLink: 'https://cottage.host',
      timeout: 10000,
      headers: { 'User-Agent': 'cottage-status (+https://status.cottage.host)' },
    },
    {
      id: 'dashboard',
      name: 'Dashboard and billing',
      tooltip: 'Signing in, deploying and managing apps, and top-ups',
      method: 'GET',
      target: 'https://app.cottage.host/healthz',
      statusPageLink: 'https://app.cottage.host',
      expectedCodes: [200],
      timeout: 10000,
      headers: { 'User-Agent': 'cottage-status (+https://status.cottage.host)' },
    },
    {
      // A small app Cottage runs for itself on the region's servers, so this checks the
      // whole path a customer's app takes: Cloudflare, the node's proxy and a running app.
      // TODO at launch: deploy the canary app and put its address here.
      id: 'apps-us-east',
      name: 'Apps in US East',
      tooltip: 'Customer apps hosted in Virginia',
      method: 'GET',
      target: 'https://status-canary-vin1.cottagehost.com/',
      timeout: 10000,
      headers: { 'User-Agent': 'cottage-status (+https://status.cottage.host)' },
    },
  ],
  // Alerts come from Grafana Cloud (hearth infra/monitoring). A webhook here could page too.
}

// Notices shown on the page: incident updates and planned maintenance. Newest last.
// Write them in Cottage's voice: say what happened, who it affects and what to expect,
// e.g. title 'Apps in US East were slow for 18 minutes'.
//   {
//     title: 'Some apps in US East aren’t loading',
//     body: 'We’re looking into it now. Next update within 30 minutes.',
//     monitors: ['apps-us-east'],          // listed as "Affects: ..." and their status follows the colour
//     start: '2026-12-01T14:05:00Z',
//     end: '2026-12-01T14:40:00Z',         // leave out while it's ongoing
//     color: 'red',                        // red = outage, yellow = degraded (default), blue = maintenance, green = resolved
//   },
const maintenances: MaintenanceConfig[] = []

// Don't edit this line
export { maintenances, pageConfig, workerConfig }
