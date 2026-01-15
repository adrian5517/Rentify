#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

function usage() {
  console.log('Usage: node tools/create_admin.js --email <email> [--username <username>] [--password <password>]');
  console.log('If --password is omitted a random 12-char password will be generated and printed.');
}

const argv = require('minimist')(process.argv.slice(2));
if (!argv.email || argv.h || argv.help) {
  usage();
  process.exit(1);
}

const email = argv.email;
const username = argv.username || email.split('@')[0];
let password = argv.password;

async function main() {
  const uri = process.env.DB_URI;
  if (!uri) {
    console.error('DB_URI missing in Backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    const User = require('../models/usersModel');

    let user = await User.findOne({ email });
    if (user) {
      if (user.role === 'admin') {
        console.log(`User ${email} already exists and is an admin. ID: ${user._id}`);
        await mongoose.disconnect();
        process.exit(0);
      }
      user.role = 'admin';
      await user.save();
      console.log(`Promoted existing user ${email} to admin. ID: ${user._id}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // create new user
    if (!password) {
      password = crypto.randomBytes(9).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B').slice(0, 12);
    }

    const newUser = new (require('../models/usersModel'))({
      email,
      username,
      password,
      role: 'admin'
    });
    await newUser.save();
    console.log('Created new admin user:');
    console.log(`  id: ${newUser._id}`);
    console.log(`  email: ${newUser.email}`);
    console.log(`  username: ${newUser.username}`);
    console.log(`  password: ${password}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

main();
