/**
 * Email Service (Legacy Re-export)
 *
 * Re-exports the EmailService from the email module for backward compatibility.
 * New code should import from '@/modules/email/email.service.js' directly.
 *
 * @deprecated Import from '../../modules/email/email.service.js' instead
 */
export {
  EmailService,
  type EmailJobData,
  type EmailOptions,
} from '../../modules/email/email.service.js';
