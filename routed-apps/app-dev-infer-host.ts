import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"

export function app_infer_host(req: ServerRequest, pu: ParsedUrl): Response {

    const addr = req.conn.remoteAddr
    if (addr.transport === "tcp") {
        return {
            status: 200,
            body: addr.hostname + ":" + addr.port
        }
    }
    else {
        return {
            status: 400,
            body: "Cannot infer non-tcp addr"
        }
    }


}