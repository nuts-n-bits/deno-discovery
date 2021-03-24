import { ServerRequest, Response, ParsedUrl, QuickQueue, sanitize_html as san } from "../dependencies/lib-compat.ts"
const logs_queue = new QuickQueue<{time: number, content: string}>()

export function log(line: string, timestamp = Date.now()) {
    logs_queue.push({time: timestamp, content: line})
    if(logs_queue.size() > 500n) {
        logs_queue.shift()
    }
}

export function app_log(req: ServerRequest, pu: ParsedUrl): Response {
    return {
        status: 200,
        body: `<html><body><h2>Logs (${logs_queue.size()})</h2>
            <style>.time {margin-right: 1em; opacity: 0.5; font-size: 80%}</style>
            <table>
                <tr><th>Time</th><th>Content</th></tr>
                ${[...logs_queue.entries()].map(([k,v]) => `<tr><td class="time">${san(new Date(v.time).toISOString())}</td><td>${san(v.content)}</td></tr>`).join("")}
            </table>
            </body></html>`
    }
}