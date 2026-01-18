require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    fullName: { type: String },
    username:{type:String, required:true},
    email: { type: String, required: true, unique: true },
    password: { type: String },
    // Facebook fields
    facebookId: { type: String, index: true },
    phoneNumber: { type: String },
    profilePicture: { type: String,default:""},
    address: { type: String },
    bio: { type: String },
    role: { type: String, enum: ['user', 'admin', 'renter'], default: 'user' },
    refreshTokens: [{ type: String }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = mongoose.model('User', userSchema);
