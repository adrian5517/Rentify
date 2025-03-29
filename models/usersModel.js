const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName :{type: String ,required: true},
    lastName :{type: String },
    email:{type:String , required: true, unique: true},
    password:{type:String , required: true},
    phoneNumber:{type:String},
    profilePicture:{type:String},
    address:{type:String},
    role:{type:String, enum: ['user', 'admin' , 'renter'], default: 'user'},
},{timestamps: true});

module.exports = mongoose.model('User', userSchema);