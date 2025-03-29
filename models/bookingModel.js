const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId:{ type:mongoose.Schema.Types.ObjectId,ref: 'User', required:true},
    propertyId:{type:mongoose.Schema.Types.ObjectId, ref:'Property', required:true},
    checkIn:{type:Date, required:true},
    checkOut:{type:Date, required:true},
    totalPrice:{type:Number, required:true},
    status:{type:String, enum:['Pending', 'Confirmed', 'Cancelled'], default:'Pending'},
},
{timestamps:true});

module.exports = mongoose.model('Booking', bookingSchema);