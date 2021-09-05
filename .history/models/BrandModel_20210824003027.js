
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let brandSchema = new Schema(
 {
 brand_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 brand_name: {
   type: String,
   default: ''
 },
 createdOn:{
   type:Date,
   default:""
 }
})


mongoose.model('brand', brandSchema);