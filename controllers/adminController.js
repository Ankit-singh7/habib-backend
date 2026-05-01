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
        const data = req.body;

        const result = await adminService.adminOverwriteAttendance(data);

        res.status(200).send({
            error: false,
            message: 'Attendance overwritten successfully',
            data: result
        });

    } catch (err) {
        console.error(err);

        res.status(500).send({
            error: true,
            message: err.message || 'Failed to overwrite attendance'
        });
    }
};

const getAdminAttendance = async (req, res) => {
    try {
        const { branch_id, employee_id, month, year } = req.query;

        const result = await adminService.getAdminAttendance(
            branch_id, employee_id, month, year
        );

        res.status(200).send({
            error: false,
            message: 'Attendance list fetched successfully',
            data: result
        });

    } catch (err) {
        console.error(err);

        res.status(500).send({
            error: true,
            message: err.message || 'Failed to fetch attendance'
        });
    }
};

module.exports = {
    getDashboard,
    createEmployee,
    adminOverwriteAttendance,
    getAdminAttendance
};