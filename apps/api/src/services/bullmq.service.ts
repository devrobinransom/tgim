import { Queue, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

export const SOVEREIGN_QUEUE_NAME = process.env.BULLMQ_QUEUE_NAME || 'tgim-domain-events';

let producerConnection: Redis | null = null;
let queue: Queue<{ eventId: string }> | null = null;

export function valkeyUrl(): string | null {
  return process.env.VALKEY_URL || process.env.REDIS_URL || null;
}

function getProducerConnection(): Redis {
  const url = valkeyUrl();
  if (!url) throw new Error('VALKEY_URL is not configured');
  producerConnection ??= new Redis(url, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
  return producerConnection;
}

export function getSovereignQueue(): Queue<{ eventId: string }> {
  queue ??= new Queue<{ eventId: string }>(SOVEREIGN_QUEUE_NAME, {
    connection: getProducerConnection(),
    defaultJobOptions: {
      attempts: Number(process.env.BULLMQ_JOB_ATTEMPTS || 5),
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10_000 },
      removeOnFail: { age: 30 * 24 * 60 * 60, count: 50_000 },
    },
  });
  return queue;
}

export async function enqueueOutboxEvent(
  eventId: string,
  options: Pick<JobsOptions, 'delay' | 'priority'> = {},
): Promise<string> {
  const job = await getSovereignQueue().add('outbox.consume', { eventId }, {
    ...options,
    // Keeping completed jobs makes this ID a durable BullMQ-side duplicate
    // barrier. Postgres remains the authoritative idempotency boundary.
    jobId: eventId,
  });
  return job.id || eventId;
}

export function createWorkerConnection(): Redis {
  const url = valkeyUrl();
  if (!url) throw new Error('VALKEY_URL is not configured');
  return new Redis(url, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

export async function closeBullMqProducer(): Promise<void> {
  if (queue) await queue.close();
  if (producerConnection) await producerConnection.quit();
  queue = null;
  producerConnection = null;
}
