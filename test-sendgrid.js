require('dotenv').config();
const sgMail = require('@sendgrid/mail');

console.log('🔍 Testing SendGrid Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('✓ SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✓ Set' : '✗ Not set');
console.log('✓ SENDGRID_VERIFIED_SENDER:', process.env.SENDGRID_VERIFIED_SENDER || '✗ Not set');
console.log();

if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY not found in .env file');
  process.exit(1);
}

if (!process.env.SENDGRID_VERIFIED_SENDER) {
  console.error('❌ Error: SENDGRID_VERIFIED_SENDER not found in .env file');
  process.exit(1);
}

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Test email
const testEmail = async () => {
  const msg = {
    to: process.env.SENDGRID_VERIFIED_SENDER, // Send to yourself for testing
    from: process.env.SENDGRID_VERIFIED_SENDER,
    subject: '🧪 Rentify SendGrid Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>✅ SendGrid is Working!</h2>
        <p>This is a test email from your Rentify server.</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          If you received this email, your SendGrid configuration is correct.
        </p>
      </div>
    `
  };

  try {
    console.log('📧 Sending test email...');
    console.log(`   To: ${msg.to}`);
    console.log(`   From: ${msg.from}`);
    console.log();
    
    const response = await sgMail.send(msg);
    
    console.log('✅ SUCCESS! Email sent via SendGrid');
    console.log('📊 Response Status:', response[0].statusCode);
    console.log('📨 Message ID:', response[0].headers['x-message-id']);
    console.log();
    console.log('✓ Check your inbox:', process.env.SENDGRID_VERIFIED_SENDER);
    console.log('✓ Also check spam/junk folder if not in inbox');
    
  } catch (error) {
    console.error('\n❌ SENDGRID ERROR:\n');
    console.error('Error Message:', error.message);
    
    if (error.response) {
      console.error('\n📋 Error Details:');
      console.error(JSON.stringify(error.response.body, null, 2));
      
      // Common error explanations
      if (error.response.body.errors) {
        console.error('\n💡 Common Solutions:');
        error.response.body.errors.forEach((err, i) => {
          console.error(`\n${i + 1}. ${err.message}`);
          
          if (err.message.includes('does not have permissions')) {
            console.error('   → Go to: https://app.sendgrid.com/settings/api_keys');
            console.error('   → Make sure your API key has "Mail Send" permission');
          }
          
          if (err.message.includes('not a verified sender')) {
            console.error('   → Go to: https://app.sendgrid.com/settings/sender_auth/senders');
            console.error('   → Verify the sender email:', process.env.SENDGRID_VERIFIED_SENDER);
            console.error('   → Check your email for verification link from SendGrid');
          }
          
          if (err.message.includes('Forbidden')) {
            console.error('   → Your API key might be invalid or expired');
            console.error('   → Create a new API key at: https://app.sendgrid.com/settings/api_keys');
          }
        });
      }
    }
    
    process.exit(1);
  }
};

testEmail();
