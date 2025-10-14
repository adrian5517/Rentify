const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware, uploadProfilePicture, updateProfile, getUserById, getAllUsers } = require ('../controllers/authController');

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);

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



