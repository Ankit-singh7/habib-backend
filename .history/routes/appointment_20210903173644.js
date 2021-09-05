const express = require('express');
const appointmentController = require("../controllers/appointmentController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/appointment`;

    app.get(`${baseUrl}`, appointmentController.getAllAppointment);

    app.post(`${baseUrl}`, appointmentController.createAppointment);

    app.delete(`${baseUrl}/:id`, appointmentController.deleteAppointment);

    app.put(`${baseUrl}/:id`, appointmentController.updateAppointment);

    app.get(`${baseUrl}/:id`, appointmentController.getSingleAppointmentDetail);

    app.get(`${baseUrl}/:customer_name/:branch_id`,appointmentController.getBillingCustomerAppointment)

}
