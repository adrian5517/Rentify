const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware, uploadProfilePicture, updateProfile, getUserById, getAllUsers } = require ('../controllers/authController');
const passport = require('passport');

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

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

            // If CLIENT_URL is set, redirect the browser to the client with the token in the URL fragment
            const clientUrl = process.env.CLIENT_URL;
            if (clientUrl) {
                // Use fragment to avoid sending token to the server in Referer header
                const redirectUrl = `${clientUrl.replace(/\/$/, '')}/auth#token=${token}`;
                return res.redirect(302, redirectUrl);
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
router.put('/users/:userId/profile-picture', uploadProfilePicture);
router.get('/users/:userId', getUserById);
router.get('/users', getAllUsers);

// Legacy endpoints (for backward compatibility)
router.post('/upload-profile-picture', uploadProfilePicture);
router.put('/update-profile', updateProfile);
router.get('/user/:userId', getUserById);

router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

module.exports = router;



