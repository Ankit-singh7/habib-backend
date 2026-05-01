const mongoose = require('mongoose');
const moment = require('moment');
const { logActivity } = require('../utils/activityLogger');

const User = mongoose.model('user');
const Attendance = mongoose.model('attendance');
const ShiftHistory = mongoose.model('shift_history');
const Branch = mongoose.model('branch');
const BranchHistory = mongoose.model('branch_history');
const Fine = mongoose.model('employee_fine');
const OperatorActivity = mongoose.model('operator_activity');
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

const getOperatorDashboard = async (operatorId) => {

    // 🔹 Step 1: Get operator details
    const operator = await User.findOne(
        { user_id: operatorId },
        { branch_id: 1, role: 1 }
    );

    if (!operator) {
        throw new Error('Operator not found');
    }
    // 🔹 Step 2: Get all ACTIVE employees in branch
    const employees = await User.find(
        {
            role: 'employee',
            status: 'Active'
        },
        { user_id: 1 }
    );
    const employeeIds = employees.map(e => e.user_id);

    const totalEmployees = employeeIds.length;

    // 🔹 Step 3: Get today's attendance
    const today = moment().format('YYYY-MM-DD');

    const attendance = await Attendance.find(
        {
            employee_id: { $in: employeeIds },
            attendance_date: today
        },
        { employee_id: 1, is_active: 1 }
    );

    // 🔹 Step 4: Calculate metrics
    const presentToday = attendance.length;

    const pendingPunchOut = attendance.reduce((count, record) => {
        return record.is_active ? count + 1 : count;
    }, 0);

    return {
        totalEmployees,
        presentToday,
        pendingPunchOut
    };
};

const getEmployeeListWithStatus = async () => {

    const today = moment().format('YYYY-MM-DD');

    // 🔹 Step 1: Get all active employees
    const employees = await User.find(
        {
            role: { $regex: '^employee$', $options: 'i' },
            status: { $regex: '^active$', $options: 'i' }
        },
        {
            user_id: 1,
            f_name: 1,
            l_name: 1,
            designation: 1,
            branch_name: 1,
            branch_id: 1,
            shift: 1
        }
    );

    const employeeIds = employees.map(e => e.user_id);

    // 🔹 Step 2: Get today's attendance
    const attendance = await Attendance.find(
        {
            employee_id: { $in: employeeIds },
            attendance_date: today
        },
        {
            employee_id: 1,
            is_active: 1
        }
    );

    // 🔹 Step 3: Create map
    const attendanceMap = {};
    attendance.forEach(a => {
        attendanceMap[a.employee_id] = a;
    });

    // 🔹 Step 4: Merge data
    return employees.map(emp => ({
        user_id: emp.user_id,
        name: `${emp.f_name} ${emp.l_name}`,
        designation: emp.designation,
        branch_name: emp.branch_name,
        status: attendanceMap[emp.user_id]?.is_active ? 'IN' : 'OUT',
        shift: emp.shift,
        branch_id: emp.branch_id
    }));
};

const operatorPunch = async (employee_id, operator_id) => {
  const now = new Date();
  const attendance_date = moment(now).format('YYYY-MM-DD');

  // ✅ Find today's record (not by is_active — by date)
  let record = await Attendance.findOne({ employee_id, attendance_date });

  // ============================================
  // 👉 FIRST PUNCH IN OF THE DAY
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
      attendance_date,
      sessions: [{ punch_in: now, punch_out: null, duration: 0 }],
      total_hours: 0,
      status: 'PRESENT',
      late_minutes: lateMinutes,
      deduction_amount: deductionAmount,
      is_active: true,
      punch_by: 'OPERATOR',
      operator_id,
    });

    await record.save();

    await logActivity({
      operator_id,
      action_type: 'PUNCH',
      target_employee_id: employee_id,
      metadata: { type: 'PUNCH_IN', time: now }
    });

    return { type: 'PUNCH_IN', message: 'Punch In successful' };
  }

  // ============================================
  // 👉 PUNCH OUT — close active session
  // ============================================
  if (record.is_active) {
    const activeSession = record.sessions
      .slice()
      .reverse()
      .find((s) => s.punch_in && !s.punch_out);

    if (activeSession) {
      const duration = Math.floor(
        (now.getTime() - new Date(activeSession.punch_in).getTime()) / (1000 * 60)
      );
      activeSession.punch_out = now;
      activeSession.duration = duration;
    }

    // ✅ Recalculate total across all sessions
    const totalMinutes = record.sessions.reduce(
      (sum, s) => sum + (s.duration || 0), 0
    );

    record.total_hours = totalMinutes;
    record.is_active = false;
    record.punch_by = 'OPERATOR';
    record.operator_id = operator_id;
    record.updated_at = now;

    await record.save();

    await logActivity({
      operator_id,
      action_type: 'PUNCH',
      target_employee_id: employee_id,
      metadata: { type: 'PUNCH_OUT', time: now }
    });

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
  record.punch_by = 'OPERATOR';
  record.operator_id = operator_id;
  record.updated_at = now;

  await record.save();

  await logActivity({
    operator_id,
    action_type: 'PUNCH',
    target_employee_id: employee_id,
    metadata: { type: 'PUNCH_IN', time: now }
  });

  return { type: 'PUNCH_IN', message: 'Punch In successful' };
};

