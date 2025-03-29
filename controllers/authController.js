const User = require('../models/usersModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL,
//         pass: process.env.EMAIL_PASSWORD,
//     },
// });




const registerUser = async (req, res)=>{
    const {firstName, LastName , email , password, phoneNumber , role} = req.body;
    try {
        const existingUser = await User.findOne({email});
        if(existingUser) return res.status(400).json({message:'User already exists'});

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ firstName, LastName , email , password : hashedPassword, phoneNumber , role})
        await newUser.save();

        res.status(201).json({message:'User registered successfully', user:newUser});
        
    } catch (error) {
        res.status(500).json({message:'Error registering user', error:error.message});
    }
}

const loginUser = async (req, res)=>{
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email});
        if(!user) return res.status(400).json({message:'Invalid credentials'});

        const isPassword = await bcrypt.compare(password, user.password);
        if(!isPassword) return res.status(400).json({message:'Invalid credentials'});

        const token = jwt.sign({id:user._id}, process.env.JWT_SECRET , {expiresIn: '1h'});
        res.status(200).json({message:'Login Successful', token , user})
        
    } catch (error) {
        res.status(500).json({message:'Error Logging in', error:error.message});
    }
};

const authMiddleware = async(req, res, next)=>{
    const token = req.cookies.token || req.headers['authorization'];
    if(!token) return res.status(401).json({message:'Unauthorized'});

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    }catch(error){
        res.status(401).json({message:'Unauthorized', error:error.message});
    }
}

const logoutUser = async (req ,res)=>{
    try{
        res.clearCookie('token');
        res.status(200).json({message:'Logout successful'});
    }catch(error){
        res.status(500).json({message:'Error logging out', error:error.message});
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    authMiddleware
}