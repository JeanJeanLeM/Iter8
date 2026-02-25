const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const REQUIRED_ARTIFACTS = [
  'client/dist/index.html',
  'packages/data-provider/dist/index.js',
  'packages/data-schemas/dist/index.cjs',
  'packages/api/dist/index.js',
  'packages/client/dist/index.js',
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  const missing = REQUIRED_ARTIFACTS.filter((relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    return !fs.existsSync(absolutePath);
  });

  try {
    if (missing.length > 0) {
      console.log(`[start:full] Missing ${missing.length} build artifacts. Running frontend build first.`);
      await run('npm', ['run', 'frontend']);
    } else {
      console.log('[start:full] Build artifacts found. Skipping frontend build.');
    }

    await run('npm', ['run', 'backend']);
  } catch (error) {
    console.error(`[start:full] Startup failed: ${error.message}`);
    process.exit(1);
  }
}

main();
