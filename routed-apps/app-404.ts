import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"

export function app_404(req: ServerRequest, pu: ParsedUrl): Response {
    return {
        status: 404,
        body: "HTTP 404"
    }
}