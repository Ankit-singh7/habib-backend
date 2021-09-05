const express = require('express');
const salesReportController = require("../controllers/productSalesReportController");
const appConfig = require("../config/appConfig")
const auth = require('../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/product-sales-report`;

    app.get(`${baseUrl}/view/all`, salesReportController.getAllSalesReport);


}
