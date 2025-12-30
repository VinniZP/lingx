/**
 * Email Service
 *
 * Handles email sending using nodemailer.
 * Uses maildev for local development.
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;
  private appUrl: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@localeflow.dev';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || this.stripHtml(options.html),
    });
  }

  /**
   * Send email verification link
   */
  async sendEmailVerification(
    to: string,
    token: string,
    userName?: string
  ): Promise<void> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;
    const greeting = userName ? `Hi ${userName}` : 'Hi';

    await this.send({
      to,
      subject: 'Verify your new email address - LocaleFlow',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7C6EE6 0%, #9D8DF1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">LocaleFlow</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #333; margin-top: 0;">${greeting},</h2>

    <p>You requested to change your email address. Please click the button below to verify your new email address:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background: #7C6EE6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This link will expire in 24 hours. If you didn't request this change, you can safely ignore this email.
    </p>

    <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color: #7C6EE6; word-break: break-all;">${verifyUrl}</a>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} LocaleFlow. All rights reserved.</p>
  </div>
</body>
</html>
      `.trim(),
    });
  }

  /**
   * Send notification that email change was initiated (to old email)
   */
  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
    userName?: string
  ): Promise<void> {
    const greeting = userName ? `Hi ${userName}` : 'Hi';

    await this.send({
      to: oldEmail,
      subject: 'Email change requested - LocaleFlow',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Change Requested</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7C6EE6 0%, #9D8DF1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">LocaleFlow</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #333; margin-top: 0;">${greeting},</h2>

    <p>A request was made to change the email address associated with your LocaleFlow account.</p>

    <div style="background: #f8f8f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #666;">
        <strong>New email:</strong> ${newEmail}
      </p>
    </div>

    <p>If you made this request, a verification email has been sent to the new address. Once verified, your email will be updated.</p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request this change, please secure your account immediately by changing your password.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} LocaleFlow. All rights reserved.</p>
  </div>
</body>
</html>
      `.trim(),
    });
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gi, '')
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
