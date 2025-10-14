const express = require('express');
const router = express.Router();

<<<<<<< HEAD
const { registerUser , loginUser , logoutUser , authMiddleware, uploadProfilePicture, updateProfile, getUserById, getAllUsers, testPassword } = require ('../controllers/authController');
=======
const { registerUser , loginUser , logoutUser , authMiddleware, getUsers } = require ('../controllers/authController');
>>>>>>> 29baad58d83b5d4ecace2b6c444b4247a6f9b98e

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);
<<<<<<< HEAD
router.post('/upload-profile-picture', uploadProfilePicture);
router.put('/update-profile', updateProfile);
router.get('/users', getAllUsers);
router.get('/user/:userId', getUserById);
router.post('/test-password', testPassword);
=======
router.get('/users', authMiddleware, getUsers); // Protected route to get users
>>>>>>> 29baad58d83b5d4ecace2b6c444b4247a6f9b98e
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

module.exports = router;



