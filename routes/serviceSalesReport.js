const express = require('express');
const salesReportController = require("../controllers/serviceSalesReportController");
const appConfig = require("../config/appConfig")
const auth = require('../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/service-sales-report`;

    app.get(`${baseUrl}/view/all`, salesReportController.getAllSalesReport);

    app.get(`${baseUrl}/view/yearly-month-wise`, salesReportController.getSalesReportYearlyMonthWise);

}
