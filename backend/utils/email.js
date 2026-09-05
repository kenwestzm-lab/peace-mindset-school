const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  family: 4, // Force IPv4 - fixes ENETUNREACH on some cloud hosts (e.g. Render)
});

async function sendPasswordResetEmail({ to, name, resetUrl, setByAdmin = false }) {
  const subject = setByAdmin
    ? "Your Peace Mindset School Password Has Been Reset"
    : "Reset Your Peace Mindset School Password";

  const introText = setByAdmin
    ? `An administrator has initiated a password reset for your account.`
    : `We received a request to reset your password.`;

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fff;">
    <div style="text-align:center; margin-bottom: 24px;">
      <h2 style="color: #9B1826; margin: 0;">Peace Mindset Private School</h2>
      <p style="color: #666; font-size: 12px; margin: 4px 0;">Better Education</p>
    </div>
    <p style="color: #333; font-size: 15px;">Hi ${name || "there"},</p>
    <p style="color: #333; font-size: 15px;">${introText}</p>
    <p style="color: #333; font-size: 15px;">Click the button below to set a new password. This link expires in <strong>30 minutes</strong>.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg,#9B1826,#c0392b); color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
        Reset My Password
      </a>
    </div>
    <p style="color: #999; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #9B1826; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #999; font-size: 12px;">If you did not request this, you can safely ignore this email — your password will not change.</p>
    <p style="color: #999; font-size: 12px;">— Peace Mindset Private School</p>
  </div>`;

  await transporter.sendMail({
    from: `"Peace Mindset Private School" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = { sendPasswordResetEmail, transporter };
