/**
 * Email Worker
 *
 * Processes email jobs from BullMQ queue.
 * Sends emails using the EmailService.
 */
import { Job, Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import type { EmailJobData, EmailService } from '../modules/email/email.service.js';

/**
 * Create the email worker
 */
export function createEmailWorker(emailService: EmailService): Worker {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      await emailService.send(job.data);
      console.log(`[EmailWorker] Sent email to ${job.data.to}: ${job.data.subject}`);
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[EmailWorker] Worker error:', err.message);
  });

  return worker;
}
