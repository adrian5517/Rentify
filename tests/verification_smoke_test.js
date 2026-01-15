require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Build BASE URL: prefer BASE_URL, otherwise use PORT (if set) or default to 5000
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const OWNER_TOKEN = process.env.OWNER_TOKEN;
const PROPERTY_ID = process.env.PROPERTY_ID;
const SAMPLE_FILE = process.env.SAMPLE_FILE || './tests/sample.jpg';

const missing = [];
if (!ADMIN_TOKEN) missing.push('ADMIN_TOKEN');
if (!OWNER_TOKEN) missing.push('OWNER_TOKEN');
if (!PROPERTY_ID) missing.push('PROPERTY_ID');
if (missing.length > 0) {
  console.error('Missing required env vars:', missing.join(', '));
  console.error('Please set them in .env located in Backend/ and re-run.');
  process.exit(1);
}

async function listPending() {
  console.log('\n[admin] GET pending');
  const res = await axios.get(`${BASE}/properties/admin/pending`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
  console.log('status:', res.status, 'count:', res.data.count || (res.data.properties && res.data.properties.length));
  return res.data;
}

async function uploadDocs() {
  console.log('\n[owner] POST upload docs');
  const form = new FormData();
  if (!fs.existsSync(SAMPLE_FILE)) {
    console.warn('Sample file not found at', SAMPLE_FILE, '— skipping upload step.');
    return null;
  }
  form.append('docs', fs.createReadStream(SAMPLE_FILE));

  const res = await axios.post(`${BASE}/properties/${PROPERTY_ID}/verification/docs`, form, {
    headers: Object.assign({ Authorization: `Bearer ${OWNER_TOKEN}` }, form.getHeaders()),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  console.log('status:', res.status, 'message:', res.data.message);
  return res.data;
}

async function submitForVerification() {
  console.log('\n[owner] POST submit verification');
  const res = await axios.post(`${BASE}/properties/${PROPERTY_ID}/verification/submit`, { notes: 'Smoke test submission' }, { headers: { Authorization: `Bearer ${OWNER_TOKEN}` } });
  console.log('status:', res.status, 'message:', res.data.message);
  return res.data;
}

async function adminVerify() {
  console.log('\n[admin] POST verify');
  const res = await axios.post(`${BASE}/properties/admin/${PROPERTY_ID}/verify`, { notes: 'Smoke test verified' }, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
  console.log('status:', res.status, 'message:', res.data.message);
  return res.data;
}

(async () => {
  try {
    await listPending();
    await uploadDocs();
    await submitForVerification();
    await listPending();
    await adminVerify();
    await listPending();
    console.log('\nSmoke test finished.');
  } catch (err) {
    if (err.config) {
      console.error('Request URL:', err.config.url);
      console.error('Request method:', err.config.method);
    }
    if (err.response) {
      console.error('API error:', err.response.status);
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
    process.exitCode = 1;
  }
})();
