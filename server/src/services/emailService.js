// Sends transactional email via Nodemailer (password resets, important alerts).
// Fails soft: if SMTP isn't configured, it logs and returns instead of throwing,
// so missing email config never breaks a request flow.
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * @param {{to:string, subject:string, html:string}} opts
 */
export async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    logger.warn(`Email skipped (SMTP not configured): "${subject}" -> ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'ClientHub <no-reply@clienthub.app>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent: "${subject}" -> ${to}`);
  } catch (err) {
    logger.error(`Email failed -> ${to}: ${err.message}`);
  }
}
