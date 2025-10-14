# Message to Backend Team

Hi Backend Team! 👋

I've implemented a new **Profile Page** feature on the frontend that needs two API endpoints to work with the server. Currently, profile updates are stored locally in the browser, but we need server-side persistence.

---

## 📋 What We Need

### 1. **Update User Profile Endpoint**
```
PUT /api/users/:userId
```
- Updates user information (name, email, phone, location, bio)
- Requires JWT authentication
- Full details in `BACKEND_API_REQUIREMENTS.md`

### 2. **Upload Profile Picture Endpoint**
```
POST /api/users/:userId/profile-picture
```
- Uploads user profile picture (JPEG, PNG, WebP)
- Maximum file size: 5MB
- Requires JWT authentication
- Full details in `BACKEND_API_REQUIREMENTS.md`

---

## 📁 Documentation Files

I've created complete documentation for you:

1. **BACKEND_API_REQUIREMENTS.md** - Complete API specification
   - Request/response formats
   - Validation rules
   - Error handling
   - Testing examples

2. **BACKEND_EXAMPLE_IMPLEMENTATION.js** - Working code example
   - Complete Express.js implementation
   - Multer configuration for file uploads
   - Authentication middleware
   - Error handling

---

## 🎯 Quick Summary

**What frontend sends:**
```javascript
// Profile update
PUT /api/users/507f1f77bcf86cd799439011
Headers: Authorization: Bearer <token>
Body: { name, email, phone, location, bio }

// Profile picture
POST /api/users/507f1f77bcf86cd799439011/profile-picture
Headers: Authorization: Bearer <token>
Body: FormData with 'profilePicture' file
```

**What frontend expects:**
```javascript
{
  "success": true,
  "message": "...",
  "user": { /* updated user object */ },
  "profilePictureUrl": "..." // for image upload
}
```

---

## 🔧 Database Schema Update

Please ensure the User model includes these fields:
```javascript
{
  name: String,
  phone: String,
  location: String,
  bio: String,
  profilePicture: String
}
```

---

## 📦 Required Packages

```bash
npm install multer sharp
```

---

## ✅ Priority

This is needed for the profile page to function fully. Currently using local storage as a temporary solution.

---

## 📞 Questions?

- Check the documentation files for complete details
- Example implementation is ready to copy/paste
- Test with Postman before deploying
- Let me know if you need clarification on anything!

Thanks! 🚀

---

**Server Base URL**: https://rentify-server-ge0f.onrender.com  
**Frontend Repo**: Rentify_Web (adrian5517)
