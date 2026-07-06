import { Injectable, Logger } from '@nestjs/common';
import { lookup as dnsLookup } from 'dns';
import type { LookupAddress, LookupOptions } from 'dns';
// Usa require para nodemailer
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer');
import type { Transporter } from 'nodemailer';

function smtpDnsLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
): void {
  dnsLookup(hostname, { ...options, family: 4 }, callback);
}

function normalizeSmtpPassword(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replaceAll('"', '').replaceAll(' ', '');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly smtpEnabled: boolean;

  constructor() {
    this.smtpEnabled = (process.env.SMTP_ENABLED ?? 'true').toLowerCase() !== 'false';

    if (!this.smtpEnabled) {
      this.transporter = null;
      this.logger.warn('SMTP is disabled (SMTP_ENABLED=false). Emails will be logged only.');
      return;
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure =
      (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: normalizeSmtpPassword(process.env.SMTP_PASS),
      },
      // Prefer IPv4; many dev networks advertise IPv6 without a working route to Gmail.
      dnsLookup: smtpDnsLookup,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    }) as Transporter;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.smtpEnabled || !this.transporter) {
      this.logger.warn(
        `SMTP disabled. Skipped delivery to ${options.to} (${options.subject}).`,
      );
      if (options.text) {
        this.logger.warn(options.text);
      }
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Paperroll" <no-reply@paperroll.com>',
        ...options,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${options.to}`,
        err instanceof Error ? err.stack : String(err),
      );
      if (options.text) {
        this.logger.warn(`Undelivered email body:\n${options.text}`);
      }
      return false;
    }
  }
}
