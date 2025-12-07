# Frontend Integration Guide — Uploads & Profile Picture

This file explains how to integrate the server upload endpoints with a web or React Native frontend.

- Base URLs used in examples: `{{BASE_URL}}` → `http://localhost:10000` (adjust if your server runs on a different port).
- Endpoints covered:
  - `POST /api/upload` (no auth required) — accepts multipart form-data `files` (array)
  - `PUT /api/auth/users/:userId/profile-picture` (single-step file upload OR JSON `{ imageUrl }`) — accepts multipart form-data `file` (or `files`) and updates the user's `profilePicture`

---

**Client Requirements**

- Ensure the client can send `multipart/form-data` requests (browser `fetch`, `axios`, or React Native `FormData`).
- Include `Authorization: Bearer <token>` header for protected endpoints (profile-picture request if your app requires auth).
- Validate file size and MIME type client-side to match server limits (default server limit: 5 MB, allowed mime types: `image/jpeg`, `image/png`, `image/webp`, `image/gif` — confirm in `middleware/uploadMiddleware.js`).

---

**1) Simple web example using `axios`**

Install axios if you don't have it:

```bash
npm install axios
```

Upload (no auth) — multiple files:

```javascript
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:10000';

async function uploadFiles(files) {
  const formData = new FormData();
  // files: FileList or array of File objects
  for (const file of files) {
    formData.append('files', file); // server uses upload.any()
  }

  const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return res.data; // { success: true, files: [...] }
}
```

Profile picture (authenticated) — single-file:

```javascript
import axios from 'axios';

async function uploadProfilePicture(file, token, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await axios.put(`${BASE_URL}/api/auth/users/${userId}/profile-picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    }
  });

  return res.data; // expected: { success: true, user: { profilePicture: ... } }
}
```

Notes:
- The route accepts any field name since server uses `upload.any()`. Use `file` or `files` for clarity.
- After receiving the response update your local user state with `response.user.profilePicture`.

---

**2) Browser `fetch` example**

```javascript
async function uploadProfilePictureFetch(file, token, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/auth/users/${userId}/profile-picture`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
      // DO NOT set Content-Type here; browser will set multipart boundary
    },
    body: formData
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
```

---

**3) React component (web) — minimal**

```jsx
import React, { useState } from 'react';
import { uploadProfilePicture } from './api'; // import the helper from above

export default function ProfilePictureUpload({ user, token, onUpdate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const f = e.target.files[0];
    // client-side validation
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File too large (max 5MB)'); return; }
    setFile(f);
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadProfilePicture(file, token, user._id);
      onUpdate(res.user); // update parent state
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} />
      {error && <div className="error">{error}</div>}
      <button onClick={handleUpload} disabled={loading || !file}>Upload</button>
    </div>
  );
}
```

---

**4) React Native (Expo) example**

React Native handles files differently. Use `expo-image-picker` or similar to get file URI and then send a `FormData` with the file object.

Install picker:

```bash
npx expo install expo-image-picker
```

Example flow:

```javascript
import * as ImagePicker from 'expo-image-picker';

async function pickAndUpload(token, userId) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.cancelled) return;

  const localUri = result.uri;
  // extract filename
  const filename = localUri.split('/').pop();
  // infer mime type
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  const formData = new FormData();
  // On Expo/React Native you must provide an object with uri, name, type
  formData.append('file', { uri: localUri, name: filename, type: mimeType });

  const res = await fetch(`${BASE_URL}/api/auth/users/${userId}/profile-picture`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    body: formData
  });

  return await res.json();
}
```

Notes for React Native:
- On some platforms you should NOT set `Content-Type` header; let React Native/runtime set it with boundary. If you have issues, try removing `Content-Type` header.
- Use smaller images or compress before upload for faster uploads and to avoid hitting server size limits.

---

**5) Client-side validations (recommended)**

- Allowed types: check `file.type` starts with `image/` and matches server whitelist.
- File size: `file.size <= 5 * 1024 * 1024` (5MB). If server config differs, align the client.
- Optionally resize/ compress images in client using `canvas` or libraries like `browser-image-compression` before sending.

---

**6) Handling the server response & updating UI**

- On success, server returns user object. Update local user state (Redux, Context, or local state) with `user.profilePicture`.
- To force-refresh image previews (if the browser caches old image), append a cache-busting query param, e.g. `profilePicture + '?v=' + Date.now()`.

---

**7) Troubleshooting**

- 404 Not Found: confirm correct path. For profile upload the correct path is `PUT /api/auth/users/:userId/profile-picture` (note `/api/auth` prefix). Use `/api/upload` for anonymous uploads.
- 401 Unauthorized: missing/expired token. Ensure your token is sent as `Authorization: Bearer <token>`.
- 415 unsupported media type or validation error: file MIME not in allowed list. Use `image/jpeg`, `image/png`, `image/webp`.
- 413 Payload Too Large: file exceeds server limit — compress or reduce file size.
- CORS errors (browser only): confirm server `ALLOWED_ORIGINS` includes your frontend origin.
- Cloudinary errors / 500: make sure server `CLOUDINARY_*` env vars are configured.

---

**8) Example Postman usage**

- `POST {{BASE_URL}}/api/upload` → Body form-data → key `files` type File → select files → Send.
- `PUT {{BASE_URL}}/api/auth/users/{{userId}}/profile-picture` → Authorization: `Bearer {{token}}` → Body form-data → key `file` type File → select file → Send.

---

**9) Security & UX notes**

- Always validate on server; client-side checks only improve UX.
- Show progress indicator for uploads (use axios `onUploadProgress` for web).
- Consider image virus scanning / moderation if your app accepts public uploads.

---

**10) Quick checklist before testing**
- Server running and `PORT` set (default `10000`).
- `CLOUDINARY_` env vars present for server upload.
- `streamifier` installed on server (`npm i streamifier`).
- Use the correct URL prefix `/api/auth` for profile updates.

---

If you want, I can:
- Add clipboard-ready code snippets for your specific frontend framework (React + Redux, Next.js, Vue, or React Native + Expo). Reply with your stack and I will add tailored examples.
- Add a small Postman test to assert the profile picture was returned and saved to Postman environment (I can add that to `postman/Rentify-upload-collection.json`).
