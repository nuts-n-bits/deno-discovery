import { ServerRequest, Response, ParsedUrl, DecodedQueryMap } from "../dependencies/lib-compat.ts"
import { memory } from "../dependencies/setup.ts"
import { single_record_serialize } from "./app-discover.ts"
import { SingleRecord } from "../dependencies/endpoint-record.ts"

export function app_dump(req: ServerRequest, pu: ParsedUrl & DecodedQueryMap): Response {
    
    const space = pu.decoded_query_map.get("format") !== "0" ? 4 : undefined

    const common_name = pu.decoded_query_map.get("common-name")
    if (common_name !== undefined) {
        const record = memory.get(common_name)
        if (record === undefined) { return { status: 404, body: "Not found" } }
        return {
            body: JSON.stringify([...record.entries()], undefined, space)
        }
        //return { body: readerFromStreamReader(readableStreamFromIterable(record_json_iter_serialize(common_name, record.entries())).getReader()) } 
    }

    return {
        body: JSON.stringify([...memory.entries()].map(([k, v]) => [k, [...v.entries()]]), undefined, space)
    }
}

async function* record_json_iter_serialize(common_name: string, record_iter: IterableIterator<[string, SingleRecord]>) {
    for(const record of record_iter) {
        yield single_record_serialize(common_name, record[1])
    }
    return
}