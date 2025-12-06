# Upload Profile Pictures — Server Implementation Guide

This document describes how to implement secure profile-image upload handling using Cloudinary with Express. It includes recommended installation steps, a sample upload route (buffer -> Cloudinary), how to wire it into `server.js`, and a short client example showing the two-step flow (upload -> update profile).

---

## Summary
- Use `multer` with `memoryStorage` to accept multipart uploads and keep file buffers in memory.
- Stream the buffer to Cloudinary using `streamifier` and `cloudinary.uploader.upload_stream` to avoid writing files to disk.
- Return the Cloudinary secure URL(s) to the client. The client then calls the existing endpoint `PUT /api/auth/users/:userId/profile-picture` (or a one-step endpoint if you prefer) to update the user's `profilePicture` field.

This code is compatible with the existing repository layout (`cloudinary.js`, `middleware/uploadMiddleware.js`). A route file example was already added at `routes/upload.js` in this repo.

---

## Install (PowerShell)
Run these in the project root:

```powershell
npm install streamifier
# multer and cloudinary are already in package.json; if missing:
# npm install multer cloudinary
```

---

## Environment variables
Ensure these are set in your environment (and in your host, e.g., Render/Vercel/Heroku):

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Also ensure the app's `JWT_SECRET` and `DB_URI` are set for other authenticated endpoints.

---

## Recommended upload route (server-side)
This route accepts any file field (`upload.any()`), streams each file buffer to Cloudinary, and returns an array of uploaded file URLs.

routes/upload.js (reference):

```javascript
const express = require('express');
const router = express.Router();
const streamifier = require('streamifier');
const cloudinary = require('../cloudinary');
const upload = require('../middleware/uploadMiddleware'); // multer memoryStorage

function uploadBufferToCloudinary(buffer, folder = 'rentify/profiles') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

router.post('/', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const results = [];
    for (const file of req.files) {
      const result = await uploadBufferToCloudinary(file.buffer, 'rentify/profiles');
      results.push({ fileName: file.originalname, url: result.secure_url || result.url });
    }

    return res.status(200).json({ success: true, files: results });
  } catch (err) {
    console.error('Upload route error:', err);
    return res.status(500).json({ success: false, message: 'Internal Server Error during upload', error: String(err.message || err) });
  }
});

module.exports = router;
```

Mount it under `/api/upload` in `server.js`:

```javascript
const uploadRoute = require('./routes/upload');
app.use('/api/upload', uploadRoute);
```

Note: The repository already contains `routes/upload.js` and mounts it in `server.js`.

---

## Existing profile update endpoint (two-step flow)
The current `uploadProfilePicture` in `controllers/authController.js` accepts a JSON body containing `imageUrl` and updates the user's `profilePicture`:

- `PUT /api/auth/users/:userId/profile-picture` example request body: `{ "imageUrl": "https://res.cloudinary.com/.../image.jpg" }`
- This keeps the upload and DB update responsibilities separate and is easy to secure and retry.

---

## Client: two-step example (Upload -> Update profile)
1) Upload files to `/api/upload` (multipart/form-data)

```javascript
async function uploadFiles(files, jwt) {
  const fd = new FormData();
  for (const f of files) fd.append('images', f);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` }, // optional: can be unauthenticated for public uploads
    body: fd
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json(); // { files: [{ fileName, url }] }
}
```

2) Call the profile-picture update endpoint with the returned URL

```javascript
async function setProfilePicture(userId, imageUrl, jwt) {
  const res = await fetch(`/api/auth/users/${userId}/profile-picture`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ imageUrl })
  });
  if (!res.ok) throw new Error('Profile update failed');
  return res.json();
}

// Example combined flow
async function uploadAndSetProfile(files, userId, jwt) {
  const uploadRes = await uploadFiles(files, jwt);
  if (!uploadRes.files || uploadRes.files.length === 0) throw new Error('No files uploaded');
  const imageUrl = uploadRes.files[0].url;
  return setProfilePicture(userId, imageUrl, jwt);
}
```

Notes:
- `upload.any()` accepts any field name in the request — the client can use `images` or any other name.
- If you want to allow unauthenticated uploads (e.g. avatars via a public upload token), ensure you implement rate-limiting and virus/malware scanning if required.

---

## Single-step option (server accepts files and updates profile)
If you prefer a single request from the client (upload + update DB), modify the `uploadProfilePicture` controller to accept `req.files` and perform the cloudinary upload inside the controller, then update the user's `profilePicture` and return the updated user.

Example change (high-level):
- Add `upload.any()` middleware to the `PUT /api/auth/users/:userId/profile-picture` route in `routes/authRoutes.js`.
- In `uploadProfilePicture` controller, if `req.files` exist, upload the first file's buffer to Cloudinary (use the same `uploadBufferToCloudinary` helper) and set `imageUrl` to the returned `secure_url`. Then update the user as the controller currently does.

This simplifies the client but couples upload and DB update on the server. It's fine for most apps.

---

## Security & operational notes
- Keep Cloudinary credentials secret and rotate them if leaked.
- Enforce file-size limits in multer (e.g., `limits: { fileSize: 5 * 1024 * 1024 }`) to avoid large memory usage.
- Consider validating file MIME types (`image/jpeg`, `image/png`, `image/webp`, etc.).
- If you expect high upload volume, consider direct client-to-Cloudinary signed uploads (unsigned presets or signed upload tokens) to avoid server bandwidth & cost.

---

## Troubleshooting
- `500` errors on upload often mean missing Cloudinary env vars or invalid credentials — check server logs for the full stack trace.
- If uploads hang, ensure `multer` is not being bypassed by body-parser on that route (apply multer middleware on the route itself).
- For large files, multipart limits, proxies, or host limits (e.g., platform request body size) can block uploads; increase limits carefully.

---

## Next steps (optional)
- I can implement the single-step `PUT /api/auth/users/:userId/profile-picture` that accepts file uploads and updates the user in one call.
- I can add client-side React example `src/components/UploadProfilePicture.jsx` that uses image preview, upload progress, and error handling.

---

*Created on: 2025-12-06*
