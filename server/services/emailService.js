/**
 * Email service (nodemailer).
 *
 * Used for transactional mail such as password-reset links. SMTP is
 * configured through env vars; when SMTP_HOST is not set the service
 * degrades gracefully and logs the message instead of sending it, so the
 * API keeps working in development without an email provider.
 */
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let transporter = null;
let resolvedHost = null;

async function resolveIPv4(host) {
  if (resolvedHost) return resolvedHost;
  try {
    const { address } = await dns.lookup(host, { family: 4 });
    resolvedHost = address;
    return address;
  } catch {
    return host; // fall back to the hostname
  }
}

async function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  const host = await resolveIPv4(process.env.SMTP_HOST);
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: { servername: process.env.SMTP_HOST }, // SNI for the original hostname
  });
  return transporter;
}

function isConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

async function sendMail({ to, subject, text, html }) {
  const tx = await getTransporter();
  const from = process.env.SMTP_FROM || 'SyncSpace <no-reply@syncspace.local>';
  if (!tx) {
    // Dev fallback: log instead of sending. Never throws.
    console.log(`[email] (not configured) to=${to} subject=${subject}\n${text}`);
    return { sent: false };
  }
  await tx.sendMail({ from, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendMail, isConfigured };
