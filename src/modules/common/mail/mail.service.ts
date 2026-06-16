import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('EMAIL_HOST');
    const port = Number(this.config.get<string>('EMAIL_PORT') ?? 587);
    const user = this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('EMAIL_PASS')?.replace(/\s+/g, '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  private getFromAddress() {
    const from = this.config.get<string>('EMAIL_FROM')?.trim();
    const user = this.config.get<string>('EMAIL_USER')?.trim();

    if (from && from.includes('<') && from.includes('>')) {
      return from;
    }

    return user ? `My App <${user}>` : from;
  }

  async sendOtp(email: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: email,
        subject: 'Your OTP Code',
        html: `
        <h2>OTP Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This will expire in 10 minutes</p>
      `,
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }

  async sendSupportReply(input: {
    to: string;
    name: string;
    ticketCode: string;
    subject: string;
    message: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: input.to,
        subject: input.subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <p>Hello ${this.escapeHtml(input.name)},</p>
            <p>${this.escapeHtml(input.message).replace(/\n/g, '<br>')}</p>
            <p style="margin-top: 24px; color: #6b7280;">
              Ticket: ${this.escapeHtml(input.ticketCode)}
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send support reply to ${input.to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to send support reply');
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
