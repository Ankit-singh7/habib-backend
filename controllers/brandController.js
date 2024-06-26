const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const brandModel = mongoose.model('brand');


let getAllBrand = (req,res) => {
    const filters = req.query;
    brandModel.find()
    .lean()
    .select('-__v -_id')
    .exec((err,result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
            res.send(apiResponse)
        }  else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Data Found', 404, null)
            res.send(apiResponse)
        }  else {
            const filteredUsers = result.filter(user => {
                let isValid = true;
                for (key in filters) {           
                        isValid = isValid && user[key] == filters[key];                 
                }
                return isValid;
            });
            let sortResult = filteredUsers.sort(function(a,b) {
                return a.name.localeCompare(b.name); //using String.prototype.localCompare()
            })
            let apiResponse = response.generate(false, 'All Brand Found', 200, sortResult)
            res.send(apiResponse)
        }
    })
}



/* Get single category details */
/* params : Id
*/
let getSingleBrandDetail = (req, res) => {
    brandModel.findOne({ 'brand_id': req.params.id })
        .select('-__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Detail Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single category


let createBrand = (req,res) => {
    let newCategory = new brandModel({
        brand_id: shortid.generate(),
        name: req.body.name,
        createdOn: time.now()
    })

    newCategory.save((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To create new Brand', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Brand Successfully created', 200, result)
            res.send(apiResponse)
        }
    })
}


let deleteBrand = (req,res) => {
    brandModel.findOneAndRemove({'brand_id':req.params.id})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To delete Branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Brand Successfully deleted', 200, result)
            res.send(apiResponse)
        }
    })
}


let updateBrand = (req,res) => {
    let option = req.body
    brandModel.updateOne({'brand_id':req.params.id},option,{multi:true})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To update branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Brand Successfully updated', 200, result)
            res.send(apiResponse)
        }
    })
}




module.exports = {
    getAllBrand:getAllBrand,
    getSingleBrandDetail:getSingleBrandDetail,
    createBrand:createBrand,
    deleteBrand: deleteBrand,
    updateBrand:updateBrand
}