import { spawn } from 'node:child_process';

const commands = [
  {
    name: 'api',
    command: 'node',
    args: ['server/index.js'],
    env: { PORT: '4178' }
  },
  {
    name: 'client',
    command: 'npm',
    args: ['run', 'client'],
    env: {}
  }
];

const children = commands.map((entry) => {
  const child = spawn(entry.command, entry.args, {
    env: { ...process.env, ...entry.env },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${entry.name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${entry.name}] ${chunk}`));
  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

children.forEach((child) => {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
});

