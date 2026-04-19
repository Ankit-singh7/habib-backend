const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let attendanceSchema = new Schema({
  attendance_id: {
    type: String,
    unique: true,
    index: true
  },

  employee_id: {
    type: String,
    required: true,
    index: true
  },

  branch_id: {
    type: String
  },

  // 🔥 IMPORTANT: Logical date (NOT actual timestamp)
  attendance_date: {
    type: String, // "YYYY-MM-DD"
    required: true,
    index: true
  },

  punch_in_time: {
    type: Date,
    default: null
  },

  punch_out_time: {
    type: Date,
    default: null
  },

  total_hours: {
    type: Number, // in minutes (better than string)
    default: 0
  },

  status: {
    type: String, // PRESENT / ABSENT / HALF_DAY
    default: 'PRESENT'
  },

  late_minutes: {
    type: Number,
    default: 0
  },

  deduction_amount: {
    type: Number,
    default: 0
  },

  is_active: {
    type: Boolean,
    default: true // active shift
  },

  created_at: {
    type: Date,
    default: Date.now
  },

  updated_at: {
    type: Date,
    default: Date.now
  }
});

attendanceSchema.index({ employee_id: 1, attendance_date: 1 });

mongoose.model('attendance', attendanceSchema);