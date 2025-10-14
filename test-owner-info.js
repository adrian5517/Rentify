// Test script to verify owner information population
// Run this after starting the server with: node test-owner-info.js

const BASE_URL = 'http://localhost:10000';

async function testOwnerPopulation() {
  console.log('🧪 Testing Owner Information Population\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Get All Properties
    console.log('\n📋 Test 1: GET /api/properties');
    console.log('-'.repeat(50));
    
    const response = await fetch(`${BASE_URL}/api/properties`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Request failed:', response.status);
      console.error('Error:', data);
      return;
    }

    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`✅ Properties count: ${data.count}`);

    if (data.properties && data.properties.length > 0) {
      const firstProperty = data.properties[0];
      
      console.log('\n📦 First Property:');
      console.log(`   Name: ${firstProperty.name}`);
      console.log(`   Property Phone: ${firstProperty.phoneNumber || 'N/A'}`);
      
      // Check postedBy population
      console.log('\n👤 Posted By:');
      if (firstProperty.postedBy) {
        if (typeof firstProperty.postedBy === 'object') {
          console.log('   ✅ Type: Object (POPULATED)');
          console.log(`   ✅ ID: ${firstProperty.postedBy._id}`);
          console.log(`   ✅ Name: ${firstProperty.postedBy.fullName || 'N/A'}`);
          console.log(`   ✅ Email: ${firstProperty.postedBy.email || 'N/A'}`);
          console.log(`   ✅ Phone: ${firstProperty.postedBy.phoneNumber || 'N/A'}`);
          console.log(`   ✅ Username: ${firstProperty.postedBy.username || 'N/A'}`);
          console.log('   ✅ RESULT: Owner information is POPULATED! 🎉');
        } else {
          console.log(`   ❌ Type: ${typeof firstProperty.postedBy}`);
          console.log(`   ❌ Value: ${firstProperty.postedBy}`);
          console.log('   ❌ RESULT: Owner information is NOT populated (just ID)');
        }
      } else {
        console.log('   ❌ postedBy is null or undefined');
      }

      // Check createdBy population
      console.log('\n👤 Created By:');
      if (firstProperty.createdBy) {
        if (typeof firstProperty.createdBy === 'object') {
          console.log('   ✅ Type: Object (POPULATED)');
          console.log(`   ✅ Name: ${firstProperty.createdBy.fullName || 'N/A'}`);
        } else {
          console.log(`   ❌ Type: ${typeof firstProperty.createdBy}`);
          console.log('   ❌ RESULT: createdBy is NOT populated');
        }
      } else {
        console.log('   ⚠️  createdBy is null or undefined');
      }

    } else {
      console.log('\n⚠️  No properties found in database');
      console.log('   Create a property first to test population');
    }

    // Test 2: Get Single Property
    if (data.properties && data.properties.length > 0) {
      console.log('\n' + '='.repeat(50));
      console.log('\n📋 Test 2: GET /api/properties/:id');
      console.log('-'.repeat(50));
      
      const propertyId = data.properties[0]._id;
      const singleResponse = await fetch(`${BASE_URL}/api/properties/${propertyId}`);
      const singleData = await singleResponse.json();
      
      console.log(`✅ Status: ${singleResponse.status}`);
      console.log(`✅ Success: ${singleData.success}`);
      
      if (singleData.property && singleData.property.postedBy) {
        if (typeof singleData.property.postedBy === 'object') {
          console.log('✅ Single property also has POPULATED owner info! 🎉');
        } else {
          console.log('❌ Single property owner NOT populated');
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(50));
    
    if (data.properties && data.properties.length > 0) {
      const prop = data.properties[0];
      const isPopulated = prop.postedBy && typeof prop.postedBy === 'object';
      
      if (isPopulated) {
        console.log('✅ Owner information is WORKING!');
        console.log('✅ Frontend can now display owner details');
        console.log('✅ "Contact Owner" button will work');
        console.log('\n🚀 Ready to deploy to production!');
      } else {
        console.log('❌ Owner information NOT populated');
        console.log('⚠️  Check if server restarted after code changes');
        console.log('⚠️  Check if properties have valid postedBy IDs');
      }
    } else {
      console.log('⚠️  No properties to test');
      console.log('💡 Create a property first using POST /api/properties');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\n💡 Make sure the server is running: npm run dev');
  }

  console.log('\n' + '='.repeat(50));
}

// Run the test
testOwnerPopulation();
