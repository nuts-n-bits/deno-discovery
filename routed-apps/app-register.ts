import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"
import { EndpointRecord } from "../dependencies/endpoint-record.ts"

/* 

/register
?common-name=WHATEVER   REQUIRED: string
&protocol=http          REQUIRED: "http"  // only supports http for now
&host=localhost:9xxx    REQUIRED: string
&ttl=[60,86400]         OPTIONAL: string(decimal) - DEFAULT to 300 (seconds)  // entry becomes invalid after this time and is to be deleted

*/
const err400 = (str: string) => ({ status: 400, body: str })
export const memory = new Map<string, EndpointRecord>()
export function app_register(req: ServerRequest, pu: ParsedUrl): Response {
    
    if(pu.decoded_query_map.get("protocol") === "http") {

        const common_name = pu.decoded_query_map.get("common-name")
        const host_text = pu.decoded_query_map.get("host")
        const ttl_text = pu.decoded_query_map.get("ttl")
        if (common_name === undefined) { return err400("No &common-name parameter (required)") }
        if (host_text === undefined) { return err400("No &host parameter (required, but could be set to [&host=infer!!] to infer by tcp connection)") }
        const host = host_text === "infer!!" ? infer_host(req) : host_text
        if (host === 420) { return err400("Connection must be of type TCP when [&host=infer!!]") }

        if (ttl_text && (/^[0-9]+$/.test(ttl_text) === false)) { return err400("Parameter &ttl malformed (optional, but must be decimal number if defined)") }
        const ttl_seconds = Math.max(60, Math.min(86400, parseInt(ttl_text || "300", 10)))

        const record_object = {protocol: "http", host: host, ttl: Date.now() + ttl_seconds * 1000, health: {last_checked: Date.now(), last_healthy: Date.now(), alive: true, ack_latency: 0}}

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
