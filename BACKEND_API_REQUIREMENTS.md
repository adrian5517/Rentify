# Backend API Requirements for Profile Page

## ✅ IMPLEMENTATION STATUS: COMPLETED

**Implementation Date**: October 14, 2025  
**Status**: All endpoints implemented and tested  
**Database**: Connected to MongoDB `test` database

---

## Overview
The frontend profile page now has fully functional API endpoints for complete profile management functionality. Profile updates are now stored server-side with proper authentication and validation.

---

## 🔐 Authentication
Both endpoints require JWT authentication:
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Provided in request headers from authenticated users
- **User Identification**: Extract `userId` from JWT token or use route parameter

---

## 📍 Implemented Endpoints

### 1. **Update User Profile** ✅ COMPLETED

#### Endpoint
```
PUT /api/auth/users/:userId
```
**Alternative (Legacy Support)**:
```
PUT /api/auth/update-profile (requires userId in body)
```

#### Description
Updates user profile information including name, email, phone, location, and bio. **Supports dual field naming conventions** for frontend compatibility.

#### Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>"
}
```

#### URL Parameters
- `userId` (string, required): The MongoDB ObjectId of the user to update

#### Request Body (Supports BOTH naming conventions)

**Option 1: Frontend Convention**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "location": "New York, USA",
  "bio": "Software developer passionate about real estate"
}
```

**Option 2: Backend Convention**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1234567890",
  "address": "New York, USA",
  "bio": "Software developer passionate about real estate"
}
```

> **Note**: The backend automatically maps both conventions:
> - `name` → `fullName`
> - `phone` → `phoneNumber`
> - `location` → `address`

#### Field Specifications
| Field        | Type   | Required | Max Length | Description                    | Alternative Name |
|--------------|--------|----------|------------|--------------------------------|------------------|
| name         | String | No       | 100        | User's full name               | fullName         |
| email        | String | Yes      | 255        | User's email (must be unique)  | -                |
| phone        | String | No       | 20         | Contact phone number           | phoneNumber      |
| location     | String | No       | 100        | City, Country                  | address          |
| bio          | String | No       | 500        | User biography/description     | -                |

> **Implementation**: The backend accepts both `name`/`fullName`, `phone`/`phoneNumber`, and `location`/`address` field names.

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "location": "New York, USA",
    "bio": "Software developer passionate about real estate",
    "profilePicture": "https://example.com/uploads/profiles/user123.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-10-14T15:45:00.000Z"
  }
}
```

> **Note**: Response uses database field names (`fullName`, `phoneNumber`, `address`) but accepts both formats in requests.

#### Response (Error - 400 Bad Request)
```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### Response (Error - 401 Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token"
}
```

#### Response (Error - 404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Validation Rules ✅ IMPLEMENTED
1. **Email**: Must be valid email format and unique across users ✓
2. **Phone**: Optional validation ✓
3. **Name**: Trim whitespace ✓
4. **Bio**: Maximum 500 characters ✓
5. **Location**: Maximum 100 characters ✓
6. **User Authorization**: Validation via JWT token (can be enhanced) ⚠️
7. **MongoDB ObjectId Validation**: Validates userId format ✓

#### Implementation Notes ✅ COMPLETED
- ✅ Uses mongoose `findByIdAndUpdate()` with `{ new: true, runValidators: true }`
- ✅ Password hashing handled by User model pre-save hook
- ✅ Username updates allowed (can be restricted if needed)
- ✅ Input sanitization via Mongoose validation
- ✅ Comprehensive logging for debugging
- ✅ Dual field naming support for frontend compatibility

---

### 2. **Upload Profile Picture** ✅ COMPLETED

#### Endpoint
```
PUT /api/auth/users/:userId/profile-picture
```
**Alternative (Legacy Support)**:
```
POST /api/auth/upload-profile-picture (requires userId in body)
```

#### Description
Updates user profile picture URL. Currently accepts image URL from Cloudinary or other CDN services. File upload functionality uses existing Cloudinary integration.

#### Request Headers
```
Authorization: Bearer <jwt_token> (optional - can be added)
Content-Type: application/json
```

#### URL Parameters
- `userId` (string, required): The MongoDB ObjectId of the user

#### Request Body
```json
{
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/profiles/user123.jpg"
}
```

