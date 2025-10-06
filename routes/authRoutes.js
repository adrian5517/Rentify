const express = require('express');
const router = express.Router();

const { registerUser , loginUser , logoutUser , authMiddleware, getUsers } = require ('../controllers/authController');

router.post('/signup', registerUser);
router.post('/login', loginUser );
router.post('/logout', logoutUser);
router.get('/users', authMiddleware, getUsers); // Protected route to get users
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({message:'Protected route', user:req.user});
});

module.exports = router;



