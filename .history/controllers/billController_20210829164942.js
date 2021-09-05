const mongoose = require('mongoose');
const shortid = require('shortid');
const customId = require('custom-id');

const time = require('./../libs/timeLib');
const moment = require('moment')//npm install moment --save
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const billModel = mongoose.model('bill')
const totalModel = mongoose.model('total')
const sessionModel = mongoose.model('session');
const productSalesReportModel = mongoose.model('productSalesReport')
const serviceSalesReportModel = mongoose.model('serviceSalesReport')

let getAllBill = (req, res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const filters = req.query;
    delete filters.current_page
    delete filters.per_page
    delete filters.startDate
    delete filters.endDate
    console.log('filter', filters)

    if(startDate && endDate) {
         console.log('here')
         console.log('billStart',startDate)
         console.log('billEnd', endDate)
        billModel.find({'date':{ $gte:startDate, $lte:endDate}}).sort({ _id: -1 })
            .lean()
            .exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Bill Controller: getAllBill', 10)
                    let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found', 'Bill Controller: getAllBill')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        console.log('here', user)
                        let isValid = true;
                        for (key in filters) {
                            console.log(filters[key])
                            console.log('here', user[key])
                            if (key === 'createdOn') {
    
                                isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                            } else {
                                isValid = isValid && user[key] == filters[key];
                            }
    
                        }
                        return isValid;
                    });
                    const startIndex = (page - 1) * limit;
                    const endIndex = page * limit
                    let total = result.length;
                    let billList = filteredUsers.slice(startIndex, endIndex)
                    let newResult = { total: total, result: billList }
                    let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                    res.send(apiResponse)
                }
            })
    } else {
      console.log('no date')
        billModel.find().sort({ _id: -1 })
            .lean()
            .exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Bill Controller: getAllBill', 10)
                    let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found', 'Bill Controller: getAllBill')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        console.log('here', user)
                        let isValid = true;
                        for (key in filters) {
                            console.log(filters[key])
                            console.log('here', user[key])
                            if (key === 'createdOn') {
    
                                isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                            } else {
                                isValid = isValid && user[key] == filters[key];
                            }
    
                        }
                        return isValid;
                    });
                    const startIndex = (page - 1) * limit;
                    const endIndex = page * limit
                    let total = result.length;
                    let billList = filteredUsers.slice(startIndex, endIndex)
                    let newResult = { total: total, result: billList }
                    let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                    res.send(apiResponse)
                }
            })
    }

}



/* Get single category details */
/* params : Id
*/
let getBillDetail = (req, res) => {
    billModel.findOne({ 'bill_id': req.params.id })
        .select('-__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Bill Controller: getSingleBillDetail', 10)
                let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'BillCategory Controller: getSingleBillDetail')
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Detail Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single category


