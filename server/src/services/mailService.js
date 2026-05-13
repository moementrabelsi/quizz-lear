import nodemailer from 'nodemailer';

let transporterPromise;

async function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendOtpEmail(to, code) {
  const from = process.env.SMTP_FROM || 'noreply@lear.com';
  const transport = await getTransporter();
  const subject = 'Your Lear training verification code';
  const text = `Your verification code is: ${code}\n\nThis code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`;

  if (!transport) {
    console.info(`[OTP dev] To: ${to}\n${text}`);
    return { sent: false, logged: true };
  }

  await transport.sendMail({ from, to, subject, text });
  return { sent: true };
}
