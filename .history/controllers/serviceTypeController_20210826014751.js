const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const serviceTypeModel = mongoose.model('serviceType');


let getAllService = (req,res) => {
    serviceTypeModel.find()
    .lean()
    .select('-__v -_id')
    .exec((err,result) => {
        if(err) {
            console.log(err)
            logger.error(err.message, 'Branch Controller: getAllBranch', 10)
            let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
            res.send(apiResponse)
        }  else if (check.isEmpty(result)) {
            logger.info('No Data Found', 'Branch Controller: getAllBranch')
            let apiResponse = response.generate(true, 'No Data Found', 404, null)
            res.send(apiResponse)
        }  else {
            let apiResponse = response.generate(false, 'All Branch Found', 200, result)
            res.send(apiResponse)
        }
    })
}



/* Get single category details */
/* params : Id
*/
let getSingleService = (req, res) => {
    serviceTypeModel.findOne({ 'service_type_id': req.params.id })
        .select('-__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Branch Controller: getSingleBranchDetail', 10)
                let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'Branch Controller: getSingleBranchDetail')
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Detail Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single category


let createService = (req,res) => {
    console.log(req.body)
    let newCategory = new serviceTypeModel({
        service_type_id: shortid.generate(),
        name: req.body.name,
        createdOn: time.now()
    })

    newCategory.save((err,result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Branch Controller: createBranch', 10)
            let apiResponse = response.generate(true, 'Failed To create new Branch', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully created', 200, result)
            res.send(apiResponse)
        }
    })
}


let deleteService = (req,res) => {
    serviceTypeModel.findOneAndRemove({'service_type_id':req.params.id})
    .exec((err,result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Branch Controller: deleteBranch', 10)
            let apiResponse = response.generate(true, 'Failed To delete Branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No Branch Found', 'Branch Controller: deleteBranch')
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully deleted', 200, result)
            res.send(apiResponse)
        }
    })
}


let updateService = (req,res) => {
    let option = req.body
    serviceTypeModel.updateOne({'service_type_id':req.params.id},option,{multi:true})
    .exec((err,result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Branch Controller: branch', 10)
            let apiResponse = response.generate(true, 'Failed To update branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No Branch Found', 'Branch Controller: branch')
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully updated', 200, result)
            res.send(apiResponse)
        }
    })
}




module.exports = {
    getAllService:getAllService,
    getSingleService:getSingleService,
    createService:createService,
    deleteService: deleteService,
    updateService: updateService
}