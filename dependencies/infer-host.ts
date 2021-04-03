import { ServerRequest } from "./lib-compat.ts"
/**
 * @returns Returns string of inferred host when transport is TCP, returns number 420 if transport is not TCP.
 */
 export function infer_host_ip(req: ServerRequest): string|420 {
    if (req.conn.remoteAddr.transport === "tcp") {
        return req.conn.remoteAddr.hostname
    }
    else {
        return 420
    }
}

/**
 * @returns Returns string of inferred host when transport is TCP, returns number 420 if transport is not TCP.
 */
 export function infer_host_port(req: ServerRequest): string|420 {
    if (req.conn.remoteAddr.transport === "tcp") {
        return req.conn.remoteAddr.port.toString()
    }
    else {
        return 420
    }
}
