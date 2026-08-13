export interface NotificationPayload {
  user_id: string;
  email?: string;
  push_token?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function deliverNotification(payload: NotificationPayload): Promise<void> {
  // In-app delivery is persisted by the worker before this function runs.
  // Push is intentionally disabled in the hard-sovereignty baseline because it
  // would hand device metadata and message routing to an external push provider.
  if (!payload.email) return;
  const host = process.env.SMTP_HOST;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!host || !from) return;
  const username = process.env.SMTP_USERNAME;
  const password = process.env.SMTP_PASSWORD;
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
    auth: username && password ? { user: username, pass: password } : undefined,
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
  });
  await transport.sendMail({ from, to: payload.email, subject: payload.title, text: payload.body });
  transport.close();
}
import nodemailer from 'nodemailer';
