# Frontend Implementation Guide - Profile Update Endpoints

## 📋 Overview
Naka-ready na ang backend endpoints para sa profile management! Narito ang lahat ng kailangan mong malaman para ma-integrate sa frontend.

---

## 🔗 Base URL
```
Production: https://rentify-server-ge0f.onrender.com
Local (for development): http://localhost:10000
```

**⚠️ Use Production URL for all requests**

---

## 📍 Available Endpoints

### 1. **Update User Profile** ✅

#### Endpoint Details
```
PUT /api/auth/users/:userId
```

#### How to Use
```javascript
// Example: Update user profile
const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Optional kung may auth
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Profile updated!', data.user);
      return data.user;
    } else {
      console.error('Error:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};
```

#### Request Body (Flexible Field Names!)
**Pwede ka gumamit ng dalawang naming convention:**

**Option 1: Frontend Convention** (Recommended)
```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "phone": "09123456789",
  "location": "Manila, Philippines",
  "bio": "Software Developer"
}
```

**Option 2: Backend Convention**
```json
{
  "fullName": "Juan Dela Cruz",
  "email": "juan@example.com",
  "phoneNumber": "09123456789",
  "address": "Manila, Philippines",
  "bio": "Software Developer"
}
```

> **Note**: Ang backend automatically mag-convert ng field names! Pwede ka gumamit ng kahit alin.

#### Success Response
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "681b26b2c58b946b8d16dacf",
    "username": "juandelacruz",
    "email": "juan@example.com",
    "fullName": "Juan Dela Cruz",
    "phoneNumber": "09123456789",
    "address": "Manila, Philippines",
    "bio": "Software Developer",
    "profilePicture": "https://cloudinary.com/...",
    "role": "user",
    "createdAt": "2025-05-07T09:24:02.754Z",
    "updatedAt": "2025-10-14T15:45:00.000Z"
  }
}
```

#### Error Responses
```json
// User not found
{
  "success": false,
  "message": "User not found"
}

// Email already exists
{
  "success": false,
  "message": "Email already exists"
}

