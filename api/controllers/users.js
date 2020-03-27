// Importing all required modules
const mongoose = require("mongoose");
const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const  jwt = require("jsonwebtoken");

const User = require("../models/user");

// Retrieving user's details by userId
exports.getUserById =  (req, res, next) => {

    // Getting user's id from userData
    const id = req.userData.id;

    // Finding user's details using user id.
    User.findById(id)
        .select("_id firstName lastName mobileNumber email emailVarified address imagePath createdAt updatedAt")
        .exec()
        .then(user => {
            // if user found, return success response
            if (user) {
                res.status(200).json(user);
            }
            // If user doesn't found, return not found response
            else {
                next(createError(404, "No valid entry found for provided ID"));
            }

        })
        // If any error occures, return error message
        .catch(error => {
            next(error);

        });
};

// Retrieving all user's details form database
exports.getAllUsers =  (req, res, next) => {

    // Finding all users
    User.find()
        .select("_id firstName lastName mobileNumber password email emailVarified address imagePath createdAt updatedAt")
        .exec()
        .then(users => {
            // If users found, return user details
            if (users.length > 1) {
                const response = {
                    count: users.length,
                    users: users
                }
                res.status(200).json(response);
            }
            // If user doesn't found, return empty response
            else {
                next(createError(404, "No entries found !"));
            }
        })
        // If any error occures, return error message
        .catch(error => {
            next(error);
        })
};

// Creating new use/ processing signup
exports.userSignUp = (req, res, next)=>{

    // Validating user's exists or not
    User.findOne({ mobileNumber : req.body.mobileNumber})
        .exec()
        .then(user => {
            // If user already exist then return error response
            if(user){
                next(createError(409, "Mobile number already in use !"));
            }
            // If user not exists, create user
            else{
                // Converting plain password into hash
                bcrypt.hash(req.body.password, 10, (error, hash)=>{

                    if(error){
                        if(!req.body.password){
                            error = createError(500, "Password must required.");
                        }else{
                            error = createError(500, "Password conversion failed.");
                        }

                        next(error);
                    } else{
                        // Creating user schema object and binding data to it
                        const  user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            mobileNumber: req.body.mobileNumber,
                            password: hash
                        });

                        user.save()
                            // If user created, return success message
                            .then(result => {
                                res.status(201).json({
                                    message: "User Created Successfully."
                                });
                            })
                            // If any error occure return error message
                            .catch(error=>{
                                if (error._message) {
                                    // If validation faied
                                    error.message = error.message;
                                } else {
                                    // If user creation failed
                                    error.message = "Product creation failed !";
                                }
                                next(error);
                            });
                    }
                })
            }
        })
};

// Performing login process
exports.userLogin = (req, res, next)=>{

    // Checking user is valid or not
    User.findOne({ mobileNumber : req.body.mobileNumber })
        .exec()
        .then(user => {
            // If user is an existing user then authenticate password
            if(user){
                bcrypt.compare(req.body.password, user.password, (error, result) => {
                    if(result){
                        // Creating jwt token
                        const token = jwt.sign(
                            {
                                id: user._id,
                                mobileNumber : user.mobileNumber,
                            },
                            process.env.JWT_KEY,
                            {
                                expiresIn: "1h"
                            }
                        );
                        res.status(200).json({
                            message : "Authentication sucesss !",
                            token : token
                        });
                    }else {
                        next(createError(401, "User credential mismatched !" ));
                    }
                });
            }
            // If user is not an existing user
            else{
                next(createError(401, "User credential mismatched !" ));
            }
        });
};

// Update users details
exports.updateUser = (req, res, next) => {

    // Retrieving user id from userData
    const id = req.userData.id;

    // Retrieve update option from request body
    const updateOps = {};

    for (const ops of req.body) {
        updateOps[ops.propName] = ops.propValue;
    }

    // Update user's details in database
    User.update({ _id: id }, { $set: updateOps })
        .exec()
        .then(result => {

            // If user's details updated successfully, return success response
            if (result.nModified > 0) {
                res.status(200).json({
                    message: "User's detail updated."
                });
            }
            // If invalid user id
            else {
                next(createError(404, "Invalid user Id !"));
            }

        })
        // If user's updation failed.
        .catch(error => {
            error.message = "User's detail updation failed !";
            next(error);
        });

};

// Delete user records
exports.removeUser = (req, res, next) => {

    // Getting user's id from request
    const id = req.params.userId;

    // Deleting product product database
    User.remove({ "_id": id })
        .exec()
        .then(result => {
            // If  product's deleted successfully, return success response
            if (result.deletedCount > 0) {
                res.status(200).json({
                    message: "User record deleted."
                });
            }
            // If invalid product id
            else {
                next(createError(404, "Invalid user Id !"));
            }

        })
        // If any error occurs, return error response
        .catch(error => {
            error.message = "User's record deletion failed !";
            next(error);
        })
};