const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({

    ownerId :{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
    name:{type:String, required:true},
    description:{ type:String , required:true},
    address:{type:String, required:true},
    city:{type:String, required:true},
    province:{type:String , required:true},
    zipCode:{type:String , required:true},
    coordinates:{
        latitude:{type:Number},
        longitude:{type:Number}
    },
    price:{type:Number , required:true},
    type:{type:String, enum:['house,apartment , studio unit , condo , boarding house'], required:true},
    availableRooms:{type:Number},
    amenities:[{type:String}],
    status:{type:String , enum:['Available', 'Occupied', 'Under Maintenance'], default:'Available'},
    images:[{type:String}],
    
    
    },{timestamps:true});

    module.exports = mongoose.model('Property', propertySchema);