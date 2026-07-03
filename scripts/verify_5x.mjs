import { spawnSync } from 'child_process';

const passes = 5;

for (let i = 1; i <= passes; i++) {
    console.log(`\n========== CodeDrop OCP verification pass ${i}/${passes} ==========`);
    const result = spawnSync('node', ['scripts/verify_all.mjs'], {
        stdio: 'inherit',
        env: { ...process.env, CODEDROP_VERIFY_PASS: String(i) }
    });

    if (result.status !== 0) {
        console.error(`\nVerification failed on pass ${i}/${passes}.`);
        process.exit(result.status || 1);
    }
}

console.log(`\n${passes}/${passes} verification passes completed successfully.`);
