
const mongoose = require('mongoose');
const shortid = require('shortid');
const customId = require('custom-id');
const time = require('../libs/timeLib');
const passwordLib = require('../libs/generatePasswordLib');
const response = require('../libs/responseLib')
const logger = require('../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib')
const token = require('../libs/tokenLib')
const AuthModel = mongoose.model('Auth')
const branchModel = mongoose.model('branch');
const emailLib = require('../libs/emailLib');

/* Models */
const UserModel = mongoose.model('user')

const applicationUrl = 'http://trego.tk' //url of frontend application

// Get all employee

let getAllEmployee = (req,res) => {
    const page = req.query.current_page?req.query.current_page: 1
    const limit = req.query.per_page?req.query.per_page:1000
    const filters = req.query;
    let searchQuery;
    req.query.f_name ? searchQuery = { 'role': 'employee', 'name': { $regex: new RegExp(req.query.name, 'i') } } : searchQuery = {'role': 'employee'}
    delete filters.current_page
    delete filters.per_page
    delete filters.f_name
    UserModel.find(searchQuery)
        .select(' -__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                logger.error(err.message, 'User Controller: getAllUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller: getAllUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
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
                const startIndex = (page - 1)*limit;
                const endIndex = page * limit
                let total = result.length;
                let empList = filteredUsers.slice(startIndex, endIndex)
                // // let empList = result.slice(startIndex,endIndex)
                // let sortResult = empList.sort(function(a,b) {
                //     return a.f_name.localeCompare(b.f_name); //using String.prototype.localCompare()
                // })
                let newResult = {total:total,result:empList}
                let apiResponse = response.generate(false, 'All User Details Found', 200, newResult)
                res.send(apiResponse)
            }
        })
}

// Get all operator

let getAllOperator = (req,res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    const filters = req.query;
    delete filters.current_page
    delete filters.per_page
    UserModel.find({'role': 'operator'})
        .select(' -__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {           
                logger.error(err.message, 'User Controller: getAllUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller: getAllUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
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
                const startIndex = (page - 1)*limit;
                const endIndex = page * limit
                let total = result.length;
                let empList = filteredUsers.slice(startIndex, endIndex)
                let sortResult = empList.sort(function(a,b) {
                    return a.f_name.localeCompare(b.f_name); //using String.prototype.localCompare()
                })
                let newResult = {total:total,result:sortResult}
                let apiResponse = response.generate(false, 'All User Details Found', 200, newResult)
                res.send(apiResponse)
            }
        })
}


// Get all stock Manager

let getAllStockManager = (req,res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    UserModel.find({'role': 'stock_manager'})
        .select(' -__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'User Controller: getAllUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller: getAllUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
                res.send(apiResponse)
            } else {
                const startIndex = (page - 1)*limit;
                const endIndex = page * limit
                let total = result.length;
                let empList = result.slice(startIndex,endIndex)
                let newResult = {total:total,result:empList}
                let apiResponse = response.generate(false, 'All User Details Found', 200, newResult)
                res.send(apiResponse)
            }
        })
}

// Get all admin

let getAllAdmin = (req,res) => {
    const page = req.query.current_page
    const limit = req.query.per_page
    UserModel.find({'role': 'admin'})
        .select(' -__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'User Controller: getAllUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller: getAllUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
                res.send(apiResponse)
            } else {
                const startIndex = (page - 1)*limit;
                const endIndex = page * limit
                let total = result.length;
                let sortResult = empList.sort(function(a,b) {
                    return a.f_name.localeCompare(b.f_name); //using String.prototype.localCompare()
                })
                let newResult = {total:total,result:sortResult}
                let apiResponse = response.generate(false, 'All User Details Found', 200, newResult)
                res.send(apiResponse)
            }
        })
}


 

/* Get single user details */
/* params : userId
*/
let getSingleUser = (req, res) => {
    UserModel.findOne({ 'user_id': req.params.id })
        .select('-__v -_id')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'User Controller: getSingleUser', 10)
                let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller:getSingleUser')
                let apiResponse = response.generate(true, 'No User Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'User Details Found', 200, result)
                res.send(apiResponse)
            }
        })
}// end get single user


/* Delete user */
/* params : userId
*/

let deleteUser = (req, res) => {

    UserModel.findOneAndRemove({ 'user_id': req.params.id })
    .select('-employee_password -_id -__v -employee_email')
    .exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller: deleteUser', 10)
            let apiResponse = response.generate(true, 'Failed To delete user', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: deleteUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Deleted the user successfully', 200, result)
            res.send(apiResponse)
        }
    });// end user model find and remove


}// end delete user

/* Edit user details */
/* params : userId
   body : firstName,lastName,mobileNumber 
*/

