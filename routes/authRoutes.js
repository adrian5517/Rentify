const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware, uploadProfilePicture, updateProfile, getUserById, getAllUsers } = require ('../controllers/authController');
const passport = require('passport');
const User = require('../models/usersModel');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const { storeOTP, getOTP, deleteOTP } = require('../utils/otpStore');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/uploadMiddleware');
const crypto = require('crypto');

// In-memory store for OAuth state -> returnTo mapping.
// This is intentionally simple for development/local usage. It is short-lived
// and cleared on use. For distributed production deployments consider using
// a persistent store (redis) or signed state values.
const oauthStateStore = new Map();

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);

// Facebook OAuth routes
router.get('/facebook', (req, res, next) => {
    // Optional `returnTo` query param indicates where to redirect the client after auth
    // e.g. /api/auth/facebook?returnTo=http://localhost:3000
    const { returnTo } = req.query || {};
    // Generate a random state and store the mapping if returnTo was provided.
    const state = crypto.randomBytes(16).toString('hex');
    if (returnTo) {
        try {
            oauthStateStore.set(state, returnTo);
        } catch (e) {
            // If storing fails for any reason, continue without state mapping.
            console.warn('Failed to store oauth state mapping', e);
        }
    }

    // Initiate passport Facebook auth. Include state so it is round-tripped.
    passport.authenticate('facebook', { scope: ['email'], state })(req, res, next);
});

router.get('/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Facebook auth error', error: err.message });
        if (!user) return res.status(400).json({ message: 'Facebook authentication failed', info });

        try {
            const token = user.generateAuthToken();
            const userResponse = {
                _id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                profilePicture: user.profilePicture,
                address: user.address,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };

            // Determine where to redirect the browser. Prefer the returnTo value stored
            // in the oauthStateStore (if provided during initiation), otherwise fall back
            // to the environment CLIENT_URL. We use the state param returned by the
            // provider to look up the stored returnTo.
            const state = req.query && (req.query.state || req.body && req.body.state);
            let clientUrl = null;
            if (state && oauthStateStore.has(state)) {
                clientUrl = oauthStateStore.get(state);
                // clear it immediately
                oauthStateStore.delete(state);
            }
            if (!clientUrl) clientUrl = process.env.CLIENT_URL;

            if (clientUrl) {
                // Use fragment to avoid sending token to the server in Referer header
                // If the provided returnTo already includes '/auth', just append the fragment,
                // otherwise append '/auth#token=...'. Trim any trailing slashes first.
                const trimmed = clientUrl.replace(/\/$/, '');
                const hasAuthPath = /\/auth($|\/|#|\?)/.test(trimmed);
                const redirectBase = hasAuthPath ? trimmed : `${trimmed}/auth`;

                // Build a safe redirect that includes the token both as a query param and as a fragment.
                // Some CDNs or intermediaries may affect fragments; including the token in the query
                // as well improves robustness. Use the URL API to avoid accidental double-`?` issues.
                try {
                    const u = new URL(redirectBase);
                    u.searchParams.set('token', token);
                    const redirectUrl = `${u.toString()}#token=${token}`;
                    console.log('OAuth callback redirect prepared', { state, clientUrl, redirectUrl });
                    return res.redirect(302, redirectUrl);
                } catch (err) {
                    // Fallback: if redirectBase isn't a full URL for some reason, append safely
                    const sep = redirectBase.includes('?') ? '&' : '?';
                    const redirectUrl = `${redirectBase}${sep}token=${token}#token=${token}`;
                    console.log('OAuth callback redirect prepared (fallback)', { state, clientUrl, redirectUrl });
                    return res.redirect(302, redirectUrl);
                }
            }

            // Default: return JSON. Clients can store the token.
            return res.status(200).json({ message: 'Login Successful', token, user: userResponse });
        } catch (error) {
            return res.status(500).json({ message: 'Error generating token', error: error.message });
        }
    })(req, res, next);
});

// Return current authenticated user
router.get('/me', authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
});

// New RESTful endpoints
router.put('/users/:userId', updateProfile);
// Support single-step multipart upload: attach multer middleware here
router.put('/users/:userId/profile-picture', upload.any(), uploadProfilePicture);
// Accept POST as well for uploads/clients that send POST (some forms or proxies may use POST)
router.post('/users/:userId/profile-picture', upload.any(), uploadProfilePicture);
router.get('/users/:userId', getUserById);
router.get('/users', getAllUsers);

// Legacy endpoints (for backward compatibility)
router.post('/upload-profile-picture', uploadProfilePicture);
router.put('/update-profile', updateProfile);
router.get('/user/:userId', getUserById);

router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

// @route   POST /api/auth/forgot-password
// @desc    Request OTP for password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });
         if (!user) {
            // For security, don't reveal if email exists
            return res.status(200).json({ 
                message: 'If this email exists, an OTP has been sent' 
            });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP (expires in 5 minutes)
        storeOTP(email.toLowerCase(), otp);

        // Send email
        await sendOTPEmail(email, otp);

        console.log(`✅ OTP sent to ${email}`);
        
        res.json({ 
            message: 'OTP sent to your email. Please check your inbox.',
            expiresIn: 300 // 5 minutes in seconds
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ 
            message: 'Failed to process request. Please try again.' 
        });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and get reset token
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Get stored OTP
        const stored = getOTP(email.toLowerCase());

        if (!stored) {
            return res.status(400).json({ message: 'OTP expired or invalid' });
        }

        // Check if expired
        if (stored.expires < Date.now()) {
            deleteOTP(email.toLowerCase());
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Check attempts (max 3 attempts)
        if (stored.attempts >= 3) {
            deleteOTP(email.toLowerCase());
            return res.status(429).json({ 
                message: 'Too many invalid attempts. Please request a new OTP.' 
            });
        }

        // Verify OTP
        if (stored.otp !== otp.trim()) {
            stored.attempts++;
            return res.status(400).json({ 
                message: 'Invalid OTP',
                attemptsLeft: 3 - stored.attempts
            });
        }

        // OTP is valid - generate reset token (valid for 15 minutes)
        const resetToken = jwt.sign(
            { email: email.toLowerCase(), purpose: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Delete OTP after successful verification
        deleteOTP(email.toLowerCase());

        console.log(`✅ OTP verified for ${email}`);

        res.json({ 
            message: 'OTP verified successfully',
            resetToken 
        });

    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        res.status(500).json({ 
            message: 'Failed to verify OTP. Please try again.' 
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with reset token
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        // Validate input
        if (!resetToken || !newPassword) {
            return res.status(400).json({ 
                message: 'Reset token and new password are required' 
            });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Verify reset token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
            
            // Check if token is for password reset
            if (decoded.purpose !== 'password-reset') {
                throw new Error('Invalid token purpose');
            }
        } catch (error) {
            return res.status(400).json({ 
                message: 'Invalid or expired reset token' 
            });
        }

        // Find user
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password (will be hashed by pre-save hook in model)
        user.password = newPassword;
        await user.save();

        console.log(`✅ Password reset successful for ${user.email}`);

        res.json({ 
            message: 'Password reset successfully. You can now login with your new password.' 
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({ 
            message: 'Failed to reset password. Please try again.' 
        });
    }
});

module.exports = router;