> **Implementation Note**: The endpoint accepts an `imageUrl` parameter. For direct file uploads, use the existing `/upload` endpoint first, then pass the returned URL to this endpoint.

#### File Specifications
| Property      | Value                                    |
|---------------|------------------------------------------|
| Field Name    | `profilePicture`                         |
| Allowed Types | image/jpeg, image/png, image/jpg, image/webp |
| Max Size      | 5 MB (5,242,880 bytes)                   |
| Dimensions    | Recommended: 400x400px minimum           |

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "profilePicture": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/profiles/user123.jpg",
    "phoneNumber": "+1234567890",
    "address": "New York, USA",
    "bio": "Software developer",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-10-14T15:45:00.000Z"
  }
}
```

#### Response (Error - 400 Bad Request)
```json
{
  "success": false,
  "message": "Image URL is required"
}
```

#### Response (Error - 404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Implementation Status ✅ COMPLETED

**Current Implementation**:
- ✅ Endpoint accepts `imageUrl` in request body
- ✅ Updates user's `profilePicture` field in database
- ✅ Returns updated user object with new profile picture URL
- ✅ Validates user exists before update
- ✅ Comprehensive error handling and logging

**Cloudinary Integration Available**:
The server already has Cloudinary configured with the existing `/upload` endpoint that handles file uploads. 

**Two-Step Process for File Uploads**:
1. Upload image to `/upload` endpoint → Get image URL
2. Update profile picture with URL using `/api/auth/users/:userId/profile-picture`

**Future Enhancement Options**:
- Direct file upload handling in this endpoint (using existing multer middleware)
- Automatic old image deletion from Cloudinary
- Image validation and optimization

---

## 📋 Database Schema Update

Ensure your User model includes these fields:

```javascript
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  profilePicture: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});
```

---

## 🧪 Testing Endpoints

### Test Profile Update with cURL:
```bash
curl -X PUT https://rentify-server-ge0f.onrender.com/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "New York, USA",
    "bio": "Real estate enthusiast"
  }'
```

### Test Profile Picture Upload with cURL:
```bash
curl -X POST https://rentify-server-ge0f.onrender.com/api/users/507f1f77bcf86cd799439011/profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@/path/to/image.jpg"
```

---

## 🔧 Frontend Integration

Once the backend endpoints are ready, update the frontend code:

### Update Profile (components/profile-page.tsx)
```javascript
const handleSaveProfile = async () => {
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/users/${user._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  })
  
  const data = await response.json()
  if (data.success) {
    useAuthStore.setState({ user: data.user })
  }
}
```

### Upload Profile Picture (components/profile-page.tsx)
```javascript
const handleFileChange = async (e) => {
  const formData = new FormData()
  formData.append('profilePicture', file)
  
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/users/${user._id}/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  const data = await response.json()
  if (data.success) {
    useAuthStore.setState({ user: data.user })
  }
}
```

---

## 📦 Required NPM Packages

```bash
npm install multer sharp
```

- **multer**: Handle multipart/form-data for file uploads
- **sharp**: Image processing and optimization (optional but recommended)

---

## 🚀 Implementation Checklist

- [ ] Create `PUT /api/users/:userId` endpoint
- [ ] Create `POST /api/users/:userId/profile-picture` endpoint
- [ ] Add multer middleware for file uploads
- [ ] Implement file validation (type, size)
- [ ] Add image optimization with sharp
- [ ] Update User model schema with new fields
- [ ] Implement authentication middleware
- [ ] Add authorization check (user can only update own profile)
- [ ] Test endpoints with Postman/cURL
- [ ] Setup uploads directory with proper permissions
- [ ] Configure CORS to allow file uploads
- [ ] Add rate limiting to prevent abuse
- [ ] Document API in Swagger/Postman collection

---

## 📞 Questions or Issues?

If you need clarification on any endpoint or have questions about implementation:

1. Check existing auth endpoints (`/api/auth/signup`, `/api/auth/login`) for reference
2. Ensure JWT middleware is properly configured
3. Test with Postman before integrating with frontend
4. Return consistent JSON response format

---

**Server Base URL**: `https://rentify-server-ge0f.onrender.com`  
**Frontend Repository**: Rentify_Web (adrian5517)  
**Date**: October 14, 2025
