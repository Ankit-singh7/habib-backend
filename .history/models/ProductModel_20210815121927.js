
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
 product_name: {
   type: String,
   default: ''
 },
 brand_name: {
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
 quantity:{
    type: String,
    default: ''   
 },
 price: {
    type:Number,
    default:null
 },
 t_price: {
    type:Number,
    default:null   
 },
 createdOn :{
   type:Date,
   default:""
 }
})


mongoose.model('product', productSchema);