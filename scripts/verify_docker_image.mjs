import { spawnSync } from 'child_process';
import net from 'net';

const image = process.env.CODEDROP_DOCKER_VERIFY_IMAGE || 'codedrop:verify';
let containerId = '';

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        encoding: 'utf8',
        stdio: options.capture ? 'pipe' : 'inherit',
        ...options
    });
    if (result.status !== 0) {
        const detail = [
            result.stdout?.trim(),
            result.stderr?.trim()
        ].filter(Boolean).join('\n');
        throw new Error(`${command} ${args.join(' ')} failed${detail ? `\n${detail}` : ''}`);
    }
    return result.stdout || '';
}

function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

async function waitForHealth(port) {
    const url = `http://127.0.0.1:${port}/health`;
    let lastError = '';
    for (let i = 0; i < 30; i++) {
        try {
            const response = await fetch(url);
            const body = await response.json().catch(() => ({}));
            if (response.ok && body.server === 'ok') return body;
            lastError = `status=${response.status} body=${JSON.stringify(body)}`;
        } catch (error) {
            lastError = error.message;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Docker container did not become healthy at ${url}: ${lastError}`);
}

try {
    run('docker', ['build', '-t', image, '.']);
    const port = await findFreePort();
    containerId = run('docker', [
        'run',
        '--rm',
        '-d',
        '-p',
        `127.0.0.1:${port}:3001`,
        image
    ], { capture: true }).trim();

    const health = await waitForHealth(port);
    console.log(JSON.stringify({
        dockerImage: 'ok',
        image,
        port,
        health
    }, null, 2));
} catch (error) {
    if (containerId) {
        const logs = spawnSync('docker', ['logs', containerId], { encoding: 'utf8' });
        const output = `${logs.stdout || ''}${logs.stderr || ''}`.trim();
        if (output) console.error(output.slice(-5000));
    }
    console.error(error.message);
    process.exitCode = 1;
} finally {
    if (containerId) {
        spawnSync('docker', ['stop', containerId], { stdio: 'ignore' });
    }
}
