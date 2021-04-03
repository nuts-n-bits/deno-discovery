import { check_all_serial } from "./health-check.ts"
import { QuickQueue } from "./lib-compat.ts"
import { EndpointRecord, SingleRecord } from "./endpoint-record.ts"

export const logs_queue = new QuickQueue<{time: number, content: string}>()

/**
 * This memory holds the bulk of the useful information of this service
 * Structure: Map<CommonName, Map<HostName, SingleRecord>
 */
 export const memory = new Map<string, EndpointRecord>()
 check_all_serial()
