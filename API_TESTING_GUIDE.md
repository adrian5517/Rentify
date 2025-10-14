# API Testing Guide - Rentify Backend

## 🚀 Server URLs
- **Production**: `https://rentify-server-ge0f.onrender.com`
- **Local**: `http://localhost:10000`

---

## 📍 Property Endpoints

### 1. Get All Properties (Populated)
```http
GET /api/properties
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "properties": [
    {
      "_id": "67890abc",
      "name": "Modern Apartment",
      "description": "Beautiful 2BR apartment",
      "images": ["https://cloudinary.com/..."],
      "location": {
        "address": "Magsaysay Avenue, Naga City",
        "latitude": 13.6218,
        "longitude": 123.1815
      },
      "price": 15000,
      "propertyType": "apartment",
      "amenities": ["WiFi", "Parking"],
      "status": "available",
      "phoneNumber": "+63 912 345 6789",
      "postedBy": {
        "_id": "user123",
        "username": "maria_santos",
        "email": "maria@example.com",
        "fullName": "Maria Santos",
        "profilePicture": "https://cloudinary.com/...",
        "phoneNumber": "+63 917 234 5678"
      },
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Test with cURL:**
```bash
curl https://rentify-server-ge0f.onrender.com/api/properties
```

---

### 2. Get Single Property
```http
GET /api/properties/:id
```

**Example:**
```bash
curl https://rentify-server-ge0f.onrender.com/api/properties/67890abc
```

**Response:**
```json
{
  "success": true,
  "property": {
    "_id": "67890abc",
    "name": "Modern Apartment",
    "postedBy": {
      "_id": "user123",
      "fullName": "Maria Santos"
    }
  }
}
```

---

### 3. Get Properties by User
```http
GET /api/properties/user/:userId
```

**Purpose:** Get all properties posted by a specific user

**Example:**
```bash
curl https://rentify-server-ge0f.onrender.com/api/properties/user/681b26b2c58b946b8d16dacf
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "properties": [...]
}
```

---

### 4. Search Properties
```http
GET /api/properties/search?location=Naga&propertyType=apartment&minPrice=10000&maxPrice=20000&status=available
```

**Query Parameters:**
- `location` - Search in address (case-insensitive)
- `propertyType` - apartment, house, condo, room, dorm, boarding house, other
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `status` - available, For rent, For sale, fully booked
- `amenities` - Comma-separated list (e.g., WiFi,Parking,Pool)

**Example:**
```bash
curl "https://rentify-server-ge0f.onrender.com/api/properties/search?location=Naga&propertyType=apartment"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "properties": [...]
}
```

---

### 5. Create Property (Protected)
```http
POST /api/properties
Authorization: Bearer <token>
Content-Type: application/json
```

**Headers:**
```javascript
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "name": "Modern Apartment",
  "description": "Beautiful 2BR apartment in downtown",
  "price": 15000,
  "address": "Magsaysay Avenue, Naga City",
  "latitude": 13.6218,
  "longitude": 123.1815,
  "propertyType": "apartment",
  "amenities": ["WiFi", "Parking", "Air Conditioning"],
  "status": "available",
  "phoneNumber": "+63 912 345 6789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property created successfully",
  "property": {
    "_id": "67890abc",
    "name": "Modern Apartment",
    "postedBy": {
      "_id": "user123",
      "fullName": "Maria Santos"
    }
  }
}
```

**Test with JavaScript:**
```javascript
const token = 'your_jwt_token_here';

const response = await fetch('https://rentify-server-ge0f.onrender.com/api/properties', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Property',
    description: 'Test description',
    price: 15000,
    address: 'Test Address',
    latitude: 13.6218,
    longitude: 123.1815,
    propertyType: 'apartment',
    amenities: ['WiFi', 'Parking'],
    status: 'available'
  })
});

const data = await response.json();
console.log(data);
```

---

### 6. Update Property (Protected)
```http
PUT /api/properties/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** Same as Create (only include fields to update)

**Response:**
```json
{
  "success": true,
  "message": "Property updated successfully",
  "property": {...}
}
```

**Authorization Check:**
- ✅ Only the property owner can update
- ❌ Returns 403 if user doesn't own the property

---

### 7. Delete Property (Protected)
```http
DELETE /api/properties/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

**Authorization Check:**
- ✅ Only the property owner can delete
- ❌ Returns 403 if user doesn't own the property

---

## 👥 User/Auth Endpoints

### 1. Get All Users
```http
GET /api/auth/users
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "users": [
    {
      "_id": "user123",
      "username": "maria_santos",
      "fullName": "Maria Santos",
      "email": "maria@example.com",
      "profilePicture": "https://cloudinary.com/..."
    }
  ]
}
```

---

### 2. Get User by ID
```http
GET /api/auth/users/:userId
```

**Example:**
```bash
curl https://rentify-server-ge0f.onrender.com/api/auth/users/681b26b2c58b946b8d16dacf
```

---

### 3. Login
```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "maria@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user123",
    "username": "maria_santos",
    "email": "maria@example.com",
    "fullName": "Maria Santos"
  }
}
```

---

### 4. Register
```http
POST /api/auth/signup
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "new_user",
  "email": "newuser@example.com",
  "password": "password123",
  "fullName": "New User"
}
```

---

## 🧪 Testing Workflow

### Step 1: Register or Login
```javascript
// Login first to get token
const loginResponse = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your@email.com',
    password: 'yourpassword'
  })
});

