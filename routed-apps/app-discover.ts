import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { readableStreamFromIterable, readerFromStreamReader } from "https://deno.land/std@0.90.0/io/streams.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"
import { memory } from "./app-register.ts"
import { SingleRecord } from "../dependencies/endpoint-record.ts"
/* 

/discover
?common-name=WHATEVER   REQUIRED: string
&dump=1|0               Optional: 1|0 - DEFAULTS to 0
                                                        // set to 1 to get entire list of endpoint registrations 
                                                        // (1 common name can correspond to lots of endpoints)
                                                        // 0 will return 1 of them randomly. 1 will return
                                                        // a stream of jsons delimited by the "\n" character
&nth=[number]           Optional: string(decimal)  
                                                        // if set, will return the n-th cache (mod cache list length) in the list. Recall that the
                                                        // default behaviour is to return a random endpoint from the list. with this option you can 
                                                        // "stably" query an item. Can also be used to supply randomness.

*/

export function app_discover(req: ServerRequest, pu: ParsedUrl): Response {

    const common_name = pu.decoded_query_map.get("common-name")
    if(common_name === undefined) { return { status: 400, body: "No &common-name parameter (required)" } }

    const record = memory.get(common_name)
    if (record === undefined) { return { status: 404 } }
    if (record.size === 0) { record.delete(common_name); return { status: 404 } }

    const dump = pu.decoded_query_map.get("dump")
    if (dump === "1") { return { body: readerFromStreamReader(readableStreamFromIterable(record_json_iter_serialize(common_name, record.entries())).getReader()) } }
    
    const nth_text = pu.decoded_query_map.get("nth")
    if(nth_text !== undefined && /^[0-9]+/.test(nth_text) !== true) { return { status: 400, body: "Parameter &nth malformed, please supply only decimal characters (^[0-9]+$). Remember this parameter is optional." } }
    const nth = nth_text === undefined ? null : parseInt(nth_text)
    
    const entires = [...record.entries()].filter(entry => entry[1].health.alive)
    while (entires.length > 0) {
        const index = (nth ?? Math.floor(Math.random() * entires.length)) % entires.length
        const [host, single_record] = entires[index]
        if (host === undefined || single_record === undefined) { return { status: 500, body: "500.1 unexpected" } }
        if (single_record.ttl < Date.now()) { record.delete(host); continue }
        else { return { status: 200, body: single_record_serialize(common_name, host, single_record) } } 
    }
    return { status: 404 }
}

async function* record_json_iter_serialize(common_name: string, record_iter: IterableIterator<[string, SingleRecord]>) {
    for(const record of record_iter) {
        yield single_record_serialize(common_name, record[0], record[1])
    }
    return
}

function single_record_serialize(common_name: string, host: string, single_record: SingleRecord) {
    const encoder = new TextEncoder()
    const json_string = JSON.stringify({
        common_name, 
        protocol: single_record.protocol, 
        host: host,
        ttl: single_record.ttl, 
        alive: single_record.health.alive, 
        ping: single_record.health.ack_latency, 
        last_checked: single_record.health.last_checked,
        last_healthy: single_record.health.last_healthy,
    }) + "\n"
    return encoder.encode(json_string)
}