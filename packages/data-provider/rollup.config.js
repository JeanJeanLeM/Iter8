import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import v8 from 'node:v8';
import pkg from './package.json';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const debugRunId = process.env.DEBUG_RUN_ID || 'pre-fix';
const bytesToMb = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
const getMemSnapshot = () => {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  return {
    rssMb: bytesToMb(usage.rss),
    heapTotalMb: bytesToMb(usage.heapTotal),
    heapUsedMb: bytesToMb(usage.heapUsed),
    heapLimitMb: bytesToMb(heapStats.heap_size_limit),
  };
};

const sendDebugLog = (location, message, hypothesisId, data = {}) => {
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

sendDebugLog('packages/data-provider/rollup.config.js:setup', 'data-provider rollup config loaded', 'H3', {
  pid: process.pid,
  nodeVersion: process.version,
  nodeOptions: process.env.NODE_OPTIONS || null,
  execArgv: process.execArgv,
  memory: getMemSnapshot(),
});

const agentDebugPlugin = () => ({
  name: 'agent-debug-data-provider',
  buildStart() {
    sendDebugLog(
      'packages/data-provider/rollup.config.js:buildStart',
      'data-provider buildStart',
      'H1',
      {
        memory: getMemSnapshot(),
      },
    );
  },
  closeBundle() {
    sendDebugLog(
      'packages/data-provider/rollup.config.js:closeBundle',
      'data-provider closeBundle',
      'H1',
      {
        memory: getMemSnapshot(),
      },
    );
  },
});

const plugins = [
  agentDebugPlugin(),
  peerDepsExternal(),
  resolve(),
  replace({
    __IS_DEV__: process.env.NODE_ENV === 'development',
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    useTsconfigDeclarationDir: true,
  }),
  terser(),
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named',
      },
    ],
    ...{
      external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        'react',
        'react-dom',
      ],
      preserveSymlinks: true,
      plugins,
    },
  },
  // Separate bundle for react-query related part
  {
    input: 'src/react-query/index.ts',
    output: [
      {
        file: 'dist/react-query/index.es.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
      },
    ],
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      'react',
      'react-dom',
      // 'librechat-data-provider', // Marking main part as external
    ],
    preserveSymlinks: true,
    plugins,
  },
];
