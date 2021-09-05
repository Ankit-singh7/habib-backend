const express = require('express');
const userController = require("../controllers/userController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/user`;

    app.get(`${baseUrl}/e`, userController.getAllEmployee);

    app.get(`${baseUrl}/o`, userController.getAllOperator);

    app.get(`${baseUrl}/a`, userController.getAllAdmin);

    app.post(`${baseUrl}`, userController.createUser);

    app.post(`${baseUrl}/login`, userController.loginFunction)

    app.delete(`${baseUrl}/:id`, userController.deleteUser);

    app.put(`${baseUrl}/:id`, userController.editUser);

    app.get(`${baseUrl}/:id`, userController.getSingleUser);

    app.post(`${baseUrl}/reset-pass`, userController.resetPasswordFunction);

    app.post(`${baseUrl}/forgot-pass`, userController.forgotPasswordFunction);


}
