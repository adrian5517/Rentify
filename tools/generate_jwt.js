#!/usr/bin/env node
require('dotenv').config();
const jwt = require('jsonwebtoken');

function usage() {
  console.log('Usage: node tools/generate_jwt.js <userId> [role] [expiresIn]');
  console.log('  <userId>   : the MongoDB user id to embed in the token (required)');
  console.log("  [role]     : user role, defaults to 'admin'");
  console.log("  [expiresIn]: token lifetime, defaults to '7d' (examples: 1h, 7d)");
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
  usage();
  process.exit(argv.length === 0 ? 1 : 0);
}

const [userId, role = 'admin', expiresIn = '7d'] = argv;
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET is not set in your environment. Create a Backend/.env with JWT_SECRET or export it.');
  process.exit(1);
}

const payload = { id: userId, role };
try {
  const token = jwt.sign(payload, secret, { expiresIn });
  console.log(token);
} catch (err) {
  console.error('Failed to sign token:', err.message);
  process.exit(1);
}
