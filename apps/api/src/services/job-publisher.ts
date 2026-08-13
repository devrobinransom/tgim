import { dbService } from './db.service.js';
import type { JobPublisher, OutboxEvent } from '@tgim/shared';
import { enqueueOutboxEvent, valkeyUrl } from './bullmq.service.js';

/**
 * Sovereign job publisher. Postgres is durable and Valkey/BullMQ transports
 * only opaque event IDs. There is deliberately no hosted queue fallback.
 */
export class SovereignJobPublisher implements JobPublisher {
  async publish(event: OutboxEvent): Promise<string> {
    // Postgres is the source of truth; Valkey carries only the opaque event ID.
    const eventType = event.event_type || event.entity_type;
    const outbox = await dbService.outboxEvents.create({
      event_type: eventType,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      payload: event.payload,
    });

    const id = outbox.id || outbox.event_id;

    // Development may intentionally run without Valkey. In that case the
    // durable row remains pending and the operations surface reports it. A
    // sovereign production instance fails readiness when VALKEY_URL is absent.
    if (!valkeyUrl()) return id;
    const providerMessageId = await enqueueOutboxEvent(id);
    await dbService.outboxEvents.markDispatched(id, providerMessageId);

    return id;
  }

  async dispatch(): Promise<number> {
    if (!valkeyUrl()) return 0;
    const pending = await dbService.outboxEvents.findUnsent();
    let count = 0;
    for (const event of pending) {
      const id = event.id || event.event_id;
      try {
        const providerMessageId = await enqueueOutboxEvent(id);
        await dbService.outboxEvents.markDispatched(id, providerMessageId);
        count += 1;
      } catch (error) {
        await dbService.outboxEvents.markFailed(id, error instanceof Error ? error.message : 'Valkey dispatch failed');
      }
    }
    return count;
  }
}

export function createJobPublisher(): JobPublisher {
  return new SovereignJobPublisher();
}

// Re-export for consumers
export type { JobPublisher, OutboxEvent };
