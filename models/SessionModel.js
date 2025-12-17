const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const sessionSchema = new Schema({
  session_id: {
    type: String,
    default: '',
    index: true,
    unique: true
  },
  session_status: {
    type: String,
    default:''
  },
  session_amount: {
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
  user_name: {
    type: String,
    default:''
  },
  withdrawn: {
      type:Number,
      default:0
  },
  isWithdrawn: {
      type: String,
      default: 'false'
  },
  cash_income: {
      type:Number,
      default: 0
  },
  drawer_balance: {
    type:Number,
    default: 0
  },
  expense_drawer_balance: {
    type:Number,
    default: 0
  },
  closing_balance: {
    type:Number,
    default: 0
  },
  date:{
    type:String,
    default:''
  },
  createdOn: {
    type: Date
  }
})

 mongoose.model('session', sessionSchema)