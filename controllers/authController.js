const User = require('../models/usersModel');

const jwt = require('jsonwebtoken');
const dns = require('dns').promises;

// Helper to read a cookie value from the request. If `cookie-parser` is present,
// `req.cookies` will be used; otherwise fall back to parsing `req.headers.cookie`.
function readCookie(req, name) {
    try {
        if (req.cookies && typeof req.cookies === 'object') return req.cookies[name];
        const header = req.headers && (req.headers.cookie || req.headers.Cookie || req.headers.COOKIE);
        if (!header) return undefined;
        const parts = header.split(';').map(p => p.trim());
        for (const part of parts) {
            const [k, ...v] = part.split('=');
            if (!k) continue;
            if (k === name) return decodeURIComponent((v || []).join('='));
        }
        return undefined;
    } catch (e) {
        return undefined;
    }
}

// Basic email format regex (RFC-lite)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Check email deliverability.
 * If `node-email-verifier` is installed in the backend project, prefer using it
 * for a more thorough verification. Otherwise fall back to MX lookup.
 */
async function isEmailDeliverable(email) {
    if (!email || !EMAIL_REGEX.test(email)) return false;
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Configuration via environment
    const STRICT = String(process.env.EMAIL_STRICT_VERIFICATION || '').toLowerCase() === 'true'
    const RETRIES = Number(process.env.EMAIL_VERIFIER_RETRIES || 2)
    const TIMEOUT_MS = Number(process.env.EMAIL_VERIFIER_TIMEOUT_MS || 5000)

    // Helper: delay
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    // Try optional package first (if installed in the backend repo)
    try {
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        const EmailVerifier = require('node-email-verifier')
        if (EmailVerifier) {
            let lastErr = null
            for (let attempt = 1; attempt <= Math.max(1, RETRIES); attempt++) {
                try {
                    // Some verifier libs expose either a verify function or a class.
                    let result
                    if (typeof EmailVerifier === 'function') {
                        const inst = EmailVerifier()
                        if (inst && typeof inst.verify === 'function') {
                            // Respect TIMEOUT_MS by racing with a timeout promise
                            result = await Promise.race([
                                inst.verify(email),
                                new Promise((_, rej) => setTimeout(() => rej(new Error('verifier timeout')), TIMEOUT_MS))
                            ])
                        } else if (typeof EmailVerifier.verify === 'function') {
                            result = await Promise.race([
                                EmailVerifier.verify(email),
                                new Promise((_, rej) => setTimeout(() => rej(new Error('verifier timeout')), TIMEOUT_MS))
                            ])
                        }
                    } else if (typeof EmailVerifier.verify === 'function') {
                        result = await Promise.race([
                            EmailVerifier.verify(email),
                            new Promise((_, rej) => setTimeout(() => rej(new Error('verifier timeout')), TIMEOUT_MS))
                        ])
                    }

                    // Interpret result
                    if (typeof result === 'boolean') {
                        if (STRICT) {
                            // In strict mode a simple boolean true is accepted, false rejected
                            return result === true
                        }
                        return result
                    }

                    if (!result) {
                        throw new Error('email verifier returned no result')
                    }

                    // Accept results that explicitly indicate deliverable / valid
                    const smtpOk = result.smtpCheck === true
                    const explicitOk = result.isValid === true || result.success === true || result.valid === true
                    const hasMx = Array.isArray(result.mxRecords) && result.mxRecords.length > 0

                    if (STRICT) {
                        // Strict: require SMTP-level check to pass (smtpCheck === true) or explicit ok
                        if (smtpOk || explicitOk) return true
                        // If verifier gave inconclusive but mx exists, consider it a fallback decision below
                        return false
                    }

                    // Non-strict: accept any positive signal
                    if (explicitOk || smtpOk || hasMx) return true

                    return false
                } catch (err) {
                    lastErr = err
                    // If transient network error, retry after small backoff
                    const transientCodes = ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND']
                    const isTransient = err && err.code && transientCodes.includes(err.code.toString())
                    if (attempt < RETRIES && isTransient) {
                        await wait(250 * attempt)
                        continue
                    }
                    // otherwise break and fallback to MX lookup
                    console.warn('node-email-verifier attempt failed:', err && err.message ? err.message : err)
                    break
                }
            }
            if (lastErr) {
                // fall through to MX lookup
            }
        }
    } catch (e) {
        // module not installed — continue to MX lookup fallback
    }

    // Fallback: perform DNS MX lookup
    try {
        const mxRecords = await dns.resolveMx(domain);
        return Array.isArray(mxRecords) && mxRecords.length > 0;
    } catch (err) {
        // If MX lookup fails, consider undeliverable
        console.warn('MX lookup failed for domain', domain, err && err.code ? err.code : err);
        return false;
    }
}


