// Quick test - Create property WITHOUT authentication
// This bypasses the protect middleware for testing purposes
// Run with: node create-property-quick.js

const BASE_URL = 'http://localhost:10000';

// You need to provide a valid user ID from your database
// Get this from: http://localhost:10000/api/auth/users
const YOUR_USER_ID = '681b26b2c58b946b8d16dacf'; // ⚠️ REPLACE WITH YOUR USER ID

const SAMPLE_PROPERTY = {
  name: 'Test Property - Quick Create',
  description: 'This is a test property created without authentication for quick testing.',
  price: 12000,
  address: 'Test Address, Naga City',
  latitude: 13.6218,
  longitude: 123.1815,
  propertyType: 'apartment',
  amenities: ['WiFi', 'Parking'],
  status: 'available',
  phoneNumber: '+63 912 345 6789',
  postedBy: 681b26b2c58b946b8d16dacf,  // Set manually
  createdBy: 681b26b2c58b946b8d16dacf   // Set manually
};

async function createQuickProperty() {
  console.log('\n========================================');
  console.log('   QUICK PROPERTY CREATE (NO AUTH)');
  console.log('========================================\n');

  try {
    console.log('📦 Creating property...');
    console.log(`   Name: ${SAMPLE_PROPERTY.name}`);
    console.log(`   User ID: ${YOUR_USER_ID}`);

    const response = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(SAMPLE_PROPERTY)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Failed to create property');
      console.error('   Status:', response.status);
      console.error('   Error:', data.message || data.error);
      
      if (response.status === 401) {
        console.log('\n⚠️  Authentication is required!');
        console.log('💡 Options:');
        console.log('   1. Use create-test-property.js instead (with login)');
        console.log('   2. Remove protect middleware temporarily');
        console.log('   3. Get a valid JWT token and add it to headers');
      }
      
      return;
    }

    if (data.success) {
      console.log('\n✅ Property created successfully!');
      console.log('\n📋 Property Details:');
      console.log(`   ID: ${data.property._id}`);
      console.log(`   Name: ${data.property.name}`);
      console.log(`   Price: ₱${data.property.price.toLocaleString()}`);
      console.log(`   Type: ${data.property.propertyType}`);

      // Check owner population
      console.log('\n👤 Owner Information:');
      if (data.property.postedBy) {
        if (typeof data.property.postedBy === 'object') {
          console.log('   ✅ Type: Object (POPULATED)');
          console.log(`   ✅ Name: ${data.property.postedBy.fullName || data.property.postedBy.username || 'N/A'}`);
          console.log(`   ✅ Email: ${data.property.postedBy.email || 'N/A'}`);
          console.log(`   ✅ Phone: ${data.property.postedBy.phoneNumber || 'N/A'}`);
        } else {
          console.log(`   ⚠️  Type: ${typeof data.property.postedBy} (NOT POPULATED)`);
          console.log(`   ⚠️  Value: ${data.property.postedBy}`);
        }
      }

      console.log('\n🧪 Next Steps:');
      console.log('   1. Run: node test-owner-info.js');
      console.log('   2. Or visit: http://localhost:10000/api/properties');
    } else {
      console.log('\n❌ Failed:', data.message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running: npm run dev');
    console.log('   2. User ID is valid (check /api/auth/users)');
  }

  console.log('\n========================================\n');
}

// Helper function to get user IDs
async function getUserIds() {
  console.log('\n📋 Fetching available users...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/users`);
    const data = await response.json();

    if (data.success && data.users && data.users.length > 0) {
      console.log('✅ Available Users:');
      data.users.slice(0, 5).forEach((user, index) => {
        console.log(`\n   ${index + 1}. ${user.fullName || user.username}`);
        console.log(`      ID: ${user._id}`);
        console.log(`      Email: ${user.email}`);
      });
      
      console.log('\n💡 Copy one of the user IDs above and paste it in YOUR_USER_ID');
      console.log('   at the top of this script, then run again.');
    } else {
      console.log('⚠️  No users found in database');
      console.log('💡 Create a user first by registering in your app');
    }
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
  }
}

// Check if user ID looks valid
if (YOUR_USER_ID === '681b26b2c58b946b8d16dacf' || YOUR_USER_ID.length !== 24) {
  console.log('\n⚠️  Warning: Using default/invalid user ID!');
  console.log('💡 You need to update YOUR_USER_ID in the script\n');
  
  getUserIds().then(() => {
    console.log('\n========================================\n');
  });
} else {
  createQuickProperty();
}
