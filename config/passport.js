const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/usersModel');

module.exports = function(passport) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FB_CLIENT_ID,
        clientSecret: process.env.FB_CLIENT_SECRET,
        callbackURL: process.env.FB_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract useful data
          const facebookId = profile.id;
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          const displayName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
          const photo = profile.photos && profile.photos[0] && profile.photos[0].value;

          // Find existing user by facebookId or email
          let user = null;
          if (facebookId) {
            user = await User.findOne({ facebookId });
          }

          if (!user && email) {
            user = await User.findOne({ email });
          }

          if (user) {
            // Update facebookId if missing
            if (!user.facebookId && facebookId) {
              user.facebookId = facebookId;
              if (photo) user.profilePicture = user.profilePicture || photo;
              await user.save();
            }
            return done(null, user);
          }

          // Create a new user if none exists
          const usernameFromEmail = email ? email.split('@')[0] : `fb_${facebookId}`;
          const username = usernameFromEmail + Math.floor(Math.random() * 10000);

          const newUser = new User({
            username,
            fullName: displayName || username,
            email: email || `${facebookId}@facebook.local`,
            password: Math.random().toString(36).slice(-8), // random password (not used)
            facebookId,
            profilePicture: photo || ''
          });

          await newUser.save();
          return done(null, newUser);
        } catch (err) {
          console.error('Facebook strategy error:', err);
          return done(err, null);
        }
      }
    )
  );

  // Minimal serialization (not used because session:false)
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
