const mongoose = require('mongoose');
const moment = require('moment');

const User = mongoose.model('user');
const Attendance = mongoose.model('attendance');
const Branch = mongoose.model('branch');
const Fine = mongoose.model('fine');
const Salary = mongoose.model('salary');
const { uploadToDrive, createEmployeeFolder, createRootFolder } = require('../service/google-drive.service');
let ROOT_FOLDER_ID = "1W5m6_WUZDGV_WbusPQtCLQe9rYNBSX4k";
const Deduction = mongoose.model('deduction');
const Incentive = mongoose.model('incentive');
const Advance = mongoose.model('advance');
const Payroll = mongoose.model('payroll');
const { globalActivity } = require('../libs/loggerLib')


const calculateDeduction = (lateMinutes, rules = []) => {
  let deduction = 0;
  for (let rule of rules) {
    if (lateMinutes >= rule.late_minutes) {
      deduction = rule.deduction;
    }
  }
  return deduction;
};


const getAdminDashboard = async (branch_id) => {

  const today = moment().format('YYYY-MM-DD');
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();

  // 🔥 Dynamic filter
  const userFilter = {
    role: 'employee',
    status: 'Active',
    ...(branch_id && { branch_id })
  };

  const employees = await User.find(userFilter, { user_id: 1 });
  const employeeIds = employees.map(e => e.user_id);

  // 🔹 Total Employees
  const totalEmployees = employeeIds.length;

  // 🔹 Total Branches
  const totalBranches = await Branch.countDocuments();

  // 🔹 Today Attendance
  const todayAttendance = await Attendance.find({
    employee_id: { $in: employeeIds },
    attendance_date: today
  });

  const todayPresent = todayAttendance.length;

  const todayIn = todayAttendance.filter(a => a.is_active).length;
  const todayOut = todayAttendance.filter(a => !a.is_active).length;

  // 🔹 Monthly Fines
  const fines = await Fine.aggregate([
    {
      $match: {
        employee_id: { $in: employeeIds },
        created_at: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalFines = fines.length ? fines[0].total : 0;

  // 🔹 Pending Salary
  const pendingSalary = await Salary.countDocuments({
    employee_id: { $in: employeeIds },
    status: 'PENDING'
  });

  // 🔹 Payroll
  const payroll = await Salary.aggregate([
    {
      $match: {
        employee_id: { $in: employeeIds },
        created_at: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$net_salary' }
      }
    }
  ]);

  const totalPayroll = payroll.length ? payroll[0].total : 0;

  // 🔹 Incentives (optional → placeholder if not built yet)
  const totalIncentives = 0;

  return {
    overview: {
      totalEmployees,
      totalBranches,
      todayPresent,
      pendingSalary
    },

    monthly: {
      todayIn,
      todayOut,
      incentives: totalIncentives,
      fines: totalFines,
      payroll: totalPayroll
    }
  };
};


const createEmployee = async (data, files) => {

  // 🔥 Step 1: Create root folder once
  if (!ROOT_FOLDER_ID) {
    ROOT_FOLDER_ID = await createRootFolder();
  }

  // 🔥 Step 2: Name split

  const fullName = `${data && data.f_name ? data.f_name : ''} ${data && data.l_name ? data.l_name : ''}`;

  // 🔥 Step 3: Employee folder
  const employeeFolderId = await createEmployeeFolder(fullName, ROOT_FOLDER_ID);

  // 🔥 Step 4: Upload docs
  let aadhaarUrl = null;
  let panUrl = null;

  if (files && files.aadhaar) {
    aadhaarUrl = await uploadToDrive(files.aadhaar[0], employeeFolderId);
  }

  if (files && files.pan) {
    panUrl = await uploadToDrive(files.pan[0], employeeFolderId);
  }

  // 🔥 Step 5: Save user
  const newUser = new User({
    user_id: new mongoose.Types.ObjectId().toString(),

    f_name: data.f_name,
    l_name: data.l_name,

    email: data.email,
    phone: data.phone,
    password: data.password,

    role: data.role,
    designation: data.designation,

    branch_id: data.branch_id,
    branch_name: data.branch_name,

    shift: data.shift,
    salary: data.salary,
    status: "Active",

    documents: {
      aadhaar_url: aadhaarUrl,
      pan_url: panUrl
    }
  });

  await newUser.save();

  return newUser;
};

// ============================================
// 🔥 ADMIN OVERWRITE ATTENDANCE
// ============================================
const adminOverwriteAttendance = async (employee_id, branch_id, admin_id, date, in_time, out_time) => {

  // ✅ Normalize date — admin can punch for any date
  const attendance_date = moment(date).format('YYYY-MM-DD');

  // ✅ Build datetime from date + time
  const buildDateTime = (dateStr, timeStr) => {
    if (!timeStr || timeStr.trim() === '') return null;
    const [hours, minutes] = timeStr.split(':');
    if (!hours || !minutes) return null;
    const dt = moment(dateStr, 'YYYY-MM-DD').toDate();
    dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dt;
  };

  const punchIn = buildDateTime(attendance_date, in_time);
  const punchOut = buildDateTime(attendance_date, out_time);

  // ✅ Calculate late minutes (vs 9 AM shift start)
  let lateMinutes = 0;
  if (punchIn) {
    const shiftStart = moment(attendance_date).startOf('day').add(9, 'hours');
    const actualIn = moment(punchIn);
    if (actualIn.isAfter(shiftStart)) {
      lateMinutes = actualIn.diff(shiftStart, 'minutes');
    }
  }

  // ✅ Calculate deduction
  const deductionConfig = await Deduction.findOne({});
  const deductionAmount = calculateDeduction(
    lateMinutes,
    deductionConfig && deductionConfig.rules ? deductionConfig.rules : []
  );

  // ✅ Calculate duration
  let duration = 0;
  if (punchIn && punchOut) {
    duration = Math.floor(
      (punchOut.getTime() - punchIn.getTime()) / (1000 * 60)
    );
  }

  // ✅ Find existing record for that date
  let record = await Attendance.findOne({ employee_id, attendance_date });

  // ============================================
  // 👉 NO RECORD — Create new
  // ============================================
  if (!record) {
    record = new Attendance({
      attendance_id: new mongoose.Types.ObjectId().toString(),
      employee_id,
      branch_id,
      attendance_date,
      sessions: [{
        punch_in: punchIn,
        punch_out: punchOut,
        duration
      }],
      total_hours: duration,
      status: (lateMinutes > 0 ? 'LATE' : 'PRESENT'),
      late_minutes: lateMinutes,
      deduction_amount: deductionAmount,
      is_active: punchIn && !punchOut,  // active if punch in but no punch out
      punch_by: 'ADMIN',
      overwritten_by: admin_id,
    });

    await globalActivity({
      operator_id:        'admin',
      action_type:        'OVERWRITE_ATTENDANCE',
      target_employee_id: employee_id,
      metadata:           { date, in_time, out_time }
    });

    await record.save();

    return {
      type: 'CREATED',
      message: 'Attendance created successfully'
    };
  }

  // ============================================
  // 👉 RECORD EXISTS — Overwrite sessions
  // ============================================
  record.sessions = [{
    punch_in: punchIn,
    punch_out: punchOut,
    duration
  }];
  record.total_hours = duration;
  record.status = (lateMinutes > 0 ? 'LATE' : 'PRESENT');
  record.late_minutes = lateMinutes;
  record.deduction_amount = deductionAmount;
  record.is_active = punchIn && !punchOut;
  record.punch_by = 'ADMIN';
  record.overwritten_by = admin_id;
  record.updated_at = new Date();
  record.markModified('sessions'); // ✅ force Mongoose to detect change

  await record.save();

  return {
    type: 'OVERWRITTEN',
    message: 'Attendance overwritten successfully'
  };
};

const saveIncentive = async (data) => {
  const { employee_id, branch_id, amount, reason, month, added_by } = data;

  // ✅ Check if already exists for this employee + month
  let existing = await Incentive.findOne({ employee_id, month });

  if (existing) {
    // ✅ Update existing
    existing.amount = amount;
    existing.reason = reason;
    existing.added_by = added_by;
    existing.updated_at = new Date();
    await existing.save();
    return existing;
  }

  // ✅ Create new
  const incentive = new Incentive({
    incentive_id: new mongoose.Types.ObjectId().toString(),
    employee_id,
    branch_id,
    amount,
    reason,
    month,
    added_by
  });

  await globalActivity({
    operator_id: 'admin',
    action_type: 'INCENTIVE',
    target_employee_id: employee_id,
    branch_id: branch_id,
    metadata: { amount, reason, month }
  });

  await incentive.save();
  return incentive;
};

const getIncentiveList = async (month, branch_id) => {
  const query = { month };
  if (branch_id) query.branch_id = branch_id;
  return await Incentive.find(query);
};

const removeIncentive = async (incentive_id) => {
  return await Incentive.findOneAndDelete({ incentive_id });
};

const saveAdvance = async (data) => {
  const { employee_id, branch_id, amount, reason, month, added_by } = data;

  // ✅ Check if already exists for this employee + month
  let existing = await Advance.findOne({ employee_id, month });

  if (existing) {
    existing.amount = amount;
    existing.reason = reason;
    existing.added_by = added_by;
    existing.updated_at = new Date();
    await existing.save();
    return existing;
  }

  const advance = new Advance({
    advance_id: new mongoose.Types.ObjectId().toString(),
    employee_id,
    branch_id,
    amount,
    reason,
    month,
    added_by
  });

  await globalActivity({
    operator_id: 'admin',
    action_type: 'ADVANCE',
    target_employee_id: employee_id,
    branch_id: branch_id,
    metadata: { amount, reason, month }
  });

  await advance.save();
  return advance;
};

const getAdvanceList = async (month, branch_id) => {
  const query = { month };
  if (branch_id) query.branch_id = branch_id;
  return await Advance.find(query);
};

const removeAdvance = async (advance_id) => {
  return await Advance.findOneAndDelete({ advance_id });
};





// ============================================
// 🔥 GENERATE PAYROLL
// ============================================
const generatePayroll = async (month, branch_id, admin_id) => {
  // ✅ Check if payroll already exists
  const existing = await Payroll.findOne({ month, branch_id: branch_id || '' });
  if (existing && existing.status !== 'DRAFT') {
    throw new Error(`Payroll already ${existing.status} for this month`);
  }

  // ✅ Get all active employees for branch
  const empQuery = {
    role: { $regex: '^employee$', $options: 'i' },
    status: { $regex: '^active$', $options: 'i' }
  };
  if (branch_id) empQuery.branch_id = branch_id;

  const employees = await User.find(empQuery, {
    user_id: 1, f_name: 1, l_name: 1,
    salary: 1, branch_id: 1, branch_name: 1
  });

  const employeeIds = employees.map(e => e.user_id);

  const employeesWithoutSalary = employees.filter(e => !e.salary);

  if (employeesWithoutSalary.length > 0) {
    throw new Error(
      `Salary missing for ${employeesWithoutSalary.length} employees`, employeesWithoutSalary.length
    );
  }

  // ✅ Date range for the month
  const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
  const end = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

  // ✅ Fetch all data in parallel
  const [attendanceRecords, fines, incentives, advances] = await Promise.all([
    Attendance.find({
      employee_id: { $in: employeeIds },
      attendance_date: { $gte: start, $lte: end }
    }),
    Fine.find({
      employee_id: { $in: employeeIds },
      salary_processed: false,
      $or: [
        { apply_to: 'CURRENT', created_at: { $gte: new Date(start), $lte: new Date(end) } },
        { apply_to: 'NEXT' }
      ]
    }),
    Incentive.find({ employee_id: { $in: employeeIds }, month }),
    Advance.find({ employee_id: { $in: employeeIds }, month })
  ]);

  // ✅ Build lookup maps
  const attMap = {};
  attendanceRecords.forEach(a => {
    if (!attMap[a.employee_id]) attMap[a.employee_id] = [];
    attMap[a.employee_id].push(a);
  });

  const fineMap = {};
  fines.forEach(f => {
    fineMap[f.employee_id] = (fineMap[f.employee_id] || 0) + f.amount;
  });

  const incentiveMap = {};
  incentives.forEach(i => { incentiveMap[i.employee_id] = i.amount || 0; });

  const advanceMap = {};
  advances.forEach(a => { advanceMap[a.employee_id] = a.amount || 0; });

  // ✅ Calculate working days in month
  const totalWorkingDays = calculateWorkingDays(start, end);

  // ✅ Build payroll per employee
  const payrollEmployees = employees.map(emp => {
    const records = attMap[emp.user_id] || [];
    const presentDays = records.length;
    const absentDays = Math.max(0, totalWorkingDays - presentDays);
    const lateDeduction = records.reduce((sum, r) => sum + (r.deduction_amount || 0), 0);

    const baseSalary = emp.salary || 0;
    const incentive = incentiveMap[emp.user_id] || 0;
    const fine = fineMap[emp.user_id] || 0;
    const advance = advanceMap[emp.user_id] || 0;

    // ✅ Per day salary
    const perDaySalary = totalWorkingDays > 0
      ? baseSalary / totalWorkingDays
      : 0;

    // ✅ Earned salary based on days present
    const earnedSalary = Math.round(perDaySalary * presentDays);

    // ✅ Absent deduction
    const absentDeduction = Math.round(perDaySalary * absentDays);

    // ✅ Net = earned + incentive - fine - lateDeduction - advance
    const netSalary = earnedSalary + incentive - fine - lateDeduction - advance;

    return {
      employee_id: emp.user_id,
      employee_name: `${emp.f_name} ${emp.l_name}`,
      branch_id: emp.branch_id,
      branch_name: emp.branch_name,
      base_salary: baseSalary,
      per_day_salary: Math.round(perDaySalary),
      earned_salary: earnedSalary,
      absent_deduction: absentDeduction,
      incentive,
      fine,
      late_deduction: lateDeduction,
      advance,
      net_salary: Math.max(0, netSalary),
      working_days: totalWorkingDays,
      present_days: presentDays,
      absent_days: absentDays
    };
  });

  // ✅ Save or update payroll
  let payroll = existing || new Payroll({
    payroll_id: new mongoose.Types.ObjectId().toString(),
    month,
    branch_id: branch_id || '',
    generated_by: admin_id,
    generated_at: new Date()
  });

  payroll.employees = payrollEmployees;
  payroll.status = 'GENERATED';
  payroll.generated_by = admin_id;
  payroll.generated_at = new Date();
  payroll.updated_at = new Date();

  await payroll.save();

  // ✅ Mark fines as processed
  const fineIds = fines.map(f => f._id);
  await Fine.updateMany(
    { _id: { $in: fineIds } },
    { salary_processed: true }
  );

  return payroll;
};

// ✅ Helper — count working days (Mon-Sat, skip Sunday)
const calculateWorkingDays = (start, end) => {
  let count = 0;
  let current = moment(start);
  const endDate = moment(end);

  while (current.isSameOrBefore(endDate)) {
    if (current.day() !== 0) count++; // 0 = Sunday
    current.add(1, 'day');
  }
  return count;
};

// ============================================
// 🔥 GET PAYROLL STATUS
// ============================================
const getPayroll = async (month, branch_id) => {
  const payroll = await Payroll.findOne({
    month,
    branch_id: branch_id || ''
  });
  return payroll;
};

// ============================================
// 🔥 LOCK PAYROLL
// ============================================
const lockPayroll = async (month, branch_id, admin_id) => {
  const payroll = await Payroll.findOne({ month, branch_id: branch_id || '' });
  if (!payroll) throw new Error('Payroll not found');
  if (payroll.status !== 'GENERATED') throw new Error('Payroll must be GENERATED to lock');

  payroll.status = 'LOCKED';
  payroll.locked_by = admin_id;
  payroll.locked_at = new Date();
  payroll.updated_at = new Date();
  await payroll.save();
  return payroll;
};

// ============================================
// 🔥 UNLOCK PAYROLL
// ============================================
const unlockPayroll = async (month, branch_id) => {
  const payroll = await Payroll.findOne({ month, branch_id: branch_id || '' });
  if (!payroll) throw new Error('Payroll not found');
  if (payroll.status !== 'LOCKED') throw new Error('Payroll must be LOCKED to unlock');

  payroll.status = 'GENERATED';
  payroll.updated_at = new Date();
  await payroll.save();
  return payroll;
};

// ============================================
// 🔥 MARK AS PAID
// ============================================
const markAsPaid = async (month, branch_id, admin_id) => {
  const payroll = await Payroll.findOne({ month, branch_id: branch_id || '' });
  if (!payroll) throw new Error('Payroll not found');
  if (payroll.status !== 'LOCKED') throw new Error('Payroll must be LOCKED to mark as paid');

  payroll.status = 'PAID';
  payroll.paid_by = admin_id;
  payroll.paid_at = new Date();
  payroll.updated_at = new Date();

  await globalActivity({
  operator_id:        'admin',
  action_type:        'SALARY_PAID',
  target_employee_id: null, // affects all
  branch_id:          branch_id,
  metadata: { month, total_employees: payroll.employees.length }
});
  await payroll.save();
  return payroll;
};

const updateEmployeeSalaries = async (updates, admin_id) => {

  // 🔥 Validate input
  const validUpdates = updates.filter(u =>
    u.employee_id && typeof u.salary === 'number'
  );

  if (validUpdates.length === 0) {
    throw new Error('No valid salary updates found');
  }

  // 🔥 Prepare bulk operations
  const bulkOps = validUpdates.map(u => ({
    updateOne: {
      filter: { user_id: u.employee_id, role: 'employee', status: 'Active' },
      update: {
        $set: {
          salary: u.salary,
          updatedOn: new Date(),
          updated_by: admin_id || null
        }
      }
    }
  }));

  // 🔥 Execute bulk update
  const result = await User.bulkWrite(bulkOps);

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount
  };
};


// ✅ Get all activity for admin
const getAdminActivity = async (branch_id, limit = 50) => {
  const ActivityLog = mongoose.model('activity_log');
  const User = mongoose.model('user');

  const logs = await ActivityLog.find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();

  const userIds = [...new Set([
    ...logs.map(l => l.operator_id),
    ...logs.map(l => l.target_employee_id)
  ].filter(Boolean))];

  const users = await User.find(
    { user_id: { $in: userIds } },
    { user_id: 1, f_name: 1, l_name: 1 }
  ).lean();

  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = `${u.f_name} ${u.l_name}`; });

  return logs.map(log => ({
    log_id:          log.log_id,
    action_type:     log.action_type,
    operator:        userMap[log.operator_id] || 'System',
    target_employee: userMap[log.target_employee_id] || null,
    metadata:        log.metadata,
    created_at:      log.created_at,
    message:         formatActivityMessage(
      log.action_type, log.metadata,
      userMap[log.operator_id],
      userMap[log.target_employee_id],
      'admin' 
    ),
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

module.exports = {
  getAdminDashboard,
  createEmployee,
  adminOverwriteAttendance,
  saveIncentive,
  getIncentiveList,
  removeIncentive,
  saveAdvance,
  getAdvanceList,
  removeAdvance,
  generatePayroll,
  getPayroll,
  lockPayroll,
  unlockPayroll,
  markAsPaid,
  updateEmployeeSalaries,
  getAdminActivity
};