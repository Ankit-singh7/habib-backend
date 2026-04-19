const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let fineSchema = new Schema({

  fine_id: {
    type: String,
    unique: true
  },

  employee_id: {
    type: String,
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  reason: {
    type: String,
    default: ''
  },

  fine_date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },

  added_by: {
    type: String, // OPERATOR / ADMIN
    required: true
  },

  operator_id: {
    type: String
  },

  created_at: {
    type: Date,
    default: Date.now
  }

});

mongoose.model('employee_fine', fineSchema);