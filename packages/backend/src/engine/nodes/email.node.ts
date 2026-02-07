import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';
import * as nodemailer from 'nodemailer';

/**
 * Email Send Node
 *
 * Sends an email via SMTP. Supports plain text and HTML bodies,
 * CC / BCC, attachments (base64), reply-to, and custom headers.
 *
 * Config:
 *   - smtp:         object   (SMTP connection settings)
 *       host:       string   (SMTP server hostname)
 *       port:       number   (SMTP port, e.g. 587, 465, 25)
 *       secure:     boolean  (true for TLS on connect / port 465)
 *       auth:       object   ({ user: string; pass: string })
 *       tls:        object?  (additional TLS options)
 *   - from:         string   (sender address, e.g. "FlowForge <noreply@flowforge.io>")
 *   - to:           string | string[]   (recipient address(es))
 *   - cc:           string | string[]?
 *   - bcc:          string | string[]?
 *   - replyTo:      string?
 *   - subject:      string
 *   - text:         string?             (plain text body)
 *   - html:         string?             (HTML body)
 *   - attachments:  Array<{
 *       filename: string;
 *       content:  string;              // base64-encoded content
 *       contentType?: string;
 *     }>?
 *   - headers:      Record<string, string>?   (custom mail headers)
 *   - priority:     'high' | 'normal' | 'low'?
 */
export class EmailNode implements NodeHandler {
  readonly type = 'email';
  readonly category = 'integrations';
  readonly description =
    'Sends an email via SMTP with support for HTML, attachments, and templates';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const {
      smtp,
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      text,
      html,
      attachments,
      headers,
      priority = 'normal',
    } = { ...config, ...inputs };

    // Validate required fields
    if (!smtp || !smtp.host) {
      throw new Error(
        'Email node: "smtp.host" is required',
      );
    }
    if (!from) {
      throw new Error('Email node: "from" is required');
    }
    if (!to) {
      throw new Error('Email node: "to" is required');
    }
    if (!subject) {
      throw new Error('Email node: "subject" is required');
    }
    if (!text && !html) {
      throw new Error(
        'Email node: at least one of "text" or "html" is required',
      );
    }

    // Create the SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 587,
      secure: smtp.secure ?? (smtp.port === 465),
      auth: smtp.auth
        ? { user: smtp.auth.user, pass: smtp.auth.pass }
        : undefined,
      tls: smtp.tls || { rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });

    // Build the mail options
    const mailOptions: Record<string, any> = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
    };

    if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    if (replyTo) mailOptions.replyTo = replyTo;
    if (text) mailOptions.text = text;
    if (html) mailOptions.html = html;
    if (headers) mailOptions.headers = headers;

    // Map priority to the X-Priority header value
    switch (priority) {
      case 'high':
        mailOptions.priority = 'high';
        break;
      case 'low':
        mailOptions.priority = 'low';
        break;
      default:
        mailOptions.priority = 'normal';
    }

    // Process attachments (base64 encoded)
    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map(
        (att: {
          filename: string;
          content: string;
          contentType?: string;
        }) => ({
          filename: att.filename,
          content: att.content,
          encoding: 'base64',
          contentType: att.contentType,
        }),
      );
    }

    try {
      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        envelope: info.envelope,
        to: mailOptions.to,
        subject,
        sentAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Email send failed: ${error.message}`);
    } finally {
      transporter.close();
    }
  }

  validate(config: Record<string, any>): boolean {
    if (!config.smtp || !config.smtp.host) return false;
    if (!config.from || typeof config.from !== 'string') return false;
    if (!config.to) return false;
    if (!config.subject || typeof config.subject !== 'string') return false;
    if (!config.text && !config.html) return false;
    return true;
  }
}
