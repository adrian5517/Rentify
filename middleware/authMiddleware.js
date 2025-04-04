const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');

exports.protect = async (req, res, next) => {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            // Log the Authorization header for debugging
            console.log("Authorization Header:", req.headers.authorization);

            // Extract token from the Authorization header
            token = req.headers.authorization.split(' ')[1];

            // Log the extracted token for debugging
            console.log("Extracted Token:", token);

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Ensure JWT_SECRET is correctly set in .env
            req.user = await User.findById(decoded.id).select('-password'); // Fetch user from DB and exclude password
            next();  // Proceed to the next middleware/controller
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
