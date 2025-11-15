// Temporary storage: { email: { otp, expires, attempts } }
const otpStore = new Map();

// Store OTP
const storeOTP = (email, otp, expiresIn = 5 * 60 * 1000) => {
  const expires = Date.now() + expiresIn;
  otpStore.set(email, { otp, expires, attempts: 0 });
  console.log(`📝 OTP stored for ${email}, expires in ${expiresIn / 1000}s`);
};

// Get OTP
const getOTP = (email) => {
  return otpStore.get(email);
};

// Delete OTP
const deleteOTP = (email) => {
  otpStore.delete(email);
  console.log(`🗑️ OTP deleted for ${email}`);
};

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email);
      console.log(`🧹 Expired OTP cleaned up for ${email}`);
    }
  }
}, 60000);

module.exports = { storeOTP, getOTP, deleteOTP };
