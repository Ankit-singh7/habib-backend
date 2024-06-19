const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const appointmentModel = mongoose.model('appointment');


let getAllAppointment = (req,res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    const filters = req.query;
    delete filters.current_page
    delete filters.per_page
    delete filters.startDate
    delete filters.endDate
    if(startDate && endDate) {
        
    }
    appointmentModel.find().sort({ _id: -1 })
    .lean()
    .exec((err,result) => {
        if(err) {
            let apiResponse = response.generate(true, 'Failed To Find Session', 500, null)
            res.send(apiResponse)
        }  else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Data Found', 404, null)
            res.send(apiResponse)
        }  else {
            const filteredUsers = result.filter(user => {
                let isValid = true;
                for (key in filters) {
                  if(key === 'createdOn') {
                      isValid = isValid && moment(user[key]).format('YYYY-MM-DD') == filters[key];
                  } else {
                    isValid = isValid && user[key] == filters[key];
                  }
                  
                }
                return isValid;
              });
              const startIndex = (page - 1)*limit;
              const endIndex = page * limit
              let total = result.length;
              let sessionList = filteredUsers.slice(startIndex,endIndex)
              let newResult = {total:total,result:sessionList}
            let apiResponse = response.generate(false, 'All Appointment found', 200, newResult)
            res.send(apiResponse)
        }
    })
}



/* Get single category details */
/* params : Id
*/
let getSingleAppointmentDetail = (req, res) => {
    appointmentModel.findOne({ 'appointment_id': req.params.id })
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


let createAppointment = (req,res) => {
    let newCategory = new appointmentModel({
        appointment_id:shortid.generate(),
        appointment_date: req.body.appointment_date,
        appointment_time:req.body.appointment_time,
        customer_name: (req.body.customer_name).toLowerCase(),
        purpose: req.body.purpose,
        branch_id:req.body.branch_id,
        branch_name: req.body.branch_name,
        payment_mode: req.body.payment_mode,
        booking_amount: req.body.booking_amount,
        status: 'pending',
        createdOn: time.now()
    })

    newCategory.save((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To create new Branch', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully created', 200, result)
            res.send(apiResponse)
        }
    })
}


let deleteAppointment = (req,res) => {
    appointmentModel.findOneAndRemove({'appointment_id':req.params.id})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To delete Branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully deleted', 200, result)
            res.send(apiResponse)
        }
    })
}


let updateAppointment = (req,res) => {
    let option = req.body
    appointmentModel.updateOne({'appointment_id':req.params.id},option,{multi:true})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To update branch', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Branch Successfully updated', 200, result)
            res.send(apiResponse)
        }
    })
}


let getBillingCustomerAppointment = (req,res) => {
    appointmentModel.findOne({ 'customer_name': (req.params.customer_name).toLowerCase(), 'status': 'pending', 'branch_id': req.params.branch_id }).exec((err, result) => {
        if (err) {
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Appointment Detail found', 200, result)
            res.send(apiResponse)
        }
    })

}




module.exports = {
    getAllAppointment:getAllAppointment,
    getSingleAppointmentDetail:getSingleAppointmentDetail,
    createAppointment:createAppointment,
    deleteAppointment: deleteAppointment,
    updateAppointment:updateAppointment,
    getBillingCustomerAppointment: getBillingCustomerAppointment
}