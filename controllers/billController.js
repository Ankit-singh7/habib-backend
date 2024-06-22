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
const appointmentModel = mongoose.model('appointment');
const employeeSalesModel = mongoose.model('employeeSales');

let getAllBill = (req, res) => {
    let total_sales = 0
    let total_bill_count = 0
    const page = req.query.current_page
    const limit = req.query.per_page
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const filters = req.query;
    delete filters.current_page
    delete filters.per_page
    delete filters.startDate
    delete filters.endDate

    if(!req.query.employee_id) {
        
        if(startDate && endDate) {
            let formatted_sd = moment(startDate,'DD-MM-YYYY')
            let formatted_ed = moment(endDate,'DD-MM-YYYY').add(1,'day')
            billModel.find({'createdOn':{ $gte:formatted_sd.format(), $lte:formatted_ed.format()}}).sort({ _id: -1 })
                .lean()
                .exec((err, result) => {
                    if (err) {
                        let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                        res.send(apiResponse)
                    } else if (check.isEmpty(result)) {
                        let apiResponse = response.generate(true, 'No Data Found', 404, null)
                        res.send(apiResponse)
                    } else {
                        const filteredUsers = result.filter(user => {
                            let isValid = true;
                            for (key in filters) {
                                if (key === 'createdOn') {
        
                                    // isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                                } else {
                                    isValid = isValid && user[key] == filters[key];
                                }
        
                            }
                            return isValid;
                        });
                        if(filteredUsers.length>0) {
                            for(let item of filteredUsers) {
                                total_sales = total_sales + item.total_price
                            }
    
                          } else {
                                total_sales = 0;
                          }
                        total_bill_count = filteredUsers.length
                        const startIndex = (page - 1) * limit;
                        const endIndex = page * limit
                        let total = `${total_sales}-${total_bill_count}`;
                        let billList = filteredUsers.slice(startIndex, endIndex)
                        let newResult = { total: total, result: billList }
                        let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                        res.send(apiResponse)
                    }
                })
        } else {
            billModel.find().sort({ _id: -1 })
                .lean()
                .exec((err, result) => {
                    if (err) {
                        let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                        res.send(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('No Data Found', 'Bill Controller: getAllBill')
                        let apiResponse = response.generate(true, 'No Data Found', 404, null)
                        res.send(apiResponse)
                    } else {
                        const filteredUsers = result.filter(user => {
                            let isValid = true;
                            for (key in filters) {
                                if (key === 'createdOn') {
        
                                    isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                                } else {
                                    isValid = isValid && user[key] == filters[key];
                                }
        
                            }
                            return isValid;
                        });
                        if(filteredUsers.length>0) {
                            for(let item of filteredUsers) {
                                total_sales = total_sales + item.total_price
                            }
    
                          } else {
                                total_sales = 0;
                          }
                        total_bill_count = filteredUsers.length
                        let total = `${total_sales}-${total_bill_count}`;
                        const startIndex = (page - 1) * limit;
                        const endIndex = page * limit
                        let billList = filteredUsers.slice(startIndex, endIndex)
                        let newResult = { total: total, result: billList }
                        let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                        res.send(apiResponse)
                    }
                })
        }
    } else {
        getEmployeeSales(req,res,startDate,endDate)
    }


}



let getAllCustomer = (req, res) => {
    const name = new RegExp(req.query.customer_name,'i')        
            billModel.find({'customer_name':name}).sort({ _id: -1 })
                .lean()
                .exec((err, result) => {
                    if (err) {
                        let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                        res.send(apiResponse)
                    } else if (check.isEmpty(result)) {
                        let apiResponse = response.generate(true, 'No Data Found', 404, null)
                        res.send(apiResponse)
                    } else {
                        let total_sales = 0
                        let total_bill_count = 0
                        if(result.length>0) {
                            for(let item of result) {
                                total_sales = total_sales + item.total_price
                            }
    
                          } else {
                                total_sales = 0;
                          }
                         total_bill_count = result.length
                         let total = `${total_sales}-${total_bill_count}`;
                         let newResult = { total: total, result: result }
                        let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                        res.send(apiResponse)
                    }
                })
}

let getAllCustomerNumber = (req, res) => {
    const number = `/${req.query.customer_phone}/`      
            billModel.find({'customer_phone':number}).sort({ _id: -1 })
                .lean()
                .exec((err, result) => {
                    if (err) {
                        let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                        res.send(apiResponse)
                    } else if (check.isEmpty(result)) {
                        let apiResponse = response.generate(true, 'No Data Found', 404, null)
                        res.send(apiResponse)
                    } else {
                        let apiResponse = response.generate(false, 'All Bills Found', 200, result)
                        res.send(apiResponse)
                    }
                })
}





 function getEmployeeSales(req, res,sd,ed){
    let employeeSalesList = [];
    const page = req.query.current_page
    const limit = req.query.per_page
    const startDate = sd?sd:''
    const endDate = ed?ed:''
    const employee_id = req.query.employee_id
    const filters = req.query;
    delete filters.current_page
    delete filters.employee_id
    delete filters.per_page

    if(startDate && endDate) {
        let formatted_sd = moment(startDate,'DD-MM-YYYY')
        let formatted_ed = moment(endDate,'DD-MM-YYYY').add(1,'day')
        billModel.find({'createdOn':{ $gte:formatted_sd.format(), $lte:formatted_ed.format()}}).sort({ _id: -1 })
            .lean()
            .exec((err, result) => {
                if (err) {
                    let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found', 'Bill Controller: getAllBill')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        let isValid = true;
                        for (key in filters) {
                            if (key === 'createdOn') {
    
                                isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                            } else {
                                isValid = isValid && user[key] == filters[key];
                            }
    
                        }
                        return isValid;
                    });
                    let total_sales = 0;
                    let total_bill_count = result.length;
                    let billList = filteredUsers
                    for(let item of billList) {
                        let products = [];
                        let services = [];
                        let productsArr = JSON.parse(JSON.stringify(item.products));
                        let servicesArr = JSON.parse(JSON.stringify(item.services));

                        for(let product of productsArr) {
                            if(product.employee_id === employee_id) {
                                total_sales = total_sales + product.total
                                 products.push(product)
                            }
                        }
                        for(let service of servicesArr) {
                            if(service.employee_id === employee_id) {
                                total_sales = total_sales + service.total
                                services.push(service)
                            }
                        }

                        if(products.length > 0 || services.length > 0) {
       
                            delete item.products
                            delete item.services
                            item.employee_id = employee_id
                            item.products = products
                            item.services = services
                            employeeSalesList.push(item)
                        }
                        
                    }

                    let total_r  = `${total_sales}-${total_bill_count}`;

                    let newResult = { total: total_r, result: employeeSalesList }
                    let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
                    res.send(apiResponse)
                }
            })
    } else {
        billModel.find().sort({ _id: -1 })
            .lean()
            .exec((err, result) => {
                if (err) {
                    let apiResponse = response.generate(true, 'Failed To Find Food Sub-Category Details', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        let isValid = true;
                        for (key in filters) {
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
                
          // const startIndex = (page - 1) * limit;
                    // const endIndex = page * limit
                    let total_sales = 0;
                    let total_bill_count = result.length;
                    // let billList = filteredUsers.slice(startIndex, endIndex)
                    let billList = filteredUsers
                    for(let item of billList) {
                        let products = [];
                        let services = [];
                        let productsArr = JSON.parse(JSON.stringify(item.products));
                        let servicesArr = JSON.parse(JSON.stringify(item.services));
                        for(let product of productsArr) {
                            if(product.employee_id === employee_id) {
                                total_sales = total_sales + product.total
                                 products.push(product)
                            }
                        }
                        for(let service of servicesArr) {
                            if(service.employee_id === employee_id) {
                                total_sales = total_sales + service.total
                                services.push(service)
                            }
                        }
                   
                        if(products.length>0 || services.length > 0) {

                            delete item.products
                            delete item.services
                            item.employee_id = employee_id
                            item.products = products
                            item.services = services
                            employeeSalesList.push(item)
                        }
                        
                    }

                    let total_r = `${total_sales}-${total_bill_count}`;
                    
                    let newResult = { total: total_r, result: employeeSalesList }
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


let createBill = (req, res) => {
    let newBill;
    if(req.body.dual_payment_mode === false  || req.body.dual_payment_mode === 'false' ) { 

        newBill = new billModel({
        bill_id: req.body.bill_id,
        token_id: req.body.token_id,
        user_name: req.body.user_name,
        user_id: req.body.user_id,
        customer_name: req.body.customer_name,
        customer_phone: req.body.customer_phone,
        customer_alternative_phone: req.body.customer_alternative_phone,
        customer_address: req.body.customer_address,
        payment_mode: req.body.payment_mode_1,
        dual_payment_mode: req.body.dual_payment_mode,
        total_price: req.body.total_price,
        booking_amount: req.body.booking_amount,
        amount_to_be_paid: req.body.amount_to_be_paid,
        products: req.body.products,
        services: req.body.services,
        branch_id: req.body.branch_id,
        branch_name: req.body.branch_name,
        date: time.getNormalTime(),
        createdOn: time.now()
    })
    } else if(req.body.dual_payment_mode === true  || req.body.dual_payment_mode === 'true' ){ 
        newBill = new billModel({
            bill_id: req.body.bill_id,
            token_id: req.body.token_id,
            user_name: req.body.user_name,
            user_id: req.body.user_id,
            customer_name: req.body.customer_name,
            customer_phone: req.body.customer_phone,
            customer_alternative_phone: req.body.customer_alternative_phone,
            customer_address: req.body.customer_address,
            payment_mode: req.body.payment_mode_1,
            payment_mode_2: req.body.payment_mode_2,
            split_amount_1: req.body.split_amount_1,
            split_amount_2: req.body.split_amount_2,
            dual_payment_mode: req.body.dual_payment_mode,
            total_price: req.body.total_price,
            booking_amount: req.body.booking_amount,
            amount_to_be_paid: req.body.amount_to_be_paid,
            products: req.body.products,
            services: req.body.services,
            branch_id: req.body.branch_id,
            branch_name: req.body.branch_name,
            date: time.getNormalTime(),
            createdOn: time.now()
        })
    }



    newBill.save((err, result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To create new Bill', 500, null)
            res.send(apiResponse)
        } else {

            if(req.body.dual_payment_mode === false  || req.body.dual_payment_mode === 'false' ) {

                if(req.body.payment_mode_1 === 'Cash') {
                    sessionModel.findOne({'session_status': 'true'})
                    .select('-__v -_id')
                    .lean()
                    .exec((err, result) => {
                        if (err) {
                             let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                        } else if (check.isEmpty(result)) {
                             let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                        } else {
                           let option = {
                               drawer_balance: Number(result.drawer_balance) + Number(req.body.total_price)
                           }
                           sessionModel.updateOne({session_id: result.session_id},option,{multi:true}).exec((err,result) => {
                           })
                        
                        }
                     })
                }
            } else if(req.body.dual_payment_mode === true  || req.body.dual_payment_mode === 'true' ){
                    if(req.body.payment_mode_1 === 'Cash' || req.body.payment_mode_2 === 'Cash') {

                        sessionModel.findOne({'session_status': 'true'})
                        .select('-__v -_id')
                        .lean()
                        .exec((err, result) => {
                            if (err) {
                                 let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                            } else if (check.isEmpty(result)) {
                                 let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                            } else {
                               let option;
                               if(req.body.payment_mode_1 === 'Cash' && req.body.payment_mode_2 !== 'Cash') {
                                   option = {
                                       drawer_balance: Number(result.drawer_balance) + Number(req.body.split_amount_1)
                                   }
                                   
                               } else if(req.body.payment_mode_1 !== 'Cash' && req.body.payment_mode_2 === 'Cash') {
                                option = {
                                    drawer_balance: Number(result.drawer_balance) + Number(req.body.split_amount_2)
                                }
                               } else if(req.body.payment_mode_1 === 'Cash' && req.body.payment_mode_2 === 'Cash') {
                                option = {
                                    drawer_balance: Number(result.drawer_balance) + Number(req.body.total_price)
                                }
                               }
                               sessionModel.updateOne({session_id: result.session_id},option,{multi:true}).exec((err,result) => {
                               })
                            
                            }
                         })
                    }
                
            }

            if(req.body.appointment_id){
                appointmentModel.deleteMany({'appointment_id': req.body.appointment_id}).exec((err,result) => {
                })
            }
            let apiResponse = response.generate(false, 'Bill Successfully created', 200, result)
            if(req.body.payment_mode === 'Cash') {
                sessionModel.findOne({'session_status': 'true','branch_id': req.body.branch_id})
                .select('-__v -_id')
                .lean()
                .exec((err, result) => {
                    if (err) {
                         let apiResponse = response.generate(true, 'Failed To Find Details', 500, null)
                    } else if (check.isEmpty(result)) {
                         let apiResponse = response.generate(true, 'No Detail Found', 404, null)
                    } else {
                       let option = {
                           drawer_balance: Number(result.drawer_balance) + Number(req.body.total_price)
                       }
                       sessionModel.updateOne({session_id: result.session_id},option,{multi:true}).exec((err,result) => {
                       })
                    
                    }
                 })
            }
            for(let item of req.body.products) {
                productSalesReportModel.findOne({'date': time.getNormalTime(),'product_id': item.product_id,'branch_id': req.body.branch_id,'employee_id': item.employee_id}).exec((err,result) => {
                   if(err){
                   } else if (check.isEmpty(result)) {
                       let sales = new productSalesReportModel({
                        sales_report_id: shortid.generate(),
                        date: time.getNormalTime(),
                        product_name: item.product_name,
                        product_id: item.product_id,
                        branch_id: req.body.branch_id,
                        branch_name: req.body.branch_name,
                        employee_id: item.employee_id,
                        employee_name: item.employee_name,
                        quantity: Number(item.quantity)
                       })
                       sales.save((err,result) => {
                       })
                   } else {
                       let obj = {
                          quantity: Number(result.quantity) + Number(item.quantity) 
                       }
                       productSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                           if(err) {
                           } else {
                               let apiResponse = response.generate(false, 'Bill Created Successfully', 200, null)
                               res.send(apiResponse)
                           }
                       })
                   }
               })
            }
            for(let item of req.body.services) {
                serviceSalesReportModel.findOne({'date': time.getNormalTime(),'service_id': item.product_id,'branch_id': req.body.branch_id,'employee_id':item.employee_id}).exec((err,result) => {
                   if(err){
                   } else if (check.isEmpty(result)) {
                       let sales = new serviceSalesReportModel({
                        sales_report_id: shortid.generate(),
                        date: time.getNormalTime(),
                        service_name: item.service_name,
                        service_id: item.service_id,
                        branch_id: req.body.branch_id,
                        branch_name: req.body.branch_name,
                        employee_id: item.employee_id,
                        employee_name: item.employee_name,
                        quantity: Number(item.quantity)
                       })
                       sales.save((err,result) => {
                           if(err) {
                           }
                       })
                   } else {
                       let obj = {
                          quantity: Number(result.quantity) + Number(item.quantity) 
                       }
                       serviceSalesReportModel.updateOne({'sales_report_id': result.sales_report_id},obj,{multi:true}).exec((err,result) => {
                           if(err) {
                           } else {
                               let apiResponse = response.generate(false, 'Bill Created Successfully', 200, null)
                            }
                        })
                    }
                })
            }
            res.send(apiResponse)
        }
    })

}


let getTotalSales = (req, res) => {
    const filters = req.query;
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    delete filters.startDate
    delete filters.endDate
    if(startDate && endDate) {

        totalModel.find({'date':{ $gte:startDate, $lte:endDate}})
            .lean()
            .select('-__v -_id')
            .exec((err, result) => {
                if (err) {
                    let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        let isValid = true;
                        for (key in filters) {
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
                    let apiResponse = response.generate(true, 'Failed To Find ', 500, null)
                    res.send(apiResponse)
                } else if (check.isEmpty(result)) {
                    logger.info('No Data Found','Bill Controller: getTotalSales')
                    let apiResponse = response.generate(true, 'No Data Found', 404, null)
                    res.send(apiResponse)
                } else {
                    const filteredUsers = result.filter(user => {
                        let isValid = true;
                        for (key in filters) {
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

    let getBillDetail = () => {
        return new Promise((resolve, reject) => {
            billModel.findOne({ 'bill_id': req.params.id }).exec((billerr, billresult) => {
                if (billerr) {
                    console.log(billerr);
                    reject(billerr);
                } else {
                    console.log(billresult);
                    bill = billresult;
                    resolve(bill);
                }
            });
        });
    }

    let updateProductSalesReport = () => {
        return new Promise((resolve, reject) => {
            if (bill.products && bill.products.length > 0) {
                let promises = bill.products.map(item => {
                    return new Promise((resolve, reject) => {
                        productSalesReportModel.findOne({
                            'date': moment(item.createdOn).format('DD-MM-YYYY'),
                            'product_id': item.product_id,
                            'branch_id': item.branch_id
                        }).exec((err, result) => {
                            if (err) {
                                console.log(err);
                                reject(err);
                            } else if (check.isEmpty(result)) {
                                console.log('no sales report p');
                                resolve();
                            } else {
                                console.log(result);
                                let obj = {
                                    quantity: Number(result.quantity) - Number(item.quantity)
                                };
                                productSalesReportModel.updateOne({
                                    'sales_report_id': result.sales_report_id
                                }, obj, { multi: true }).exec((err, result) => {
                                    if (err) {
                                        console.log(err);
                                        reject(err);
                                    } else {
                                        console.log(result);
                                        resolve(result);
                                    }
                                });
                            }
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    resolve('sales updated');
                }).catch(err => {
                    reject(err);
                });
            } else {
                resolve('no products added');
            }
        });
    }

    let updateServiceSalesReport = () => {
        return new Promise((resolve, reject) => {
            if (bill.services && bill.services.length > 0) {
                let promises = bill.services.map(item => {
                    return new Promise((resolve, reject) => {
                        serviceSalesReportModel.findOne({
                            'date': moment(item.createdOn).format('DD-MM-YYYY'),
                            'service_id': item.service_id,
                            'branch': item.branch
                        }).exec((err, result) => {
                            if (err) {
                                console.log(err);
                                reject(err);
                            } else if (check.isEmpty(result)) {
                                console.log('no sales report s');
                                resolve();
                            } else {
                                console.log(result);
                                let obj = {
                                    quantity: Number(result.quantity) - Number(item.quantity)
                                };
                                serviceSalesReportModel.updateOne({
                                    'sales_report_id': result.sales_report_id
                                }, obj, { multi: true }).exec((err, result) => {
                                    if (err) {
                                        console.log(err);
                                        reject(err);
                                    } else {
                                        console.log(result);
                                        resolve(result);
                                    }
                                });
                            }
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    resolve('sales updated');
                }).catch(err => {
                    reject(err);
                });
            } else {
                resolve('no services added');
            }
        });
    }

    let updateDrawerBalance = () => {
        return new Promise((resolve, reject) => {
            if (bill.payment_mode === 'Cash') {
                sessionModel.findOne({
                    'session_status': 'true',
                    'branch_id': bill.branch_id
                }).select('-__v -_id').lean().exec((err, sResult) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else if (check.isEmpty(sResult)) {
                        console.log('no active session');
                        resolve('no active session');
                    } else {
                        let newObj = {
                            drawer_balance: Number(sResult.drawer_balance) - Number(bill.total_price),
                            cash_income: Number(sResult.cash_income) - Number(bill.total_price)
                        };
                        sessionModel.updateOne({
                            'session_id': sResult.session_id
                        }, newObj, { multi: true }).exec((updateErr, updateResult) => {
                            if (updateErr) {
                                console.log(updateErr);
                                reject(updateErr);
                            } else {
                                resolve(updateResult);
                            }
                        });
                    }
                });
            } else {
                resolve('payment_mode is not Cash');
            }
        });
    }

    let deleteBillFromDB = () => {
        return new Promise((resolve, reject) => {
            billModel.findOneAndRemove({ 'bill_id': req.params.id }).exec((err, result) => {
                if (err) {
                    console.log(err);
                    logger.error(err.message, 'Bill Controller: deleteBill', 10);
                    let apiResponse = response.generate(true, 'Failed To delete Bill', 500, null);
                    reject(apiResponse);
                } else if (check.isEmpty(result)) {
                    logger.info('No Bill Found', 'Bill Controller: deleteBill');
                    let apiResponse = response.generate(true, 'No Detail Found', 404, null);
                    reject(apiResponse);
                } else {
                    let apiResponse = response.generate(false, 'Bill Successfully deleted', 200, result);
                    resolve(apiResponse);
                }
            });
        });
    }

    getBillDetail()
        .then(updateProductSalesReport)
        .then(updateServiceSalesReport)
        .then(updateDrawerBalance)
        .then(deleteBillFromDB)
        .then((apiResponse) => {
            res.status(200).send(apiResponse);
        }).catch((err) => {
            console.log("errorhandler");
            console.log(err);
            res.status(err.status || 500).send(err);
        });
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
                let apiResponse = response.generate(true, 'Failed To delete bill', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
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
                let apiResponse = response.generate(true, 'Failed To delete bill', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
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
    getTotalSales: getTotalSales,
    getAllCustomer:getAllCustomer,
    getAllCustomerNumber: getAllCustomerNumber
}