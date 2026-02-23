import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import v8 from 'node:v8';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const debugRunId = process.env.DEBUG_RUN_ID || 'railway-predeploy';
const toMb = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
const mem = () => {
  const m = process.memoryUsage();
  const h = v8.getHeapStatistics();
  return {
    rssMb: toMb(m.rss),
    heapUsedMb: toMb(m.heapUsed),
    heapTotalMb: toMb(m.heapTotal),
    heapLimitMb: toMb(h.heap_size_limit),
  };
};

const sendDebugLog = (location, message, hypothesisId, data = {}) => {
  console.log(`[agent-debug] ${message}`, JSON.stringify({ location, hypothesisId, data }));
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '204ac8' },
    body: JSON.stringify({
      sessionId: '204ac8',
      runId: debugRunId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
};

sendDebugLog('packages/data-schemas/rollup.config.js:setup', 'data-schemas setup', 'H3', {
  nodeOptions: process.env.NODE_OPTIONS || null,
  mem: mem(),
});

const agentDebugPlugin = () => ({
  name: 'agent-debug-data-schemas',
  buildStart() {
    sendDebugLog('packages/data-schemas/rollup.config.js:buildStart', 'data-schemas buildStart', 'H1', {
      mem: mem(),
    });
  },
  closeBundle() {
    sendDebugLog('packages/data-schemas/rollup.config.js:closeBundle', 'data-schemas closeBundle', 'H1', {
      mem: mem(),
    });
  },
});

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.es.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [
    agentDebugPlugin(),
    // Allow importing JSON files
    json(),
    // Automatically externalize peer dependencies
    peerDepsExternal(),
    // Resolve modules from node_modules
    nodeResolve(),
    // Convert CommonJS modules to ES6
    commonjs(),
    // Compile TypeScript files and generate type declarations
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types',
      rootDir: 'src',
    }),
  ],
  // Do not bundle these external dependencies
  external: ['mongoose'],
};
