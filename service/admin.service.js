const mongoose = require('mongoose');
const moment = require('moment');

const User = mongoose.model('user');
const Attendance = mongoose.model('attendance');
const Branch = mongoose.model('branch');
const Fine = mongoose.model('fine');
const Salary = mongoose.model('salary');
const { uploadToDrive, createEmployeeFolder, createRootFolder} = require('../service/google-drive.service');
let ROOT_FOLDER_ID = "1W5m6_WUZDGV_WbusPQtCLQe9rYNBSX4k";


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

    const totalFines = fines[0]?.total || 0;

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

    const totalPayroll = payroll[0]?.total || 0;

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

  const fullName = `${data?.f_name} ${data?.l_name}`;

  // 🔥 Step 3: Employee folder
  const employeeFolderId = await createEmployeeFolder(fullName, ROOT_FOLDER_ID);

  // 🔥 Step 4: Upload docs
  let aadhaarUrl = null;
  let panUrl = null;

  if (files?.aadhaar) {
    aadhaarUrl = await uploadToDrive(files.aadhaar[0], employeeFolderId);
  }

  if (files?.pan) {
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
const adminOverwriteAttendance = async (data) => {
  const {
    employee_id,
    branch_id,
    date,           // "YYYY-MM-DD"
    in_time,        // "HH:mm" (24hr)
    out_time,       // "HH:mm" (24hr) — can be null
    status,         // PRESENT / LATE / ABSENT
    reason,
    admin_id
  } = data;

  // ✅ Build full datetime from date + time strings
  const buildDateTime = (dateStr, timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const dt = moment(dateStr).toDate();
    dt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dt;
  };

  const punchIn = buildDateTime(date, in_time);
  const punchOut = out_time ? buildDateTime(date, out_time) : null;

  // ✅ Calculate duration if both times exist
  let duration = 0;
  let totalMinutes = 0;

  if (punchIn && punchOut) {
    duration = Math.floor((punchOut - punchIn) / (1000 * 60));
    totalMinutes = duration;
  }

  // ✅ Check if record exists for this date
  let record = await Attendance.findOne({ employee_id, attendance_date: date });

  if (record) {
    // ✅ Overwrite — replace sessions with admin-set values
    record.sessions = [{
      punch_in: punchIn,
      punch_out: punchOut,
      duration
    }];
    record.total_hours = totalMinutes;
    record.status = status;
    record.is_active = !punchOut; // active if no punch out
    record.overwritten_by = admin_id;
    record.overwrite_reason = reason;
    record.updated_at = new Date();

  } else {
    // ✅ Create new record for that date
    record = new Attendance({
      attendance_id: new mongoose.Types.ObjectId().toString(),
      employee_id,
      branch_id,
      attendance_date: date,
      sessions: [{
        punch_in: punchIn,
        punch_out: punchOut,
        duration
      }],
      total_hours: totalMinutes,
      status,
      is_active: !punchOut,
      late_minutes: 0,
      deduction_amount: 0,
      punch_by: 'ADMIN',
      overwritten_by: admin_id,
      overwrite_reason: reason,
    });
  }

  await record.save();

  await logActivity({
    operator_id: admin_id,
    action_type: 'OVERWRITE',
    target_employee_id: employee_id,
    metadata: { date, status, reason, in_time, out_time }
  });

  return { message: 'Attendance overwritten successfully' };
};


const getAdminAttendance = async (branch_id, employee_id, month, year) => {
  const start = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
  const end = moment(start).endOf('month').format('YYYY-MM-DD');

  const query = {
    attendance_date: { $gte: start, $lte: end }
  };

  if (employee_id) query.employee_id = employee_id;

  // ✅ If branch_id provided, get employee IDs for that branch first
  if (branch_id) {
    const User = mongoose.model('user');
    const branchEmployees = await User.find(
      { branch_id, status: 'Active' },
      { user_id: 1 }
    );
    query.employee_id = { $in: branchEmployees.map(e => e.user_id) };
  }

  const records = await Attendance.find(query).sort({ attendance_date: -1 });

  // ✅ Get employee names
  const User = mongoose.model('user');
  const empIds = [...new Set(records.map(r => r.employee_id))];
  const empList = await User.find(
    { user_id: { $in: empIds } },
    { user_id: 1, f_name: 1, l_name: 1, branch_name: 1, designation: 1 }
  );

  const empMap = {};
  empList.forEach(e => { empMap[e.user_id] = e; });

  return records.map(r => {
    const emp = empMap[r.employee_id] || {};
    const sessions = r.sessions || [];
    const completedSessions = sessions.filter(s => s.punch_out);

    return {
      attendance_id: r.attendance_id,
      employee_id: r.employee_id,
      employee_name: emp.f_name ? `${emp.f_name} ${emp.l_name}` : 'Unknown',
      branch: emp.branch_name || '',
      designation: emp.designation || '',
      date: r.attendance_date,
      punch_in: sessions[0]?.punch_in || null,
      punch_out: completedSessions[completedSessions.length - 1]?.punch_out || null,
      total_hours: r.total_hours || 0,
      status: r.status,
      session_count: sessions.length
    };
  });
};


module.exports = {
    getAdminDashboard,
    createEmployee,
    adminOverwriteAttendance,
    getAdminAttendance
};