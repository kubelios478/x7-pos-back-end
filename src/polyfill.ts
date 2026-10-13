import { webcrypto } from 'node:crypto';
import * as path from 'path';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tsConfigPaths = require('tsconfig-paths');
  const appRoot = path.resolve(__dirname, '..');
  tsConfigPaths.register({
    baseUrl: appRoot,
    paths: {
      'src/*': [
        path.join(appRoot, 'dist', '*'),
        path.join(appRoot, 'src', '*'),
      ],
    },
  });
} catch {
  // Ignorar si no está disponible tsconfig-paths
}

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