let editUser = (req, res) => {

    let options = req.body;
    UserModel.updateOne({ 'user_id': req.params.id }, options).exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller:editUser', 10)
            let apiResponse = response.generate(true, 'Failed To edit user details', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: editUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'User details Updated', 200, "None")
            res.send(apiResponse)
        }
    });// end user model update


}// end edit user

let createUser = (req,res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                if (!validateInput.Email(req.body.email)) {
                    let apiResponse = response.generate(true, 'Email Does not met the requirement', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(req.body.password)) {
                    let apiResponse = response.generate(true, '"password" parameter is missing"', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(req)
                }
            } else {
                logger.error('Field Missing During User Creation', 'userController: createUser()', 5)
                let apiResponse = response.generate(true, 'One or More Parameter(s) is missing', 400, null)
                reject(apiResponse)
            }
        })
    }// end validate user input

    let create = () => { 
        let payload;
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email })
                .exec((err, retrievedUserDetails) => {
                    if (err) {
                        logger.error(err.message, 'userController: createUser', 10)
                        let apiResponse = response.generate(true, 'Failed To Create User', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retrievedUserDetails)) {
                        if(req.body.role === 'employee') {
                             payload = {
                                user_id: shortid.generate(),
                                f_name: req.body.f_name,
                                l_name: req.body.l_name || '',
                                email: req.body.email.toLowerCase(),
                                password:req.body.password,
                                status:req.body.status,
                                phone: req.body.phone,
                                designation:req.body.designation,
                                role: req.body.role,
                                createdOn: time.now()
                            }

                            let newUser = new UserModel(payload)
                            newUser.save((err, newUser) => {
                                if (err) {
                                    console.log(err)
                                    logger.error(err.message, 'userController: createUser', 10)
                                    let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                                    reject(apiResponse)
                                } else {
                                    let newUserObj = newUser.toObject();
                                  
    
                                    resolve(newUserObj)
                                }
                            })
                        } else if(req.body.role === 'operator') {
                            let branch_name;
                            branchModel.findOne({'branch_id':req.body.branch_id}).exec((err,result) => {
                                if(err) {
                                    console.log(err)
                                } else {
                                    branch_name = result.branch_name
                                    payload = {
                                        user_id: shortid.generate(),
                                        f_name: req.body.f_name,
                                        l_name: req.body.l_name || '',
                                        email: req.body.email.toLowerCase(),
                                        password:req.body.password,
                                        branch_name: branch_name,
                                        branch_id: req.body.branch_id,
                                        phone: req.body.phone,
                                        role: req.body.role,
                                        createdOn: time.now()
                                    }

                                    let newUser = new UserModel(payload)
                                    newUser.save((err, newUser) => {
                                        if (err) {
                                            console.log(err)
                                            logger.error(err.message, 'userController: createUser', 10)
                                            let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                                            reject(apiResponse)
                                        } else {
                                            let newUserObj = newUser.toObject();
                                          
            
                                            resolve(newUserObj)
                                        }
                                    })
                                }
                            })
                        } else if(req.body.role === 'admin') {
                            payload = {
                                user_id: shortid.generate(),
                                f_name: req.body.f_name,
                                l_name: req.body.l_name || '',
                                email: req.body.email.toLowerCase(),
                                password:req.body.password,
                                phone: req.body.phone,
                                role: req.body.role,
                                createdOn: time.now()
                            }

                            let newUser = new UserModel(payload)
                            newUser.save((err, newUser) => {
                                if (err) {
                                    console.log(err)
                                    logger.error(err.message, 'userController: createUser', 10)
                                    let apiResponse = response.generate(true, 'Failed to create new User', 500, null)
                                    reject(apiResponse)
                                } else {
                                    let newUserObj = newUser.toObject();
                                  
    
                                    resolve(newUserObj)
                                }
                            })
                        } 
                      
                    } else {
                        logger.error('User Cannot Be Created.User Already Present', 'userController: createUser', 4)
                        let apiResponse = response.generate(true, 'User Already Present With this Email', 403, null)
                        reject(apiResponse)
                    }
                })
        })
    }// end create user function


    validateUserInput(req, res)
        .then(create)
        .then((resolve) => {
            delete resolve.password
            delete resolve._id
            delete resolve.__v
            let apiResponse = response.generate(false, 'User created', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err);
            res.send(err);
        })

}

