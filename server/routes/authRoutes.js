const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware } = require ('../../controllers/authController');
const passport = require('passport');

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);
// Facebook OAuth
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

            // If CLIENT_URL is set, redirect to client with token in fragment, else return JSON
            const clientUrl = process.env.CLIENT_URL;
            if (clientUrl) {
                const redirectUrl = `${clientUrl.replace(/\/$/, '')}/auth#token=${token}`;
                return res.redirect(302, redirectUrl);
            }

            return res.status(200).json({ message: 'Login Successful', token, user: userResponse });
        } catch (error) {
            return res.status(500).json({ message: 'Error generating token', error: error.message });
        }
    })(req, res, next);
});

router.get('/me', authMiddleware, (req, res) => {
    res.status(200).json({ user: req.user });
});
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

module.exports = router;



