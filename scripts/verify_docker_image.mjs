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

function runCapture(command, args) {
    return run(command, args, { capture: true });
}

function runCaptureAllow(command, args, allowedStatuses = [0]) {
    const result = spawnSync(command, args, {
        encoding: 'utf8',
        stdio: 'pipe'
    });
    if (!allowedStatuses.includes(result.status)) {
        const detail = [
            result.stdout?.trim(),
            result.stderr?.trim()
        ].filter(Boolean).join('\n');
        throw new Error(`${command} ${args.join(' ')} failed${detail ? `\n${detail}` : ''}`);
    }
    return result.stdout || '';
}

function runWithRetry(command, args, attempts = 2) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return run(command, args);
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                console.error(`${command} ${args.join(' ')} failed; retrying once.`);
            }
        }
    }
    throw lastError;
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
    runWithRetry('docker', ['build', '-t', image, '.']);

    const envFiles = runCapture('docker', [
        'run',
        '--rm',
        image,
        'find',
        '.',
        '-maxdepth',
        '2',
        '-type',
        'f',
        '(',
        '-name',
        '.env',
        '-o',
        '-name',
        '.env.local',
        '-o',
        '-name',
        '.env.production',
        ')',
        '-print'
    ]).trim();
    if (envFiles) {
        throw new Error(`Docker image contains private env files:\n${envFiles}`);
    }

    const privateGatewayHits = runCaptureAllow('docker', [
        'run',
        '--rm',
        image,
        'grep',
        '-R',
        '-n',
        '-E',
        '100\\.99\\.|sk-[A-Za-z0-9_-]{16,}',
        '.',
        '--exclude-dir=node_modules'
    ], [0, 1]).trim();
    if (privateGatewayHits) {
        throw new Error(`Docker image contains private gateway or secret-like content:\n${privateGatewayHits}`);
    }

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