// Username already exists
{
  "success": false,
  "message": "Username already exists"
}
```

#### React/Next.js Example
```typescript
// Example sa React component
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    location: user?.address || '',
    bio: user?.bio || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user); // Update global state
        toast.success('Profile updated successfully!');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Full Name"
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <input
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Phone"
      />
      <input
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        placeholder="Location"
      />
      <textarea
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        placeholder="Bio"
      />
      <button onClick={handleSaveProfile} disabled={loading}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );
};
```

---

### 2. **Update Profile Picture** ✅

#### Endpoint Details
```
PUT /api/auth/users/:userId/profile-picture
```

#### Two-Step Process

**Step 1: Upload Image to Cloudinary**
```javascript
const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('propertyImage', file); // ⚠️ IMPORTANT: Field name must be 'propertyImage'

  console.log('Uploading file:', {
    name: file.name,
    size: file.size,
    type: file.type
  });

  const response = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
    method: 'POST',
    body: formData
    // ⚠️ DO NOT set Content-Type header manually! Browser will set it automatically with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload image');
  }

  const data = await response.json();
  console.log('Upload successful:', data.fileUrl);
  
  return data.fileUrl; // Returns Cloudinary URL
};
```

> **Critical Notes:**
> - ✅ Field name MUST be `'propertyImage'` (not 'image', 'file', or 'profilePicture')
> - ✅ DO NOT set `Content-Type` header - let browser handle it
> - ✅ The endpoint accepts arrays but processes the first file
> - ✅ Backend automatically resizes to 400x400px for profile pictures

**Step 2: Update User Profile Picture**
```javascript
const updateProfilePicture = async (userId, imageUrl) => {
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${userId}/profile-picture`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl })
  });

  const data = await response.json();
  
  if (data.success) {
    return data.user;
  } else {
    throw new Error(data.message);
  }
};
```

#### Complete Example
```javascript
const handleProfilePictureUpload = async (e) => {
  const file = e.target.files[0];
  
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Please select an image file');
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size must be less than 5MB');
    return;
  }

  console.log('Starting upload for:', file.name);
  setUploading(true);
  
  try {
    // Step 1: Upload to Cloudinary
    console.log('Step 1: Uploading to Cloudinary...');
    const imageUrl = await uploadImageToCloudinary(file);
    console.log('Cloudinary upload complete:', imageUrl);
    
    // Step 2: Update user profile picture
    console.log('Step 2: Updating user profile...');
    const updatedUser = await updateProfilePicture(user._id, imageUrl);
    console.log('Profile update complete');
    
    // Update global state
    setUser(updatedUser);
    toast.success('Profile picture updated!');
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    toast.error(error.message || 'Failed to upload profile picture');
  } finally {
    setUploading(false);
  }
};
```

**Common Mistakes to Avoid:**
```javascript
// ❌ WRONG - Setting Content-Type manually
fetch('https://rentify-server-ge0f.onrender.com/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data' // DON'T DO THIS!
  },
  body: formData
});

// ✅ CORRECT - Let browser set Content-Type
fetch('https://rentify-server-ge0f.onrender.com/upload', {
  method: 'POST',
  body: formData // Browser adds correct headers automatically
});

// ❌ WRONG - Wrong field name
formData.append('image', file);
formData.append('file', file);
formData.append('profilePicture', file);

// ✅ CORRECT - Must be 'propertyImage'
formData.append('propertyImage', file);
```

#### React/Next.js Complete Example
```typescript
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

const ProfilePictureUpload = () => {
  const { user, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('propertyImage', file); // ⚠️ Must be 'propertyImage'

    console.log('Uploading to Cloudinary:', file.name);

    const response = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
      method: 'POST',
      body: formData
      // DO NOT set Content-Type header!
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload failed:', errorData);
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const data = await response.json();
    
    if (!data.success || !data.fileUrl) {
      throw new Error('Upload response missing file URL');
    }
    
    console.log('Upload successful:', data.fileUrl);
    return data.fileUrl;
  };

  const updateProfilePicture = async (imageUrl: string) => {
    const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user._id}/profile-picture`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data.user;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    
    try {
      // Upload to Cloudinary
      const imageUrl = await uploadImageToCloudinary(file);
      
      // Update profile picture
      const updatedUser = await updateProfilePicture(imageUrl);
      
      // Update state
      setUser(updatedUser);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <img
          src={user?.profilePicture || '/default-avatar.png'}
          alt="Profile"
          className="w-32 h-32 rounded-full object-cover"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        <Upload size={20} />
        {uploading ? 'Uploading...' : 'Change Photo'}
      </button>
    </div>
  );
};
```

#### Success Response
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "user": {
    "_id": "681b26b2c58b946b8d16dacf",
    "username": "juandelacruz",
    "email": "juan@example.com",
    "profilePicture": "https://res.cloudinary.com/demo/image/upload/v1234567890/profiles/user123.jpg",
    "fullName": "Juan Dela Cruz",
    ...
  }
}
```

---

## 🎯 Quick Integration Checklist

- [ ] Update your API base URL (local or production)
- [ ] Import toast/notification library (e.g., sonner, react-toastify)
- [ ] Copy the profile update function
- [ ] Copy the profile picture upload function
- [ ] Update your global state/store with returned user data
- [ ] Add loading states for better UX
- [ ] Add error handling and validation
- [ ] Test with real user data

---

## 🔍 Additional Endpoints (For Reference)

### Get User by ID
```javascript
GET /api/auth/users/:userId

// Example
const getUserById = async (userId) => {
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${userId}`);
  const data = await response.json();
  
  if (data.success) {
    return data.user;
  }
};
```

### Get All Users
```javascript
GET /api/auth/users

// Example
const getAllUsers = async () => {
  const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/users');
  const data = await response.json();
  
  if (data.success) {
    console.log(`Total users: ${data.count}`);
    return data.users;
  }
};
```

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Access to fetch at 'http://localhost:10000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**: Already configured sa backend! CORS is enabled for all origins.

### Issue 2: 404 Not Found
**Error**: `Cannot PUT /api/auth/users/undefined`

**Solution**: Make sure `userId` is defined:
```javascript
// ❌ Wrong
fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user.id}`)

// ✅ Correct
fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user._id}`)
```

### Issue 3: Email Already Exists
**Error**: `{ "success": false, "message": "Email already exists" }`

**Solution**: The email is already taken by another user. Ask user to use a different email.

### Issue 4: Image Upload Fails
**Error**: `{ "success": false, "message": "No file uploaded" }`

**Solution**: Check these common issues:

```javascript
// ❌ WRONG - Setting Content-Type header manually
const response = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data', // ❌ This breaks FormData!
  },
  body: formData
});

