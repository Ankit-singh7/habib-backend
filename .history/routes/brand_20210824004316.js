const express = require('express');
const brandController = require("../controllers/brandController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/brand`;

    app.get(`${baseUrl}`, brandController.getAllBrand);

    app.post(`${baseUrl}`, brandController.createBrand);

    app.delete(`${baseUrl}/:id`, brandController.deleteBrand);

    app.put(`${baseUrl}/:id`, brandController.updateBrand);

    app.get(`${baseUrl}/:id`, brandController.getSingleBrandDetail);

}
