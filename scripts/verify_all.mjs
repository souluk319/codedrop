import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const jsFiles = fs.readdirSync('js')
    .filter(file => file.endsWith('.js'))
    .map(file => path.join('js', file))
    .sort();

const mjsFiles = fs.readdirSync('scripts')
    .filter(file => file.endsWith('.mjs'))
    .map(file => path.join('scripts', file))
    .sort();

const checks = [
    ['git', ['diff', '--check']],
    ['node', ['--check', 'server.js']],
    ...jsFiles.map(file => ['node', ['--check', file]]),
    ...mjsFiles.map(file => ['node', ['--check', file]]),
    ['node', ['scripts/test_study_content.mjs']],
    ['node', ['scripts/verify_ui_ux.mjs']],
    ['node', ['scripts/verify_kugnus_gateway_contract.mjs']],
    ['node', ['scripts/verify_release_runtime_contract.mjs']],
    ['node', ['scripts/verify_server_smoke.mjs']]
];

for (const [cmd, args] of checks) {
    const label = [cmd, ...args].join(' ');
    console.log(`\n$ ${label}`);
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

console.log('\nAll CodeDrop OCP verification checks passed.');
