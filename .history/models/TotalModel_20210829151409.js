const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const totalSchema = new Schema({
  total_id: {
    type: String,
    default: '',
    index: true,
    unique: true
  },
  total: {
    type: Number,
    default:0
  },
  branch_id:{
    type: String,
    default:''
  },
  branch_name:{
    type: String,
    default:''
  },
  employee_id:{
    type: String,
    default:''
  },
  date: {
    type:String,
    default:''
  },

  payment_mode : {
    type: String,
    default:''
  },
  bill_by:{
    type: String,
    default:''
  },
  createdOn :{
    type:Date,
    default:''
  },
})

 mongoose.model('total', totalSchema)