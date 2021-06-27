import { serve, ServerRequest, Response, RoutingTable } from "./dependencies/lib-compat.ts"
import { parse_url, ParsedUrl, derive_query_map, DuplicateParamPolicy, DecodedQueryMap } from "./dependencies/lib-compat.ts"
import { app_404 } from "./routed-apps/app-404.ts"
import { app_register } from "./routed-apps/app-register.ts"
import { app_discover } from "./routed-apps/app-discover.ts"
import { app_dump } from "./routed-apps/app-dump.ts"
import { app_ack } from "./routed-apps/app-ack.ts"
import { app_infer_host } from "./routed-apps/app-dev-infer-host.ts"
import { app_log } from "./routed-apps/app-dev-log.ts"

export const common_name_header = ["X-Endpoint-Common-Name", "deno-discovery"]
const server = serve({ hostname: "127.0.0.1", port: 9999 })
console.log(`http server ${common_name_header[1]} is running. Come at http://localhost:9999/`)

const app_map = new RoutingTable<string, (req: ServerRequest, pu: ParsedUrl & DecodedQueryMap) => Response|Promise<Response>>(app_404)
app_map.register( app_discover   , "discover"       )
app_map.register( app_register   , "register"       )
app_map.register( app_dump       , "dump"           )
app_map.register( app_ack        , "ack"            )
app_map.register( app_infer_host , "dev-infer-host" )
app_map.register( app_log        , "dev-log"        )

while (true) {
    try {
        for await (const request of server) {
            let parsed_url: ParsedUrl, qm: DecodedQueryMap
            try {
                parsed_url = parse_url(request.url)
                qm = derive_query_map(parsed_url, DuplicateParamPolicy.ThrowError)
            }
            catch (parse_url_error) {
                await request.respond({status: 400, body: "HTTP 400, malformed url", headers: new Headers([common_name_header])})
                break
            }
            const app = app_map.lookup(parsed_url.decoded_segments).val
            try {
                const response = await app(request, {...parsed_url, ...qm})
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
