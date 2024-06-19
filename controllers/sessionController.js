const mongoose = require('mongoose');
const shortid = require('shortid');
const customId = require('custom-id');
const time = require('./../libs/timeLib');
const moment = require('moment')//npm install moment --save
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const check = require('../libs/checkLib')
/* Models */
const sessionModel = mongoose.model('session')





let getAllSession = (req,res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    const filters = req.query;
    delete filters.current_page
    delete filters.per_page
    sessionModel.find().sort({ _id: -1 })
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
            let apiResponse = response.generate(false, 'All Bills Found', 200, newResult)
            res.send(apiResponse)
        }
    })
}

let createSession = (req,res) => {
    let id = shortid.generate();
    let newSession = new sessionModel({
       session_id: id,
       session_status: req.body.session_status,
       session_amount: req.body.session_amount,
       drawer_balance: req.body.drawer_balance,
       user_name: req.body.user_name,
       withdrawn: req.body.withdrawn,
       branch_id: req.body.branch_id,
       branch_name: req.body.branch_name,
       isWithdrawn: 'false',
       date: time.getNormalTime(),
       cash_income: req.body.cash_income,
       createdOn: time.now()
    })

    newSession.save((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To create session', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'session Successfully created', 200, result)
            res.send(apiResponse)
        }
    })



  
}




let deleteSession = (req,res) => {
    sessionModel.findOneAndRemove({'session_id':req.params.id})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To delete Session', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No Session Found', 'Session Controller: deleteSession')
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Session Successfully deleted', 200, result)
            res.send(apiResponse)
        }
    })
}

let getSessionDetail = (req, res) => {
    sessionModel.findOne({ 'session_id': req.params.id })
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


let updateSession = (req,res) => {
    let option = req.body
    sessionModel.updateOne({'session_id':req.params.id},option,{multi:true})
    .exec((err,result) => {
        if (err) {
            let apiResponse = response.generate(true, 'Failed To update Session', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'No Detail Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Session Successfully updated', 200, result)
            res.send(apiResponse)
        }
    })
}

let getCurrentSession = (req,res) => {

    sessionModel.findOne({'session_status': 'true','branch_id': req.query.branch_id,'date': req.query.date})
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
}


let deactivateAllSession = (req,res) => {
    sessionModel.find({session_status:'true','branch_id': req.params.branch_id}).exec((err,result) => {
        if(err) {
        }else if (check.isEmpty(result)) {
        } else {
          for (let item of result) {
            
            let option = {
              session_status: 'false'
            }
      
            sessionModel.updateOne({'session_id':item.session_id},option,{multi:true}).exec((err,result) => {
              if(err) {
              }
            })
          }
        }
      })
}






module.exports = {
    getAllSession: getAllSession,
    createSession: createSession,
    updateSession: updateSession,
    deleteSession: deleteSession,
    getSessionDetail: getSessionDetail,
    getCurrentSession: getCurrentSession,
    deactivateAllSession: deactivateAllSession
}