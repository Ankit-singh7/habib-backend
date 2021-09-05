const express = require('express');
const appointmentController = require("../controllers/appointmentController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/appointment`;

    app.get(`${baseUrl}`, productController.getAllAppointment);

    app.post(`${baseUrl}`, productController.createAppointment);

    app.delete(`${baseUrl}/:id`, productController.deleteAppointment);

    app.put(`${baseUrl}/:id`, productController.updateAppointment);

    app.get(`${baseUrl}/:id`, productController.getSingleAppointment);

}
