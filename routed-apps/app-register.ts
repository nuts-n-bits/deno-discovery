import { ServerRequest, Response, ParsedUrl } from "../dependencies/lib-compat.ts"
import { SingleRecord } from "../dependencies/endpoint-record.ts"
import { on_cooldown } from "../dependencies/cooldown.ts"
import { healthCheck } from "../dependencies/health-check.ts"
import { memory } from "../dependencies/setup.ts"
import { infer_host_ip, infer_host_port } from "../dependencies/infer-host.ts"

const err400 = (str: string) => ({ status: 400, body: str })

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
        
        // make sure host ip is proper string, infer if needed
        const ip_text = pu.decoded_query_map.get("host-ip")
        if (ip_text === undefined) { return err400("No &host-ip parameter (required, but could be set to [&host-ip=infer!!] to infer by tcp connection)") }
        const ip = ip_text === "infer!!" ? infer_host_ip(req) : ip_text
        if (ip === 420) { return err400("Connection must be of type TCP when [&host-ip=infer!!]") }

        // make sure host port is proper string, infer if needed
        const port_text = pu.decoded_query_map.get("host-port")
        if (port_text === undefined) { return err400("No &host-port parameter (required, but could be set to [&host-port=infer!!] to infer by tcp connection)") }
        const port = port_text === "infer!!" ? infer_host_port(req) : port_text
        if (port === 420) { return err400("Connection must be of type TCP when [&host-port=infer!!]") }

        const host_final_str = ip_text + ":" + port_text

        // make sure ttl_seconds is set to valid number
        const ttl_text = pu.decoded_query_map.get("ttl")
        if (ttl_text && (/^[0-9]+$/.test(ttl_text) === false)) { return err400("Parameter &ttl malformed (optional, but must be decimal number if defined)") }
        const ttl_seconds = Math.max(60, Math.min(86400, parseInt(ttl_text || "300", 10)))

        // build a default SingleRecord
        const record_object: SingleRecord = {protocol: "http", host: host_final_str, ttl: Date.now() + ttl_seconds * 1000, health: {last_checked: Date.now(), last_healthy: Date.now(), alive: true, ack_latency: 0}}
        // check endpoint health as part of registration, guarding against unintended high-frequency checks with on_cooldown
        if (on_cooldown(host_final_str) === "ok") { 
            const health = await healthCheck(common_name, record_object)
            if (health.alive === false) { return { status: 500, body: "Not OK ... specified host does not conform to health check requirements" } }
        }

        // put SingleRecord into memory[host]
        const existing = memory.get(common_name) 
        if (existing) { existing.set(host_final_str, record_object) }
        else { memory.set(common_name, new Map([[host_final_str, record_object]])) }
        return { 
            body: `OK` 
                + (ip_text !== "infer!!" ? "" : ` ... inferred ip: ${ip_text}`) 
                + (port_text !== "infer!!" ? "" : ` ... inferred port: ${port_text}`) }
    }
    else {
        return err400("Parameter &protocol must be http (currently supported)")
    }

}