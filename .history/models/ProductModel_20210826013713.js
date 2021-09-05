
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let productSchema = new Schema(
 {
 product_id: {
   type: String,
   default: '',
   index: true,
   unique: true
 },
 name: {
   type: String,
   default: ''
 },
 brand_id: {
    type: String,
    default: ''
  },
 brand_name:{
   type: String,
   default: ''
 },
 uom: {
    type: String,
    default: ''
 },
 product_type:{
    type: String,
    default: '' 
 },
 mostly_used:{
   type:String,
   default:''
 },
 quantity:{
    type: Number,
    default: null   
 },
 createdOn :{
   type:Date,
   default:""
 }
})


mongoose.model('product', productSchema);