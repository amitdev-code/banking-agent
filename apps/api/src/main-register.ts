import path from 'path';
import { register } from 'tsconfig-paths';

// Register workspace package paths pointing at the compiled dist/ output.
// __dirname at runtime = dist/apps/api/src/
// path.resolve(__dirname, '../../..') = dist/
register({
  baseUrl: path.resolve(__dirname, '../../..'),
  paths: {
    '@banking-crm/database': ['packages/database/src/index'],
    '@banking-crm/ai':       ['packages/ai/src/index'],
    '@banking-crm/types':    ['packages/types/src/index'],
    '@banking-crm/ui':       ['packages/ui/src/index'],
  },
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./main');
