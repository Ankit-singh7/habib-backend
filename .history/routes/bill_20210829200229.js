const express = require('express');
const billController = require("../controllers/billController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/bill`;

    app.get(`${baseUrl}`, billController.getAllBill);

    app.post(`${baseUrl}`, billController.createBill);

    app.delete(`${baseUrl}/:id`, billController.deleteBill);

    app.post(`${baseUrl}/:id/update`, billController.updateBill);

    app.post(`${baseUrl}/:id/status`, billController.changeStatus)

    app.get(`${baseUrl}/:id/getById`,billController.getBillDetail);

    app.get(`${baseUrl}/total`,billController.getTotalSales);
}
