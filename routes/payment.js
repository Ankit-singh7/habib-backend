const express = require('express');
const paymentController = require("../controllers/paymentModeController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/payment`;

    app.get(`${baseUrl}`, paymentController.getAllMode);

    app.post(`${baseUrl}`, paymentController.createMode);

    app.delete(`${baseUrl}/:id`, paymentController.deleteMode);

    app.put(`${baseUrl}/:id`, paymentController.updateMode);

    app.get(`${baseUrl}/:id`, paymentController.getSingleModeDetail);

}
