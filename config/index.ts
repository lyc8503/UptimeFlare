import { Maintenances, PageConfig, WorkerConfig } from '@/types/config'
import * as config from '@/uptime.config'

const pageConfig = config.pageConfig
const workerConfig = config.workerConfig

let maintenances = []
// need any because we cannot guarantee that maintenances exists
if ((config as any).maintenances) {
  maintenances = (config as any).maintenances
}

export { pageConfig, workerConfig, maintenances }
