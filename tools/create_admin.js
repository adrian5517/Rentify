#!/usr/bin/env node
/**
 * create_admin.js
 * Create or promote a user to admin and print an ADMIN_TOKEN.
 * Usage:
 *   node create_admin.js --email admin@example.com [--username admin] [--password Adm1n!234]
 * If --password is omitted a secure random 12-char password will be printed.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const crypto = require('crypto')
const path = require('path')

const argv = require('minimist')(process.argv.slice(2))
const email = (argv.email || argv.e || '').toString().trim().toLowerCase()
const username = (argv.username || argv.u || (email ? email.split('@')[0] : '')).toString()
let password = argv.password || argv.p || argv.pass

function usage() {
  console.log('Usage: node create_admin.js --email admin@example.com [--username admin] [--password Adm1n!234]')
  process.exit(1)
}

if (!email) usage()

// If password omitted, generate a secure one
if (!password) {
  password = crypto.randomBytes(9).toString('base64').replace(/[+\/=]/g, 'A').slice(0, 12)
  console.log('No password supplied — generated password will be shown below.')
}

// Basic complexity check (min 8 chars, uppercase, number, symbol)
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
if (!passwordRegex.test(password)) {
  console.error('Password does not meet complexity: min 8 chars, uppercase, number, symbol')
  process.exit(2)
}

const DB = process.env.DB_URI || process.env.MONGO_URI || process.env.DATABASE_URL
if (!DB) {
  console.error('DB connection string not found in env (DB_URI or MONGO_URI). Please set it in Backend/.env')
  process.exit(3)
}

async function run() {
  await mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to DB')

  const User = require(path.resolve(__dirname, '..', 'models', 'usersModel'))

  let user = await User.findOne({ email })
  if (user) {
    const wasAdmin = user.role === 'admin'
    user.role = 'admin'
    user.username = username || user.username
    // only overwrite password when explicitly provided via CLI
    if (argv.password || argv.p || argv.pass) user.password = password
    await user.save()
    console.log(`Updated existing user ${email} -> role: admin${wasAdmin ? ' (already admin)' : ''}`)
  } else {
    user = new User({ username, email, password, role: 'admin' })
    await user.save()
    console.log('Created new admin:', email)
  }

  // Generate token using model helper if available
  let token
  try {
    token = user.generateAuthToken()
  } catch (err) {
    const jwt = require('jsonwebtoken')
    const adminExpiry = process.env.ADMIN_ACCESS_EXPIRES_IN || process.env.ACCESS_EXPIRES_IN || '30d'
    token = jwt.sign({ id: user._id, role: 'admin' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: adminExpiry })
  }

  console.log('\n--- Admin created/updated ---')
  console.log('email:', user.email)
  console.log('username:', user.username)
  console.log('role:', user.role)
  console.log('userId:', user._id.toString())
  console.log('\nADMIN_TOKEN=' + token)
  console.log('\nPassword (only shown at creation or if provided):', password)

  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error('Error creating admin:', err && err.message ? err.message : err)
  process.exit(1)
})
