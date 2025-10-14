# New Features Implementation Guide

## Overview
This document describes the newly implemented features for the Rentify messaging system.

---

## 1. User List Endpoint with Search/Filter

### Endpoint: `GET /api/auth/users`

**Description**: Fetches a list of users with optional search and filtering capabilities.

**Authentication**: Required (uses `authMiddleware`)

**Query Parameters**:
- `search` (optional): Search term to filter users by username, email, or fullName
- `role` (optional): Filter users by role (`user`, `renter`, `admin`)
- `limit` (optional): Number of results per page (default: 50)
- `page` (optional): Page number for pagination (default: 1)

**Example Requests**:
```javascript
// Get all users
GET /api/auth/users

// Search for users
GET /api/auth/users?search=john

// Filter by role
GET /api/auth/users?role=renter

// Combined search and filter with pagination
GET /api/auth/users?search=smith&role=user&limit=10&page=1
```

**Response Example**:
```json
{
  "users": [
    {
      "_id": "...",
      "username": "john_doe",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "role": "user",
      "phoneNumber": "+1234567890",
      "profilePicture": "https://...",
      "createdAt": "2025-10-07T00:00:00.000Z",
      "updatedAt": "2025-10-07T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

## 2. Test Users Seed Script

### File: `seedUsers.js`

**Description**: A script to populate the database with test users for development and testing.

**Usage**:
```bash
node seedUsers.js
```

**Test Users Created**: 15 users including:
- Regular users (role: `user`)
- Renters (role: `renter`)
- Admin (role: `admin`)

**Default Credentials**:
- Most users: `password123`
- Admin user: `admin123`

**Features**:
- Checks for existing users before creating duplicates
- Generates unique profile pictures using DiceBear API
- Provides detailed console output during seeding

**Test User Examples**:
```
Email: john.doe@example.com | Password: password123 | Role: user
Email: jane.smith@example.com | Password: password123 | Role: renter
Email: admin@example.com | Password: admin123 | Role: admin
```

---

## 3. Typing Indicators

### Socket.io Events

**Client → Server Events**:

#### `typing-start`
Emitted when a user starts typing a message.

**Payload**:
```javascript
{
  senderId: "userId_who_is_typing",
  receiverId: "userId_who_should_see_indicator"
}
```

**Example**:
```javascript
socket.emit('typing-start', {
  senderId: currentUserId,
  receiverId: chatPartnerId
});
```

#### `typing-stop`
Emitted when a user stops typing.

**Payload**:
```javascript
{
  senderId: "userId_who_stopped_typing",
  receiverId: "userId_who_should_stop_seeing_indicator"
}
```

**Example**:
```javascript
socket.emit('typing-stop', {
  senderId: currentUserId,
  receiverId: chatPartnerId
});
```

**Server → Client Events**:

#### `typing-start`
Received when the chat partner starts typing.

**Payload**:
```javascript
{
  senderId: "userId_who_is_typing"
}
```

**Example**:
```javascript
socket.on('typing-start', ({ senderId }) => {
  console.log(`User ${senderId} is typing...`);
  // Show typing indicator in UI
});
```

#### `typing-stop`
Received when the chat partner stops typing.

**Payload**:
```javascript
{
  senderId: "userId_who_stopped_typing"
}
```

**Example**:
```javascript
socket.on('typing-stop', ({ senderId }) => {
  console.log(`User ${senderId} stopped typing`);
  // Hide typing indicator in UI
});
```

**Implementation Tip**:
Use a debounce/throttle mechanism to avoid sending too many typing events:
```javascript
let typingTimeout;
const handleTyping = () => {
  socket.emit('typing-start', { senderId: userId, receiverId: partnerId });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing-stop', { senderId: userId, receiverId: partnerId });
  }, 2000); // Stop after 2 seconds of no typing
};
```

---

## 4. Read Receipts

### HTTP Endpoint

#### `POST /api/messages/mark-read`

**Description**: Marks messages as read via HTTP request.

**Request Body**:
```json
{
  "userId": "current_user_id",
  "otherUserId": "sender_id"
}
```

**Response**:
```json
{
  "message": "Messages marked as read",
  "modifiedCount": 5
}
```

### Socket.io Events

**Client → Server Event**:

#### `mark-as-read`
Marks messages from another user as read.

**Payload**:
```javascript
{
  userId: "current_user_id",
  otherUserId: "sender_id"
}
```

**Example**:
```javascript
socket.emit('mark-as-read', {
  userId: currentUserId,
  otherUserId: chatPartnerId
});
```

**Server → Client Event**:

#### `messages-read`
Notifies the sender that their messages have been read.

**Payload**:
```javascript
{
  readBy: "userId_who_read_messages",
  count: 5 // number of messages marked as read
}
```

**Example**:
```javascript
socket.on('messages-read', ({ readBy, count }) => {
  console.log(`${count} messages read by user ${readBy}`);
  // Update UI to show read receipts (e.g., double checkmarks)
});
```

**Implementation Flow**:
1. User opens a chat with another user
2. Emit `mark-as-read` event to server
3. Server updates message `read` status in database
4. Server notifies the message sender via `messages-read` event
5. Sender's UI updates to show messages as read

---

## Message Model

The message model already includes a `read` field:

```javascript
{
  sender: ObjectId,
  receiver: ObjectId,
  message: String,
  imageUrls: [String],
  read: Boolean, // default: false
  createdAt: Date,
  updatedAt: Date
}
```

---

## Frontend Integration Examples

### Complete Chat Implementation Example

```javascript
import io from 'socket.io-client';

