import 'dotenv/config';
import { startApi } from './index.js';
import { startWorker } from './worker.js';

await Promise.all([startApi(), startWorker()]);
