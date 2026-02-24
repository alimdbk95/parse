import nodemailer from 'nodemailer';

// Create transporter based on environment variables
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

const transporter = createTransporter();

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!transporter) {
    console.log('Email service not configured, skipping email send');
    return false;
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

interface InvitationEmailParams {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
}

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<boolean> {
  const { toEmail, workspaceName, inviterName, role, inviteLink, expiresIn } = params;

  const subject = `You've been invited to join ${workspaceName} on Parse`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #141414; border-radius: 12px; border: 1px solid #262626;">
          <tr>
            <td style="padding: 40px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Parse</h1>
              </div>

              <!-- Content -->
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff; text-align: center;">
                You've been invited!
              </h2>

              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa; text-align: center;">
                <strong style="color: #ffffff;">${inviterName}</strong> has invited you to join
                <strong style="color: #ffffff;">${workspaceName}</strong> as a <strong style="color: #22c55e;">${role}</strong>.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}"
                   style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #0a0a0a; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                  Accept Invitation
                </a>
              </div>

              <!-- Expiration Notice -->
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #71717a; text-align: center;">
                This invitation expires in ${expiresIn}.
              </p>

              <!-- Link fallback -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #262626;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; text-align: center;">
                  If the button doesn't work, copy and paste this link:
                </p>
                <p style="margin: 0; font-size: 12px; color: #3b82f6; text-align: center; word-break: break-all;">
                  ${inviteLink}
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #52525b; text-align: center;">
          Parse - Research Document Analysis Platform
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
You've been invited to join ${workspaceName} on Parse!

${inviterName} has invited you to join ${workspaceName} as a ${role}.

Accept the invitation by visiting: ${inviteLink}

This invitation expires in ${expiresIn}.

---
Parse - Research Document Analysis Platform
`;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text,
  });
}