let createBill = (req, res) => {
    let newBill = new billModel({
        bill_id: req.body.bill_id,
        user_name: req.body.user_name,
        user_id: req.body.user_id,
        customer_name: req.body.customer_name,
        customer_phone: req.body.customer_phone,
        customer_alternative_phone: req.body.customer_alternative_phone,
        customer_address: req.body.customer_address,
        payment_mode: req.body.payment_mode,
        employee_id: req.body.employee_id,
        employee_name: req.body.employee_name,
        total_price: req.body.total_price,
        products: req.body.products,
        services: req.body.services,
        branch_id: req.body.branch_id,
        branch_name: req.body.branch_name,
        date: time.getNormalTime(),
        createdOn: time.now()
    })



    newBill.save((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'Bill Controller: createBill', 10)
            let apiResponse = response.generate(true, 'Failed To create new Bill', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Bill Successfully created', 200, result)
            if(req.body.payment_mode === 'Cash') {
                console.log('mode is cash')
                sessionModel.findOne({'session_status': 'true','branch_id': req.body.branch_id})
                .select('-__v -_id')
                .lean()
                .exec((err, result) => {
                    if (err) {
                         console.log(err)
                         logger.error(err.message, 'Session Controller: getSingleSessionDetail', 10)
                         let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                         console.log(apiResponse);
                    } else if (check.isEmpty(result)) {
                         logger.info('No User Found', 'Session Controller: getSingleSessionDetail')
                         let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                         console.log(apiResponse);
                    } else {
                       console.log(result)
                       let option = {
                           drawer_balance: Number(result.drawer_balance) + Number(req.body.total_price)
                       }
                       sessionModel.updateOne({session_id: result.session_id},option,{multi:true}).exec((err,result) => {
                           if(err){
                               console.log(err)
                           } else {
                               console.log(result)
                           }
                       })
                    
                    }
                 })
            }
            for(let item of req.body.products) {
                productSalesReportModel.findOne({'date': time.getNormalTime(),'product_id': item.product_id,'branch': req.body.branch}).exec((err,result) => {
                   if(err){
                       console.log(err)
                   } else if (check.isEmpty(result)) {
                       let sales = new productSalesReportModel({
                        sales_report_id: shortid.generate(),
                        date: time.getNormalTime(),
                        product_name: item.product_name,
                        product_id: item.product_id,
                        branch_id: req.body.branch_id,
                        branch_name: req.body.branch_name,
                        employee_id: req.body.employee_id,
                        employee_name: req.body.employee_name,
                        quantity: Number(item.quantity)
                       })
                       sales.save((err,result) => {
                           if(err) {
                               console.log(err)
                           } else {
                               console.log(result)
                           }
                       })
                   } else {
                       let obj = {
                          quantity: Number(result.quantity) + Number(item.quantity) 
                       }
                       productSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                           if(err) {
                               console.log(err)
                           } else {
                               console.log(result)
                           }
                       })
                   }
               })
            }
            for(let item of req.body.services) {
                serviceSalesReportModel.findOne({'date': time.getNormalTime(),'service_id': item.product_id,'branch': req.body.branch}).exec((err,result) => {
                   if(err){
                       console.log(err)
                   } else if (check.isEmpty(result)) {
                       let sales = new serviceSalesReportModel({
                        sales_report_id: shortid.generate(),
                        date: time.getNormalTime(),
                        service_name: item.product_name,
                        service_id: item.product_id,
                        branch_id: req.body.branch_id,
                        branch_name: req.body.branch_name,
                        employee_id: req.body.employee_id,
                        employee_name: req.body.employee_name,
                        quantity: Number(item.quantity)
                       })
                       sales.save((err,result) => {
                           if(err) {
                               console.log(err)
                           } else {
                               console.log(result)
                           }
                       })
                   } else {
                       let obj = {
                          quantity: Number(result.quantity) + Number(item.quantity) 
                       }
                       serviceSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                           if(err) {
                               console.log(err)
                           } else {
                               console.log(result)
                           }
                       })
                   }
               })
            }
            totalModel.find({ 'date': time.getNormalTime(),'payment_mode': req.body.payment_mode, 'bill_by': req.body.user_name, 'branch_id': req.body.branch_id})
                .exec((err, totalS) => {
                    if (err) {
                        console.log(err)
                    } else if (check.isEmpty(totalS)) {
                        console.log('date here')
                        let total = new totalModel({
                            total_id: shortid.generate(),
                            total: req.body.total_price,
                            payment_mode: req.body.payment_mode,
                            branch_id: req.body.branch_id,
                            employee_id: req.body.employee_id,
                            branch_name: req.body.branch_name,
                            bill_by: req.body.user_name,
                            date: time.getNormalTime(),
                            createdOn: time.now()
                        })

                        total.save((err, result) => {
                            if (err) {
                                console.log(err)
                            } else {
                                let apiResponse = response.generate(false, 'Bill Created', 200, null)
                                res.send(apiResponse)
                            }
                        })
                    } else {
                        let oldTotal = totalS[0].total
                        let newTotal = Number(oldTotal) + Number(req.body.total_price)
                        const option = {
                            total: newTotal
                        }
                        totalModel.updateOne({ 'total_id': totalS[0].total_id }, option, { multi: true })
                            .exec((err, result) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    let apiResponse = response.generate(false, 'Bill Created', 200, null)
                                    res.send(apiResponse)
                                }

                            })
                         }
                     })
                  }
               })

    // for changing total sale






}


let getTotalSales = (req, res) => {
    const filters = req.query;
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    delete filters.startDate
    delete filters.endDate
    console.log('filter', filters)
    if(startDate && endDate) {

        totalModel.find({'date':{ $gte:startDate, $lte:endDate}})
            .lean()
            .select('-__v -_id')
            .exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Bill Controller: getTotalSales', 10)
                    let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found', 'Bill Controller: getTotalSales')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        console.log('here', user)
                        let isValid = true;
                        for (key in filters) {
                            console.log(filters[key])
                            console.log('here', user[key])
                            if (key === 'createdOn') {
    
                                isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                            } else {
                                isValid = isValid && user[key] == filters[key];
                            }
    
                        }
                        return isValid;
                    });
                    let apiResponse = response.generate(false, 'All Sales Found', 200, filteredUsers)
                    res.send(apiResponse)
                }
            })
    } else {
       
        totalModel.find()
            .lean()
            .select('-__v -_id')
            .exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Bill Controller: getTotalSales', 10)
                    let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found','Bill Controller: getTotalSales')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        console.log('here', user)
                        let isValid = true;
                        for (key in filters) {
                            console.log(filters[key])
                            console.log('here', user[key])
                            if (key === 'createdOn') {
    
                                isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                            } else {
                                isValid = isValid && user[key] == filters[key];
                            }
    
                        }
                        return isValid;
                    });
                    let apiResponse = response.generate(false, 'All Sales Found', 200, filteredUsers)
                    res.send(apiResponse)
                }
            }) 
    }
}

