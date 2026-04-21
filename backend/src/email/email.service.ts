import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Email sending is disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.transporter.verify().then(() => {
      this.logger.log(`SMTP connected: ${host}:${port}`);
    }).catch((err) => {
      this.logger.error(`SMTP connection failed: ${err.message}`);
    });
  }

  get isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendResetPasswordEmail(
    to: string,
    resetToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Cannot send email — SMTP not configured');
      return false;
    }

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'https://ruts-realaids.duckdns.org:4443',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">RUTS REALAIDS</h1>
              <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">ระบบแจ้งเหตุฉุกเฉินและห้องพยาบาล</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">สวัสดี <strong>${userName}</strong>,</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
                เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">
                      รีเซ็ตรหัสผ่าน
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;">
                ลิงก์นี้จะหมดอายุใน <strong>60 นาที</strong><br>
                หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                &copy; 2026 มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', `RUTS REALAIDS <${this.config.get('SMTP_USER')}>`),
        to,
        subject: 'รีเซ็ตรหัสผ่าน — RUTS REALAIDS',
        html,
      });
      this.logger.log(`Reset password email sent to: ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${to}: ${err.message}`);
      return false;
    }
  }
}
