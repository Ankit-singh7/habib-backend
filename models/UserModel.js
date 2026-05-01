
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
    phone: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: ''
    },
    designation: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: ''
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Night'],
      default: 'Morning'
    },
    salary: {
      type: Number,
      default: null
    },
    documents: {
      aadhaar_url: String,
      pan_url: String,
      photo_url: String
    },
    createdOn: {
      type: Date,
      default: ""
    },
  })

userSchema.index({ branch_id: 1, role: 1, status: 1 });
mongoose.model('user', userSchema);