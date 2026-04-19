const mongoose = require('mongoose');
const moment = require('moment');

const Attendance = mongoose.model('attendance');
const Deduction = mongoose.model('deduction');

// 🔥 Utility: calculate deduction
const calculateDeduction = (lateMinutes, rules = []) => {
  let deduction = 0;

  for (let rule of rules) {
    if (lateMinutes >= rule.late_minutes) {
      deduction = rule.deduction;
    }
  }

  return deduction;
};

// 🔥 Punch In / Punch Out
const punch = async (employee_id, branch_id) => {
  const now = new Date();

  // Check active record
  const existing = await Attendance.findOne({
    employee_id,
    is_active: true
  });

  // 👉 PUNCH IN
  if (!existing) {
    const attendance_date = moment(now).format('YYYY-MM-DD');

    const shiftStart = moment(now).startOf('day').add(9, 'hours'); // 9 AM
    const actualIn = moment(now);

    let lateMinutes = 0;

    if (actualIn.isAfter(shiftStart)) {
      lateMinutes = actualIn.diff(shiftStart, 'minutes');
    }

    // 🔥 Fetch deduction rules
    const deductionConfig = await Deduction.findOne({});

    const deductionAmount = calculateDeduction(
      lateMinutes,
      deductionConfig?.rules || []
    );

    const newAttendance = new Attendance({
      attendance_id: new mongoose.Types.ObjectId().toString(),
      employee_id,
      branch_id,
      attendance_date,
      punch_in_time: now,
      late_minutes: lateMinutes,          // ✅ NOW SET
      deduction_amount: deductionAmount,  // ✅ NOW SET
      is_active: true
    });

    await newAttendance.save();

    return {
      type: 'PUNCH_IN',
      message: 'Punch In successful'
    };
  }

  // 👉 PUNCH OUT
  else {
    const punchOutTime = now;

    const totalMinutes = Math.floor(
      (punchOutTime - existing.punch_in_time) / (1000 * 60)
    );

    // 🔥 Late calculation (assume 10 AM shift)
    const shiftStart = moment(existing.punch_in_time)
      .startOf('day')
      .add(10, 'hours');

    const actualIn = moment(existing.punch_in_time);

    let lateMinutes = 0;
    if (actualIn.isAfter(shiftStart)) {
      lateMinutes = actualIn.diff(shiftStart, 'minutes');
    }

    // 🔥 Fetch deduction rules
    const deductionConfig = await Deduction.findOne({});

    const deductionAmount = calculateDeduction(
      lateMinutes,
      deductionConfig?.rules || []
    );

    existing.punch_out_time = punchOutTime;
    existing.total_hours = totalMinutes;
    existing.late_minutes = lateMinutes;
    existing.deduction_amount = deductionAmount;
    existing.is_active = false;
    existing.updated_at = new Date();

    await existing.save();

    return {
      type: 'PUNCH_OUT',
      message: 'Punch Out successful',
      total_hours: totalMinutes,
      deduction: deductionAmount
    };
  }
};

// 🔥 Dashboard Data
const getDashboard = async (employee_id) => {
  const today = moment().format('YYYY-MM-DD');

  const todayAttendance = await Attendance.findOne({
    employee_id,
    attendance_date: today
  });

  const start = moment().startOf('month').format('YYYY-MM-DD');

  const records = await Attendance.find({
    employee_id,
    attendance_date: { $gte: start, $lte: today }
  });

  // 🔥 Map records
  const recordMap = {};
  records.forEach(r => {
    recordMap[r.attendance_date] = r;
  });

  let current = moment(start);
  const todayMoment = moment();

  let totalMinutes = 0;
  let present = 0;
  let missingDays = 0;

  while (current <= todayMoment) {
    const dateStr = current.format('YYYY-MM-DD');

    if (recordMap[dateStr]) {
      const r = recordMap[dateStr];
      totalMinutes += r.total_hours || 0;
      present++;
    } else {
      missingDays++;
    }

    current.add(1, 'day');
  }

  return {
    today: {
      punch_in: todayAttendance?.punch_in_time || null,
      punch_out: todayAttendance?.punch_out_time || null,
      total_hours: todayAttendance?.total_hours || 0,
      late_minutes: todayAttendance?.late_minutes || 0,
      deduction: todayAttendance?.deduction_amount || 0,
      status: todayAttendance?.is_active ? 'Active' : 'Completed'
    },
    summary: {
      hours: totalMinutes,
      present,
      absent: missingDays // ✅ now correct base logic
    }
  };
};

// 🔥 Attendance List
const getAttendanceList = async (employee_id, month, year) => {
  const start = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
  const end = moment(start).endOf('month').format('YYYY-MM-DD');

  const records = await Attendance.find({
    employee_id,
    attendance_date: { $gte: start, $lte: end }
  }).sort({ attendance_date: -1 });

  return records.map((r) => ({
    date: r.attendance_date,
    in: r.punch_in_time,
    out: r.punch_out_time,
    hours: r.total_hours,
    status: r.status
  })); 
};

module.exports = {
  punch,
  getDashboard,
  getAttendanceList
};