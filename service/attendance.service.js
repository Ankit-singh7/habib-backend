const mongoose = require('mongoose');
const moment = require('moment');

const Attendance = mongoose.model('attendance');
const Deduction = mongoose.model('deduction');
const Payroll = mongoose.model('payroll');

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

const punch = async (employee_id, branch_id, photoUrl = null) => {
  const now = new Date();
  const attendance_date = moment(now).format('YYYY-MM-DD');



  let record = await Attendance.findOne({ employee_id, attendance_date });

  // 👉 FIRST PUNCH IN
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
      deductionConfig && deductionConfig.rules ? deductionConfig.rules : []
    );

    record = new Attendance({
      attendance_id: new mongoose.Types.ObjectId().toString(),
      employee_id,
      branch_id,
      attendance_date,
      sessions: [{
        punch_in: now,
        punch_out: null,
        duration: 0,
        punch_in_photo: photoUrl  // ✅ NEW
      }],
      total_hours: 0,
      status: 'PRESENT',
      late_minutes: lateMinutes,
      deduction_amount: deductionAmount,
      is_active: true,
    });

    await record.save();
    return { type: 'PUNCH_IN', message: 'Punch In successful' };
  }

  // 👉 PUNCH OUT — unchanged
  if (record.is_active) {
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
      activeSession.punch_out_photo = photoUrl;
    }

    const totalMinutes = record.sessions.reduce(
      (sum, s) => sum + (s.duration || 0), 0
    );

    record.total_hours = totalMinutes;
    record.is_active = false;
    record.updated_at = new Date();
    record.markModified('sessions');
    await record.save();

    return { type: 'PUNCH_OUT', message: 'Punch Out successful', total_hours: totalMinutes };
  }

  // 👉 SUBSEQUENT PUNCH IN
  record.sessions.push({
    punch_in: now,
    punch_out: null,
    duration: 0,
    punch_in_photo: photoUrl
  });
  record.is_active = true;
  record.updated_at = new Date();
  record.markModified('sessions');
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
  const sessions = todayAttendance && todayAttendance.sessions
  ? todayAttendance.sessions
  : [];
  const lastSession = sessions[sessions.length - 1] || null;

  return {
    today: todayAttendance ? {
      punch_in: lastSession && lastSession.punch_in ? lastSession.punch_in : null,
      punch_out: lastSession && lastSession.punch_out ? lastSession.punch_out : null,
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

const getEmployeePayroll = async (employee_id) => {
  const payrolls = await Payroll.find(
    {
      status: 'PAID',
      'employees.employee_id': employee_id
    },
    { month: 1, status: 1, employees: 1 }
  ).sort({ month: -1 }).lean();

  const result = payrolls.map((p) => {
    const emp = p.employees.find(
      (e) => e.employee_id === employee_id
    );

    if (!emp) return null;

    return {
      month:          p.month,
      status:         p.status,
      base:           emp.base_salary,
      per_day_salary: emp.per_day_salary || Math.round(emp.base_salary / (emp.working_days || 26)),
      earned_salary:  emp.earned_salary  || emp.net_salary, // ✅ fallback for old records
      incentives:     emp.incentive,
      fines:          emp.fine,
      late_deduction: emp.late_deduction,
      advance:        emp.advance,
      net:            emp.net_salary,
      present_days:   emp.present_days,
      absent_days:    emp.absent_days,
      working_days:   emp.working_days,
      branch:         emp.branch_name
    };
  }).filter(Boolean);

  return result;
};

// In attendance.service.js or new activity.service.js
const getEmployeeActivity = async (employee_id, limit = 20) => {
  const ActivityLog = mongoose.model('activity_log');
  const User = mongoose.model('user');

  const logs = await ActivityLog.find({
    target_employee_id: employee_id
  })
  .sort({ created_at: -1 })
  .limit(limit)
  .lean();

  // ✅ Get operator names
  const operatorIds = [...new Set(logs.map(l => l.operator_id).filter(Boolean))];
  const operators = await User.find(
    { user_id: { $in: operatorIds } },
    { user_id: 1, f_name: 1, l_name: 1 }
  ).lean();

  const operatorMap = {};
  operators.forEach(o => {
    operatorMap[o.user_id] = `${o.f_name} ${o.l_name}`;
  });

  return logs.map(log => ({
    log_id:      log.log_id,
    action_type: log.action_type,
    operator:    operatorMap[log.operator_id] || 'System',
    metadata:    log.metadata,
    created_at:  log.created_at,
    // ✅ Human readable message
    message:     formatActivityMessage(log.action_type, log.metadata, operatorMap[log.operator_id], 'employee')
  }));
};

// ✅ Format human readable messages
const formatActivityMessage = (actionType, metadata, operatorName, employeeName, viewMode = 'employee') => {
  const op  = operatorName || 'Someone';
  const emp = employeeName || 'you';

  // ✅ For employee view — "you" context
  // ✅ For admin view — show employee name

  switch (actionType) {

    case 'PUNCH_IN':
      return viewMode === 'admin'
        ? `${op} punched in ${emp}`
        : `${op} recorded your punch in`;

    case 'PUNCH_OUT':
      return viewMode === 'admin'
        ? `${op} punched out ${emp}`
        : `${op} recorded your punch out`;

    // ✅ Keep old PUNCH for backward compat
    case 'PUNCH':
      if (metadata?.type === 'PUNCH_IN') {
        return viewMode === 'admin'
          ? `${op} punched in ${emp}`
          : `${op} recorded your punch in`;
      }
      return viewMode === 'admin'
        ? `${op} punched out ${emp}`
        : `${op} recorded your punch out`;

    case 'FINE':
      return viewMode === 'admin'
        ? `${op} added fine of ₹${metadata?.amount} for ${emp} — ${metadata?.reason || ''}`
        : `Fine of ₹${metadata?.amount} added by ${op} — ${metadata?.reason || ''}`;

    case 'INCENTIVE':
      return viewMode === 'admin'
        ? `Incentive of ₹${metadata?.amount} added for ${emp} (${metadata?.month})`
        : `Incentive of ₹${metadata?.amount} added for ${metadata?.month}`;

    case 'ADVANCE':
      return viewMode === 'admin'
        ? `Advance of ₹${metadata?.amount} added for ${emp} (${metadata?.month})`
        : `Advance of ₹${metadata?.amount} added for ${metadata?.month}`;

    case 'SHIFT_CHANGE':
      return viewMode === 'admin'
        ? `${op} changed shift of ${emp} from ${metadata?.old_shift || '?'} → ${metadata?.new_shift || '?'}`
        : `Your shift changed from ${metadata?.old_shift || '?'} → ${metadata?.new_shift || '?'} by ${op}`;

    case 'BRANCH_CHANGE':
      const oldBranch = metadata?.old_branch || 'previous branch';
      const newBranch = metadata?.new_branch || 'new branch';
      return viewMode === 'admin'
        ? `${op} moved ${emp} from ${oldBranch} → ${newBranch}`
        : `Your branch changed from ${oldBranch} → ${newBranch} by ${op}`;

    case 'SALARY_PAID':
      return `Salary paid for ${metadata?.month}`;

    case 'OVERWRITE':
      return viewMode === 'admin'
        ? `${op} updated attendance of ${emp} for ${metadata?.date}`
        : `Your attendance was updated by ${op} for ${metadata?.date}`;

    case 'ADMIN_PUNCH':
      return viewMode === 'admin'
        ? `${op} recorded attendance of ${emp} for ${metadata?.date}`
        : `Attendance recorded by ${op} for ${metadata?.date}`;

    default:
      return `${op} performed ${actionType} for ${emp}`;
  }
};

module.exports = { punch, getDashboard, getAttendanceList, getBranchesWithLocation, getEmployeePayroll, getEmployeeActivity };