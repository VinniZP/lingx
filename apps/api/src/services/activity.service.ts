/**
 * Activity Service
 *
 * Handles async activity logging via BullMQ queue.
 * Read operations are handled by ActivityRepository.
 */
import type { CreateActivityInput } from '@lingx/shared';
import { activityQueue } from '../lib/queues.js';

export class ActivityService {
  /**
   * Log a new activity asynchronously via BullMQ queue.
   *
   * This method returns immediately (~1-2ms) after publishing to the queue.
   * The actual database write happens in the background worker with
   * sequential session-based grouping.
   *
   * @param input - Activity data to log
   */
  async log(input: CreateActivityInput): Promise<void> {
    await activityQueue.add(
      'log',
      {
        ...input,
        timestamp: Date.now(),
      },
      {
        // Delay slightly to allow batching of concurrent operations
        delay: 100,
      }
    );
  }
}
