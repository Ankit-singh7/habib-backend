const adminService = require('../service/admin.service');

const getDashboard = async (req, res) => {
    try {

        const branchId = req.query.branch_id || '';

        const data = await adminService.getAdminDashboard(branchId);

        res.status(200).send({
            error: false,
            message: 'Admin dashboard fetched',
            data
        });

    } catch (err) {
        console.error(err);

        res.status(500).send({
            error: true,
            message: err.message || 'Failed to load dashboard'
        });
    }
};

const createEmployee = async (req, res) => {
    try {

        const data = req.body;
        const files = req.files;

        const user = await adminService.createEmployee(data, files);

        res.status(200).send({
            error: false,
            message: 'Employee created successfully',
            data: user
        });

    } catch (err) {
        console.error(err);

        res.status(500).send({
            error: true,
            message: err.message || 'Failed to create employee'
        });
    }
};

const adminOverwriteAttendance = async (req, res) => {
  try {
    // ✅ Destructure from req.body — not passing whole object
    const {
      employee_id,
      branch_id,
      date,
      in_time,
      out_time,
      admin_id
    } = req.body;

    const result = await adminService.adminOverwriteAttendance(
      employee_id,  // ✅ individual params — not req.body
      branch_id,
      admin_id,
      date,
      in_time,
      out_time
    );

    res.status(200).send({
      error: false,
      message: result.message,
      data: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).send({
      error: true,
      message: err.message || 'Failed to process attendance'
    });
  }
};

const saveIncentive = async (req, res) => {
  try {
    const result = await adminService.saveIncentive(req.body);
    res.status(200).send({ error: false, message: 'Incentive saved', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const getIncentiveList = async (req, res) => {
  try {
    const { month, branch_id } = req.query;
    const result = await adminService.getIncentiveList(month, branch_id);
    res.status(200).send({ error: false, message: 'Incentive list', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const removeIncentive = async (req, res) => {
  try {
    await adminService.removeIncentive(req.params.id);
    res.status(200).send({ error: false, message: 'Incentive removed', data: null });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const saveAdvance = async (req, res) => {
  try {
    const result = await adminService.saveAdvance(req.body);
    res.status(200).send({ error: false, message: 'Advance saved', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const getAdvanceList = async (req, res) => {
  try {
    const { month, branch_id } = req.query;
    const result = await adminService.getAdvanceList(month, branch_id);
    res.status(200).send({ error: false, message: 'Advance list', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const removeAdvance = async (req, res) => {
  try {
    await adminService.removeAdvance(req.params.id);
    res.status(200).send({ error: false, message: 'Advance removed', data: null });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: true, message: err.message });
  }
};

const generatePayroll = async (req, res) => {
  try {
    const { month, branch_id } = req.body;
    const admin_id = req.body.admin_id;
    const result = await adminService.generatePayroll(month, branch_id, admin_id);
    res.status(200).send({ error: false, message: 'Payroll generated', data: result });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
};

const getPayroll = async (req, res) => {
  try {
    const { month, branch_id } = req.query;
    const result = await adminService.getPayroll(month, branch_id);
    res.status(200).send({ error: false, message: 'Payroll fetched', data: result });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
};

const lockPayroll = async (req, res) => {
  try {
    const { month, branch_id, admin_id } = req.body;
    const result = await adminService.lockPayroll(month, branch_id, admin_id);
    res.status(200).send({ error: false, message: 'Payroll locked', data: result });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
};

const unlockPayroll = async (req, res) => {
  try {
    const { month, branch_id } = req.body;
    const result = await adminService.unlockPayroll(month, branch_id);
    res.status(200).send({ error: false, message: 'Payroll unlocked', data: result });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
};

const markAsPaid = async (req, res) => {
  try {
    const { month, branch_id, admin_id } = req.body;
    const result = await adminService.markAsPaid(month, branch_id, admin_id);
    res.status(200).send({ error: false, message: 'Payroll marked as paid', data: result });
  } catch (err) {
    res.status(500).send({ error: true, message: err.message });
  }
};

const updateEmployeeSalaries = async (req, res) => {
  try {

    const { updates, admin_id } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).send({
        error: true,
        message: 'Invalid updates payload'
      });
    }

    const result = await adminService.updateEmployeeSalaries(updates, admin_id);

    res.status(200).send({
      error: false,
      message: 'Salaries updated successfully',
      data: result
    });

  } catch (err) {
    res.status(500).send({
      error: true,
      message: err.message
    });
  }
};

module.exports = {
    getDashboard,
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
    updateEmployeeSalaries
};