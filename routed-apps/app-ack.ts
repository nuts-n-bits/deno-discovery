import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"

export function app_ack(req: ServerRequest, pu: ParsedUrl): Response {
    return {
        status: 200,
        body: pu.decoded_fragments[1]
    }
}