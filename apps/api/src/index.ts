import 'dotenv/config';
import { buildApp } from './app.js';
import { pathToFileURL } from 'node:url';

export async function startApi() {
  const app = buildApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = process.env.HOST || '0.0.0.0';
  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'Shutting down');
    try {
      await app.close();
    } catch (error) {
      app.log.error(error, 'Graceful shutdown failed');
      process.exitCode = 1;
    }
  };
  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
  try {
    await app.listen({ port, host });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) void startApi();
