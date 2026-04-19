const attendanceService = require('../service/attendance.service');

// 🔥 Punch API
exports.punch = async (req, res) => {
  try {
    const { employee_id, branch_id } = req.body;

    const result = await attendanceService.punch(
      employee_id,
      branch_id
    );

    res.status(200).send({
      error: false,
      message: result.message,
      data: result
    });

  } catch (err) {
    res.status(500).send({
      error: true,
      message: err.message || 'Something went wrong'
    });
  }
};

// 🔥 Dashboar d API
exports.getDashboard = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await attendanceService.getDashboard(employeeId);

    res.status(200).send({
      error: false,
      data: result
    });

  } catch (err) {
    res.status(500).send({
      error: true,
      message: err.message
    });
  }
};

// 🔥 Attendance List API
exports.getAttendanceList = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const result = await attendanceService.getAttendanceList(
      employeeId,
      month,
      year
    );

    res.status(200).send({
      error: false,
      data: result
    });

  } catch (err) {
    res.status(500).send({
      error: true,
      message: err.message
    });
  }
};