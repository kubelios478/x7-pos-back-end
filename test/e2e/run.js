// npm run test:e2e: levanta la base desechable, corre los e2e y la apaga, pase lo que pase.
// Los argumentos extra van a jest (p. ej. npm run test:e2e -- -t "order flow").
const { spawnSync } = require('child_process');

const compose = ['compose', '-f', 'docker-compose.e2e.yml', '-p', 'x7-pos-e2e'];
const run = (cmd, args) =>
  spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

const up = run('docker', [...compose, 'up', '-d', '--wait']);
if (up.status !== 0) {
  console.error('No se pudo levantar la base e2e (¿Docker está corriendo?).');
  process.exit(up.status ?? 1);
}

let status = 1;
try {
  const jest = run('npx', [
    'jest',
    '--config',
    './test/jest-e2e.json',
    '--runInBand',
    ...process.argv.slice(2),
  ]);
  status = jest.status ?? 1;
} finally {
  run('docker', [...compose, 'down', '-v']);
}
process.exit(status);
