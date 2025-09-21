import { Injectable } from '@nestjs/common';
// Usa require para nodemailer
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer');
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }) as Transporter;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Paperroll" <no-reply@paperroll.com>',
      ...options,
    });
  }
}