//Get users



const registerUser = async (req, res) => {
    const { username, email, password, phoneNumber, role } = req.body;

    try {
        // Server-side password policy:
        // - Minimum length: 8
        // - At least one uppercase letter
        // - At least one number
        // - At least one symbol (non-alphanumeric)
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: 'Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.'
            });
        }

        // Check email deliverability to avoid fake emails
        const emailDeliverable = await isEmailDeliverable(email)
        if (!emailDeliverable) return res.status(400).json({ message: 'Email address appears invalid or undeliverable' })

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

        const newUser = new User({
            username,
            email,
            password,
            phoneNumber,
            role,
            profilePicture
        });

        await newUser.save();

        const token = newUser.generateAuthToken();

        // Don't send password in response
        const userResponse = {
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            profilePicture: newUser.profilePicture,
            address: newUser.address,
            role: newUser.role,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userResponse,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('Login attempt with email:', email);
        
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found with email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Comparing passwords...');
        const isPasswordMatch = await user.comparePassword(password);
        console.log('Password match:', isPasswordMatch);

        if (!isPasswordMatch) {
            console.log('Password does not match for email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = user.generateAuthToken();
                // Create a refresh token (rotateable) and store it on the user
                const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret';
                const refreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' });

                // Persist refresh token to user document
                try {
                    user.refreshTokens = user.refreshTokens || [];
                    user.refreshTokens.push(refreshToken);
                    await user.save();
                } catch (e) {
                    console.warn('Failed to persist refresh token for user:', e && e.message ? e.message : e);
                }

                // Set HttpOnly refresh token cookie (accessible only to server)
                try {
                    const cookieOpts = { httpOnly: true, sameSite: 'lax' };
                    if (process.env.NODE_ENV === 'production') {
                        cookieOpts.secure = true;
                        cookieOpts.domain = process.env.COOKIE_DOMAIN || undefined;
                    }
                    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 1000 * 60 * 60 * 24 * 7 });
                } catch (e) {
                    console.warn('Failed to set refresh token cookie:', e && e.message ? e.message : e);
                }

                // Don't send password in response
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

        res.status(200).json({ 
            message: 'Login Successful', 
            token, 
            user: userResponse 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error Logging in', error: error.message });
    }
};

const authMiddleware = async (req, res, next) => {
    const token = readCookie(req, 'token') || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ message: 'User not found' });
        next();
    } catch (error) {
        // Log detailed token verification errors for local debugging (mask token)
        try {
            const masked = token ? `${String(token).slice(0,6)}...${String(token).slice(-6)}` : '<no-token>';
            console.error('Auth middleware JWT verify failed:', { maskedToken: masked, error: error && error.message });
        } catch (lgErr) {
            console.error('Auth middleware verify error (failed to log token):', error && error.message);
        }
        res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
};

