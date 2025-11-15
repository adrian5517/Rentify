# SendGrid Setup Instructions

## Quick Steps to Get SendGrid Working

### 1. Create SendGrid Account
1. Go to https://sendgrid.com/
2. Click "Start for Free"
3. Sign up (100 emails/day free)
4. Verify your email address

### 2. Create API Key
1. Login to SendGrid dashboard
2. Go to Settings → API Keys (https://app.sendgrid.com/settings/api_keys)
3. Click "Create API Key"
4. Name: "Rentify Production"
5. Permissions: Select "Full Access" (or "Restricted Access" with Mail Send permission)
6. Click "Create & View"
7. **COPY THE API KEY NOW** (you can't see it again!)

### 3. Verify Sender Email
**IMPORTANT:** SendGrid requires you to verify the sender email before sending.

1. Go to Settings → Sender Authentication (https://app.sendgrid.com/settings/sender_auth)
2. Click "Verify a Single Sender"
3. Fill in the form:
   - From Name: Rentify
   - From Email Address: **juelboncodin@gmail.com**
   - Reply To: juelboncodin@gmail.com
   - Company Address: (fill in any address)
   - City, State, ZIP, Country
4. Click "Create"
5. **Check your email** (juelboncodin@gmail.com) for verification link
6. Click the verification link
7. Wait for "Verified" status in SendGrid dashboard

### 4. Update Environment Variables

#### Local (.env file):
```env
SENDGRID_API_KEY = SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_VERIFIED_SENDER = juelboncodin@gmail.com
```

#### Render Dashboard:
1. Go to https://dashboard.render.com
2. Select your service (rentify-server)
3. Go to Environment tab
4. Click "Add Environment Variable"
5. Add these two:
   - Key: `SENDGRID_API_KEY`
     Value: `SG.your-api-key-here`
   - Key: `SENDGRID_VERIFIED_SENDER`
     Value: `juelboncodin@gmail.com`
6. Click "Save Changes"
7. Render will automatically redeploy

### 5. Test Locally First

```powershell
# Start server
npm run dev

# Test forgot password
$body = @{email='juelboncodin@gmail.com'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:10000/api/auth/forgot-password' -ContentType 'application/json' -Body $body
```

Expected output:
```
✅ OTP email sent via SendGrid to: juelboncodin@gmail.com
```

Check your email inbox for the OTP!

### 6. Deploy to Render

```powershell
git add .
git commit -m "Switch to SendGrid for email delivery"
git push
```

Render will auto-deploy. Check logs for:
```
✅ OTP email sent via SendGrid to: ...
```

### 7. Test Production

```powershell
$body = @{email='juelboncodin@gmail.com'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'https://rentify-server-ge0f.onrender.com/api/auth/forgot-password' -ContentType 'application/json' -Body $body
```

---

## Troubleshooting

### Error: "The from email does not match a verified Sender Identity"
**Solution:** Verify your sender email in SendGrid (step 3 above)

### Error: "Forbidden"
**Solution:** Check API key permissions - needs "Mail Send" permission

### Error: "API key not found"
**Solution:** 
- Make sure SENDGRID_API_KEY starts with `SG.`
- Check for extra spaces in .env
- Restart server after updating .env

### Email goes to spam
**Solution:** 
1. Add SPF/DKIM records (SendGrid → Sender Authentication → Domain Authentication)
2. Or use SendGrid's shared domain for now (works in free tier)

---

## SendGrid Free Tier Limits

- ✅ 100 emails per day
- ✅ Single sender verification (no custom domain needed)
- ✅ All email types (transactional, marketing)
- ✅ Email activity tracking
- ✅ Basic support

Perfect for development and small production apps!

---

## Next Steps After Setup

1. ✅ Get API key from SendGrid
2. ✅ Verify sender email (juelboncodin@gmail.com)
3. ✅ Update local .env with API key
4. ✅ Test locally
5. ✅ Add environment variables to Render
6. ✅ Deploy and test production

**All done!** Emails will now work reliably on Render 🎉
