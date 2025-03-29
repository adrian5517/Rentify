const Booking = require('../models/bookingModel');


const createBooking = async (req, res)=> {
    try {
        const booking = new Booking({...req.body, userId: req.user.id});
        await booking.save();
        res.status(201).json({message:'Booking created successfully', booking});
        
    } catch (error) {
        res.status(500).json({message:'Error creating booking', error:error.message});
    }
}

module.exports = createBooking