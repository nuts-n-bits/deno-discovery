export type HostString = string
export type SingleRecord = {protocol: string, host: HostString, ttl: number, health: {last_checked: number, last_healthy: number, alive: boolean, ack_latency: number}}
export type EndpointRecord = Map<HostString, SingleRecord>