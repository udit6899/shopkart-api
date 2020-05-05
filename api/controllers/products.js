// Importing all necessary packages
const path = require('path');
const mongoose = require("mongoose");
const createError = require("http-errors");
const utils = require('../middlewares/utils');
const contract = require('../sdk/gateway/contract');
const { removeDir } = require('../middlewares/upload');

const Product = require("../models/product.js");

// Building query for get products
function buildQuery(req) {

    let query = {};
    let path = req.originalUrl.split('/')[2];

    if ( path == 'by-type' ){
        // Query for all product according to productType
        query = { type: req.params.productType };
    } else if ( path == 'by-seller' ){
        // Query for all products according to sellerId
        query = { seller: req.params.sellerId };
    } else {
        // Query for all products
        query = {};
    }

    return query;
}

// Retrieving and adding productImages to request
function addProductImages(req){

    // Retrieve images path from req.files
    let productImages = [];

    req.files.forEach(image => {
        productImages.push(image.path.replace('public/uploads/', ''));
    });

    // Adding productImages to request body
    req.body.productImages = productImages;
}

// Retrieving product's details form database
exports.getProductById =  function (req, res, next) {

    // Getting product'd id from request
    const id = req.params.productId;

    // Finding product's details using product id.
    Product.findById(id, { __v: 0 })
        .exec()
        .then(product => {
            // if product found, return success response
            if (product) {
                product.request = {
                    type: "GET ",
                        description: "GET_ALL_PRODUCTS",
                        url: req.protocol + '://' + req.get('host') + "/products/get-all"
                }
                res.status(200).json({
                    status: 200,
                    message: "Product details of the given Id: " + id,
                    product: product
                });
            }
            // If product doesn't found, return not found response
            else {
                next(createError(404, "No valid entry found for provided ID"));
            }

        })
        // If any error occures, return error message
        .catch(error => {
            next(error);

        });
};

// Retrieving all product's details or according to productType form database
exports.getAllProducts = function (req, res, next) {

    // Building query
    var query = buildQuery(req);

    // Finding all products
    Product.paginate(query, { offset: ( parseInt(req.params.offSet) - 1 || 0 ) * 10, limit: 10 })
        .then(result => {
            // If Product found, return product details
            if (result.total > 0) {
                const response = {
                    status: 200,
                    message: "A list of product details",
                    total: result.total,
                    offSet: (result.offset / 10) + 1,
                    pages: Math.ceil(result.total / result.limit),
                    products: result.docs.map(product => {
                        return utils.productResponse(req, product);
                    })
                }
                res.status(200).json(response);
            }
            // If product doesn't found, return empty response
            else {
                next(createError(404, "Product not found !"));
            }
        })
        // If any error occures, return error message
        .catch(error => {
            next(error);
        })
};

// Creating new product
exports.createProduct = async function (req, res, next) {

    // Adding productImages to request body
    addProductImages(req);

    // Create new product's document/object and binding the product's details
    const product = new Product(req.body);

    // Adding productId, productImages and sellerId to request
    product._id = new mongoose.Types.ObjectId();
    product.seller =  req.userData.id;

    try {

        // Create assets in chain code
        await contract.invoke( {
            org: "ecom",
            user: req.userData.id.toString(),
            method: "CreateAsset",
            args: [
                product._id.toString(),
                product.type,
                product.title,
                product.seller.toString(),
                product.price.toString(),
                product.quantity.toString()
            ]
        });

        // Creating product in database
        let result = await product.save();

        // If  product's created successfully, return success response
        await res.status(201).json({
            status: 201,
            message: "Product created successfully.",
            createdProduct: utils.productResponse(req, result)
        });

    } catch (error) {

        // If error occur, then remove stored images
        removeDir(
            path.resolve(__dirname + "../../../public/uploads", path.dirname(req.body.productImages[0]))
        );

        if (error._message) {
            // If validation faied
            error.message = error.message;
        }  else {
            // If product creation failed
            error.message = "Product creation failed !";
        }
            next(error);
    }
};

// Update Product details
exports.updateProduct = function (req, res, next) {

    // Adding productImages to request body
    addProductImages(req);

    // Retrieving product id from request
    const id = req.params.productId;

    // Update product details in database
    Product.updateOne({ _id: id, seller: req.userData.id }, { $set: req.body })
        .exec()
        .then(result => {

            // If product's details updated successfully, return success response
            if (result.nModified > 0) {
                res.status(200).json({
                    status: 200,
                    message: "Product details updated",
                    request: {
                        type: "GET",
                        description: "GET_PRODUCT_DETAILS",
                        url: req.protocol + '://' + req.get('host') + "/products/get/" + id
                    }
                });
            } else {
                // If invalid product id
                next(createError(404, "Invalid Product Id !"));
            }
        })
        // If product's updation failed.
        .catch(error => {
            if (error._message) {
                // If validation faied
                error.message = error.message;
            } else {
                // If product update failed
                error.message = "Product updation failed !";
            }
            next(error);
        });
};

// Delete product
exports.deleteProduct = async function (req, res, next) {

    // Getting product's id from request
    const productId = req.params.productId;

    try {
        // Deleting product product database
        let result = await Product.remove({ "_id": productId, seller: req.userData.id });

        // If  product's deleted successfully, return success response
        if (result.deletedCount > 0) {

            // Delete assets from couchDb
            await contract.invoke( {
                org: "ecom",
                user: req.userData.id.toString(),
                method: "DeleteAsset",
                args: [
                    req.userData.id.toString(),
                    productId,
                ]
            });

            await res.status(200).json({
                status: 200,
                message: "Product deleted successfully",
                request: {
                    type: "POST",
                    description: "CREATE_NEW_PRODUCT",
                    url: req.protocol + '://' + req.get('host') + "/products/create"
                }
            });

        } else {
            // If invalid product id
            next(createError(404, "Invalid Product Id !"));
        }

    } catch (error) {
        // If any error occurs, return error response
        error.message = "Product deletion failed !";
        next(error);
    }
};

// Update product quantity
exports.updateProductQuantity =  function (id, quantity) {

    //Finding product's quantity using product id.
    Product.findById(id, { quantity: 1 }, function (err, product) {

         // If product is exists then update quantity of the product
        if (product){
            Product.updateOne({ _id: id }, { $set: { quantity: product.quantity + quantity } })
                .catch(e=>{});
        }
    } );
};
