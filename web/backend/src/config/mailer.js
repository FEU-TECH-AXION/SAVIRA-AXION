const { Resend } = require('resend');

const hasResendKey = Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder'));
const resend = hasResendKey ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'no-reply@support.saviraphilippines.org';

async function sendResetPasswordEmail(to, resetLink) {
  if (!resend) {
    console.warn(`[mailer disabled] Reset password link for ${to}: ${resetLink}`);
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your SAVIRA password',
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link will expire shortly. If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    throw error;
  }

  return data;
}

async function sendWelcomeEmail(to, firstName) {
  if (!resend) {
    console.warn(`[mailer disabled] Welcome email for ${to} (${firstName || 'there'})`);
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to SAVIRA!',
    html: `
      <p>Hi ${firstName},</p>
      <p>Welcome to SAVIRA! Your account has been created successfully.</p>
      <p>You can now log in and start using the platform.</p>
    `,
  });

  if (error) {
    console.error('Resend error (welcome email):', error);
    throw error;
  }

  return data;
}

async function sendVerificationCodeEmail(to, code, context = 'account') {
  if (!resend) {
    console.warn(`[mailer disabled] Verification code for ${to} (${context}): ${code}`);
    return { skipped: true, code };
  }

  const subject =
    context === 'email_change'
      ? 'Verify your new SAVIRA email'
      : 'Your SAVIRA verification code';

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <p>Your SAVIRA verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">${code}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    console.error('Resend error (verification code):', error);
    throw error;
  }

  return data;
}

async function sendSupportReplyEmail(to, subject, message) {
  if (!resend) {
    console.warn(`[mailer disabled] Support reply to ${to}: ${subject || 'SAVIRA support reply'}`);
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: subject || 'SAVIRA support reply',
    html: `
      <p>${String(message || '').replace(/\n/g, '<br />')}</p>
      <p style="margin-top: 24px;">SAVIRA Support</p>
    `,
  });

  if (error) {
    console.error('Resend error (support reply):', error);
    throw error;
  }

  return data;
}

module.exports = {
  FROM_EMAIL,
  sendResetPasswordEmail,
  sendWelcomeEmail,
  sendVerificationCodeEmail,
  sendSupportReplyEmail,
};
