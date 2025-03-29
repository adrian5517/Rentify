const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    bookingId:{type: mongoose.Schema.Types.ObjectId, ref:'Booking', required:true},
    amount:{type:Number, required:true},
    paymentMethod:{type:String ,enum:['Credit Card', 'Gcash', 'Paypal'], required:true},
    status:{type:String, enum:['Pending', 'Completed', 'Failed'], default:'Pending'},
},{timestamps:true});

module.exports = mongoose.model('Payment',paymentSchema);