let loginFunction = (req, res) => {
    let findUser = () => {
        //console.log("findUser");
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                console.log("req body email is there");
                //console.log(req.body);
                UserModel.findOne({email: req.body.email}, (err, userDetails) => {
                    /* handle the error here if the User is not found */
                    if (err) {
                        console.log(err)
                        logger.error('Failed To Retrieve User Data', 'userController: findUser()', 10)
                        /* generate the error message and the api response message here */
                        let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                        reject(apiResponse)
                        /* if Company Details is not found */
                    } else if (check.isEmpty(userDetails)) {
                        /* generate the response and the console error message here */
                        logger.error('No User Found', 'userController: findUser()', 7)
                        let apiResponse = response.generate(true, 'No User Found with this email', 404, null)
                        reject(apiResponse)
                    } else {
                        /* prepare the message and the api response here */
                        logger.info('User Found', 'userController: findUser()', 10)
                        resolve(userDetails)
                    }
                });

            } else {
                let apiResponse = response.generate(true, '"email" parameter is missing', 400, null)
                reject(apiResponse)
            }
        })
    }

    let validatePassword = (retrievedUserDetails) => {
        console.log(retrievedUserDetails)
        console.log("validatePassword");
        return new Promise((resolve, reject) => {
            if(req.body.password === retrievedUserDetails.password) {
                resolve(retrievedUserDetails)
            } else {
                logger.info('Login Failed Due To Invalid Password', 'userController: validatePassword()', 10)
                let apiResponse = response.generate(true, 'Invalid password', 400, null)
                reject(apiResponse)
            }
        })
    }



    findUser(req, res)
        .then(validatePassword)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Login Successful', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log("errorhandler");
            console.log(err);
            res.status(err.status)
            res.send(err)
        })
}



// end of the login function 


/**
 * function to logout user.
 * auth params: userId.
 */
let logout = (req, res) => {
    AuthModel.findOneAndRemove({ userId: req.params.id }, (err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'user Controller: logout', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'Already Logged Out or Invalid UserId', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Logged Out Successfully', 200, null)
            res.send(apiResponse)
        }
    })
} // end of the logout function.





let resetPasswordFunction = (req,res) => {
    UserModel.find({'email':req.body.email})
    .select(' -__v -_id -password')
    .lean()
    .exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller: getAllUser', 10)
            let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: getAllUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            let options = {
                password: req.body.password
            }

            UserModel.updateOne({'email':req.body.email},options)
            .select('-password')
            .exec((err,result) => {
                if(err) {
                    console.log(err)
                } else {

                    let apiResponse = response.generate(false, 'User Details Found', 200, result)
                    res.send(apiResponse)
                }
            })
        }
    })
}

let forgotPasswordFunction = (req,res) => {
    UserModel.find({'email':req.body.email})
    .select(' -__v -_id')
    .lean()
    .exec((err, result) => {
        if (err) {
            console.log(err)
            logger.error(err.message, 'User Controller: getAllUser', 10)
            let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            logger.info('No User Found', 'User Controller: getAllUser')
            let apiResponse = response.generate(true, 'No User Found', 404, null)
            res.send(apiResponse)
        } else {
            console.log(result)
            console.log(req.body.oldPassword)
            if(req.body.oldPassword === result[0].password) {

                let options = {
                    password: req.body.newPassword
                }
    
                UserModel.updateOne({'email':req.body.email},options)
                .select('-password')
                .exec((err,result) => {
                    if(err) {
                        console.log(err)
                    } else {
    
                        let apiResponse = response.generate(false, 'User Details Found', 200, result)
                        res.send(apiResponse)
                    }
                })
            } else {
                let apiResponse = response.generate(true, 'Old Password is not correct', 500, null)
                res.send(apiResponse)
            }
        }
    })
}


let sendEmail = (req,res) => {
    console.log(req.body)
    let sendEmail = () => {
        return new Promise((resolve, reject) => {
            
            let sendEmailOptions = {
               email: req.body.email,
               subject: `Query from a customer - ${req.body.subject}`,
               html: `<h4> Hi Admin,</h4>
                   <p> We got a query from <B>${req.body.name}</B> </p>
                       
                    <p>${req.body.message}</p>

                    <p>Email: - ${req.body.email}</p>                             
                   
       
                   <br><b>Love Desi Chinese</b>
                               `
           }
       
           setTimeout(() => {
               emailLib.sendEmail(sendEmailOptions);
           }, 2000);
           resolve('Message Sent Successfully')
        })
    }

    sendEmail(req, res)
    .then((resolve) => {
        let apiResponse = response.generate(false, 'Message Sent Successfully', 200, 'None')
        res.status(200)
        res.send(apiResponse)
    })
    .catch((err) => {
        console.log("errorhandler");
        console.log(err);
        res.status(err.status)
        res.send(err)
    })
}


module.exports = {
    getAllEmployee: getAllEmployee,
    getAllAdmin: getAllAdmin,
    getAllStockManager:getAllStockManager,
    getAllOperator: getAllOperator,
    createUser: createUser,
    getSingleUser: getSingleUser,  
    editUser: editUser,
    deleteUser: deleteUser,
    resetPasswordFunction:resetPasswordFunction,
    forgotPasswordFunction: forgotPasswordFunction,
    loginFunction: loginFunction,
    logout: logout,
    sendEmail: sendEmail
}// end exports