import { existsSync } from 'node:fs';

const required = [
  'app/layout.tsx',
  'app/page.tsx',
  'lib/autoAssign.ts',
  'lib/supabase.ts',
  'types/domain.ts',
  '.env.example',
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Omega Shift Manager MVP source check passed.');
console.log('Install dependencies in a network-enabled environment to run `next build`.');
