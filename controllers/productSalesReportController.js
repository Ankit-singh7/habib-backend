const mongoose = require('mongoose');
const shortid = require('shortid');
const customId = require('custom-id');
const time = require('../libs/timeLib');
const response = require('../libs/responseLib')
const logger = require('../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */

const salesReportModel = mongoose.model('productSalesReport');



let getAllSalesReport = (req, res) => {
    const filters = req.query;
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    delete filters.startDate
    delete filters.endDate
    console.log(filters)
        console.log('object')
        salesReportModel.find({'date':{'$gte':new Date(startDate),'$lte':new Date(endDate)}}).exec((err,result) => {
            if(err) {
                res.send(err)
            } else if (check.isEmpty(result)) {
                let apiResponse = response.generate(false, 'Ingredient Successfuly found', 200, null)
                res.send(apiResponse)
    
            } else {
                const filteredUsers = result.filter(user => {
                    console.log('here', user)
                    let isValid = true;
                    for (key in filters) {
                        console.log(filters[key])
                        console.log('here', user[key])
                            isValid = isValid && user[key] == filters[key];
                        

                    }
                    return isValid;
                });
                let total = filteredUsers.length;
                let reportList = filteredUsers
                let sortResult = reportList.sort(function(a,b) {
                    return a.product_name.localeCompare(b.product_name);//using String.prototype.localCompare()
                })
                let newResult = {total:total,result:sortResult}
                let apiResponse = response.generate(false, 'All sales Found', 200, newResult)
                res.send(apiResponse)
            }
        })
    } 

    let getSalesReportYearlyMonthWise = (req, res) => {
        const filters = req.query;
        const year = req.query.year;
    
        salesReportModel.aggregate([
            {
                $match: {
                    'date': {
                        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
                    }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: { $dateFromString: { dateString: "$date", format: "%d-%m-%Y" } } }
                    },
                    total: { $sum: 1 },
                    result: { $push: "$$ROOT" }
                }
            },
            {
                $sort: {
                    '_id.month': 1
                }
            }
        ]).exec((err, result) => {
            if (err) {
                res.send(err);
            } else if (check.isEmpty(result)) {
                let apiResponse = response.generate(false, 'No sales data found for the given year', 200, null);
                res.send(apiResponse);
            } else {
                let formattedResult = result.map(item => {
                    return {
                        month: item._id.month,
                        total: item.total,
                        result: item.result.sort((a, b) => a.product_name.localeCompare(b.product_name))
                    };
                });
    
                let apiResponse = response.generate(false, 'Sales data found', 200, formattedResult);
                res.send(apiResponse);
            }
        });
    };
    



module.exports = {
    getAllSalesReport:getAllSalesReport,
    getSalesReportYearlyMonthWise: getSalesReportYearlyMonthWise
}