let deleteBill = (req, res) => {
    let bill;
    let updateTotal = () => {
        return new Promise((resolve,reject) => {

            billModel.findOne({ 'bill_id': req.params.id }).exec((billerr,billresult) => {
                if(billerr){
                    console.log(billerr)
                    reject(billerr)
                } else {
                    console.log(billresult)
                    bill = billresult
                    console.log(moment(billresult.createdOn).format('DD-MM-YYYY'))
                    totalModel.findOne({ 'date': moment(billresult.createdOn).format('DD-MM-YYYY'),'payment_mode': billresult.payment_mode, 'bill_by': billresult.user_name }).exec((totalerr,totalResult) => {
                       if(totalerr) {
                           console.log(totalerr)
                           reject(totalerr)
                       } else {
                           console.log('in-total')
                           console.log(totalResult)
                           let tempObj = totalResult;
                           tempObj.total = Number(tempObj.total)-Number(billresult.total_price)
                           totalModel.updateOne({'total_id': tempObj.total_id },tempObj,{multi:true}).exec((tUpdateErr,tUpdateResult) => {
                              if(tUpdateErr) {
                                  console.log(tUpdateErr)
                                  reject(tUpdateErr)
                              } else {
                                  console.log(tUpdateResult)
                                  console.log('total resolved')
                                  resolve(tUpdateResult)
                              }
                           })
                       }
                    
                   
                    })
                }
            })
        })
    }

let updateProductSalesReport = () => {
    return new Promise((resolve,reject) => {
        for(let item of bill.products) {
            productSalesReportModel.findOne({'date': moment(bill.createdOn).format('DD-MM-YYYY'),'product_id': item.product_id,'branch':bill.branch}).exec((err,result) => {
                if(err){
                    console.log(err)
                } else if (check.isEmpty(result)) {
                     console.log('no sales report')
                } else {
                    console.log(result)
                    let obj = {
                       quantity: Number(result.quantity) - Number(item.quantity) 
                    }
                    productSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                        if(err) {
                            console.log(err)
                        } else {
                            console.log(result)
                        }
                    })
                }
            })
         }
         resolve('sales updated')
    })
}

let updateServiceSalesReport = () => {
    return new Promise((resolve,reject) => {
        for(let item of bill.products) {
            serviceSalesReportModel.findOne({'date': moment(bill.createdOn).format('DD-MM-YYYY'),'service_id': item.service_id,'branch':bill.branch}).exec((err,result) => {
                if(err){
                    console.log(err)
                } else if (check.isEmpty(result)) {
                     console.log('no sales report')
                } else {
                    console.log(result)
                    let obj = {
                       quantity: Number(result.quantity) - Number(item.quantity) 
                    }
                    serviceSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                        if(err) {
                            console.log(err)
                        } else {
                            console.log(result)
                        }
                    })
                }
            })
         }
         resolve('sales updated')
    })
}

