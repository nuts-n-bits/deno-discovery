import { memory } from "../routed-apps/app-register.ts"
import { async_sleep } from "./lib-compat.ts"
import { SingleRecord, HostString } from "./endpoint-record.ts"

async function health_check(common_name: string, host: HostString, endpoint_record: SingleRecord) {
    if(endpoint_record.protocol === "http") {
        // console.log(`Starting health check for endpoint ((${common_name})) at ((${host}))...`)
        const random_text = Math.random().toString()
        const abort_controller = new AbortController()
        const start = Date.now()
        let res
        try{
            res = await Promise.race([fetch(`http://${endpoint_record.host}/ack/${random_text}`, {signal: abort_controller.signal}), async_sleep(5000)])  // if endpoint takes more than 5 secs to respond, deem dead
        }
        catch(e) {
            res = undefined
        }
        const end = Date.now()
        if(res !== undefined && res.status === 200 && res.headers.get("x-endpoint-common-name") === common_name) {
            endpoint_record.health.alive = true
            endpoint_record.health.ack_latency = end - start
            endpoint_record.health.last_checked = start
            endpoint_record.health.last_healthy = end
            // console.log("    ... And its healthy")
        }
        else {
            endpoint_record.health.alive = false
            endpoint_record.health.last_checked = start
            if(res === undefined) { abort_controller.abort() }  // if endpoint takes more than 5 secs to respond, kill the connection
            // console.log("    ... And its dead")
        }
    }
    else {
        console.log("Cannot health check incompatible protocol")
    }
}

export async function check_all_serial() {

    for(const [common_name, endpoint_record] of memory.entries()) {
        for(const [host, single_record] of endpoint_record.entries()) {
            await health_check(common_name, host, single_record)
        }
    }

    setTimeout(check_all_serial, 30 * 1000)
}