const express = require('express');
const serviceTypeController = require("../controllers/serviceTypeController");
const appConfig = require("../config/appConfig")
const auth = require('../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/service-type`;

    app.get(`${baseUrl}`, serviceTypeController.getAllService);

    app.post(`${baseUrl}`, serviceTypeController.createService);

    app.delete(`${baseUrl}/:id`, serviceTypeController.deleteService);

    app.put(`${baseUrl}/:id`, serviceTypeController.updateService);

    app.get(`${baseUrl}/:id`, serviceTypeController.getSingleService);

}
