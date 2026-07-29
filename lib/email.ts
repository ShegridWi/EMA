import nodemailer from "nodemailer";

// Generic sender — deliberately has no report-specific or language-
// specific content of its own (same "take copy as props" idea as
// components/ui): callers resolve subject/body text via next-intl
// (see app/api/cron/weekly-report/route.ts) and pass the final strings
// in. Keeps this file reusable for any future transactional email, not
// just the weekly report.
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export type EmailAttachment = { filename: string; content: Buffer };

export async function sendEmail({
  to,
  subject,
  text,
  attachments,
}: {
  to: string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: to.join(", "),
    subject,
    text,
    attachments,
  });
}