let updateDrawerBalance = () => {
        return new Promise((resolve,reject) => {
            if(bill.payment_mode === 'Cash') {

                sessionModel.findOne({'session_status': 'true','branch':bill.branch})
                   .select('-__v -_id')
                   .lean()
                   .exec((err, sResult) => {
                     if (err) {
                        console.log(err)
                     } else if (check.isEmpty(sResult)) {
                        console.log('no active session')
                     } else {

                         let newObj = {
                                drawer_balance: Number(sResult.drawer_balance) - Number(bill.total_price),
                                cash_income: Number(sResult.cash_income) - Number(bill.total_price)
                             }

                             sessionModel.updateOne({'session_id': sResult.session_id },newObj,{multi:true}).exec((updateErr, updateResult) => {
                                    if(updateErr){
                                      console.log(updateErr)
                                    } else {
                                       resolve(updateResult)
                                    }
                             })

                    }
                  })
            } else {
                resolve('payment_mode is not Cash')
            }
      })
    }

    // let updateIGReport_and_stock = () => {
    //     return new Promise((resolve,reject) => {
    //         ingredientReportModel.find({'date': moment(bill.createdOn).format('DD-MM-YYYY')}).exec((rErr,report) => {
    //             if(rErr) {
    //                 console.log(err);
    //             } else if(check.isEmpty(report)) {
    //                 console.log('No data found')
    //             } else {
    //                 for(let item of bill.products) {
    //                     foodIngredientModel.find({ 'sub_category_id': item.food_id }, (Ierr, ingredient) => {
    //                         if(Ierr) {
    //                             console.log(Ierr)
    //                         } else if(check.isEmpty(ingredient)) {
    //                             console.log('No ingredient Found for this food')
    //                         } else {
    //                             console.log('Ingredients Found')
    //                             console.log(ingredient)
    //                             for(let i of ingredient) {
    //                                 for (let ri of report) {
    //                                     if (ri.ingredient_id === i.ingredient_id) {
    //                                         ri.quantity_by_order = String(Number(ri.quantity_by_order) - (Number(item.quantity) * Number(i.quantity)))
    //                                         let data = {
    //                                             quantity_by_order: ri.quantity_by_order
    //                                         }
    //                                         ingredientReportModel.updateOne({ 'date': time.getNormalTime(), 'ingredient_id': ri.ingredient_id }, data, { multi: true }).exec((err, response) => {
    //                                             if (err) {
    //                                                 console.log(err)
    //                                             } else {
    //                                                 console.log(response)
    //                                                 console.log('IG Report Successfully updated')
    //                                                 // Updating Stocks
    //                                                 ingredientModel.find({ ingredient_id: ri.ingredient_id }).exec((err, result) => {
    //                                                     if (err) {
    //                                                         console.log(err)
    //                                                     } else {
    //                                                         let quantity2 = Number(item.quantity) * Number(i.quantity)
    //                                                         let stock = result[0].stock
    //                                                         const option = {
    //                                                             stock: stock + Number(quantity2)
    //                                                         }
    //                                                         ingredientModel.updateOne({ ingredient_id: ri.ingredient_id }, option, { multi: true }).exec((err, result) => {
    //                                                             if (err) {
    //                                                                 console.log(err)
    //                                                             } else {
    //                                                                 console.log('stock updated successfully')
    //                                                                 console.log(result)
    //                                                             }
    //                                                         })
    //                                                     }
    //                                                 })
    //                                             }
    //                                         })
                                  
    //                                     }
    //                                 }
    //                             }

    //                         }
    //                     })
    //                     resolve('report and stock updated')
    //                 }
    //             }
    //         })
    //     })
    // }


    let deleteBill = () => {
        return new Promise((resolve,reject) => {
            billModel.findOneAndRemove({ 'bill_id': req.params.id })
            .exec((err, result) => {
                if (err) {
                    console.log(err)
                    logger.error(err.message, 'Bill Controller: deleteBill', 10)
                    let apiResponse = response.generate(true, 'Failed To delete Bill', 500, null)
                    reject('Failed To delete Bill')
                } else if (check.isEmpty(result)) {
                    logger.info('No Bill Found', 'Bill Controller: deleteBill')
                    let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                      reject('No Detail Found')
                } else {
                    let apiResponse = response.generate(false, 'Bill Successfully deleted', 200, result)
                    res.send(apiResponse)
                    resolve('Bill Successfully deleted')
                }
            })
        })
    }

    updateTotal(req,res)
       .then(updateProductSalesReport)
       .then(updateServiceSalesReport)
       .then(updateDrawerBalance)
       .then(deleteBill)
       .then((resolve) => {
        let apiResponse = response.generate(false, 'Bill Deleted Successfully', 200, resolve)
        res.status(200)
        res.send(apiResponse)
       }).catch((err) => {
        console.log("errorhandler");
        console.log(err);
        res.status(err.status)
        res.send(err)
    })
 


}


let changeStatus = (req, res) => {
    let option = req.body
    if (req.body.status === 'in-cook') {
        option = {
            status: 'in-cook',
            incookAt: time.now()
        }
    } else if (req.body.status === 'cookedAt') {
        option = {
            status: 'cookedAt',
            cookedAt: time.now()
        }
    } else if (req.body.status === 'dispatchedAt') {
        option = {
            status: 'dispatchedAt',
            dispatchedAt: time.now()
        }
    }

    billModel.updateOne({ 'bill_id': req.params.id }, option, { multi: true })
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Bill Controller: updateSubCatergory', 10)
                let apiResponse = response.generate(true, 'Failed To delete bill', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No Bill Found', 'Bill Controller: updateBIll')
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Bill Successfully updated', 200, result)
                res.send(apiResponse)
            }
        })
}



let updateBill = (req, res) => {
    let option = req.body
    billModel.updateOne({ 'bill_id': req.params.id }, option, { multi: true })
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Bill Controller: updateSubCatergory', 10)
                let apiResponse = response.generate(true, 'Failed To delete bill', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No Bill Found', 'Bill Controller: updateBIll')
                let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Bill Successfully updated', 200, result)
                res.send(apiResponse)
            }
        })
}




module.exports = {
    getAllBill: getAllBill,
    getBillDetail: getBillDetail,
    createBill: createBill,
    deleteBill: deleteBill,
    updateBill: updateBill,
    changeStatus: changeStatus,
    getTotalSales: getTotalSales
}