const logoutUser = async (req, res) => {
    try {
        // Remove refresh token (if present) and clear cookie
        const refreshToken = readCookie(req, 'refreshToken');
        if (refreshToken) {
            try {
                const user = await User.findOne({ refreshTokens: refreshToken });
                if (user) {
                    user.refreshTokens = (user.refreshTokens || []).filter(t => t !== refreshToken);
                    await user.save();
                }
            } catch (e) {
                console.warn('Failed to remove refresh token on logout:', e && e.message ? e.message : e);
            }
        }
        res.clearCookie('refreshToken');
        res.clearCookie('token');
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};

// Refresh access token using refresh token cookie
const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = readCookie(req, 'refreshToken');
        if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret';
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, refreshSecret);
        } catch (err) {
            return res.status(401).json({ message: 'Invalid refresh token', error: err.message });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: 'User not found' });

        // Check that this refresh token is still valid (in user's list)
        if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
            return res.status(401).json({ message: 'Refresh token revoked' });
        }

        // Issue new access token (and rotate refresh token)
        const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_EXPIRES_IN || '1h' });

        // Rotate refresh token: remove old, add new
        const newRefreshToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' });
        user.refreshTokens = (user.refreshTokens || []).filter(t => t !== refreshToken);
        user.refreshTokens.push(newRefreshToken);
        await user.save();

        // Set cookie
        try {
          const cookieOpts = { httpOnly: true, sameSite: 'lax' };
          if (process.env.NODE_ENV === 'production') {
            cookieOpts.secure = true;
            cookieOpts.domain = process.env.COOKIE_DOMAIN || undefined;
          }
          res.cookie('refreshToken', newRefreshToken, { ...cookieOpts, maxAge: 1000 * 60 * 60 * 24 * 7 });
        } catch (e) {
          console.warn('Failed to set new refresh token cookie:', e && e.message ? e.message : e);
        }

        return res.status(200).json({ success: true, token: newAccessToken, user: { _id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(500).json({ message: 'Failed to refresh token', error: error.message });
    }
};

const streamifier = require('streamifier');
const cloudinary = require('../cloudinary');

function uploadBufferToCloudinary(buffer, folder = 'rentify/profiles') {
    return new Promise((resolve, reject) => {
        try {
            const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
            streamifier.createReadStream(buffer).pipe(stream);
        } catch (err) {
            reject(err);
        }
    });
}

const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.params.userId;
        let { imageUrl } = req.body;

        // If files were uploaded (single-step flow), upload the first file to Cloudinary
        if (req.files && req.files.length > 0) {
            const file = req.files[0];
            try {
                const result = await uploadBufferToCloudinary(file.buffer, 'rentify/profiles');
                imageUrl = result.secure_url || result.url;
            } catch (err) {
                console.error('Cloudinary upload failed:', err);
                return res.status(500).json({ success: false, message: 'Image upload failed', error: String(err.message || err) });
            }
        }

        if (!imageUrl) {
            return res.status(400).json({ 
                success: false,
                message: 'Image URL is required' 
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profilePicture: imageUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({ success: true, message: 'Profile picture updated successfully', user });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile picture', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.params.userId;
        // Support both naming conventions
        const { 
            fullName, name,
            username, 
            email, 
            address, location,
            phoneNumber, phone,
            bio
        } = req.body;

        console.log('=== UPDATE PROFILE REQUEST ===');
        console.log('User ID from params:', userId);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            console.log('ERROR: userId is missing');
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        // Check if userId is a valid ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('ERROR: Invalid userId format');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid User ID format' 
            });
        }

        // Verify user exists first
        const existingUser = await User.findById(userId);
        console.log('Existing user found:', existingUser ? 'Yes' : 'No');
        
        if (!existingUser) {
            console.log('ERROR: User not found in database');
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }

        console.log('Current user data:', {
            username: existingUser.username,
            email: existingUser.email,
            fullName: existingUser.fullName,
            phoneNumber: existingUser.phoneNumber,
            address: existingUser.address
        });

        // Check if email already exists (if email is being changed)
        if (email && email !== existingUser.email) {
            const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
            if (existingEmail) {
                console.log('ERROR: Email already exists');
                return res.status(400).json({ 
                    success: false,
                    message: 'Email already exists' 
                });
            }
        }

        // Check if username already exists (if username is being changed)
        if (username && username !== existingUser.username) {
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                console.log('ERROR: Username already exists');
                return res.status(400).json({ 
                    success: false,
                    message: 'Username already exists' 
                });
            }
        }

        const updateData = {};
        // Map both naming conventions to database fields
        if (fullName !== undefined || name !== undefined) updateData.fullName = fullName || name;
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (address !== undefined || location !== undefined) updateData.address = address || location;
        if (phoneNumber !== undefined || phone !== undefined) updateData.phoneNumber = phoneNumber || phone;
        if (bio !== undefined) updateData.bio = bio;

        console.log('Update data to be applied:', JSON.stringify(updateData, null, 2));

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        console.log('Updated user:', user ? 'Success' : 'Failed');
        console.log('=== UPDATE COMPLETE ===');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('=== UPDATE PROFILE ERROR ===');
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating profile', 
            error: error.message 
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        res.status(200).json({ 
            success: true,
            user 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user', 
            error: error.message 
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ 
            success: true,
            count: users.length,
            users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error fetching users', 
            error: error.message 
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    authMiddleware,
    uploadProfilePicture,
    updateProfile,
    getUserById,
    getAllUsers
};