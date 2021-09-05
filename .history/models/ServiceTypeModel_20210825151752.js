
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let serviceTypeSchema = new Schema(
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


mongoose.model('serviceType', serviceTypeSchema);