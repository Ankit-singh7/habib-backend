const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const productModel = mongoose.model('product');
const brandModel = mongoose.model('brand');


let getAllProduct = (req,res) => {
    productModel.find()
    .lean()
    .select('-__v -_id')
    .exec((err,result) => {
        if(err) {
            console.log(err)
            logger.error(err.message, 'Product Controller: getAllProduct', 10)
            let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
            res.send(apiResponse)
        }  else if (check.isEmpty(result)) {
            logger.info('No Data Found', 'Product Controller: getAllProduct')
            let apiResponse = response.generate(true, 'No Data Found', 404, null)
            res.send(apiResponse)
        }  else {
            let apiResponse = response.generate(false, 'All Product Found', 200, result)
            res.send(apiResponse)
        }
    })
}



/* Get single category details */
/* params : Id
*/
let getSingleProduct = (req, res) => {
    productModel.findOne({ 'product_id': req.params.id })
        .select('-__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Product Controller: getSingleProductDetail', 10)
                let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'Branch Controller: getSingleProductDetail')
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Detail Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single category


let createProduct = (req,res) => {
     let brand_name;
    let findBrandName = () => {
        return new Promise((resolve,reject) => {
           brandModel.find({'brand_id': req.body.brand_id}).exec((err,result) => {
               if(err) {
                  reject('Brand is not found')
               } else {
                   brand_name = result[0].brand_name  
                   resolve('Brand found')             
                }
        })

    })
    }

    let saveProduct = () => {
        return new Promise((resolve,reject) => {
            
            let newCategory = new productModel({
                product_id: shortid.generate(),
                product_name: req.body.product_name,
                brand_id: req.body.brand_id,
                brand_name: brand_name,
                uom: req.body.uom,
                product_type: req.body.product_type,
                quantity: req.body.quantity,
                mostly_used: req.body.mostly_used,
                createdOn: time.now()
            })
        
            newCategory.save((err,result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Branch Controller: createProduct', 10)
                    let apiResponse = response.generate(true, 'Failed To create new Product', 500, null)
                    reject('failed to add product')
                } else {
                     resolve(result)
                }
            })

        })
    }

    findBrandName(req,res)
         .then(saveProduct)
         .then((resolve) => {
            let apiResponse = response.generate(false, 'Product added Successfully', 200, resolve)
            res.status(200)
            res.send(apiResponse)
           }).catch((err) => {
            console.log("errorhandler");
            console.log(err);
            res.status(err.status)
            res.send(err)
        })
}


let deleteProduct = (req,res) => {
    productModel.findOneAndRemove({'product_id':req.params.id})
    .exec((err,result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Product Controller: deleteProduct', 10)
            let apiResponse = response.generate(true, 'Failed To delete Product', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No Product Found', 'Product Controller: deleteProduct')
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Product Successfully deleted', 200, result)
            res.send(apiResponse)
        }
    })
}


let updateProduct = (req,res) => {
    let option = req.body
    productModel.updateOne({'product_id':req.params.id},option,{multi:true})
    .exec((err,result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Product Controller: branch', 10)
            let apiResponse = response.generate(true, 'Failed To update Product', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No Product Found', 'Product Controller: Product')
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Product Successfully updated', 200, result)
            res.send(apiResponse)
        }
    })
}




module.exports = {
    getAllProduct:getAllProduct,
    getSingleProduct:getSingleProduct,
    createProduct:createProduct,
    deleteProduct: deleteProduct,
    updateProduct: updateProduct
}