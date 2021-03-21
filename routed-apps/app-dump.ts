import { ServerRequest, Response } from "../dependencies/lib-compat.ts"
import { ParsedUrl } from "../dependencies/lib-compat.ts"
import { memory } from "./app-register.ts"

export function app_dump(req: ServerRequest, pu: ParsedUrl): Response {

    return {
        body: JSON.stringify([...memory.entries()].map(([k, v]) => [k, [...v.entries()]]))
    }
}