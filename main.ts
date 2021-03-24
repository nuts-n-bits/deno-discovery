import { serve, ServerRequest, Response } from "./dependencies/lib-compat.ts"
import { parse_url, ParsedUrl } from "./dependencies/lib-compat.ts"
import { app_404 } from "./routed-apps/app-404.ts"
import { app_register } from "./routed-apps/app-register.ts"
import { app_discover } from "./routed-apps/app-discover.ts"
import { app_dump } from "./routed-apps/app-dump.ts"
import { app_ack } from "./routed-apps/app-ack.ts"
import { app_infer_host } from "./routed-apps/app-dev-infer-host.ts"

export const common_name_header = ["X-Endpoint-Common-Name", "deno-discovery"]

const server = serve({ hostname: "0.0.0.0", port: 9999 })
console.log(`http server ${common_name_header[1]} is running. Come at http://localhost:9999/`)

const app_map = new Map<string, (req: ServerRequest, pu: ParsedUrl) => Response|Promise<Response>>()
app_map.set( "discover"        , app_discover   )
app_map.set( "register"        , app_register   )
app_map.set( "dump"            , app_dump       )
app_map.set( "ack"             , app_ack        )
app_map.set( "dev-infer-host"  , app_infer_host )

while (true) {
    try {
        for await (const request of server) {
            let parsed_url: ParsedUrl
            try {
                parsed_url = parse_url(request.url)
            }
            catch (parse_url_error) {
                await request.respond({status: 400, body: "HTTP 400, malformed url", headers: new Headers([common_name_header])})
                break
            }
            const app = app_map.get(parsed_url.decoded_fragments[0]) || app_404
            try {
                const response = await app(request, parsed_url)
                if (response.headers) { response.headers.set(common_name_header[0], common_name_header[1]) }
                else { response.headers = new Headers([common_name_header]) }
                await request.respond(response)
            }
            catch (endpoint_and_response_error) {
                try {
                    await request.respond({status: 500, body: (endpoint_and_response_error as Error).stack, headers: new Headers([common_name_header])})
                }
                catch (fallback_response_error) {
                    console.error("Fallback response has botched", fallback_response_error)
                }
            }
        }
    }
    catch (top_level_for_await_error) {
        console.log("swallowed error", top_level_for_await_error)
    }
}


import * as _ from "./setup.ts"
_._