const changeShift = async (employee_id, new_shift, operator_id) => {

    // 🔹 Step 1: Get employee
    const employee = await User.findOne({ user_id: employee_id });

    if (!employee) {
        throw new Error('Employee not found');
    }

    const oldShift = employee.shift || 'Morning';

    // 🔹 Step 2: Update user
    employee.shift = new_shift;
    await employee.save();

    // 🔹 Step 3: Save history (🔥 IMPORTANT)
    await ShiftHistory.create({
        history_id: new mongoose.Types.ObjectId().toString(),
        employee_id,
        old_shift: oldShift,
        new_shift,
        changed_by: 'OPERATOR',
        operator_id
    });

    await logActivity({
        operator_id,
        branch_id: employee.branch_id,
        action_type: 'SHIFT_CHANGE',
        target_employee_id: employee_id,
        metadata: {
            old_shift: oldShift,
            new_shift: new_shift
        }
    });

    return {
        message: 'Shift updated successfully',
        old_shift: oldShift,
        new_shift
    };
};

const changeBranch = async (employee_id, new_branch_id, operator_id) => {

    // 🔹 Step 1: Get employee
    const employee = await User.findOne({ user_id: employee_id });

    if (!employee) {
        throw new Error('Employee not found');
    }

    // 🔥 NOW safe to use employee
    if (employee.branch_id === new_branch_id) {
        throw new Error('Employee already in this branch');
    }

    // 🔹 Step 2: Get new branch
    const branch = await Branch.findOne({ branch_id: new_branch_id });

    if (!branch) {
        throw new Error('Branch not found');
    }

    const oldBranchId = employee.branch_id;
    const oldBranchName = employee.branch_name;

    // 🔹 Step 3: Update user
    employee.branch_id = branch.branch_id;
    employee.branch_name = branch.branch_name;

    await employee.save();

    // 🔥 Step 4: Save history
    await BranchHistory.create({
        history_id: new mongoose.Types.ObjectId().toString(),
        employee_id,
        old_branch_id: oldBranchId,
        old_branch_name: oldBranchName,
        new_branch_id: branch.branch_id,
        new_branch_name: branch.branch_name,
        changed_by: 'OPERATOR',
        operator_id
    });

    await logActivity({
        operator_id,
        branch_id: branch.branch_id,
        action_type: 'BRANCH_CHANGE',
        target_employee_id: employee_id,
        metadata: {
            old_branch: oldBranchName,
            new_branch: branch.branch_name
        }
    });

    return {
        message: 'Branch updated successfully',
        old_branch: oldBranchName,
        new_branch: branch.branch_name
    };
};

const addFine = async (employee_id, amount, reason, operator_id) => {

    // 🔹 Step 1: Validate employee
    const employee = await User.findOne({ user_id: employee_id });

    if (!employee) {
        throw new Error('Employee not found');
    }

    if (!amount || amount <= 0) {
        throw new Error('Invalid fine amount');
    }

    const today = moment().format('YYYY-MM-DD');

    // 🔹 Step 2: Save fine
    await Fine.create({
        fine_id: new mongoose.Types.ObjectId().toString(),
        employee_id,
        amount,
        reason,
        fine_date: today,
        added_by: 'OPERATOR',
        operator_id
    });

    await logActivity({
        operator_id,
        branch_id: employee.branch_id,
        action_type: 'FINE',
        target_employee_id: employee_id,
        metadata: {
            amount,
            reason
        }
    });

    return {
        message: 'Fine added successfully',
        amount,
        employee: `${employee.f_name} ${employee.l_name}`
    };
};


