/**
 * keeps in memory a list of hosts and the last time this service has pinged it
 * string: host
 * number: js timestamp (ms)
 */
const memory = new Map<string, number>()
const seconds = 1000
export function on_cooldown(host: string, time_limit = 30*seconds, now = Date.now()): "ok"|"wait" {
    const timestamp = memory.get(host)
    if (timestamp === undefined || now - timestamp > time_limit) {
        // if never seen or if last visited over time limit, put on cooldown and return ok
        memory.set(host, now)
        return "ok"
    }
    else {
        return "wait"
    }
}