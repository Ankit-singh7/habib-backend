
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let serviceTypeSchema = new Schema(
 {
 service_type_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 name: {
   type: String,
   default: ''
 },
 createdOn :{
   type:Date,
   default:""
 }
})


mongoose.model('serviceType', serviceTypeSchema);