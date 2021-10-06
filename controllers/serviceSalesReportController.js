const mongoose = require('mongoose');
const shortid = require('shortid');
const customId = require('custom-id');
const time = require('../libs/timeLib');
const response = require('../libs/responseLib')
const logger = require('../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */

const salesReportModel = mongoose.model('serviceSalesReport');



let getAllSalesReport = (req, res) => {
    const filters = req.query;
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    delete filters.startDate
    delete filters.endDate
    console.log(filters)

        console.log('object')
        salesReportModel.find({'date':{ $gte:startDate, $lte:endDate}}).exec((err,result) => {
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
                let newResult = {total:total,result:reportList}
                let apiResponse = response.generate(false, 'All sales Found', 200, newResult)
                res.send(apiResponse)

            }
        })

}



module.exports = {
    getAllSalesReport:getAllSalesReport
}