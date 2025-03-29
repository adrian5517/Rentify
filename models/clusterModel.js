const mongoose = require('mongoose');

const clusterSchema = new mongoose.Schema({
    propertyId:{type:mongoose.Schema.Types.ObjectId,ref:'Property', required:true},
    userId:{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
    clusterLabel:{ type:String , required:true},
    distanceFromCentroid:{type: Number, required: true}
});

module.exports = mongoose.model('Cluster', clusterSchema);