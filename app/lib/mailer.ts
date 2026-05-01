import nodemailer from 'nodemailer';

/**
 * Shared nodemailer transporter.
 * Uses GMAIL_USER + GMAIL_APP_PASSWORD from .env.local.
 */
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