const { token, user } = await loginResponse.json();
console.log('Token:', token);
console.log('User ID:', user._id);
```

---

### Step 2: Get All Properties
```javascript
const propertiesResponse = await fetch('https://rentify-server-ge0f.onrender.com/api/properties');
const propertiesData = await propertiesResponse.json();

console.log(`Found ${propertiesData.count} properties`);
console.log('First property owner:', propertiesData.properties[0].postedBy);
```

---

### Step 3: Create a Property
```javascript
const createResponse = await fetch('https://rentify-server-ge0f.onrender.com/api/properties', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My New Property',
    description: 'A beautiful place to stay',
    price: 15000,
    address: 'Naga City',
    latitude: 13.6218,
    longitude: 123.1815,
    propertyType: 'apartment',
    amenities: ['WiFi', 'Parking'],
    status: 'available',
    phoneNumber: '+63 912 345 6789'
  })
});

const newProperty = await createResponse.json();
console.log('Created property:', newProperty);
```

---

### Step 4: Get User's Properties
```javascript
const userPropertiesResponse = await fetch(
  `https://rentify-server-ge0f.onrender.com/api/properties/user/${user._id}`
);
const userPropertiesData = await userPropertiesResponse.json();

console.log(`User has ${userPropertiesData.count} properties`);
```

---

### Step 5: Search Properties
```javascript
const searchResponse = await fetch(
  'https://rentify-server-ge0f.onrender.com/api/properties/search?location=Naga&propertyType=apartment&minPrice=10000&maxPrice=20000'
);
const searchData = await searchResponse.json();

console.log(`Found ${searchData.count} matching properties`);
```

---

## 🔍 Testing with Postman/Thunder Client

### Collection Setup

**1. Create Environment Variables:**
```
BASE_URL = https://rentify-server-ge0f.onrender.com
TOKEN = (will be set after login)
USER_ID = (will be set after login)
```

**2. Login Request:**
```
POST {{BASE_URL}}/api/auth/login
Body: { "email": "...", "password": "..." }

Tests Script:
const response = pm.response.json();
pm.environment.set("TOKEN", response.token);
pm.environment.set("USER_ID", response.user._id);
```

**3. Get Properties Request:**
```
GET {{BASE_URL}}/api/properties
```

**4. Create Property Request:**
```
POST {{BASE_URL}}/api/properties
Headers: Authorization: Bearer {{TOKEN}}
Body: { property data }
```

---

## ✅ Expected Behaviors

### Population Check
- ✅ `postedBy` should be an object, not just an ID
- ✅ `postedBy` should include: fullName, email, profilePicture, phoneNumber
- ❌ If `postedBy` is just a string ID, population failed

### Authorization Check
- ✅ Creating property requires valid JWT token
- ✅ Updating property requires ownership
- ✅ Deleting property requires ownership
- ❌ Returns 401 if no token
- ❌ Returns 403 if not owner

### Search Check
- ✅ Location search is case-insensitive
- ✅ Multiple filters work together
- ✅ Returns empty array if no matches
- ✅ All properties are populated

---

## 🐛 Troubleshooting

### Issue: postedBy is null
**Solution:** Property created before authentication was required. Delete and recreate.

### Issue: 401 Unauthorized
**Solution:** Make sure token is valid and included in Authorization header

### Issue: 403 Forbidden
**Solution:** User doesn't own this property. Only owner can update/delete.

### Issue: Properties not showing owner info
**Solution:** Check if `.populate()` is working. Restart server after code changes.

---

## 📊 Response Format Standards

All endpoints follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details"
}
```

---

## 🎯 Integration Checklist

- [x] GET /api/properties returns populated postedBy ✅
- [x] GET /api/properties/:id returns populated property ✅
- [x] POST /api/properties requires authentication ✅
- [x] PUT /api/properties/:id requires ownership ✅
- [x] DELETE /api/properties/:id requires ownership ✅
- [x] GET /api/properties/user/:userId returns user's properties ✅
- [x] GET /api/properties/search filters correctly ✅
- [x] GET /api/auth/users returns all users ✅
- [x] GET /api/auth/users/:userId returns single user ✅
- [x] All responses include success flag ✅

---

**Last Updated:** October 14, 2025
**Backend Status:** ✅ Fully Implemented & Ready for Frontend Integration
