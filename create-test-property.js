// Script to create test properties with authentication
// Run with: node create-test-property.js

const BASE_URL = 'http://localhost:10000';

// Test user credentials - make sure this user exists in your database
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};

// Sample properties to create
const SAMPLE_PROPERTIES = [
  {
    name: 'Modern 2BR Apartment',
    description: 'Beautiful modern apartment in the heart of Naga City. Features 2 bedrooms, 1 bathroom, fully furnished with WiFi and parking.',
    price: 15000,
    address: 'Magsaysay Avenue, Naga City, Camarines Sur',
    latitude: 13.6218,
    longitude: 123.1815,
    propertyType: 'apartment',
    amenities: ['WiFi', 'Parking', 'Air Conditioning', 'Furnished'],
    status: 'available',
    phoneNumber: '+63 912 345 6789'
  },
  {
    name: 'Cozy Studio Near University',
    description: 'Perfect for students! Cozy studio unit near Ateneo de Naga University. Includes all utilities and fast internet.',
    price: 8000,
    address: 'Ateneo Avenue, Naga City, Camarines Sur',
    latitude: 13.6190,
    longitude: 123.1820,
    propertyType: 'room',
    amenities: ['WiFi', 'Water', 'Electricity', 'Near School'],
    status: 'available',
    phoneNumber: '+63 917 234 5678'
  },
  {
    name: 'Spacious Family House',
    description: 'Large family house with 4 bedrooms, 3 bathrooms, garage, and spacious backyard. Perfect for families.',
    price: 25000,
    address: 'Carolina Street, Naga City, Camarines Sur',
    latitude: 13.6250,
    longitude: 123.1800,
    propertyType: 'house',
    amenities: ['Parking', 'Garage', 'Garden', 'Security', 'Pet Friendly'],
    status: 'available',
    phoneNumber: '+63 918 345 6789'
  }
];

async function loginUser() {
  console.log('\n🔐 Logging in...');
  console.log(`   Email: ${TEST_USER.email}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Login failed:', data.message);
      console.log('\n💡 Siguraduhing may existing user ka sa database:');
      console.log('   Email:', TEST_USER.email);
      console.log('   Password:', TEST_USER.password);
      console.log('\n💡 O i-update ang TEST_USER credentials sa script');
      return null;
    }

    if (data.success && data.token) {
      console.log('✅ Login successful!');
      console.log(`   User: ${data.user.fullName || data.user.username}`);
      console.log(`   User ID: ${data.user._id}`);
      return {
        token: data.token,
        user: data.user
      };
    } else {
      console.error('❌ No token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
    return null;
  }
}

async function createProperty(propertyData, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(propertyData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`   ❌ Failed: ${data.message}`);
      return null;
    }

    if (data.success) {
      console.log(`   ✅ Created: ${propertyData.name}`);
      console.log(`      Property ID: ${data.property._id}`);
      
      // Check if owner is populated
      if (data.property.postedBy && typeof data.property.postedBy === 'object') {
        console.log(`      Owner: ${data.property.postedBy.fullName || data.property.postedBy.username} ✅`);
      } else {
        console.log(`      Owner: ${data.property.postedBy} ⚠️ (not populated)`);
      }
      
      return data.property;
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function createTestProperties() {
  console.log('\n========================================');
  console.log('   CREATE TEST PROPERTIES');
  console.log('========================================\n');

  // Step 1: Login
  const auth = await loginUser();
  if (!auth) {
    console.log('\n❌ Cannot proceed without authentication');
    console.log('\n💡 Options:');
    console.log('   1. Create a user first:');
    console.log('      - Go to your app and register');
    console.log('      - Or use existing user credentials');
    console.log('   2. Update TEST_USER in this script');
    return;
  }

  console.log('\n📦 Creating properties...\n');

  // Step 2: Create properties
  const createdProperties = [];
  for (let i = 0; i < SAMPLE_PROPERTIES.length; i++) {
    const propertyData = SAMPLE_PROPERTIES[i];
    console.log(`\n[${i + 1}/${SAMPLE_PROPERTIES.length}] Creating: ${propertyData.name}`);
    
    const property = await createProperty(propertyData, auth.token);
    if (property) {
      createdProperties.push(property);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Step 3: Summary
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================\n');

  if (createdProperties.length > 0) {
    console.log(`✅ Successfully created ${createdProperties.length}/${SAMPLE_PROPERTIES.length} properties`);
    console.log('\n📊 Created Properties:');
    createdProperties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.name}`);
      console.log(`      - Price: ₱${prop.price.toLocaleString()}`);
      console.log(`      - Type: ${prop.propertyType}`);
      console.log(`      - Location: ${prop.location.address}`);
    });

    console.log('\n🧪 Now you can test:');
    console.log('   1. Run: node test-owner-info.js');
    console.log('   2. Or visit: http://localhost:10000/api/properties');
    console.log('   3. Check if owner information is populated');
  } else {
    console.log('❌ No properties were created');
    console.log('\n💡 Check the errors above and try again');
  }

  console.log('\n========================================\n');
}

// Run the script
createTestProperties();
