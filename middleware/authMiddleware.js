const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');

exports.protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get the token from the header
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using JWT secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to the request object (without password)
      req.user = await User.findById(decoded.id).select('-password');

      // Proceed to the next middleware or route handler
      return next();
    } catch (error) {
      // Send error response if token is invalid or expired
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If no token, send error response
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
