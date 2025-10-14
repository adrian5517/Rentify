# 🏠 Paano Mag-Create ng Test Properties

## May 2 Options:

---

## ✅ OPTION 1: With Authentication (Recommended)

### Step 1: I-update ang credentials
Buksan ang `create-test-property.js` at i-update ang:

```javascript
const TEST_USER = {
  email: 'test@example.com',      // ⬅️ I-change to sa iyong email
  password: 'password123'          // ⬅️ I-change to sa iyong password
};
```

### Step 2: Run the script
```powershell
node create-test-property.js
```

### Gagawin nito:
- ✅ Mag-login using your credentials
- ✅ Mag-create ng 3 sample properties
- ✅ Automatic na may postedBy (from JWT token)
- ✅ I-populate ang owner information

---

## 🚀 OPTION 2: Quick Create (No Authentication)

**⚠️ Note:** Kailangan mo i-disable muna ang authentication o mag-provide ng valid user ID

### Step 1: Kumuha ng User ID

#### Option A: Get from API
```powershell
# Run to get list of users
Invoke-RestMethod -Uri "http://localhost:10000/api/auth/users"
```

#### Option B: Run helper script
```powershell
node create-property-quick.js
# Ipapakita nito ang available users with IDs
```

### Step 2: I-update ang User ID
Buksan ang `create-property-quick.js` at i-update ang:

```javascript
const YOUR_USER_ID = '681b26b2c58b946b8d16dacf'; // ⬅️ I-paste dito ang user ID mo
```

### Step 3: Run the script
```powershell
node create-property-quick.js
```

**⚠️ Note:** Kung may authentication (protect middleware), mag-fa-fail ito. Use Option 1 instead.

---

## 📋 Pre-requisites

### 1. May running server
```powershell
npm run dev
```

Dapat nakita mo:
```
Server running on port 10000
MongoDB connected successfully
```

### 2. May existing user sa database

#### Option A: Register via API
```powershell
Invoke-RestMethod -Uri "http://localhost:10000/api/auth/signup" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"username":"testuser","email":"test@example.com","password":"password123","fullName":"Test User"}'
```

#### Option B: Register via Frontend
- Open your frontend app
- Go to signup/register page
- Create an account

---

## 🧪 After Creating Properties

### Verify na gumana:

#### 1. Run test script
```powershell
node test-owner-info.js
```

Dapat makita:
```
✅ Type: Object (POPULATED)
✅ Name: Test User
✅ Email: test@example.com
✅ RESULT: Owner information is POPULATED! 🎉
```

#### 2. Check sa browser
Open: http://localhost:10000/api/properties

Dapat makita ang properties with populated owner:
```json
{
  "success": true,
  "properties": [
    {
      "name": "Modern 2BR Apartment",
      "postedBy": {
        "_id": "...",
        "fullName": "Test User",
        "email": "test@example.com"
      }
    }
  ]
}
```

---

## 🐛 Common Issues

### Issue 1: "Login failed"
**Cause:** Wrong email/password or user doesn't exist

**Solution:**
```powershell
# Check existing users
Invoke-RestMethod -Uri "http://localhost:10000/api/auth/users"

# Or create new user
Invoke-RestMethod -Uri "http://localhost:10000/api/auth/signup" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"username":"testuser","email":"test@example.com","password":"password123","fullName":"Test User"}'
```

---

### Issue 2: "User authentication required" or 401 error
**Cause:** Authentication middleware is active

**Solution:** Use Option 1 (with authentication) instead of Option 2

---

### Issue 3: "User not found" or invalid user ID
**Cause:** User ID doesn't exist in database

**Solution:**
```powershell
# Get valid user IDs
node create-property-quick.js
# Or visit: http://localhost:10000/api/auth/users
```

---

### Issue 4: "Server error" or connection failed
**Cause:** Server not running or MongoDB not connected

**Solution:**
```powershell
# Make sure server is running
npm run dev

# Check MongoDB connection in server logs
```

---

## 💡 Tips

### Mag-create ng maraming properties
I-update ang `SAMPLE_PROPERTIES` array sa `create-test-property.js`:

```javascript
const SAMPLE_PROPERTIES = [
  {
    name: 'Your Property 1',
    description: '...',
    // ... other fields
  },
  {
    name: 'Your Property 2',
    // ... add more properties here
  }
];
```

### Mag-customize ng property data
I-update ang values:
- `name` - Property name
- `description` - Property description
- `price` - Monthly rent (in pesos)
- `address` - Full address
- `latitude` & `longitude` - Map coordinates
- `propertyType` - apartment, house, condo, room, dorm, etc.
- `amenities` - Array of amenities
- `status` - available, For rent, For sale, fully booked
- `phoneNumber` - Contact number

---

## 📊 Quick Commands Reference

```powershell
# Start server
npm run dev

# Create properties (with auth)
node create-test-property.js

# Create property (quick, no auth)
node create-property-quick.js

# Test owner population
node test-owner-info.js

# Get all users
Invoke-RestMethod -Uri "http://localhost:10000/api/auth/users"

# Get all properties
Invoke-RestMethod -Uri "http://localhost:10000/api/properties"
```

---

## ✅ Success!

Pag nag-succeed ang script, makikita mo:

```
✅ Successfully created 3/3 properties

📊 Created Properties:
   1. Modern 2BR Apartment
      - Price: ₱15,000
      - Type: apartment
      - Location: Magsaysay Avenue, Naga City

🧪 Now you can test:
   1. Run: node test-owner-info.js
   2. Or visit: http://localhost:10000/api/properties
```

Tapos pwede mo na i-test sa frontend kung gumagana na ang "Contact Owner" button! 🎉
