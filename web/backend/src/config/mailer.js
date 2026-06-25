const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'no-reply@support.saviraphilippines.org';

async function sendResetPasswordEmail(to, resetLink) {
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

async function sendSignInEmail(to, firstName) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'SAVIRA sign-in verification',
    html: `
      <p>Hi ${firstName || 'there'},</p>
      <p>Your SAVIRA account was just signed in on the mobile app.</p>
      <p>If this was you, no further action is needed.</p>
      <p>If you did not sign in, please reset your password or contact SAVIRA support immediately.</p>
    `,
  });

  if (error) {
    console.error('Resend error (sign-in email):', error);
    throw error;
  }

  return data;
}

module.exports = { sendResetPasswordEmail, sendWelcomeEmail, sendSignInEmail };
