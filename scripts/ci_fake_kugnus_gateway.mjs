import http from 'http';

const port = Number(process.env.CI_FAKE_KUGNUS_PORT || 18790);
const model = process.env.CI_FAKE_KUGNUS_MODEL || 'gemma4:12b-it-qat';

async function readJsonBody(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk.toString();
    return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
    }

    try {
        const body = await readJsonBody(req);
        if (body.model !== model) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `unexpected model: ${body.model}` }));
            return;
        }

        if (body.stream) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'gateway ' } }] })}\n\n`);
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'ok' } }] })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            choices: [{ message: { content: 'OK' } }]
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`CI fake KUGNUS gateway listening on http://127.0.0.1:${port}/v1`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
