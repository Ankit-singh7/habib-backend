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
    
        salesReportModel.find({}).exec((err, allResults) => {
            if (err) {
                res.send(err);
            } else {
                const filteredResults = allResults.filter(result => {
                    const resultYear = parseInt(result.date.substring(6, 10));
                    return resultYear === parseInt(year);
                });
    
                const groupedResults = groupByMonth(filteredResults);
    
                if (check.isEmpty(groupedResults)) {
                    let apiResponse = response.generate(false, 'No sales data found for the given year', 200, null);
                    res.send(apiResponse);
                } else {
                    let apiResponse = response.generate(false, 'Sales data found', 200, groupedResults);
                    res.send(apiResponse);
                }
            }
        });
    };
    
    function groupByMonth(results) {
        const grouped = results.reduce((acc, result) => {
            const month = parseInt(result.date.substring(3, 5));
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(result);
            return acc;
        }, {});
    
        return Object.keys(grouped).map(month => ({
            month: parseInt(month),
            total: grouped[month].length,
            result: grouped[month].sort((a, b) => a.product_name.localeCompare(b.product_name))
        }));
    }
    
    
    
    



module.exports = {
    getAllSalesReport:getAllSalesReport,
    getSalesReportYearlyMonthWise: getSalesReportYearlyMonthWise
}