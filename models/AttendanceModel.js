const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ✅ Each punch in/out pair is a session
const sessionSchema = new Schema({
  punch_in: { type: Date, default: null },
  punch_out: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // minutes for this session
}, { _id: false });

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

  attendance_date: {
    type: String, // "YYYY-MM-DD"
    required: true,
    index: true
  },

  // ✅ Multiple punch in/out pairs
  sessions: {
    type: [sessionSchema],
    default: []
  },

  // ✅ Total minutes across ALL sessions for the day
  total_hours: {
    type: Number,
    default: 0
  },

  status: {
    type: String, // PRESENT / ABSENT
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

  // ✅ true = employee is currently punched in (active session exists)
  is_active: {
    type: Boolean,
    default: false
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

attendanceSchema.index({ employee_id: 1, attendance_date: 1 }, { unique: true });

mongoose.model('attendance', attendanceSchema);