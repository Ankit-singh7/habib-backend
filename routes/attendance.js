const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const appConfig = require("../config/appConfig")

module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/attendance`;

    app.post(`${baseUrl}/punch`, attendanceController.punch);

    app.get(`${baseUrl}/dashboard/:employeeId`, attendanceController.getDashboard);

    app.get(`${baseUrl}/attendance/list/:employeeId`, attendanceController.getAttendanceList);

    app.get(`${baseUrl}/locations`, attendanceController.getBranchesWithLocation);

}