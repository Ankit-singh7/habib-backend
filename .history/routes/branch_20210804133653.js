const express = require('express');
const branchController = require("../controllers/branchController");
const appConfig = require("../config/appConfig")
const auth = require('./../middlewares/auth')


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/branch`;

    app.get(`${baseUrl}/view/all`, branchController.getAllBranch);

    app.post(`${baseUrl}/create`, branchController.createBranch);

    app.get(`${baseUrl}/:id/delete`, branchController.deleteBranch);

    app.put(`${baseUrl}/:id/update`, branchController.updateBranch);

    app.get(`${baseUrl}/:id/getById`, branchController.getSingleBranchDetail);

}
