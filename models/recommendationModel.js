const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    propertyId:{type:mongoose.Schema.Types.ObjectId, ref:'Property', required: true},
    score:{type:Number, required:true},
});

module.exports = mongoose.model('Recommendation', recommendationSchema);