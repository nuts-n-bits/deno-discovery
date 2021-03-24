import { memory } from "../routed-apps/app-register.ts"
import { async_sleep } from "./lib-compat.ts"
import { SingleRecord } from "./endpoint-record.ts"
import { on_cooldown } from "./cooldown.ts"
import { log } from "../routed-apps/app-log.ts"

export async function health_check(
    common_name: string, endpoint_record: SingleRecord
): Promise<{alive: true, start: number, end: number}|{alive: false, start: number}> {
    if(endpoint_record.protocol === "http") {
        log(`Starting health check for endpoint ((${common_name})) at ((${endpoint_record.host}))...`)
        const random_text = Math.random().toString()
        const abort_controller = new AbortController()
        const start = Date.now()
        let res
        try{
            res = await Promise.race([
                fetch(`http://${endpoint_record.host}/ack/${random_text}`, {signal: abort_controller.signal}), 
                async_sleep(5000)  // if endpoint takes more than 5 secs to respond, deem dead
            ])
        }
        catch(e) {
            res = undefined
        }
        const end = Date.now()
        if(res !== undefined && res.status === 200 && res.headers.get("x-endpoint-common-name") === common_name) {
            log("... And its healthy")
            return { alive: true, start, end }
        }
        else {
            if(res === undefined) { abort_controller.abort() }  // if endpoint takes more than 5 secs to respond, kill the connection
            log("    ... And its dead")
            return { alive: false, start }
        }
    }
    else {
        console.log("Cannot health check incompatible protocol")
        return { alive: false, start: Date.now() }
    }
}

export async function check_all_serial() {

    for(const [common_name, endpoint_record] of memory.entries()) {
        for(const [host, single_record] of endpoint_record.entries()) {
            const report = await health_check(common_name, single_record)
            if (on_cooldown(single_record.host) === "wait") { return }
            if (report.alive === true) {
                single_record.health.alive = true
                single_record.health.ack_latency = report.end - report.start
                single_record.health.last_checked = report.start
                single_record.health.last_healthy = report.end
            }
            else {
                single_record.health.alive = false
                single_record.health.last_checked = report.start
            }
        }
    }

    setTimeout(check_all_serial, 30 * 1000)
}