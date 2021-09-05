
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
 name: {
   type: String,
   default: ''
 },
 service_type_id: {
    type: String,
    default: ''  
 },
 service_type_name:{
    type: String,
    default: ''   
 },
 mostly_used:{
    type: String,
    default: ''    
 },
 createdOn :{
   type:Date,
   default:""
 }
})


mongoose.model('service', serviceSchema);