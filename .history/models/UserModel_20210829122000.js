
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let userSchema = new Schema(
 {
 user_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 f_name: {
   type: String,
   default: ''
 },
 l_name: {
  type: String,
  default: ''
 },
 email: {
    type: String,
    default: ''
 },
 password: {
    type: String,
    default: ''
 },
 branch_name: {
   type: String,
   default: ''
 },
 branch_id: {
  type: String,
  default: ''
 },
 phone:{
   type:String,
   default:''
 },
 status:{
    type:String,
    default:''
  },
 designation:{
    type:String,
    default:''
 },
 role:{
     type:String,
     default:''
 },
 createdOn :{
   type:Date,
   default:""
 }, 
})


mongoose.model('user', userSchema);