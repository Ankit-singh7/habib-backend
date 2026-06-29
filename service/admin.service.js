const mongoose = require('mongoose');
const moment = require('moment');

const User = mongoose.model('user');
const Attendance = mongoose.model('attendance');
const Branch = mongoose.model('branch');
// const Fine = mongoose.model('fine');
const Salary = mongoose.model('salary');
const { uploadToDrive, createEmployeeFolder, createRootFolder } = require('../service/google-drive.service');
let ROOT_FOLDER_ID = "1W5m6_WUZDGV_WbusPQtCLQe9rYNBSX4k";
const Incentive = mongoose.model('incentive');
const Advance = mongoose.model('advance');
const { globalActivity } = require('../libs/loggerLib')
const PayrollAdjustment = mongoose.model('payroll_adjustment');
const EmployeePayroll = mongoose.model('employee_payroll');
const Fine = mongoose.model('employee_fine');

const getAdminDashboard = async (branch_id) => {

  const today = moment().format('YYYY-MM-DD');
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();

  // ✅ Now includes both employee and operator
  const userFilter = {
    role: { $in: ['employee', 'operator'] },
    status: 'Active',
    ...(branch_id && { branch_id })
  };

  const employees = await User.find(userFilter, { user_id: 1 });
  const employeeIds = employees.map(e => e.user_id);

  const totalEmployees = employeeIds.length;
  const totalBranches = await Branch.countDocuments();

  const todayAttendance = await Attendance.find({
    employee_id: { $in: employeeIds },
    attendance_date: today
  });

  const todayPresent = todayAttendance.length;
  const todayIn = todayAttendance.filter(a => a.is_active).length;
  const todayOut = todayAttendance.filter(a => !a.is_active).length;

  const fines = await Fine.aggregate([
    {
      $match: {
        employee_id: { $in: employeeIds },
        created_at: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const totalFines = fines.length ? fines[0].total : 0;

  const pendingSalary = await Salary.countDocuments({
    employee_id: { $in: employeeIds },
    status: 'PENDING'
  });

  const payroll = await Salary.aggregate([
    {
      $match: {
        employee_id: { $in: employeeIds },
        created_at: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    { $group: { _id: null, total: { $sum: '$net_salary' } } }
  ]);

  const totalPayroll = payroll.length ? payroll[0].total : 0;
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
    shift_time: data.shift_time,

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
const adminOverwriteAttendance = async (
  employee_id,
  branch_id,
  admin_id,
  date,
  sessions = []
) => {

  const attendance_date = moment(date).format('YYYY-MM-DD');

  // ==========================================
  // Employee Details
  // ==========================================

  const employee = await User.findOne(
    { user_id: employee_id },
    {
      shift_time: 1
    }
  );

  // ==========================================
  // Build DateTime Helper
  // ==========================================

  const buildDateTime = (dateStr, timeStr) => {

    if (!timeStr || timeStr.trim() === '') {
      return null;
    }

    const [hours, minutes] = timeStr.split(':');

    if (!hours || !minutes) {
      return null;
    }

    const dt = moment(
      dateStr,
      'YYYY-MM-DD'
    ).toDate();

    dt.setHours(
      parseInt(hours),
      parseInt(minutes),
      0,
      0
    );

    return dt;
  };

  // ==========================================
  // Build Sessions
  // ==========================================

  const attendanceSessions = sessions.map(
    (session) => {

      const punchIn = buildDateTime(
        attendance_date,
        session.in
      );

      const punchOut = buildDateTime(
        attendance_date,
        session.out
      );

      let duration = 0;

      if (punchIn && punchOut) {

        duration = Math.floor(
          (
            punchOut.getTime() -
            punchIn.getTime()
          ) /
          (1000 * 60)
        );
      }

      return {
        punch_in: punchIn,
        punch_out: punchOut,
        duration
      };
    }
  );

  // ==========================================
  // First Punch In
  // ==========================================

  const firstPunchIn =
    attendanceSessions.find(
      s => s.punch_in
    )?.punch_in || null;

  // ==========================================
  // Active Session
  // ==========================================

  const activeSession =
    attendanceSessions.find(
      s =>
        s.punch_in &&
        !s.punch_out
    );

  // ==========================================
  // Total Hours
  // ==========================================

  const totalHours =
    attendanceSessions.reduce(
      (sum, session) =>
        sum + (session.duration || 0),
      0
    );

  // ==========================================
  // Late Minutes
  // ==========================================

  let lateMinutes = 0;

  if (
    firstPunchIn &&
    employee?.shift_time &&
    employee.shift_time.trim() !== ''
  ) {

    const [hours, minutes] =
      employee.shift_time
        .split(':')
        .map(Number);

    const shiftStart = moment(
      attendance_date
    )
      .startOf('day')
      .add(hours, 'hours')
      .add(minutes, 'minutes');

    const actualIn =
      moment(firstPunchIn);

    if (actualIn.isAfter(shiftStart)) {

      lateMinutes =
        actualIn.diff(
          shiftStart,
          'minutes'
        );
    }
  }

  // ==========================================
  // Deduction
  // ==========================================

  let deductionAmount = 0;

  if (employee?.shift_time) {

    const deductionConfig =
      await Deduction.findOne({});

    deductionAmount =
      calculateDeduction(
        lateMinutes,
        deductionConfig?.rules || []
      );
  }

  // ==========================================
  // Status
  // ==========================================

  let status = 'ABSENT';

  if (
    attendanceSessions.length > 0
  ) {

    status =
      lateMinutes > 0
        ? 'LATE'
        : 'PRESENT';
  }

  // ==========================================
  // Existing Record
  // ==========================================

  let record =
    await Attendance.findOne({
      employee_id,
      attendance_date
    });

  // ==========================================
  // Create
  // ==========================================

  if (!record) {

    record = new Attendance({

      attendance_id:
        new mongoose.Types.ObjectId().toString(),

      employee_id,

      branch_id,

      attendance_date,

      shift_time:
        employee?.shift_time || null,

      sessions:
        attendanceSessions,

      total_hours:
        totalHours,

      status,

      late_minutes:
        lateMinutes,

      deduction_amount:
        deductionAmount,

      is_active:
        !!activeSession,

      punch_by:
        'ADMIN',

      overwritten_by:
        admin_id
    });

    await record.save();

    await globalActivity({
      operator_id: 'admin',

      action_type:
        'OVERWRITE_ATTENDANCE',

      target_employee_id:
        employee_id,

      metadata: {
        attendance_date,
        sessions_count:
          attendanceSessions.length
      }
    });

    return {
      type: 'CREATED',
      message:
        'Attendance created successfully'
    };
  }

  // ==========================================
  // Update Existing
  // ==========================================

  record.shift_time =
    employee?.shift_time || null;

  record.sessions =
    attendanceSessions;

  record.total_hours =
    totalHours;

  record.status =
    status;

  record.late_minutes =
    lateMinutes;

  record.deduction_amount =
    deductionAmount;

  record.is_active =
    !!activeSession;

  record.punch_by =
    'ADMIN';

  record.overwritten_by =
    admin_id;

  record.updated_at =
    new Date();

  record.markModified(
    'sessions'
  );

  await record.save();

  await globalActivity({
    operator_id: 'admin',

    action_type:
      'OVERWRITE_ATTENDANCE',

    target_employee_id:
      employee_id,

    metadata: {
      attendance_date,
      sessions_count:
        attendanceSessions.length
    }
  });

  return {
    type: 'OVERWRITTEN',
    message:
      'Attendance overwritten successfully'
  };
};

const saveIncentive = async (data) => {

  const {
    employee_id,
    branch_id,
    amount,
    reason,
    month,
    added_by
  } = data;

  const incentive = new Incentive({

    incentive_id:
      new mongoose.Types.ObjectId().toString(),

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
    branch_id,
    metadata: {
      amount,
      reason,
      month
    }
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

  const {
    employee_id,
    branch_id,
    amount,
    reason,
    month,
    added_by
  } = data;

  const advance = new Advance({

    advance_id:
      new mongoose.Types.ObjectId().toString(),

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
    branch_id,
    metadata: {
      amount,
      reason,
      month
    }
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

// NEW FUNCTIONS

const savePayrollAdjustment = async (
  employee_id,
  branch_id,
  month,
  paid_leave_days,
  festival_days,
  updated_by
) => {

  let adjustment = await PayrollAdjustment.findOne({
    employee_id,
    month
  });

  if (adjustment) {

    adjustment.paid_leave_days = paid_leave_days;
    adjustment.festival_days = festival_days;
    adjustment.updated_by = updated_by;
    adjustment.updated_at = new Date();

    await adjustment.save();

    return adjustment;
  }

  adjustment = new PayrollAdjustment({
    adjustment_id: new mongoose.Types.ObjectId().toString(),
    employee_id,
    branch_id,
    month,
    paid_leave_days,
    festival_days,
    updated_by
  });

  await adjustment.save();

  return adjustment;
};


const getEmployeePayrollPreview = async (
  employee_id,
  month
) => {

  const employee = await User.findOne({
    user_id: employee_id
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  if (!employee.salary) {
    throw new Error(
      `${employee.f_name} ${employee.l_name} salary not configured`
    );
  }

  const startDate = moment(month + '-01')
    .startOf('month')
    .format('YYYY-MM-DD');

  const endDate = moment(month + '-01')
    .endOf('month')
    .format('YYYY-MM-DD');

  const attendances = await Attendance.find({
    employee_id,
    attendance_date: {
      $gte: startDate,
      $lte: endDate
    }
  });

const workedMinutes = attendances.reduce(
  (totalMinutes, attendance) => {

    const sessionMinutes =
      (attendance.sessions || []).reduce(
        (sessionTotal, session) => {

          return (
            sessionTotal +
            Number(session.duration || 0)
          );

        },
        0
      );

    return totalMinutes + sessionMinutes;

  },
  0
);

  const totalLateMinutes = attendances.reduce(
    (sum, item) => sum + (item.late_minutes || 0),
    0
  );

  const adjustment =
    await PayrollAdjustment.findOne({
      employee_id,
      month
    });

  const paidLeaveDays =
    adjustment?.paid_leave_days || 0;

  const festivalDays =
    adjustment?.festival_days || 0;

  const paidLeaveMinutes =
    paidLeaveDays * 600;

  const festivalMinutes =
    festivalDays * 600;

  const payableMinutes =
    workedMinutes +
    paidLeaveMinutes +
    festivalMinutes;

  const monthlyMinutes = 18000;

  const perMinuteRate =
    employee.salary / monthlyMinutes;

  const earnedSalary =
    payableMinutes *
    perMinuteRate;

  const lateDeduction =
    totalLateMinutes *
    perMinuteRate;

  const incentive =
    (
      await Incentive.find({
        employee_id,
        month
      })
    ).reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );

  const advance =
    (
      await Advance.find({
        employee_id,
        month
      })
    ).reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );

  const fines = await Fine.find({
    employee_id,
    month,
    salary_processed: false,
    apply_to: 'CURRENT'
  });

  const fine =
    fines.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );

  const netSalary =
    earnedSalary +
    incentive -
    fine -
    advance -
    lateDeduction;

  const formula =
    `((${workedMinutes}+${paidLeaveMinutes}+${festivalMinutes})×${perMinuteRate.toFixed(4)})+${incentive}-${fine}-${advance}-${lateDeduction}`;

  return {

    employee_id,

    employee_name:
      `${employee.f_name} ${employee.l_name}`,

    branch_id: employee.branch_id,
    branch_name: employee.branch_name,

    base_salary: employee.salary,

    monthly_minutes: monthlyMinutes,

    worked_minutes: workedMinutes,

    paid_leave_minutes: paidLeaveMinutes,

    festival_minutes: festivalMinutes,

    payable_minutes: payableMinutes,

    total_late_minutes: totalLateMinutes,

    per_minute_rate: perMinuteRate,

    earned_salary: Math.round(
      earnedSalary
    ),

    incentive,

    fine,

    advance,

    late_deduction: Math.round(
      lateDeduction
    ),

    net_salary: Math.round(
      netSalary
    ),

    salary_formula: formula,

    fine_ids: fines.map(
      item => item._id
    )
  };
};


const generateEmployeePayroll = async (
  employee_id,
  month,
  admin_id
) => {

  const preview =
    await getEmployeePayrollPreview(
      employee_id,
      month
    );

  let payroll =
    await EmployeePayroll.findOne({
      employee_id,
      month
    });

  // =====================================
  // Prevent overwrite if locked/paid
  // =====================================

  if (
    payroll &&
    (
      payroll.status === 'LOCKED' ||
      payroll.status === 'PAID'
    )
  ) {
    throw new Error(
      `Payroll already ${payroll.status}`
    );
  }

  // =====================================
  // Create New Payroll
  // =====================================

  if (!payroll) {

    payroll =
      new EmployeePayroll({

        payroll_id:
          new mongoose.Types.ObjectId().toString(),

        employee_id:
          preview.employee_id,

        employee_name:
          preview.employee_name,

        branch_id:
          preview.branch_id,

        month,

        base_salary:
          preview.base_salary,

        monthly_minutes:
          preview.monthly_minutes,

        worked_minutes:
          preview.worked_minutes,

        paid_leave_minutes:
          preview.paid_leave_minutes,

        festival_minutes:
          preview.festival_minutes,

        payable_minutes:
          preview.payable_minutes,

        total_late_minutes:
          preview.total_late_minutes,

        per_minute_rate:
          preview.per_minute_rate,

        earned_salary:
          preview.earned_salary,

        incentive:
          preview.incentive,

        fine:
          preview.fine,

        advance:
          preview.advance,

        late_deduction:
          preview.late_deduction,

        net_salary:
          preview.net_salary,

        salary_formula:
          preview.salary_formula,

        status: 'GENERATED',

        generated_by:
          admin_id,

        generated_at:
          new Date(),

        created_at:
          new Date(),

        updated_at:
          new Date()
      });

  }

  // =====================================
  // Regenerate Existing Draft
  // =====================================

  else {

    payroll.employee_name =
      preview.employee_name;

    payroll.branch_id =
      preview.branch_id;

    payroll.base_salary =
      preview.base_salary;

    payroll.monthly_minutes =
      preview.monthly_minutes;

    payroll.worked_minutes =
      preview.worked_minutes;

    payroll.paid_leave_minutes =
      preview.paid_leave_minutes;

    payroll.festival_minutes =
      preview.festival_minutes;

    payroll.payable_minutes =
      preview.payable_minutes;

    payroll.total_late_minutes =
      preview.total_late_minutes;

    payroll.per_minute_rate =
      preview.per_minute_rate;

    payroll.earned_salary =
      preview.earned_salary;

    payroll.incentive =
      preview.incentive;

    payroll.fine =
      preview.fine;

    payroll.advance =
      preview.advance;

    payroll.late_deduction =
      preview.late_deduction;

    payroll.net_salary =
      preview.net_salary;

    payroll.salary_formula =
      preview.salary_formula;

    payroll.generated_by =
      admin_id;

    payroll.generated_at =
      new Date();

    payroll.updated_at =
      new Date();
  }

  await payroll.save();

  // =====================================
  // Mark fines as processed
  // =====================================

  if (
    preview.fine_ids &&
    preview.fine_ids.length
  ) {

    await Fine.updateMany(
      {
        _id: {
          $in: preview.fine_ids
        }
      },
      {
        $set: {
          salary_processed: true
        }
      }
    );
  }

  return payroll;
};

const getPayrollEmployees = async (month, branch_id = '') => {

  // ✅ Include both employee and operator
  const employeeFilter = {
    role: { $in: ['employee', 'operator'] }
  };

  if (branch_id) {
    employeeFilter.branch_id = branch_id;
  }

  const employees = await User.find(employeeFilter)
    .select('user_id f_name l_name branch_id branch_name salary designation role')
    .lean();

  const payrolls = await EmployeePayroll.find({ month }).lean();

  const payrollMap = new Map();
  payrolls.forEach(payroll => payrollMap.set(payroll.employee_id, payroll));

  return employees.map(employee => {

    const payroll = payrollMap.get(employee.user_id);

    return {
      employee_id: employee.user_id,
      employee_name: `${employee.f_name || ''} ${employee.l_name || ''}`.trim(),
      branch_id: employee.branch_id,
      branch_name: employee.branch_name,
      designation: employee.designation,
      role: employee.role, // ✅ include role so frontend can differentiate
      salary: employee.salary || 0,
      payroll_generated: !!payroll,
      payroll_status: payroll ? payroll.status : 'NOT_GENERATED',
      net_salary: payroll ? payroll.net_salary : 0,
      generated_at: payroll?.generated_at || null,
      paid_at: payroll?.paid_at || null,
      locked_at: payroll?.locked_at || null
    };
  });
};

const lockEmployeePayroll = async (
  employee_id,
  month,
  admin_id
) => {

  const payroll =
    await EmployeePayroll.findOne({
      employee_id,
      month
    });

  if (!payroll) {
    throw new Error(
      'Payroll not generated'
    );
  }

  if (payroll.status === 'PAID') {
    throw new Error(
      'Payroll already paid'
    );
  }

  payroll.status = 'LOCKED';

  payroll.locked_by =
    admin_id;

  payroll.locked_at =
    new Date();

  payroll.updated_at =
    new Date();

  await payroll.save();

  return payroll;
};

const markEmployeePayrollPaid = async (
  employee_id,
  month,
  admin_id
) => {

  const payroll =
    await EmployeePayroll.findOne({
      employee_id,
      month
    });

  if (!payroll) {

    throw new Error(
      'Payroll not generated'
    );

  }

  if (
    payroll.status === 'PAID'
  ) {

    throw new Error(
      'Salary already paid'
    );

  }

  const snapshot =
    await getEmployeePayrollSlip(
      employee_id,
      month
    );

  payroll.status = 'PAID';

  payroll.payroll_snapshot =
    snapshot;

  payroll.paid_by =
    admin_id;

  payroll.paid_at =
    new Date();

  payroll.updated_at =
    new Date();

  await payroll.save();

  return payroll;

};


const getEmployeePayroll = async (
  employee_id,
  month
) => {

  return await EmployeePayroll.findOne({
    employee_id,
    month
  });

};
// END

const updateEmployeeSalaries = async (updates, admin_id) => {

  const validUpdates = updates.filter(u =>
    u.employee_id && typeof u.salary === 'number'
  );

  if (validUpdates.length === 0) {
    throw new Error('No valid salary updates found');
  }

  const bulkOps = validUpdates.map(u => ({
    updateOne: {
      filter: {
        user_id: u.employee_id,
        // ✅ Allow both employee and operator
        role: { $in: ['employee', 'operator'] },
        status: 'Active'
      },
      update: {
        $set: {
          salary: u.salary,
          updatedOn: new Date(),
          updated_by: admin_id || null
        }
      }
    }
  }));

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

  // ✅ Fetch both employees and operators for name resolution
  const users = await User.find(
    {
      user_id: { $in: userIds },
      role: { $in: ['employee', 'operator'] }
    },
    { user_id: 1, f_name: 1, l_name: 1, role: 1 }
  ).lean();

  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = `${u.f_name} ${u.l_name}`; });

  return logs.map(log => ({
    log_id: log.log_id,
    action_type: log.action_type,
    operator: userMap[log.operator_id] || 'System',
    target_employee: userMap[log.target_employee_id] || null,
    metadata: log.metadata,
    created_at: log.created_at,
    message: formatActivityMessage(
      log.action_type,
      log.metadata,
      userMap[log.operator_id],
      userMap[log.target_employee_id],
      'admin'
    ),
  }));
};

// ✅ Format human readable messages
const formatActivityMessage = (actionType, metadata, operatorName, employeeName, viewMode = 'employee') => {
  const op = operatorName || 'Someone';
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

const getEmployeePayrollSlip = async (
  employee_id,
  month
) => {

  const payroll =
    await EmployeePayroll.findOne({
      employee_id,
      month
    }).lean();

  if (!payroll) {
    throw new Error(
      'Salary not generated yet'
    );
  }

  // Once paid, return frozen snapshot
  if (
    payroll.status === 'PAID' &&
    payroll.payroll_snapshot
  ) {

    return payroll.payroll_snapshot;

  }

  const employee =
    await User.findOne({
      user_id: employee_id
    }).lean();

  const startDate =
    moment(month + '-01')
      .startOf('month')
      .format('YYYY-MM-DD');

  const endDate =
    moment(month + '-01')
      .endOf('month')
      .format('YYYY-MM-DD');

  const attendances =
    await Attendance.find({

      employee_id,

      attendance_date: {
        $gte: startDate,
        $lte: endDate
      }

    })
      .sort({
        attendance_date: 1
      })
      .lean();

  const attendanceRows =
    attendances.map(att => ({

      date:
        att.attendance_date,

      status:
        att.status,

      sessions:
        att.sessions || [],

      worked_minutes:
          (att.sessions || []).reduce(
    (sum, session) =>
      sum + Number(session.duration || 0),
    0
  ),

      late_minutes:
        att.late_minutes || 0

    }));

  const incentives =
    await Incentive.find({
      employee_id,
      month
    }).lean();

  const advances =
    await Advance.find({
      employee_id,
      month
    }).lean();

  const fines =
    await Fine.find({

      employee_id,

      month,

      salary_processed: true

    }).lean();

  const presentDays =
    attendanceRows.filter(
      x => x.status !== 'ABSENT'
    ).length;

  const absentDays =
    attendanceRows.filter(
      x => x.status === 'ABSENT'
    ).length;

  return {

    employee: {

      employee_id:
        employee.user_id,

      employee_name:
        `${employee.f_name} ${employee.l_name}`,

      branch_name:
        employee.branch_name,

      designation:
        employee.designation,

      phone:
        employee.phone,

       shift_time:
    employee.shift_time || null  // ✅ added

    },

    payroll,

    attendance_summary: {

      present_days:
        presentDays,

      absent_days:
        absentDays,

      worked_minutes:
        payroll.worked_minutes,

      late_minutes:
        payroll.total_late_minutes,

      paid_leave_minutes:
        payroll.paid_leave_minutes,

      festival_minutes:
        payroll.festival_minutes,

      payable_minutes:
        payroll.payable_minutes

    },

    attendance_rows:
      attendanceRows,

    incentives,

    advances,

    fines

  };

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
  updateEmployeeSalaries,
  getAdminActivity,

  savePayrollAdjustment,
  getEmployeePayrollPreview,
  generateEmployeePayroll,
  getPayrollEmployees,
  lockEmployeePayroll,
  markEmployeePayrollPaid,
  getEmployeePayroll,
  getEmployeePayrollSlip

};