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
    app.get(`${baseUrl}/payroll`, adminController.getPayroll);
    app.post(`${baseUrl}/payroll/generate`, adminController.generatePayroll);
    app.post(`${baseUrl}/payroll/lock`, adminController.lockPayroll);
    app.post(`${baseUrl}/payroll/unlock`, adminController.unlockPayroll);
    app.post(`${baseUrl}/payroll/paid`, adminController.markAsPaid);

    app.post(`${baseUrl}/employee/salary/bulk-update`, adminController.updateEmployeeSalaries);

}