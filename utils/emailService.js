const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email via SendGrid
const sendOTPEmail = async (email, otp) => {
  const msg = {
    to: email,
    from: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@rentify.com',
    subject: 'Rentify - Password Reset OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>We received a request to reset your Rentify account password. Use the OTP code below to proceed:</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">This code will expire in 5 minutes</p>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>

            <p>Need help? Contact our support team at support@rentify.com</p>
            <p>Best regards,<br><strong>The Rentify Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 Rentify. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    await sgMail.send(msg);
    console.log('✅ OTP email sent via SendGrid to:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { generateOTP, sendOTPEmail };