class ChatService {
  constructor() {
    this.socket = io('http://localhost:10000');
    this.currentUserId = null;
    this.typingTimeouts = new Map();
  }

  // Initialize connection
  connect(userId) {
    this.currentUserId = userId;
    this.socket.emit('register', userId);
    this.setupListeners();
  }

  // Setup event listeners
  setupListeners() {
    // Receive messages
    this.socket.on('private-message', (message) => {
      console.log('New message:', message);
      // Update UI with new message
      // Auto-mark as read if chat is open
      if (this.isCurrentChat(message.sender)) {
        this.markAsRead(message.sender);
      }
    });

    // Typing indicators
    this.socket.on('typing-start', ({ senderId }) => {
      console.log(`${senderId} is typing...`);
      // Show typing indicator in UI
    });

    this.socket.on('typing-stop', ({ senderId }) => {
      console.log(`${senderId} stopped typing`);
      // Hide typing indicator in UI
    });

    // Read receipts
    this.socket.on('messages-read', ({ readBy, count }) => {
      console.log(`${count} messages read by ${readBy}`);
      // Update message status to read in UI
    });
  }

  // Send message
  sendMessage(receiverId, text, images = []) {
    this.socket.emit('private-message', {
      senderId: this.currentUserId,
      receiverId,
      text,
      images
    });
  }

  // Typing indicators with debounce
  handleTyping(receiverId) {
    // Clear existing timeout
    if (this.typingTimeouts.has(receiverId)) {
      clearTimeout(this.typingTimeouts.get(receiverId));
    }

    // Emit typing start
    this.socket.emit('typing-start', {
      senderId: this.currentUserId,
      receiverId
    });

    // Set timeout to emit typing stop
    const timeout = setTimeout(() => {
      this.socket.emit('typing-stop', {
        senderId: this.currentUserId,
        receiverId
      });
      this.typingTimeouts.delete(receiverId);
    }, 2000);

    this.typingTimeouts.set(receiverId, timeout);
  }

  // Mark messages as read
  markAsRead(otherUserId) {
    this.socket.emit('mark-as-read', {
      userId: this.currentUserId,
      otherUserId
    });
  }

  // Fetch users with search
  async searchUsers(searchTerm, role = null) {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (role) params.append('role', role);

    const response = await fetch(`/api/auth/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    return response.json();
  }
}

// Usage example
const chat = new ChatService();
chat.connect('currentUserId');

// Send a message
chat.sendMessage('receiverId', 'Hello!');

// Handle typing
inputField.addEventListener('input', () => {
  chat.handleTyping('receiverId');
});

// Search users
const users = await chat.searchUsers('john', 'renter');
```

---

## Testing Guide

### 1. Test User Endpoint

```bash
# Create test users
node seedUsers.js

# Test the endpoint (after getting a token)
curl -X GET "http://localhost:10000/api/auth/users" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test search
curl -X GET "http://localhost:10000/api/auth/users?search=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test role filter
curl -X GET "http://localhost:10000/api/auth/users?role=renter" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Typing Indicators

Open two browser tabs with different logged-in users and:
1. Start typing in one tab
2. Observe typing indicator in the other tab
3. Stop typing and verify indicator disappears

### 3. Test Read Receipts

1. Send messages from User A to User B
2. Open chat as User B
3. Verify messages are marked as read
4. Check User A's UI shows read status

---

## Environment Variables

Make sure your `.env` file includes:
```env
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=10000
```

---

## Summary of Changes

### Files Created:
- `seedUsers.js` - Test user seeding script
- `NEW_FEATURES.md` - This documentation

### Files Modified:
- `controllers/authController.js` - Added `getUsers` function
- `routes/authRoutes.js` - Added `/users` endpoint
- `controllers/messageController.js` - Added `markMessagesAsRead` function
- `routes/messageRoutes.js` - Added `/mark-read` endpoint
- `server.js` - Added typing indicators and read receipt socket events

### New Socket.io Events:
- `typing-start` - User starts typing
- `typing-stop` - User stops typing
- `mark-as-read` - Mark messages as read
- `messages-read` - Notification that messages were read

### New HTTP Endpoints:
- `GET /api/auth/users` - List/search users
- `POST /api/messages/mark-read` - Mark messages as read

---

## Next Steps

1. Run the seed script to create test users: `node seedUsers.js`
2. Test the `/api/auth/users` endpoint
3. Integrate typing indicators in your frontend
4. Implement read receipts in your chat UI
5. Consider adding:
   - Online/offline status indicators
   - Message delivery status (sent, delivered, read)
   - Unread message counts
   - Last seen timestamps
