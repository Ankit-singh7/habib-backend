
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let serviceSchema = new Schema(
 {
 service_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 service_name: {
   type: String,
   default: ''
 },
 createdOn :{
   type:Date,
   default:""
 }
})


mongoose.model('service', serviceSchema);