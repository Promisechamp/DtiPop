import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
dotenv.config();


// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email transporter ready');
  }
});

/**
 * Send verification email
 */
export const sendVerificationEmail = async (email, fullName, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  console.log('📧 Sending verification email to:', email);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Verify Your Email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; }
        .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; background: white; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; padding: 12px 30px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .expiry { color: #999; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Don't Trash It</h1>
        </div>
        <div class="content">
          <h2>Hi ${fullName},</h2>
          <p>Thank you for joining <strong>Don't Trash It</strong>!</p>
          <p>Please verify your email address to start giving items a second life:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" class="btn">Verify Email</a>
          </div>
          <p>If the button doesn't work, copy this link into your browser:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px;">
            ${verifyUrl}
          </p>
          <p class="expiry">⏰ This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>© 2026 Don't Trash It. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Don\'t Trash It" <noreply@donttrashit.com>',
    to: email,
    subject: '🎯 Verify Your Email - Don\'t Trash It',
    html: html,
  });

  console.log('✅ Verification email sent to:', email);
};







export const sendClaimEmail = async ({
  to,            // vendor email
  replyTo,       // user's email
  subject,
  text,
}) => {
  const { data, error } = await resend.emails.send({
    from: "Proof of Purchase <claims@pop.com>", // your verified domain
    to: [to],
    replyTo: replyTo,
    subject,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message);
  }

  return data;
};