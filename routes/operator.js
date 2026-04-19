const express = require('express');
const operatorController = require('../controllers/operatorController');
const appConfig = require("../config/appConfig")

module.exports.setRouter = (app) => {
     let baseUrl = `${appConfig.apiVersion}/operator`;

     app.get(`${baseUrl}/dashboard/:operatorId`, operatorController.getDashboard);
     app.get(`${baseUrl}/employees`, operatorController.getEmployeeList);
     app.post(`${baseUrl}/punch`, operatorController.operatorPunch );
     app.post(`${baseUrl}/change-shift`, operatorController.changeShift );
     app.post(`${baseUrl}/change-branch`, operatorController.changeBranch );
     app.post(`${baseUrl}/add-fine`, operatorController.addFine );
     app.get(`${baseUrl}/activity/:operatorId`, operatorController.getRecentActivity);
     app.get(`${baseUrl}/attendance/control`, operatorController.getAttendanceControl);
     app.get(`${baseUrl}/profile/:operatorId`, operatorController.getProfile);

}