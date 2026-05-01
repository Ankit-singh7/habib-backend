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

    app.get(`${baseUrl}/attendance/list`, adminController.getAdminAttendance);
    app.post(`${baseUrl}/attendance/overwrite`, adminController.adminOverwriteAttendance);

}