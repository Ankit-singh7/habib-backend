const mongoose = require('mongoose');
const moment = require('moment');

const Attendance = mongoose.model('attendance');
const Deduction = mongoose.model('deduction');

const calculateDeduction = (lateMinutes, rules = []) => {
  let deduction = 0;
  for (let rule of rules) {
    if (lateMinutes >= rule.late_minutes) {
      deduction = rule.deduction;
    }
  }
  return deduction;
};

// ============================================
// 🔥 PUNCH IN / PUNCH OUT
// ============================================
const punch = async (employee_id, branch_id) => {
  const now = new Date();
  const attendance_date = moment(now).format('YYYY-MM-DD');

  // ✅ Find today's record
  let record = await Attendance.findOne({ employee_id, attendance_date });

  // ============================================
  // 👉 FIRST PUNCH IN OF THE DAY — create record
  // ============================================
  if (!record) {
    const shiftStart = moment(now).startOf('day').add(9, 'hours');
    const actualIn = moment(now);

    let lateMinutes = 0;
    if (actualIn.isAfter(shiftStart)) {
      lateMinutes = actualIn.diff(shiftStart, 'minutes');
    }

    const deductionConfig = await Deduction.findOne({});
    const deductionAmount = calculateDeduction(
      lateMinutes,
      deductionConfig?.rules || []
    );

    record = new Attendance({
      attendance_id: new mongoose.Types.ObjectId().toString(),
      employee_id,
      branch_id,
      attendance_date,
      sessions: [{ punch_in: now, punch_out: null, duration: 0 }],
      total_hours: 0,
      status: 'PRESENT',
      late_minutes: lateMinutes,
      deduction_amount: deductionAmount,
      is_active: true,  // currently punched in
    });

    await record.save();

    return { type: 'PUNCH_IN', message: 'Punch In successful' };
  }

  // ============================================
  // 👉 PUNCH OUT — close the active session
  // ============================================
  if (record.is_active) {
    // Find the last session that has no punch_out
    const activeSession = record.sessions
      .slice()
      .reverse()
      .find(s => s.punch_in && !s.punch_out);

    if (activeSession) {
      const duration = Math.floor(
        (now - new Date(activeSession.punch_in)) / (1000 * 60)
      );
      activeSession.punch_out = now;
      activeSession.duration = duration;
    }

    // ✅ Recalculate total minutes across ALL sessions
    const totalMinutes = record.sessions.reduce(
      (sum, s) => sum + (s.duration || 0), 0
    );

    record.total_hours = totalMinutes;
    record.is_active = false;
    record.updated_at = new Date();

    await record.save();

    return {
      type: 'PUNCH_OUT',
      message: 'Punch Out successful',
      total_hours: totalMinutes
    };
  }

  // ============================================
  // 👉 SUBSEQUENT PUNCH IN — add new session
  // ============================================
  record.sessions.push({ punch_in: now, punch_out: null, duration: 0 });
  record.is_active = true;
  record.updated_at = new Date();

  await record.save();

  return { type: 'PUNCH_IN', message: 'Punch In successful' };
};

// ============================================
// 🔥 DASHBOARD
// ============================================
const getDashboard = async (employee_id) => {
  const today = moment().format('YYYY-MM-DD');
  const start = moment().startOf('month').format('YYYY-MM-DD');

  const todayAttendance = await Attendance.findOne({
    employee_id,
    attendance_date: today
  });

  const records = await Attendance.find({
    employee_id,
    attendance_date: { $gte: start, $lte: today }
  });

  // ✅ Build date map of records
  const recordMap = {};
  records.forEach(r => { recordMap[r.attendance_date] = r; });

  let current = moment(start);
  const todayMoment = moment();

  let totalMinutes = 0;
  let present = 0;
  let absent = 0;

  while (current.isSameOrBefore(todayMoment, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const isWeekend = current.day() === 0; // ✅ skip Sundays (optional)

    if (!isWeekend) {
      if (recordMap[dateStr]) {
        totalMinutes += recordMap[dateStr].total_hours || 0;
        present++;
      } else {
        // ✅ Only count as absent if day has passed
        if (current.isBefore(todayMoment, 'day')) {
          absent++;
        }
      }
    }

    current.add(1, 'day');
  }

  // ✅ Get last session for display
  const sessions = todayAttendance?.sessions || [];
  const lastSession = sessions[sessions.length - 1] || null;

  return {
    today: todayAttendance ? {
      punch_in: lastSession?.punch_in || null,
      punch_out: lastSession?.punch_out || null,
      total_hours: todayAttendance.total_hours || 0,
      late_minutes: todayAttendance.late_minutes || 0,
      deduction: todayAttendance.deduction_amount || 0,
      status: todayAttendance.is_active ? 'Active' : 'Completed',
      sessions: sessions  // ✅ send all sessions if needed for history
    } : null,
    summary: {
      hours: totalMinutes,
      present,
      absent
    }
  };
};

// ============================================
// 🔥 ATTENDANCE LIST
// ============================================
const getAttendanceList = async (employee_id, month, year) => {
  const start = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
  const end = moment(start).endOf('month').format('YYYY-MM-DD');

  const records = await Attendance.find({
    employee_id,
    attendance_date: { $gte: start, $lte: end }
  }).sort({ attendance_date: -1 });

  return records.map((r) => ({
    date: r.attendance_date,
    sessions: r.sessions,          // ✅ all sessions
    total_hours: r.total_hours,    // ✅ total for the day
    status: r.status,
    late_minutes: r.late_minutes,
    deduction: r.deduction_amount
  }));
};


const getBranchesWithLocation = async () => {
  const Branch = mongoose.model('branch');
  
  const branches = await Branch.find(
    { latitude: { $ne: 0 }, longitude: { $ne: 0 } }, // ✅ only branches with coordinates
    { branch_id: 1, branch_name: 1, latitude: 1, longitude: 1 }
  );

  return branches;
};

module.exports = { punch, getDashboard, getAttendanceList, getBranchesWithLocation };