const getRecentActivity = async (operator_id) => {

    const activities = await OperatorActivity.find({
        operator_id
    })
        .sort({ created_at: -1 })
        .limit(10);

    const employeeIds = activities
        .map(a => a.target_employee_id)
        .filter(Boolean);

    const users = await User.find(
        { user_id: { $in: employeeIds } },
        { user_id: 1, f_name: 1, l_name: 1 }
    );

    const userMap = {};
    users.forEach(u => {
        userMap[u.user_id] = `${u.f_name} ${u.l_name}`;
    });

    return activities.map(a => {

        const employeeName = userMap[a.target_employee_id] || 'Employee';

        let text = '';

        switch (a.action_type) {

            case 'FINE':
                text = `Fine added for ${employeeName} (₹${a.metadata?.amount || 0})`;
                break;

            case 'PUNCH':
                text = `${a.metadata?.type === 'PUNCH_IN' ? 'Punch-in' : 'Punch-out'} done for ${employeeName}`;
                break;

            case 'SHIFT_CHANGE':
                text = `Shift changed for ${employeeName} (${a.metadata?.new_shift})`;
                break;

            case 'BRANCH_CHANGE':
                text = `Branch changed for ${employeeName} (${a.metadata?.new_branch})`;
                break;

            default:
                text = `Activity for ${employeeName}`;
        }

        return {
            text,
            time: moment(a.created_at).fromNow()
        };
    });
};

const getAttendanceControl = async (branch_id) => {
  const today = moment().format('YYYY-MM-DD');

  const query = {
    status: 'Active',
    ...(branch_id && { branch_id })
  };

  const employees = await User.find(
    query,
    { user_id: 1, f_name: 1, l_name: 1, designation: 1, branch_name: 1 }
  );

  const employeeIds = employees.map(e => e.user_id);

  const attendance = await Attendance.find({
    employee_id: { $in: employeeIds },
    attendance_date: today
  });

  const attendanceMap = {};
  attendance.forEach(a => { attendanceMap[a.employee_id] = a; });

  let present = 0;
  let absent = 0;
  let late = 0;

  const result = employees.map(emp => {
    const record = attendanceMap[emp.user_id];

    let status = 'ABSENT';
    let punch_in = null;
    let punch_out = null;
    let total_hours = 0;
    let sessionCount = 0;

    if (record) {
      const sessions = record.sessions || [];
      sessionCount = sessions.length;

      // ✅ First punch in of the day
      punch_in = sessions[0]?.punch_in || null;

      // ✅ Last completed punch out
      const completedSessions = sessions.filter((s) => s.punch_out);
      punch_out = completedSessions[completedSessions.length - 1]?.punch_out || null;

      // ✅ Total hours across all sessions
      total_hours = record.total_hours || 0;

      // ✅ Status based on is_active
      if (record.is_active) {
        status = 'IN';
      } else if (sessions.length > 0) {
        status = 'OUT';
      }

      // ✅ Late overrides IN/OUT status
      if (record.late_minutes > 0) {
        status = status === 'IN' ? 'IN' : 'LATE'; // ✅ keep IN if active, else LATE
        late++;
        present++;
      } else {
        present++;
      }

    } else {
      absent++;
    }

    return {
      employee_id: emp.user_id,
      name: `${emp.f_name} ${emp.l_name}`,
      designation: emp.designation,
      branch: emp.branch_name,
      status,
      punch_in,
      punch_out,
      total_hours,
      session_count: sessionCount
    };
  });

  return {
    summary: { present, absent, late },
    employees: result
  };
};

const getOperatorProfile = async (operator_id) => {

    // 🔹 Step 1: Get operator details
    const operator = await User.findOne(
        { user_id: operator_id },
        {
            user_id: 1,
            f_name: 1,
            l_name: 1,
            email: 1,
            phone: 1,
            role: 1,
            branch_id: 1,
            branch_name: 1,
            status: 1
        }
    );

    if (!operator) {
        throw new Error('Operator not found');
    }

    // 🔹 Step 2: Get employees under operator scope
    const employees = await User.find(
        {
            role: 'employee',
            status: 'Active'
        },
        { user_id: 1 }
    );

    const employeeIds = employees.map(e => e.user_id);

    // 🔹 Step 3: Get today's attendance
    const today = moment().format('YYYY-MM-DD');

    const attendance = await Attendance.find({
        employee_id: { $in: employeeIds },
        attendance_date: today
    });

    const presentToday = attendance.length;

    // 🔹 Step 4: Permissions (can be DB-driven later)
    const permissions = {
        overwriteAttendance: true,
        manualPunch: true
    };

    return {
        profile: {
            name: `${operator.f_name} ${operator.l_name}`,
            role: operator.role,
            branch: operator.branch_name,
            status: operator.status,

            employeeId: operator.user_id,
            phone: operator.phone,
            email: operator.email
        },

        permissions,

        stats: {
            totalEmployees: employeeIds.length,
            presentToday
        }
    };
};

module.exports = {
    getOperatorDashboard,
    getEmployeeListWithStatus,
    operatorPunch,
    changeShift,
    changeBranch,
    addFine,
    getRecentActivity,
    getAttendanceControl,
    getOperatorProfile
};