import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"
import { EndpointRecord, SingleRecord } from "../dependencies/endpoint-record.ts"
import { on_cooldown } from "../dependencies/cooldown.ts"
import { health_check } from "../dependencies/health-check.ts"

const err400 = (str: string) => ({ status: 400, body: str })

/**
 * This memory holds the bulk of the useful information of this service
 * Structure: Map<CommonName, Map<HostName, SingleRecord>
 */
export const memory = new Map<string, EndpointRecord>()

/** 
 * Endpoint description
 * 
 * /register
 * ?common-name=WHATEVER   REQUIRED: string
 * &protocol=http          REQUIRED: "http"  // only supports http for now
 * &host=localhost:9xxx    REQUIRED: string, or literal string value "infer!!"
 * &ttl=[60,86400]         OPTIONAL: string(decimal) - DEFAULT to 300 (seconds)  // entry becomes invalid after this time and is to be deleted
 */
export async function app_register(req: ServerRequest, pu: ParsedUrl): Promise<Response> {
    
    if(pu.decoded_query_map.get("protocol") === "http") {

        // make sure common_name is set to string
        const common_name = pu.decoded_query_map.get("common-name")
        if (common_name === undefined) { return err400("No &common-name parameter (required)") }
        
        // make sure host is proper string, infer if needed
        const host_text = pu.decoded_query_map.get("host")
        if (host_text === undefined) { return err400("No &host parameter (required, but could be set to [&host=infer!!] to infer by tcp connection)") }
        const host = host_text === "infer!!" ? infer_host(req) : host_text
        if (host === 420) { return err400("Connection must be of type TCP when [&host=infer!!]") }

        // make sure ttl_seconds is set to valid number
        const ttl_text = pu.decoded_query_map.get("ttl")
        if (ttl_text && (/^[0-9]+$/.test(ttl_text) === false)) { return err400("Parameter &ttl malformed (optional, but must be decimal number if defined)") }
        const ttl_seconds = Math.max(60, Math.min(86400, parseInt(ttl_text || "300", 10)))

        // build a default SingleRecord
        const record_object: SingleRecord = {protocol: "http", host: host, ttl: Date.now() + ttl_seconds * 1000, health: {last_checked: Date.now(), last_healthy: Date.now(), alive: true, ack_latency: 0}}
        // check endpoint health as part of registration, guarding against unintended high-frequency checks with on_cooldown
        if (on_cooldown(host) === "ok") { 
            const health = await health_check(common_name, record_object)
            if (health.alive === false) { return { status: 500, body: "Not OK ... specified host does not conform to health check requirements" } }
        }

        // put SingleRecord into memory[host]
        const existing = memory.get(common_name) 
        if (existing) { existing.set(host, record_object) }
        else { memory.set(common_name, new Map([[host, record_object]])) }
        return { body: `OK` + (host_text !== "infer!!" ? "" : ` ... inferred host: ${host}` ) }
    }
    else {
        return err400("Parameter &protocol must be http (currently supported)")
    }

}

/**
 * @returns Returns string of inferred host when transport is TCP, returns number 420 if transport is not TCP.
 */
function infer_host(req: ServerRequest): string|420 {
    if (req.conn.remoteAddr.transport === "tcp") {
        return req.conn.remoteAddr.hostname + ":" + req.conn.remoteAddr.port
    }
    else {
        return 420
    }
}
