import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

/**
 * SMTP is optional. When it is not configured the contact form still works —
 * enquiries are persisted and shown in the dashboard inbox — so a missing
 * mail server can never cost the company a lead.
 */
function getTransporter() {
  if (!env.mail.enabled) return null;
  transporter ??= nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
  });
  return transporter;
}

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Notifies the sales inbox about a new enquiry. Never throws. */
export async function sendEnquiryNotification(message, machine) {
  const mail = getTransporter();
  if (!mail || !env.mail.to) return { sent: false, reason: 'smtp-disabled' };

  const rows = [
    ['Name', message.name],
    ['Email', message.email],
    ['Phone', message.phone || '—'],
    ['Subject', message.subject],
    ['Language', message.locale === 'ar' ? 'Arabic' : 'English'],
    ['Machine', machine ? `${machine.nameEn} (/machines/${machine.slug})` : '—'],
  ];

  const html = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#1F2937">
      <h2 style="margin:0 0 16px;color:#007BFF">New enquiry — Rashidy Import &amp; Export</h2>
      <table style="border-collapse:collapse;width:100%;max-width:620px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;background:#F3F4F6;font-weight:600;width:140px">${label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join('')}
      </table>
      <h3 style="margin:24px 0 8px">Message</h3>
      <p style="white-space:pre-wrap;line-height:1.6;background:#F9FAFB;padding:16px;border-left:3px solid #007BFF">${escapeHtml(
        message.message,
      )}</p>
    </div>`;

  try {
    await mail.sendMail({
      from: env.mail.from,
      to: env.mail.to,
      replyTo: `${message.name} <${message.email}>`,
      subject: `[Website enquiry] ${message.subject}`,
      html,
      text: rows.map(([label, value]) => `${label}: ${value}`).join('\n') + `\n\n${message.message}`,
    });
    return { sent: true };
  } catch (error) {
    // Logged, not surfaced: the visitor already got a success response and the
    // enquiry is safely in the database.
    console.error('[mailer] Failed to deliver enquiry notification:', error.message);
    return { sent: false, reason: 'smtp-error' };
  }
}

export async function verifyMailer() {
  const mail = getTransporter();
  if (!mail) return { ok: false, reason: 'disabled' };
  try {
    await mail.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}
