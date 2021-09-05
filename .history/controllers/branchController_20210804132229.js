
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let branchSchema = new Schema(
 {
 branch_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 branch_name: {
   type: String,
   default: ''
 },
 branch_address: {
   type: String,
   default: ''
 },
 branch_phone:{
   type:String,
   default:''
 },
 createdOn :{
   type:Date,
   default:""
 }, 
})


mongoose.model('branch', branchSchema);