// Importing all required modules
const mongoose = require("mongoose");
const createError = require("http-errors");

// Validating user's exists or not
module.exports = function (req, res, next) {

    var query = {};
    // Getting the model
    var temp = req.originalUrl.split('/');
    // Making model class
    var Model =  require('../models/' + temp[1].substring(0, temp[1].length-1));

    if ( temp[1] == 'users' ){
        // Query for finding users
        query = { mobileNumber : req.body.mobileNumber };
    } else {
        // Query for finding sellers or logistics or couriers
        query = { email : req.body.email };
    }

    Model.findOne( query, (err, user) => {

        if (err){
            // If any error occur
            return next(createError(500, err.message));
        }
        // Different options for different routes
        if(temp[2] == 'signup' && user){
            // If request for signup route, then forbid
            return  next(createError(409, "User is already exists !"));
        } else if(temp[2] == 'forgot' && !user){
            // If request for forgot password route, then forbid
            return next(createError(404, "User is not exists !"));
        }
        // If user not exist, then allow for sign up
        // If user exists, then allow for forgot password
        next();
    })
}