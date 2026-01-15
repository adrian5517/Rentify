#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.DB_URI;
  if (!uri) {
    console.error('DB_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    const User = require('../models/usersModel');
    const admins = await User.find({ role: 'admin' }).select(' _id username email role createdAt').lean();
    if (!admins || admins.length === 0) {
      console.log('No admin users found');
    } else {
      console.log(`Found ${admins.length} admin user(s):`);
      admins.forEach(a => console.log(`- id: ${a._id} | username: ${a.username || '-'} | email: ${a.email || '-'} | createdAt: ${a.createdAt || '-'} `));
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing admins:', err.message);
    process.exit(1);
  }
}

main();
