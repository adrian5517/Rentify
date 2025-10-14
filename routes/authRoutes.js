const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware, uploadProfilePicture, updateProfile, getUserById, getAllUsers, testPassword } = require ('../controllers/authController');

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);
router.post('/upload-profile-picture', uploadProfilePicture);
router.put('/update-profile', updateProfile);
router.get('/users', getAllUsers);
router.get('/user/:userId', getUserById);
router.post('/test-password', testPassword);
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

module.exports = router;



