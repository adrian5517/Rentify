# 🚀 Quick API Reference - Rentify Backend

## Base URL
```
Production: https://rentify-server-ge0f.onrender.com
Local: http://localhost:10000
```

---

## 🎯 Quick Commands

### Seed Test Users
```bash
node seedUsers.js
```

### Start Server
```bash
npm run dev
```

---

## 📡 API Endpoints

### Get Users (with search/filter)
```http
GET /api/auth/users?search=john&role=renter&limit=10&page=1
Authorization: Bearer YOUR_TOKEN
```

### Mark Messages as Read
```http
POST /api/messages/mark-read
Content-Type: application/json

{
  "userId": "currentUserId",
  "otherUserId": "senderId"
}
```

## 🔌 Socket.io Events

### Client Emits:
```javascript
// Register user
socket.emit('register', userId);

// Typing indicators
socket.emit('typing-start', { senderId, receiverId });
socket.emit('typing-stop', { senderId, receiverId });

// Mark as read
socket.emit('mark-as-read', { userId, otherUserId });

// Send message
socket.emit('private-message', { senderId, receiverId, text, images });
```

### Client Listens:
```javascript
// Receive message
socket.on('private-message', (message) => { ... });

// Typing indicators
socket.on('typing-start', ({ senderId }) => { ... });
socket.on('typing-stop', ({ senderId }) => { ... });

// Read receipts
socket.on('messages-read', ({ readBy, count }) => { ... });
```

## 🧪 Test User Credentials

```
john.doe@example.com : password123
jane.smith@example.com : password123
admin@example.com : admin123
... (15 users total)
```

## 📊 User Search Examples

```javascript
// Search by name
GET /api/auth/users?search=john

// Filter by role
GET /api/auth/users?role=renter

// Pagination
GET /api/auth/users?limit=20&page=2

// Combined
GET /api/auth/users?search=smith&role=user&limit=10
```

## ⚡ Implementation Tips

### Typing Indicator with Debounce
```javascript
let typingTimeout;
inputField.addEventListener('input', () => {
  socket.emit('typing-start', { senderId, receiverId });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing-stop', { senderId, receiverId });
  }, 2000);
});
```

### Auto Mark as Read
```javascript
socket.on('private-message', (message) => {
  displayMessage(message);
  
  // Auto-mark as read if chat is open
  if (currentChatUserId === message.sender) {
    socket.emit('mark-as-read', {
      userId: currentUserId,
      otherUserId: message.sender
    });
  }
});
```

### Show Read Status
```javascript
socket.on('messages-read', ({ readBy, count }) => {
  // Update UI to show double checkmarks or "Read" status
  updateMessagesReadStatus(readBy);
});
```

## 🔍 Testing Checklist

- [ ] Run `node seedUsers.js` successfully
- [ ] Login with test user
- [ ] Fetch users with `/api/auth/users`
- [ ] Search users by name
- [ ] Filter users by role
- [ ] Connect to socket.io
- [ ] Send typing indicator
- [ ] Receive typing indicator
- [ ] Send message
- [ ] Mark message as read
- [ ] Receive read receipt
