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

let getAllBill = async (req, res) => {
    try {
        if (req.query.employee_id) {
            return getEmployeeSales(req, res, req.query.startDate, req.query.endDate);
        }

        const page = parseInt(req.query.current_page) || 1;
        const limit = parseInt(req.query.per_page) || 10;
        const { startDate, endDate, current_page, per_page, ...filters } = req.query;

        let dbQuery = {};

        const sd = startDate ? moment(startDate, 'DD-MM-YYYY') : moment().startOf('day');
        const ed = endDate ? moment(endDate, 'DD-MM-YYYY').add(1, 'day') : moment().endOf('day');

        dbQuery.createdOn = {
            $gte: sd.format(),
            $lte: ed.format()
        };

        for (const key of Object.keys(filters)) {
            if (key === 'createdOn') continue;
            if (filters[key] !== undefined && filters[key] !== '') {
                dbQuery[key] = filters[key];
            }
        }

        const skip = (page - 1) * limit;

        const [bills, total_bill_count, sumResult] = await Promise.all([
            billModel.find(dbQuery).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
            billModel.countDocuments(dbQuery),
            billModel.find(dbQuery).select('total_price').lean()
        ]);

        if (!bills || bills.length === 0) {
            return res.send(response.generate(true, 'No Data Found', 404, null));
        }

        const total_sales = sumResult.reduce((sum, item) => sum + (item.total_price || 0), 0);
        const total = `${total_sales}-${total_bill_count}`;

        res.send(response.generate(false, 'All Bills Found', 200, { total, result: bills }));

    } catch (err) {
        logger.error(err.message, 'Bill Controller: getAllBill');
        res.send(response.generate(true, 'Failed To Find Bills', 500, null));
    }
};


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