// ✅ CORRECT - No Content-Type header
const response = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
  method: 'POST',
  body: formData // Browser sets correct headers automatically
});

// ❌ WRONG - Incorrect field name
formData.append('image', file);
formData.append('file', file);
formData.append('photo', file);

// ✅ CORRECT - Must be 'propertyImage'
formData.append('propertyImage', file);
```

**Debug Steps:**
1. Check browser Network tab - look for the request payload
2. Verify the FormData field name is `propertyImage`
3. Make sure you're NOT setting `Content-Type` header
4. Check file is actually selected (not null/undefined)
5. Look at backend console logs for detailed error messages

### Issue 5: 400 Bad Request on Upload
**Error**: `Failed to load resource: the server responded with a status of 400`

**Root Causes & Solutions:**

**1. Wrong field name in FormData**
```javascript
// ✅ Correct implementation
const formData = new FormData();
formData.append('propertyImage', file);
```

**2. Content-Type header set manually**
```javascript
// ❌ Don't do this
headers: { 'Content-Type': 'multipart/form-data' }

// ✅ Omit Content-Type completely
// No headers needed for FormData
```

**3. File is null or undefined**
```javascript
const file = e.target.files?.[0];
if (!file) {
  console.error('No file selected');
  return;
}
```

**4. Server expects different format**
```javascript
// Backend expects: upload.array('propertyImage', 5)
// So frontend MUST use: formData.append('propertyImage', file)
```

---

## 📝 Field Mapping Reference

| Frontend Field | Backend Field | Type   | Required |
|---------------|---------------|--------|----------|
| `name`        | `fullName`    | String | No       |
| `email`       | `email`       | String | Yes      |
| `phone`       | `phoneNumber` | String | No       |
| `location`    | `address`     | String | No       |
| `bio`         | `bio`         | String | No       |

**Note**: Pwede ka gumamit ng kahit alin - frontend or backend field names! Backend will handle the conversion.

---

## 🚀 Testing Tips

1. **Use Postman or Thunder Client** para i-test ang endpoints independently
2. **Check browser console** for detailed error messages
3. **Use Network tab** sa DevTools para makita ang actual request/response
4. **Test with different user IDs** to ensure it works for all users
5. **Test error cases** (invalid email, file too large, etc.)

---

## 📞 Need Help?

Kung may tanong ka or may problema sa integration:

1. Check ang console logs sa both frontend and backend
2. Verify ang user ID (dapat MongoDB ObjectId format)
3. Make sure ang server is running (`npm run dev`)
4. Check if database connection is successful
5. Test the endpoint using Postman first

---

## ✅ Complete Working Example (Copy-Paste Ready!)

```typescript
// profileService.ts
export const profileService = {
  async updateProfile(userId: string, profileData: any) {
    const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return response.json();
  },

  async uploadImageToCloudinary(file: File) {
    const formData = new FormData();
    formData.append('propertyImage', file); // ⚠️ CRITICAL: Must be 'propertyImage'
    
    console.log('Uploading to Cloudinary...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    const response = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
      method: 'POST',
      body: formData
      // ⚠️ DO NOT add Content-Type header!
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Upload failed:', error);
      throw new Error(error.message || 'Upload failed');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.fileUrl) {
      throw new Error('Invalid upload response');
    }
    
    console.log('Upload successful:', data.fileUrl);
    return data.fileUrl;
  },

  async updateProfilePicture(userId: string, imageUrl: string) {
    const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${userId}/profile-picture`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl })
    });
    return response.json();
  }
};

// Usage in component
const handleSave = async () => {
  const result = await profileService.updateProfile(user._id, formData);
  if (result.success) {
    toast.success('Profile updated!');
    setUser(result.user);
  }
};

const handleImageUpload = async (file: File) => {
  const imageUrl = await profileService.uploadImageToCloudinary(file);
  const result = await profileService.updateProfilePicture(user._id, imageUrl);
  if (result.success) {
    toast.success('Profile picture updated!');
    setUser(result.user);
  }
};
```

---

**Production Server URL**: `https://rentify-server-ge0f.onrender.com`  
**Local Server URL**: `http://localhost:10000` (for development)  
**Last Updated**: October 14, 2025  
**Backend Status**: ✅ Ready for Integration
