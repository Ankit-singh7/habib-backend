const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const serviceModel = mongoose.model('service');
const serviceTypeModel = mongoose.model('serviceType');


let getAllService = (req,res) => {
    serviceModel.find()
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
    serviceModel.findOne({ 'service_id': req.params.id })
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


let getServiceByCategory = (req,res) => {
    serviceModel.find({service_type_id: req.params.service_type_id})
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
}

let getActiveService = (req,res) => {
    serviceModel.find({mostly_used: 'yes'})
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
}


let createService = (req,res) => {
    console.log(req.body)

    let service_type_name;

    let findServiceType = () => {
        return new Promise((resolve,reject) => {
            serviceTypeModel.find({'service_type_id': req.body.service_type_id}).exec((err,result) => {
                if(err) {
                   console.log(err)
                   reject('service type not found')
                } else {
                    service_type_name = result[0].name
                    resolve('found type')
                }
            })
        })
    }

    let saveService = () => {
        return new Promise((resolve,reject) => {

            let newCategory = new serviceModel({
                service_id: shortid.generate(),
                name: req.body.name,
                service_type_id: req.body.service_type_id,
                mostly_used: req.body.mostly_used,
                service_type_name: service_type_name,
                createdOn: time.now()
            })
        
            newCategory.save((err,result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Branch Controller: createBranch', 10)
                    let apiResponse = response.generate(true, 'Failed To create new Branch', 500, null)
                     reject('failed to create service')
                } else {
                    let apiResponse = response.generate(false, 'Service Successfully created', 200, result)
                    resolve(result)
                }
            })
        })
    }

    findServiceType(req,res)
    .then(saveService)
    .then((resolve) => {
        let apiResponse = response.generate(false, 'Service added Successfully', 200, resolve)
        res.status(200)
        res.send(apiResponse)
       }).catch((err) => {
        console.log("errorhandler");
        console.log(err);
        res.status(err.status)
        res.send(err)
    })

}


let deleteService = (req,res) => {
    serviceModel.findOneAndRemove({'service_id':req.params.id})
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
    serviceModel.updateOne({'service_id':req.params.id},option,{multi:true})
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
    updateService: updateService,
    getServiceByCategory: getServiceByCategory,
    getActiveService: getActiveService
}