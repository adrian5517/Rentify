# Frontend Integration — Facebook OAuth (Rentify)

This guide explains how to integrate the Rentify backend Facebook OAuth flow into your frontend quickly. It's written as a copy-paste friendly reference. You can keep the example `.env` entries temporarily while you integrate and delete them later.

---

## Summary (one-liner)
- Start the login by redirecting users to: `${API_BASE}/api/auth/facebook`.
- After Facebook consent, backend will redirect to `CLIENT_URL/auth#token=<JWT>` (if `CLIENT_URL` is set) or return JSON `{ message, token, user }`.
- The frontend reads the token from the URL fragment and stores it (localStorage or cookie), then fetches `/api/auth/me` to get the user.

---

## Files created
- `FRONTEND_FACEBOOK_OAUTH_INTEGRATION.md` (this file)

---

## Example frontend `.env` (temporary)
Create a local environment file for your frontend (e.g. `.env.local` in a Create React App or Vite project). Delete this when you're done.

```
REACT_APP_API_BASE=https://rentify-server-ge0f.onrender.com
REACT_APP_CLIENT_URL=https://rentify-web-beta.vercel.app
# Optional: use your deployed API and client URLs in production
# REACT_APP_API_BASE=https://rentify-server-ge0f.onrender.com
# REACT_APP_CLIENT_URL=https://rentify-web-beta.vercel.app
```

Notes:
- `REACT_APP_API_BASE` should point to your Rentify API (local or deployed).
- `REACT_APP_CLIENT_URL` is used only for your reference — the server will redirect to this URL if `CLIENT_URL` is configured on the server side.

---

## Quick start (3 steps)
1. Add a "Continue with Facebook" button that sends the browser to:
   - `${process.env.REACT_APP_API_BASE}/api/auth/facebook`
2. Add a client route `/auth` to parse the returned token from the URL fragment and store it.
3. Use the token in `Authorization: Bearer <token>` for protected API calls, or call `GET /api/auth/me` to retrieve user info.

---

## Minimal React integration (recommended)

### `LoginButton.jsx` (simple)
```jsx
import React from 'react';

export default function LoginButton() {
  const apiBase = process.env.REACT_APP_API_BASE;
  const handleLogin = () => {
    window.location.href = `${apiBase}/api/auth/facebook`;
  };

  return (
    <button onClick={handleLogin}>
      Continue with Facebook
    </button>
  );
}
```

### `AuthRedirect.jsx` (mounted at `/auth`)
This component reads `#token=<JWT>` from the URL fragment, stores it, and fetches `/api/auth/me`.

```jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthRedirect({ setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1); // remove '#'
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (!token) {
      // No token — redirect to login or show error
      navigate('/login');
      return;
    }

    // Save token (choose storage carefully — this example uses localStorage)
    localStorage.setItem('token', token);

    // Fetch user
    fetch(`${process.env.REACT_APP_API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch /me');
        return res.json();
      })
      .then((data) => {
        // data.user contains user object
        if (setUser) setUser(data.user);
        // Navigate to the app home or intended page
        navigate('/');
      })
      .catch((err) => {
        console.error('Error fetching user after FB login', err);
        // Handle the error (show message and redirect to login)
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [navigate, setUser]);

  return (
    <div>
      Signing in...
    </div>
  );
}
```

Notes:
- `setUser` is optional; it should set your app state (context, Redux, etc.).
- If you prefer cookies, you can POST the token to an endpoint that sets an httpOnly cookie. (I can help add that server endpoint.)

---

## Minimal plain-JS handler for `/auth` (no framework)
```html
<script>
(function () {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('token');

  if (!token) {
    document.body.innerText = 'Login failed: token missing';
    return;
  }

  localStorage.setItem('token', token);

  fetch(`${process.env.API_BASE || 'http://localhost:10000'}/api/auth/me`, {
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(res => res.json())
    .then(data => {
      // do something with data.user
      window.location.href = '/';
    })
    .catch(err => {
      console.error(err);
      window.location.href = '/login';
    });
})();
</script>
```

---

## How to test locally (PowerShell)
1. Start the API server (in repo root):
```powershell
npm run dev
```
2. Start the frontend dev server (e.g., CRA):
```powershell
npm start
```
3. Create a Facebook App in developers.facebook.com and add your redirect URI:
   - e.g., `http://localhost:10000/api/auth/facebook/callback`
4. Visit your frontend, click "Continue with Facebook", complete consent. After redirect, you should land on `/auth` and the flow will finish.

If Facebook requires an HTTPS redirect, use ngrok:
```powershell
ngrok http 10000
# set the callback URI in Facebook to https://<ngrok-id>.ngrok.io/api/auth/facebook/callback
```

---

## Logout
- Client should clear stored token and app state (e.g. `localStorage.removeItem('token')`).
- Optionally POST to `${API_BASE}/api/auth/logout` (this clears cookie-based token only).

---

## Security notes & recommendations
- The server redirects with the token in the URL fragment (after `#`) to avoid sending it in Referer headers or server logs.
- Prefer httpOnly cookies for storing tokens in browsers for better XSS protection. I can add an endpoint that exchanges the token for an httpOnly cookie on the server.
- Consider adding `state` parameter to the OAuth flow and validate it on callback to prevent CSRF.
- Tokens have expiration; implement refresh tokens if you need persistent sessions.

---

## Optional improvements I can add (pick one)
- Add `state` param support (server + client) for CSRF protection.
- Add an endpoint that sets an httpOnly cookie instead of returning token in fragment.
- Implement refresh tokens + server-side blacklist for logout.
- Example React component wired to your existing app (I can create a PR to your frontend repo).

---

## Quick checklist to finish integration
- [ ] Configure Facebook App (Valid OAuth Redirect URI)
- [ ] Add `REACT_APP_API_BASE` and optional `REACT_APP_CLIENT_URL` to frontend `.env`
- [ ] Add `CLIENT_URL` to server env (if you want redirect behavior)
- [ ] Implement `/auth` route handler on frontend (see examples)
- [ ] Test login/logout flows and inspect user in DB

---

If you'd like, I can also produce a ready-to-drop `AuthRedirect.jsx` and `LoginButton.jsx` file and commit them into your frontend repo — tell me where (or paste the repo link) and I’ll prepare a PR.

