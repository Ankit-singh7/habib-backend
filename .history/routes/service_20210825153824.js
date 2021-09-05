const express = require('express');
const serviceController = require("../controllers/serviceTypeController");
const appConfig = require("../config/appConfig")
const auth = require('../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/service`;

    app.get(`${baseUrl}`, serviceController.getAllService);

    app.post(`${baseUrl}`, serviceController.createService);

    app.delete(`${baseUrl}/:id`, serviceController.deleteService);

    app.put(`${baseUrl}/:id`, serviceController.updateService);

    app.get(`${baseUrl}/:id`, serviceController.getSingleService);

}
