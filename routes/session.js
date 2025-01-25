const express = require('express');
const sessionController = require("../controllers/sessionController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/session`;

    app.get(`${baseUrl}/view/all`, sessionController.getAllSession);

    app.post(`${baseUrl}/create`, sessionController.createSession);

    app.get(`${baseUrl}/:id/delete`, sessionController.deleteSession);

    app.put(`${baseUrl}/:id/update`, sessionController.updateSession);

    app.get(`${baseUrl}/:id/getById`,sessionController.getSessionDetail);

    app.get(`${baseUrl}/findCurrentStatus`,sessionController.getCurrentSession)

    app.get(`${baseUrl}/:branch_id/deactivate`,sessionController.deactivateAllSession)
}
