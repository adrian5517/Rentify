# Conversations — Frontend Integration Guide

**TL;DR:** Use `GET /api/messages/conversations` (protected) to fetch conversation summaries in one request. Send JWT in the `Authorization` header. Supports `limit` and `skip` for pagination.

---

**Endpoint**
- URL: `GET /api/messages/conversations`
- Auth: Required. Header: `Authorization: Bearer <JWT>`
- Query params (optional):
  - `limit` — number of conversations to return (default 50, max 100)
  - `skip` — offset for pagination (default 0)

**Response (one item)**
- `participant`: { `_id`, `username?`, `fullName?`, `email?`, `profilePicture?` }
- `lastMessage`: { `_id`, `sender`, `receiver`, `message`, `imageUrls`, `read`, `createdAt` }
- `unreadCount`: number (messages unread by the current user)
- `totalMessages`: number
- `lastMessageAt`: timestamp

Example (abridged):

```json
[
  {
    "participant": {"_id":"...","username":"alice","profilePicture":"..."},
    "lastMessage": {"_id":"...","message":"Hi","createdAt":"2025-11-30T..."},
    "unreadCount": 2,
    "totalMessages": 14,
    "lastMessageAt":"2025-11-30T..."
  }
]
```

**Frontend usage (fetch helper)**

```javascript
async function fetchConversations({ token, limit = 50, skip = 0 }){
  const res = await fetch(`/api/messages/conversations?limit=${limit}&skip=${skip}`,{
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
```

**React example (hook + list)**

```javascript
import React, { useEffect, useState } from 'react';

export default function Conversations({ token }){
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(()=>{
    if(!token) return;
    setLoading(true);
    fetchConversations({ token, limit, skip: page * limit })
      .then(setConvos)
      .catch(err => { console.error(err); /* show toast */ })
      .finally(()=> setLoading(false));
  }, [token, page]);

  if(loading) return <div>Loading...</div>;
  return (
    <ul>
      {convos.map(c => (
        <li key={c.participant._id}>
          <img src={c.participant.profilePicture} alt="avatar" width={40} />
          <div>
            <strong>{c.participant.username || c.participant.fullName}</strong>
            <div>{c.lastMessage.message}</div>
            <small>{new Date(c.lastMessageAt).toLocaleString()}</small>
            {c.unreadCount > 0 && <span className="badge">{c.unreadCount}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

**Mark messages read**
- When user opens a conversation, call `POST /api/messages/mark-read` with `{ userId: '<meId>', otherUserId: '<otherId>' }` to clear unread counts. The backend also updates conversation summaries where applicable.

**UI tips**
- Show `unreadCount` as a badge next to the conversation.
- Sort conversations by `lastMessageAt` (server already returns sorted results).
- For real-time updates, subscribe to socket events (private-message, messages-read) to update last message and unread counts.

**Pagination & infinite scroll**
- Use `limit` and `skip` to request additional pages. For infinite-scroll, increase `skip` by `limit` on each fetch.
- Deduplicate by `participant._id` when merging pages.

**Error handling**
- If 401 returned, force user logout and redirect to sign-in.
- If server returns 500, show a retry UI and log error.

**Testing locally**
1. Start server: `node server.js` (or `npm run dev`).
2. Get a valid JWT (login endpoint).
3. Call the endpoint with the token:

```bash
curl -H "Authorization: Bearer <TOKEN>" "http://localhost:10000/api/messages/conversations?limit=20"
```

**Notes for devs**
- The endpoint expects `req.user` (JWT middleware). For quick local testing, you can append `?userId=<objectId>` if the controller accepts that (not recommended for production).
- If you plan to cache conversations client-side, store per-user caches keyed by `participant._id` and invalidate on new messages or `messages-read` events.

If you want, I can also:
- Add a small `conversations` React component file to the repo.
- Create a `.env.example` that documents `SENDGRID_API_KEY` and other env vars (no secrets).

---
Created by automation — let me know if you'd like a different code style or an integrated React component file added to the project.
