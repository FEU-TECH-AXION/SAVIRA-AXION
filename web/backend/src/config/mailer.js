const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: UPDATE ONCE DOMAIN IS LIVE — replace with e.g. no-reply@yourdomain.com
const FROM_EMAIL = 'SASHA@support.saviraphilippines.org';

async function sendResetPasswordEmail(to, resetLink) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset your SASHA password',
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

module.exports = { sendResetPasswordEmail };