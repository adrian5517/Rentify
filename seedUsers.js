require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/usersModel');

const DB_URI = process.env.DB_URI;

const testUsers = [
    {
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        fullName: 'John Doe',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john.doe@example.com'
    },
    {
        username: 'jane_smith',
        email: 'jane.smith@example.com',
        password: 'password123',
        phoneNumber: '+1234567891',
        fullName: 'Jane Smith',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane.smith@example.com'
    },
    {
        username: 'bob_johnson',
        email: 'bob.johnson@example.com',
        password: 'password123',
        phoneNumber: '+1234567892',
        fullName: 'Bob Johnson',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob.johnson@example.com'
    },
    {
        username: 'alice_williams',
        email: 'alice.williams@example.com',
        password: 'password123',
        phoneNumber: '+1234567893',
        fullName: 'Alice Williams',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice.williams@example.com'
    },
    {
        username: 'mike_brown',
        email: 'mike.brown@example.com',
        password: 'password123',
        phoneNumber: '+1234567894',
        fullName: 'Mike Brown',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike.brown@example.com'
    },
    {
        username: 'sarah_davis',
        email: 'sarah.davis@example.com',
        password: 'password123',
        phoneNumber: '+1234567895',
        fullName: 'Sarah Davis',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah.davis@example.com'
    },
    {
        username: 'tom_wilson',
        email: 'tom.wilson@example.com',
        password: 'password123',
        phoneNumber: '+1234567896',
        fullName: 'Tom Wilson',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom.wilson@example.com'
    },
    {
        username: 'emma_garcia',
        email: 'emma.garcia@example.com',
        password: 'password123',
        phoneNumber: '+1234567897',
        fullName: 'Emma Garcia',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma.garcia@example.com'
    },
    {
        username: 'admin_user',
        email: 'admin@example.com',
        password: 'admin123',
        phoneNumber: '+1234567898',
        fullName: 'Admin User',
        role: 'admin',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin@example.com'
    },
    {
        username: 'david_martinez',
        email: 'david.martinez@example.com',
        password: 'password123',
        phoneNumber: '+1234567899',
        fullName: 'David Martinez',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david.martinez@example.com'
    },
    {
        username: 'lisa_rodriguez',
        email: 'lisa.rodriguez@example.com',
        password: 'password123',
        phoneNumber: '+1234567800',
        fullName: 'Lisa Rodriguez',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa.rodriguez@example.com'
    },
    {
        username: 'james_lee',
        email: 'james.lee@example.com',
        password: 'password123',
        phoneNumber: '+1234567801',
        fullName: 'James Lee',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=james.lee@example.com'
    },
    {
        username: 'maria_hernandez',
        email: 'maria.hernandez@example.com',
        password: 'password123',
        phoneNumber: '+1234567802',
        fullName: 'Maria Hernandez',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria.hernandez@example.com'
    },
    {
        username: 'chris_anderson',
        email: 'chris.anderson@example.com',
        password: 'password123',
        phoneNumber: '+1234567803',
        fullName: 'Chris Anderson',
        role: 'user',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chris.anderson@example.com'
    },
    {
        username: 'nancy_taylor',
        email: 'nancy.taylor@example.com',
        password: 'password123',
        phoneNumber: '+1234567804',
        fullName: 'Nancy Taylor',
        role: 'renter',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nancy.taylor@example.com'
    }
];

async function seedUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(DB_URI, {});
        console.log('✅ Connected to MongoDB');

        // Clear existing test users (optional - comment out if you want to keep existing data)
        // await User.deleteMany({ email: { $in: testUsers.map(u => u.email) } });
        // console.log('🗑️  Cleared existing test users');

        // Create users
        const createdUsers = [];
        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: userData.email });
                if (existingUser) {
                    console.log(`⚠️  User ${userData.email} already exists, skipping...`);
                    continue;
                }

                const user = new User(userData);
                await user.save();
                createdUsers.push(user);
                console.log(`✅ Created user: ${userData.username} (${userData.email})`);
            } catch (error) {
                console.error(`❌ Error creating user ${userData.email}:`, error.message);
            }
        }

        console.log(`\n🎉 Successfully created ${createdUsers.length} test users!`);
        console.log('\nTest user credentials:');
        console.log('Email: john.doe@example.com | Password: password123');
        console.log('Email: jane.smith@example.com | Password: password123');
        console.log('Email: admin@example.com | Password: admin123');
        console.log('... and more (all use password: password123 except admin)');

    } catch (error) {
        console.error('❌ Error seeding users:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

seedUsers();