async function getEmployeeSales(req, res, sd, ed) {
    try {
        const employee_id = req.query.employee_id;
        const { startDate, endDate, current_page, per_page, employee_id: _eid, ...filters } = req.query;

        let dbQuery = {};
        if (sd && ed) {
            dbQuery.createdOn = {
                $gte: moment(sd, 'DD-MM-YYYY').toDate(),
                $lte: moment(ed, 'DD-MM-YYYY').add(1, 'day').toDate()
            };
        }
        for (const key of Object.keys(filters)) {
            if (filters[key] !== undefined && filters[key] !== '') {
                dbQuery[key] = filters[key];
            }
        }

        const bills = await billModel.find(dbQuery).sort({ _id: -1 }).lean();

        if (!bills || bills.length === 0) {
            return res.send(response.generate(true, 'No Data Found', 404, null));
        }

        let total_sales = 0;
        let employeeSalesList = [];

        for (let item of bills) {
            const products = (item.products || []).filter(p => p.employee_id === employee_id);
            const services = (item.services || []).filter(s => s.employee_id === employee_id);

            products.forEach(p => total_sales += p.total || 0);
            services.forEach(s => total_sales += s.total || 0);

            if (products.length > 0 || services.length > 0) {
                employeeSalesList.push({ ...item, products, services, employee_id });
            }
        }

        const total_r = `${total_sales}-${bills.length}`;
        res.send(response.generate(false, 'All Bills Found', 200, { total: total_r, result: employeeSalesList }));

    } catch (err) {
        logger.error(err.message, 'Bill Controller: getEmployeeSales');
        res.send(response.generate(true, 'Failed To Find Bills', 500, null));
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
        dob: req.body.dob,
        anniversary: req.body.anniversary,
        feedback: req.body.feedback,
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
            dob: req.body.dob,
            anniversary: req.body.anniversary,
            feedback: req.body.feedback,
            date: time.getNormalTime(),
            createdOn: time.now()
        })
    }

    newBill.save((err, result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To create new Bill', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Bill Successfully created', 200, result)
            res.send(apiResponse)

            setImmediate(() => {
                let postProcess = Promise.resolve()

                if(req.body.dual_payment_mode === false  || req.body.dual_payment_mode === 'false' ) {
                    if(req.body.payment_mode_1 === 'Cash') {
                        postProcess = postProcess.then(() =>
                            sessionModel.updateOne(
                                { session_status: 'true' },
                                { $inc: { drawer_balance: Number(req.body.total_price) } }
                            ).exec()
                        )
                    }
                } else if(req.body.dual_payment_mode === true  || req.body.dual_payment_mode === 'true' ){
                    if(req.body.payment_mode_1 === 'Cash' || req.body.payment_mode_2 === 'Cash') {
                        let cashAmount = 0
                        if(req.body.payment_mode_1 === 'Cash' && req.body.payment_mode_2 !== 'Cash') {
                            cashAmount = Number(req.body.split_amount_1)
                        } else if(req.body.payment_mode_1 !== 'Cash' && req.body.payment_mode_2 === 'Cash') {
                            cashAmount = Number(req.body.split_amount_2)
                        } else if(req.body.payment_mode_1 === 'Cash' && req.body.payment_mode_2 === 'Cash') {
                            cashAmount = Number(req.body.total_price)
                        }
                        if (cashAmount) {
                            postProcess = postProcess.then(() =>
                                sessionModel.updateOne(
                                    { session_status: 'true' },
                                    { $inc: { drawer_balance: cashAmount } }
                                ).exec()
                            )
                        }
                    }
                }

                if(req.body.payment_mode === 'Cash') {
                    postProcess = postProcess.then(() =>
                        sessionModel.updateOne(
                            { session_status: 'true', branch_id: req.body.branch_id },
                            { $inc: { drawer_balance: Number(req.body.total_price) } }
                        ).exec()
                    )
                }

                if(req.body.appointment_id){
                    postProcess = postProcess.then(() =>
                        appointmentModel.deleteMany({'appointment_id': req.body.appointment_id}).exec()
                    )
                }

                const reportDate = time.getNormalTime()
                const products = Array.isArray(req.body.products) ? req.body.products : []
                const services = Array.isArray(req.body.services) ? req.body.services : []
                const reportTasks = []

                for(let item of products) {
                    reportTasks.push(
                        productSalesReportModel.findOneAndUpdate(
                            {
                                date: reportDate,
                                product_id: item.product_id,
                                branch_id: req.body.branch_id,
                                employee_id: item.employee_id
                            },
                            {
                                $inc: { quantity: Number(item.quantity) },
                                $setOnInsert: {
                                    sales_report_id: shortid.generate(),
                                    date: reportDate,
                                    product_name: item.product_name,
                                    product_id: item.product_id,
                                    branch_id: req.body.branch_id,
                                    branch_name: req.body.branch_name,
                                    employee_id: item.employee_id,
                                    employee_name: item.employee_name
                                }
                            },
                            { upsert: true, new: true }
                        ).exec()
                    )
                }

                for(let item of services) {
                    reportTasks.push(
                        serviceSalesReportModel.findOneAndUpdate(
                            {
                                date: reportDate,
                                service_id: item.product_id,
                                branch_id: req.body.branch_id,
                                employee_id: item.employee_id
                            },
                            {
                                $inc: { quantity: Number(item.quantity) },
                                $setOnInsert: {
                                    sales_report_id: shortid.generate(),
                                    date: reportDate,
                                    service_name: item.service_name,
                                    service_id: item.service_id,
                                    branch_id: req.body.branch_id,
                                    branch_name: req.body.branch_name,
                                    employee_id: item.employee_id,
                                    employee_name: item.employee_name
                                }
                            },
                            { upsert: true, new: true }
                        ).exec()
                    )
                }

                if (reportTasks.length > 0) {
                    postProcess = postProcess.then(() => Promise.all(reportTasks))
                }

                postProcess.catch((postErr) => {
                    logger.error(
                        postErr.message || String(postErr),
                        'Bill Controller: createBill post-process'
                    )
                })
            })
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