import { ServerRequest, Response, ParsedUrl, QuickQueue, sanitize_html as san } from "../dependencies/lib-compat.ts"
const logs_queue = new QuickQueue<{time: number, content: string}>()

export function log(line: string, timestamp = Date.now()) {
    logs_queue.push({time: timestamp, content: line})
    if(logs_queue.size() > 500n) {
        logs_queue.shift()
    }
}

export function app_log(req: ServerRequest, pu: ParsedUrl): Response {
    const log_entries = [...logs_queue.entries()].map(([k,v]) => v)
    const timespan = log_entries.length > 0 ? log_entries[log_entries.length-1].time - log_entries[0].time : 0
    return {
        status: 200,
        body: `<html><body><h2>Logs (${logs_queue.size()} items in ${(timespan/1000).toFixed(0)} seconds)</h2>
            <style>.time {margin-right: 1em; opacity: 0.5; font-size: 80%}</style>
            <table>
                <tr><th>Time</th><th>Content</th></tr>
                ${log_entries.map(log => `<tr><td class="time">${san(new Date(log.time).toISOString())}</td><td>${san(log.content)}</td></tr>`).join("")}
            </table>
            </body></html>`
    }
}