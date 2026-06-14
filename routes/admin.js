const express = require('express');
const adminController = require('../controllers/adminController');
const appConfig = require("../config/appConfig")
const upload = require('../middlewares/multer');

module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/admin`;

    app.get(`${baseUrl}/dashboard`, adminController.getDashboard);

    app.post(
        `${baseUrl}/employee/create`,
        upload.fields([
            { name: 'aadhaar', maxCount: 1 },
            { name: 'pan', maxCount: 1 }
        ]),
        adminController.createEmployee
    );
    app.post(`${baseUrl}/attendance/overwrite`, adminController.adminOverwriteAttendance);

    app.post(`${baseUrl}/incentive/save`, adminController.saveIncentive);
    app.get(`${baseUrl}/incentive/list`, adminController.getIncentiveList);
    app.delete(`${baseUrl}/incentive/:id`, adminController.removeIncentive);

    // ✅ Advance routes
    app.post(`${baseUrl}/advance/save`, adminController.saveAdvance);
    app.get(`${baseUrl}/advance/list`, adminController.getAdvanceList);
    app.delete(`${baseUrl}/advance/:id`, adminController.removeAdvance);


    // payroll routes
    app.post(`${baseUrl}/payroll-adjustment/save`, adminController.savePayrollAdjustment);
    app.get(`${baseUrl}/employee-payroll/preview`, adminController.getEmployeePayrollPreview);
    app.post(`${baseUrl}/employee-payroll/generate`, adminController.generateEmployeePayroll);
    app.get(`${baseUrl}/employee-payroll/list`, adminController.getPayrollEmployees);
    app.post(`${baseUrl}/employee-payroll/lock`, adminController.lockEmployeePayroll);
    app.post(`${baseUrl}/employee-payroll/paid`, adminController.markEmployeePayrollPaid);
    app.get(`${baseUrl}/employee-payroll`, adminController.getEmployeePayroll);
    app.get(`${baseUrl}/employee-payroll/slip`, adminController.getEmployeePayrollSlip);

    app.post(`${baseUrl}/employee/salary/bulk-update`, adminController.updateEmployeeSalaries);

    app.get(`${baseUrl}/employee/list`, adminController.getEmployeeList);
    app.put(
        `${baseUrl}/employee/update/:userId`,
        upload.fields([
            { name: 'aadhaar', maxCount: 1 },
            { name: 'pan', maxCount: 1 }
        ]),
        adminController.updateEmployee
    );
    app.get(`${baseUrl}/activity`, adminController.getAdminActivity);

}