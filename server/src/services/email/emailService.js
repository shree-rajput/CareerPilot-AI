// Setup transport with fallback logger if SMTP environment variables are missing
let transporter;

async function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (host && user && pass) {
      try {
        const nodemailer = await import("nodemailer");
        transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user, pass }
        });
      } catch (err) {
        console.warn("[EmailService] Nodemailer error, using mock transport.", err);
      }
    }
    
    if (!transporter) {
      // Development mock transport (logs email content safely)
      transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[EmailService MOCK] Sent to: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
          return { messageId: `mock_${Date.now()}` };
        }
      };
    }
  }
  return transporter;
}

/**
 * Renders HTML template for notification emails.
 */
function renderEmailTemplate({ title, message, actionUrl, recipientName, _entityType }) {
  const year = new Date().getFullYear();
  const baseUrl = process.env.CLIENT_URL || "https://careerpilot.ai";
  
  const absoluteActionUrl = actionUrl
    ? (actionUrl.startsWith("http") ? actionUrl : `${baseUrl}${actionUrl.startsWith("/") ? "" : "/"}${actionUrl}`)
    : "";

  const ctaButton = absoluteActionUrl
    ? `<a href="${absoluteActionUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 16px;">View Details on CareerPilot</a>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
    .header { font-size: 20px; font-weight: 800; color: #6366f1; letter-spacing: 0.5px; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">✈ CAREERPILOT AI</div>
    <div class="title">${title}</div>
    <div class="content">
      <p>Hello ${recipientName || "there"},</p>
      <p>${message}</p>
      ${ctaButton}
    </div>
    <div class="footer">
      © ${year} CareerPilot AI Platform. You are receiving this because of your notification settings.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends email notification asynchronously.
 */
export async function sendEmailNotification({ user, type, title, message, actionUrl, entityType }) {
  try {
    if (!user || !user.email) return false;

    const prefs = user.notificationPreferences || {};

    if (prefs.emailEnabled === false) {
      console.log(`[EmailService] User ${user.email} has disabled all email notifications.`);
      return false;
    }

    if (type === "ACTION_REQUIRED" && prefs.actionRequired === false) return false;
    if (type === "OPPORTUNITY" && prefs.opportunity === false) return false;
    if (type === "INTERVIEW" && prefs.interview === false) return false;
    if (type === "LEARNING" && prefs.learning === false) return false;
    if (type === "PROGRESS" && prefs.progress === false) return false;

    const htmlContent = renderEmailTemplate({
      title,
      message,
      actionUrl,
      recipientName: user.name,
      entityType
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"CareerPilot AI" <notifications@careerpilot.ai>',
      to: user.email,
      subject: `[CareerPilot] ${title}`,
      html: htmlContent
    };

    const mailer = await getTransporter();
    await mailer.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send email to ${user?.email}:`, error.message);
    return false;
  }
}

/**
 * Sends Email Verification link.
 */
export async function sendVerificationEmail({ user, token }) {
  try {
    if (!user || !user.email || !token) return false;

    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
    .header { font-size: 20px; font-weight: 800; color: #6366f1; letter-spacing: 0.5px; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .btn { background-color: #6366f1; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 16px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">✈ CAREERPILOT AI</div>
    <div class="title">Verify Your Email Address</div>
    <div class="content">
      <p>Hello ${user.name || "there"},</p>
      <p>Thank you for registering on CareerPilot AI. Please click the button below to verify your email address and activate your career accelerator features.</p>
      <p><a href="${verificationUrl}" class="btn">Verify Email Address</a></p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${verificationUrl}" style="color: #818cf8;">${verificationUrl}</a></p>
      <p style="font-size: 12px; color: #94a3b8;">This verification link will expire in 24 hours.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} CareerPilot AI. If you did not create an account, please ignore this email.
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"CareerPilot AI" <no-reply@careerpilot.ai>',
      to: user.email,
      subject: "[CareerPilot] Verify your email address",
      html: htmlContent
    };

    const mailer = await getTransporter();
    await mailer.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send verification email to ${user?.email}:`, error.message);
    return false;
  }
}

/**
 * Sends Password Reset link.
 */
export async function sendPasswordResetEmail({ user, token }) {
  try {
    if (!user || !user.email || !token) return false;

    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
    .header { font-size: 20px; font-weight: 800; color: #6366f1; letter-spacing: 0.5px; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .btn { background-color: #ef4444; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 16px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">✈ CAREERPILOT AI</div>
    <div class="title">Reset Your Password</div>
    <div class="content">
      <p>Hello ${user.name || "there"},</p>
      <p>We received a request to reset your CareerPilot AI account password. Click the button below to set a new password:</p>
      <p><a href="${resetUrl}" class="btn">Reset Password</a></p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If the button does not work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #f87171;">${resetUrl}</a></p>
      <p style="font-size: 12px; color: #94a3b8;">This password reset link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} CareerPilot AI. Account Security Department.
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"CareerPilot Security" <security@careerpilot.ai>',
      to: user.email,
      subject: "[CareerPilot] Password Reset Request",
      html: htmlContent
    };

    const mailer = await getTransporter();
    await mailer.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send password reset email to ${user?.email}:`, error.message);
    return false;
  }
}

/**
 * Sends Password Reset Confirmation notification.
 */
export async function sendPasswordResetConfirmationEmail({ user }) {
  try {
    if (!user || !user.email) return false;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
    .header { font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: 0.5px; margin-bottom: 24px; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .content { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">✓ CAREERPILOT AI</div>
    <div class="title">Password Reset Successful</div>
    <div class="content">
      <p>Hello ${user.name || "there"},</p>
      <p>Your CareerPilot AI account password was successfully changed. You can now log in using your new credentials.</p>
      <p>If you did not make this change, please contact platform security support immediately.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} CareerPilot AI Platform.
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"CareerPilot Security" <security@careerpilot.ai>',
      to: user.email,
      subject: "[CareerPilot] Your password has been reset",
      html: htmlContent
    };

    const mailer = await getTransporter();
    await mailer.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed to send password reset confirmation to ${user?.email}:`, error.message);
    return false;
  }
}
