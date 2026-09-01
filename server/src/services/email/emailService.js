// Setup transport with fallback logger if SMTP environment variables are missing
let transporter;

async function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

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
        console.warn("[EmailService] Nodemailer not available, using mock transport.");
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
function renderEmailTemplate({ title, message, actionUrl, recipientName, entityType }) {
  const year = new Date().getFullYear();
  const ctaButton = actionUrl
    ? `<a href="${actionUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 16px;">View on CareerPilot</a>`
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

    // Check user notification preferences
    const prefs = user.notificationPreferences || {};

    if (prefs.emailEnabled === false) {
      console.log(`[EmailService] User ${user.email} has disabled email notifications.`);
      return false;
    }

    if (type === "INTERVIEW_REMINDER" && prefs.interviewReminders === false) return false;
    if (type === "APPLICATION_FOLLOWUP" && prefs.applicationReminders === false) return false;
    if (type === "PREPARATION_REMINDER" && prefs.preparationReminders === false) return false;
    if (type.startsWith("MENTOR_") && prefs.mentorUpdates === false) return false;

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
