const express = require('express');
const productController = require("../controllers/productController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/product`;

    app.get(`${baseUrl}`, productController.getAllProduct);
    
    app.get(`${baseUrl}/active`, productController.getActiveProduct);

    app.post(`${baseUrl}`, productController.createProduct);

    app.delete(`${baseUrl}/:id`, productController.deleteProduct);

    app.put(`${baseUrl}/:id`, productController.updateProduct);

    app.get(`${baseUrl}/:id`, productController.getSingleProduct);

    app.get(`${baseUrl}/:brand_id/by_brand`, productController.getProductByBrand);


}
