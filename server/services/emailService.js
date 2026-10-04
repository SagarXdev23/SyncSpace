/**
 * Email service.
 *
 * Priority order:
 *  1. Resend HTTP API (RESEND_API_KEY) — works on hosts that block SMTP
 *     ports (e.g. Render free tier). No extra dependency (uses fetch).
 *  2. SMTP via nodemailer (SMTP_HOST) — classic path.
 *  3. Dev fallback — logs the message instead of sending; never throws.
 */
const nodemailer = require("nodemailer");
const dns = require("dns").promises;

let smtpTransporter = null;
let resolvedSmtpHost = null;

/**
 * Resolve SMTP_HOST to IPv4. Some hosts lack IPv6 connectivity — without
 * this, nodemailer fails with ENETUNREACH when DNS returns IPv6 first.
 */
async function resolveIPv4(host) {
  if (resolvedSmtpHost) return resolvedSmtpHost;
  try {
    const { address } = await dns.lookup(host, { family: 4 });
    resolvedSmtpHost = address;
    return address;
  } catch {
    return host;
  }
}

async function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!process.env.SMTP_HOST) return null;
  const host = await resolveIPv4(process.env.SMTP_HOST);
  smtpTransporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: { servername: process.env.SMTP_HOST },
  });
  return smtpTransporter;
}

async function sendViaResend({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || "SyncSpace <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true, provider: "resend" };
}

async function sendViaSmtp({ to, subject, text, html }) {
  const tx = await getSmtpTransporter();
  if (!tx) return null;
  const from = process.env.SMTP_FROM || "SyncSpace <no-reply@syncspace.local>";
  await tx.sendMail({ from, to, subject, text, html });
  return { sent: true, provider: "smtp" };
}

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

async function sendMail({ to, subject, text, html }) {
  // 1. Resend (HTTP — works where SMTP ports are blocked)
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, text, html });
  }
  // 2. SMTP
  const smtpResult = await sendViaSmtp({ to, subject, text, html });
  if (smtpResult) return smtpResult;
  // 3. Dev fallback
  const from = process.env.SMTP_FROM || "SyncSpace <no-reply@syncspace.local>";
  console.log(`[email] (not configured) to=${to} subject=${subject}\n${text}`);
  return { sent: false };
}

module.exports = { sendMail, isConfigured };
