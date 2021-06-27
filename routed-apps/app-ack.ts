import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl, DecodedQueryMap } from "../dependencies/lib-compat.ts"

export function app_ack(req: ServerRequest, pu: ParsedUrl & DecodedQueryMap): Response {
    return {
        status: 200,
        body: pu.decoded_segments[1]
    }
}