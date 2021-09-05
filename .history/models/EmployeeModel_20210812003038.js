
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let employeeSchema = new Schema(
 {
 employee_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 employee_name: {
   type: String,
   default: ''
 },
 employee_email: {
    type: String,
    default: ''
 },
 employee_password: {
    type: String,
    default: ''
 },
 employee_branch: {
   type: String,
   default: ''
 },
 employee_phone:{
   type:String,
   default:''
 },
 employee_status:{
    type:String,
    default:''
  },
 employee_designation:{
    type:String,
    default:''
 },
 createdOn :{
   type:Date,
   default:""
 }, 
})


mongoose.model('employee', employeeSchema);